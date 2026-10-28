import { cachedDiscovery, BrowserCache } from "../discovery/cache.ts";
import { discover } from "../discovery/engine.ts";
import { errorMessage } from "../discovery/rpc.ts";
import type {
  CachedResult,
  DiscoveryResult,
  TokenInput,
  CacheStore,
} from "../discovery/types.ts";
export interface LookupState {
  input: TokenInput | null;
  result: CachedResult | null;
  loading: boolean;
  refreshing: boolean;
  progress: string;
  error: string | null;
}
export type DiscoveryRunner = (
  input: TokenInput,
  options: {
    signal: AbortSignal;
    onProgress: (message: string) => void;
    cache: CacheStore;
  },
) => Promise<DiscoveryResult>;
export class DiscoveryController {
  private state: LookupState = {
    input: null,
    result: null,
    loading: false,
    refreshing: false,
    progress: "",
    error: null,
  };
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;
  constructor(
    readonly cache: CacheStore = new BrowserCache(),
    private run: DiscoveryRunner = discover,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<LookupState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  async lookup(input: TokenInput, refresh = false) {
    this.controller?.abort();
    const owned = new AbortController();
    this.controller = owned;
    const requested = {
      chainId: input.chainId,
      address: input.address.toLowerCase(),
    };
    const same =
      this.state.input?.chainId === requested.chainId &&
      this.state.input.address === requested.address;
    const prior = refresh && same ? this.state.result : null;
    this.update({
      input: requested,
      result: prior,
      loading: true,
      refreshing: refresh,
      progress: "Pinning a block snapshot…",
      error: null,
    });
    try {
      const result = await cachedDiscovery(requested, {
        cache: this.cache,
        refresh,
        run: async () => {
          const result = await this.run(requested, {
            cache: this.cache,
            signal: owned.signal,
            onProgress: (progress) => {
              if (this.controller === owned) this.update({ progress });
            },
          });
          owned.signal.throwIfAborted();
          return result;
        },
      });
      if (this.controller !== owned) return;
      this.update({ result });
    } catch (error) {
      if (this.controller !== owned) return;
      this.update({ error: errorMessage(error), result: prior });
    } finally {
      if (this.controller === owned) {
        this.controller = null;
        this.update({ loading: false, refreshing: false });
      }
    }
  }
  cancel() {
    this.controller?.abort();
    this.controller = null;
    this.update({
      loading: false,
      refreshing: false,
      error: "Lookup cancelled. No new snapshot was saved.",
    });
  }
  dispose() {
    this.controller?.abort();
    this.controller = null;
    this.listeners.clear();
  }
}
