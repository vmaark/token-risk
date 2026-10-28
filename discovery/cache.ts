import { errorCode, errorMessage } from "./rpc.ts";
import type { CacheEntry, CacheStore, CacheInfo, TokenInput } from "./types.ts";
export const CACHE_VERSION = 4;
export const RESULT_SCHEMA_VERSION = 5;
export const RESULT_TTL = 120_000;
export const METADATA_TTL = 86_400_000;
interface StoredEntry<T> {
  key: string;
  value: T;
  savedAt: number;
  expiresAt: number;
  version: number;
}
export class BrowserCache implements CacheStore {
  available = true;
  private pending: Promise<IDBDatabase> | null = null;
  async db() {
    if (!this.pending)
      this.pending = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("token-risk-discovery", CACHE_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const s of [...db.objectStoreNames]) db.deleteObjectStore(s);
          db.createObjectStore("entries", { keyPath: "key" });
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => {
            request.result.close();
            this.pending = null;
          };
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    return this.pending;
  }
  async get<T>(
    key: string,
    { allowExpired = false, now = Date.now() } = {},
  ): Promise<CacheEntry<T> | null> {
    try {
      const db = await this.db();
      const row = await new Promise<StoredEntry<T> | undefined>(
        (resolve, reject) => {
          const r = db.transaction("entries").objectStore("entries").get(key);
          r.onsuccess = () => resolve(r.result as StoredEntry<T> | undefined);
          r.onerror = () => reject(r.error);
        },
      );
      if (
        !row ||
        row.version !== CACHE_VERSION ||
        (!allowExpired && row.expiresAt <= now)
      )
        return null;
      return {
        value: row.value,
        savedAt: row.savedAt,
        expiresAt: row.expiresAt,
        stale: row.expiresAt <= now,
      };
    } catch {
      this.available = false;
      return null;
    }
  }
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      if (JSON.stringify(value).length > 4_000_000) return;
      const db = await this.db();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("entries", "readwrite");
        const store = tx.objectStore("entries");
        const r = store.getAll();
        r.onsuccess = () => {
          const entries = (r.result as StoredEntry<unknown>[]).sort(
            (a, b) => b.savedAt - a.savedAt,
          );
          for (const old of entries.slice(79)) store.delete(old.key);
          store.put({
            key,
            value,
            savedAt: Date.now(),
            expiresAt: Date.now() + ttl,
            version: CACHE_VERSION,
          });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.available = false;
    }
  }
  async clear() {
    try {
      const db = await this.db();
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction("entries", "readwrite");
        t.objectStore("entries").clear();
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }
}
export const resultKey = (chain: number, address: string) =>
  `result:${RESULT_SCHEMA_VERSION}:${CACHE_VERSION}:${chain}:${address.toLowerCase()}`;
export async function cachedDiscovery<
  T extends { coverage: { interrupted: boolean } },
>(
  input: TokenInput,
  {
    cache,
    refresh = false,
    run,
  }: { cache: CacheStore; refresh?: boolean; run: () => Promise<T> },
): Promise<T & { cache: CacheInfo }> {
  const key = resultKey(input.chainId, input.address);
  if (!refresh) {
    const hit = await cache.get<T>(key);
    if (hit)
      return {
        ...hit.value,
        cache: {
          status: "hit",
          savedAt: hit.savedAt,
          expiresAt: hit.expiresAt,
        },
      };
  }
  try {
    const value = await run();
    if (value.coverage.interrupted)
      return { ...value, cache: { status: "partial", savedAt: null } };
    await cache.set(key, value, RESULT_TTL);
    return {
      ...value,
      cache: {
        status: "fresh",
        savedAt: Date.now(),
        expiresAt: Date.now() + RESULT_TTL,
      },
    };
  } catch (error) {
    if (
      errorCode(error) === "ABORTED" ||
      (error instanceof Error && error.name === "AbortError")
    )
      throw error;
    const prior = await cache.get<T>(key, { allowExpired: true });
    if (prior)
      return {
        ...prior.value,
        cache: {
          status: "stale",
          savedAt: prior.savedAt,
          expiresAt: prior.expiresAt,
          error: errorMessage(error),
        },
      };
    throw error;
  }
}
