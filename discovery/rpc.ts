import {
  encodeFunctionData,
  decodeFunctionResult,
  parseAbi,
  keccak256,
  type Hex,
  type Abi,
} from "viem";
import { CHAINS } from "./chains.ts";
import type {
  ContractCall,
  ReadClient,
  ReadEvidence,
  ReadResult,
  Snapshot,
} from "./types.ts";
export { CHAINS } from "./chains.ts";
export const ZERO = "0x0000000000000000000000000000000000000000";
export const isAddress = (a: unknown): a is string =>
  typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
export const lower = (a: string) => a.toLowerCase();
export const nodeId = (chainId: number, address: string) =>
  `${chainId}:${lower(address)}`;
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
export const errorCode = (e: unknown) =>
  e && typeof e === "object" && "code" in e && typeof e.code === "string"
    ? e.code
    : undefined;
export class DiscoveryError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function boundedJson<T = unknown>(
  response: Response,
  maxBytes = 2_000_000,
): Promise<T> {
  if (!response.ok)
    throw new DiscoveryError(
      "UPSTREAM_UNAVAILABLE",
      `Upstream returned HTTP ${response.status}.`,
    );
  if (
    Number(response.headers.get("content-length") || 0) > maxBytes ||
    !response.body
  )
    throw new DiscoveryError(
      "RESPONSE_TOO_LARGE",
      "Upstream response exceeded the discovery limit.",
    );
  const reader = response.body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes)
        throw new DiscoveryError(
          "RESPONSE_TOO_LARGE",
          "Upstream response exceeded the discovery limit.",
        );
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new DiscoveryError(
      "INVALID_UPSTREAM_RESPONSE",
      "Upstream did not return valid JSON.",
    );
  }
}
interface RpcQuery {
  method: string;
  params: unknown[];
}
interface RpcResponse {
  id: number;
  result?: unknown;
  error?: { code: number };
}
interface RpcBlock {
  number: Hex;
  hash: string;
  timestamp: Hex;
}
const isHex = (value: unknown): value is Hex =>
  typeof value === "string" && /^0x[0-9a-f]*$/i.test(value);
export class ReadSession implements ReadClient {
  snapshots = new Map<number, Promise<Snapshot>>();
  cache = new Map<string, ReadResult>();
  reads: ReadEvidence[] = [];
  calls = 0;
  maxCalls: number;
  deadline: number;
  signal?: AbortSignal;
  fetcher: typeof fetch;
  constructor(
    public env: Record<string, string | undefined> = {},
    fetcher: typeof fetch = fetch,
    options: {
      maxCalls?: number;
      timeoutMs?: number;
      signal?: AbortSignal;
    } = {},
  ) {
    this.fetcher = (...args) => fetcher(...args);
    this.maxCalls = options.maxCalls || 900;
    this.deadline = Date.now() + (options.timeoutMs || 45000);
    this.signal = options.signal;
  }
  check() {
    if (this.signal?.aborted)
      throw new DiscoveryError("ABORTED", "Lookup cancelled.", 499);
    if (Date.now() > this.deadline)
      throw new DiscoveryError("TIME_BUDGET", "Lookup time budget reached.");
    if (this.calls > this.maxCalls)
      throw new DiscoveryError("READ_BUDGET", "RPC read budget reached.");
  }
  async rpc(chainId: number, items: RpcQuery[]): Promise<ReadResult[]> {
    this.check();
    const chain = CHAINS[chainId];
    if (!chain)
      throw new DiscoveryError(
        "UNSUPPORTED_CHAIN",
        "This network is not enabled.",
        400,
      );
    const override = this.env[`RPC_URL_${chainId}`];
    const urls = override ? [override] : chain.rpc;
    const queries = items.map((item, i) => ({
      jsonrpc: "2.0",
      id: i + 1,
      method: item.method,
      params: item.params,
    }));
    if (this.calls + queries.length > this.maxCalls)
      throw new DiscoveryError("READ_BUDGET", "RPC read budget reached.");
    this.calls += queries.length;
    let failure: unknown;
    for (const url of urls) {
      try {
        if (!url.startsWith("https://"))
          throw new Error("Invalid RPC configuration");
        const response = await this.fetcher(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queries.length === 1 ? queries[0] : queries),
          signal: AbortSignal.any([
            AbortSignal.timeout(
              Math.max(1, Math.min(10000, this.deadline - Date.now())),
            ),
            ...(this.signal ? [this.signal] : []),
          ]),
        });
        const body = await boundedJson<RpcResponse | RpcResponse[]>(response);
        const list = Array.isArray(body) ? body : [body];
        if (list.length !== queries.length)
          throw new Error("Incomplete RPC batch");
        return queries.map((q) => {
          const r = list.find((x) => x.id === q.id);
          if (!r || (!("result" in r) && !r.error))
            throw new Error("Invalid RPC item");
          return r.error
            ? {
                ok: false,
                error: {
                  code: r.error.code,
                  message: "RPC call reverted or is unavailable.",
                },
              }
            : { ok: true, value: r.result };
        });
      } catch (error) {
        failure = error;
      }
    }
    throw new DiscoveryError(
      "RPC_UNAVAILABLE",
      errorCode(failure) === "TIME_BUDGET"
        ? errorMessage(failure)
        : `${chain.name} RPC is unavailable (${errorMessage(failure).slice(0, 160)}). Try again shortly.`,
    );
  }
  async snapshot(chainId: number): Promise<Snapshot> {
    const cached = this.snapshots.get(chainId);
    if (cached) return cached;
    const pending = (async () => {
      const [identity, block] = await this.rpc(chainId, [
        { method: "eth_chainId", params: [] },
        { method: "eth_getBlockByNumber", params: ["finalized", false] },
      ]);
      if (
        !identity.ok ||
        !isHex(identity.value) ||
        Number(BigInt(identity.value)) !== Number(chainId)
      )
        throw new DiscoveryError(
          "CHAIN_MISMATCH",
          "RPC returned the wrong network.",
        );
      let selected = block,
        finality = "finalized";
      if (!selected.ok || !selected.value) {
        [selected] = await this.rpc(chainId, [
          { method: "eth_getBlockByNumber", params: ["latest", false] },
        ]);
        finality = "latest-unfinalized";
      }
      const b = selected.ok ? (selected.value as RpcBlock | null) : null;
      if (!b || !isHex(b.number) || !b.hash || !isHex(b.timestamp))
        throw new DiscoveryError(
          "BLOCK_UNAVAILABLE",
          "Could not pin a chain snapshot.",
        );
      return {
        chainId: Number(chainId),
        chain: CHAINS[chainId].name,
        number: Number(BigInt(b.number)),
        hex: b.number,
        hash: b.hash,
        timestamp: Number(BigInt(b.timestamp)),
        finality,
      };
    })();
    this.snapshots.set(chainId, pending);
    return pending;
  }
  async batch<T = unknown>(
    chainId: number,
    calls: ContractCall[],
  ): Promise<ReadResult<T>[]> {
    const block = await this.snapshot(chainId);
    const outputs: ReadResult[] = [];
    for (let offset = 0; offset < calls.length; offset += 25) {
      const prepared = calls.slice(offset, offset + 25).map((c) => {
        const abi: Abi = parseAbi([c.signature]);
        const name = c.signature.match(/function\s+(\w+)/)?.[1];
        if (!name) throw new Error("Invalid function signature");
        const data = encodeFunctionData({
          abi,
          functionName: name,
          args: c.args || [],
        });
        return {
          key: `${chainId}:${lower(c.address)}:${data}:${block.hex}`,
          c,
          abi,
          name,
          data,
        };
      });
      const uncached = prepared.filter((q) => !this.cache.has(q.key));
      if (uncached.length) {
        const replies = await this.rpc(
          chainId,
          uncached.map((q) => ({
            method: "eth_call",
            params: [{ to: q.c.address, data: q.data }, block.hex],
          })),
        );
        replies.forEach((r, i) => {
          const q = uncached[i];
          let result: ReadResult = r;
          try {
            if (r.ok && isHex(r.value))
              result = {
                ok: true,
                value: decodeFunctionResult({
                  abi: q.abi,
                  functionName: q.name,
                  data: r.value,
                }),
                raw: r.value,
              };
            else if (r.ok) throw new Error("Invalid hex");
          } catch {
            result = {
              ok: false,
              error: {
                code: "ABI_DECODE",
                message: "Return data did not match the interface.",
              },
            };
          }
          this.cache.set(q.key, result);
          this.reads.push({
            chainId,
            blockNumber: block.number,
            address: lower(q.c.address),
            method: q.c.signature,
            args: (q.c.args || []).map((v) =>
              typeof v === "bigint" ? v.toString() : v,
            ),
            ok: result.ok,
            ...(result.ok ? { raw: result.raw } : { error: result.error.code }),
          });
        });
      }
      outputs.push(...prepared.map((q) => this.cache.get(q.key)!));
    }
    // Each adapter supplies its ABI return type at this single dynamic-decoding boundary.
    return outputs as ReadResult<T>[];
  }
  async read<T = unknown>(
    chainId: number,
    address: string,
    signature: string,
    args: readonly unknown[] = [],
  ) {
    return (await this.batch<T>(chainId, [{ address, signature, args }]))[0];
  }
  async code(chainId: number, address: string): Promise<Hex> {
    const block = await this.snapshot(chainId);
    const [r] = await this.rpc(chainId, [
      { method: "eth_getCode", params: [address, block.hex] },
    ]);
    const valid = r.ok && isHex(r.value);
    this.reads.push({
      chainId,
      blockNumber: block.number,
      address: lower(address),
      method: "eth_getCode",
      args: [],
      ok: valid,
      ...(valid ? { raw: r.value as Hex } : { error: "CODE_UNAVAILABLE" }),
    });
    if (!valid)
      throw new DiscoveryError(
        "CODE_UNAVAILABLE",
        "Contract bytecode could not be read.",
      );
    return r.value as Hex;
  }
  async storage(
    chainId: number,
    address: string,
    slot: Hex,
  ): Promise<Hex | null> {
    const b = await this.snapshot(chainId);
    const [r] = await this.rpc(chainId, [
      { method: "eth_getStorageAt", params: [address, slot, b.hex] },
    ]);
    const valid = r.ok && isHex(r.value);
    this.reads.push({
      chainId,
      blockNumber: b.number,
      address: lower(address),
      method: "eth_getStorageAt",
      args: [slot],
      ok: valid,
      ...(valid ? { raw: r.value as Hex } : { error: "STORAGE_UNAVAILABLE" }),
    });
    return valid ? (r.value as Hex) : null;
  }
  async states() {
    return Promise.all([...this.snapshots.values()]);
  }
}
export const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
export const ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
export const BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
export const slotAddress = (v: Hex | null) =>
  v && /^0x[0-9a-fA-F]{64}$/.test(v) && v.slice(-40) !== "0".repeat(40)
    ? "0x" + v.slice(-40)
    : null;
export const hashCode = (code: Hex) => keccak256(code);
