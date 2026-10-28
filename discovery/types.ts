import type { Abi, Hex } from "viem";

export interface TokenInput {
  chainId: number;
  address: string;
}
export interface Chain {
  id: number;
  name: string;
  llamaName: string;
  kind: "L1" | "L2" | "Sidechain";
  parentId?: number;
  rpc: string[];
  explorer: string;
  nativeSymbol: string;
  eid?: number;
}
export interface Endpoint {
  eid: number;
  chainId: number | null;
  name: string;
  key?: string;
}
export interface Snapshot {
  chainId: number;
  chain: string;
  number: number;
  hex: Hex;
  hash: string;
  timestamp: number;
  finality: string;
}
export interface UlnConfig {
  confirmations: string;
  requiredDVNCount: number;
  optionalDVNCount: number;
  optionalDVNThreshold: number;
  requiredDVNs: string[];
  optionalDVNs: string[];
}
export interface GracePolicy {
  library: string;
  expiresAtBlock: string;
  scope: string;
  config?: UlnConfig | null;
}
export interface BridgePath {
  sourceEid: number;
  source: string;
  peer: string;
  peerAddress?: string | null;
  receiveLibrary?: string;
  usesDefault?: boolean;
  config: UlnConfig | null;
  grace: GracePolicy[];
}
export interface Peer extends Endpoint {
  peer: string;
  peerAddress: string | null;
}
export interface SourceMetadata {
  verified: boolean;
  codeHash: Hex;
  reason?: string;
  name?: string;
  abi?: Abi;
  url?: string;
  address?: string;
}
export interface DiscoveryNode {
  id: string;
  chainId?: number;
  address?: string;
  name: string;
  symbol: string;
  type: string;
  observations: string[];
  unknowns: string[];
  codeHash?: Hex;
  source?: SourceMetadata;
  decimals?: number;
  totalSupply?: string;
  implementation?: string;
  beacon?: string;
  owners?: string[];
  threshold?: string;
  inspected?: boolean;
  adapter?: string;
  totalAssets?: string;
  strategyQueue?: string[];
  factory?: string;
  pool?: string;
  config?: string;
  depositPool?: string;
  endpoint?: string;
  unresolved?: number;
  peers?: Peer[];
  failedPeerReads?: number;
  paths?: BridgePath[];
  provenance?: "curated";
  risks?: string[][];
  riskReferences?: Record<string, string>;
  chartGroup?: string;
  chartLabel?: string;
}
export interface DiscoveryEdge {
  from: string;
  to: string;
  kind: string;
  label?: string;
  amount?: string;
  basis?: string;
}
export interface ExposureGraph {
  root: string;
  nodes: DiscoveryNode[];
  edges: DiscoveryEdge[];
  mode?: string;
}
export interface ReadEvidence {
  chainId: number;
  blockNumber: number;
  address: string;
  method: string;
  args: unknown[];
  ok: boolean;
  raw?: Hex;
  error?: string | number;
}
export interface DiscoveryResult extends ExposureGraph {
  schemaVersion: number;
  generatedAt: string;
  input: TokenInput;
  snapshots: Snapshot[];
  reads: ReadEvidence[];
  warnings: string[];
  coverage: { interrupted: boolean; rpcReads: number; [key: string]: unknown };
  catalog: { endpointCount: number; asOf: string; source: string };
}
export interface CacheInfo {
  status: "hit" | "partial" | "fresh" | "stale";
  savedAt: number | null;
  expiresAt?: number;
  error?: string;
}
export type CachedResult = DiscoveryResult & { cache: CacheInfo };
export interface CacheEntry<T> {
  value: T;
  savedAt: number;
  expiresAt: number;
  stale: boolean;
}
export interface CacheStore {
  get<T>(
    key: string,
    options?: { allowExpired?: boolean; now?: number },
  ): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
}
export type ReadResult<T = unknown> =
  | { ok: true; value: T; raw?: Hex }
  | { ok: false; error: { code: string | number; message: string } };
export interface ContractCall {
  address: string;
  signature: string;
  args?: readonly unknown[];
}
export interface ReadClient {
  signal?: AbortSignal;
  calls: number;
  reads: ReadEvidence[];
  fetcher: typeof fetch;
  snapshot(chainId: number): Promise<Snapshot>;
  batch<T = unknown>(
    chainId: number,
    calls: ContractCall[],
  ): Promise<ReadResult<T>[]>;
  read<T = unknown>(
    chainId: number,
    address: string,
    signature: string,
    args?: readonly unknown[],
  ): Promise<ReadResult<T>>;
  code(chainId: number, address: string): Promise<Hex>;
  storage(chainId: number, address: string, slot: Hex): Promise<Hex | null>;
  states(): Promise<Snapshot[]>;
}
export type CategoryId =
  "network" | "code" | "control" | "bridge" | "staking" | "market" | "issuer";
export type CategoryTotals = Record<CategoryId, number>;
export interface ExposureFact {
  key: string;
  nodeId: string;
  category: CategoryId;
  dimension: string;
  label: string;
  units: 1;
}
export interface EvidenceCheck {
  label: string;
  passed: boolean;
}
export interface NodeExposure {
  units: number;
  dimensions: ExposureFact[];
  checks: EvidenceCheck[];
  unresolved: boolean;
  gaps: string[];
  stage: number;
  severity: "not-assessed";
  inheritedDimensions: { dimension: string; from: string; name: string }[];
}
export interface ExposureLayer {
  index: number;
  stage: number;
  label: string;
  nodes: string[];
  added: CategoryTotals;
  totals: CategoryTotals;
  addedUnits: number;
  totalUnits: number;
  unresolved: number;
  cumulativeUnknown: number;
}
export interface ExposureAssessment {
  version: string;
  unit: "EU";
  formula: string;
  total: number;
  categoryTotals: CategoryTotals;
  perNode: Record<string, NodeExposure>;
  layers: ExposureLayer[];
  cycles: string[][];
  checks: { passed: number; total: number };
  unresolvedNodes: number;
  limitations: string[];
}
