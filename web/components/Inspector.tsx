import { formatUnits } from "viem";
import type {
  DiscoveryNode,
  DiscoveryResult,
  ExposureAssessment,
  BridgePath,
  UlnConfig,
} from "../../discovery/types.ts";
import { CHAINS } from "../../discovery/chains.ts";
import { NodeExposure } from "./ExposurePanel.tsx";
export const short = (s?: string) =>
  s ? `${s.slice(0, 6)}…${s.slice(-4)}` : "Unknown";
export function ExplorerLink({
  chainId,
  address,
}: {
  chainId: number;
  address: string;
}) {
  return (
    <a
      className="live-address"
      href={`${CHAINS[chainId].explorer}/address/${address}`}
      target="_blank"
      rel="noopener"
    >
      {short(address)} ↗
    </a>
  );
}
export function amount(value: string, decimals?: number) {
  try {
    if (decimals === undefined) return `${value} raw units`;
    const [whole, part] = formatUnits(BigInt(value), decimals).split(".");
    return `${Number(whole).toLocaleString()}${part ? "." + part.slice(0, 5) : ""}`;
  } catch {
    return value;
  }
}
const quorum = (c: UlnConfig) =>
  `${c.requiredDVNs.length} required${c.optionalDVNThreshold ? ` + ${c.optionalDVNThreshold}/${c.optionalDVNs.length} optional` : ""} DVNs`;
function Config({ config: c }: { config?: UlnConfig | null }) {
  return c ? (
    <>
      <p>
        {c.confirmations} source confirmations · {quorum(c)}
      </p>
      <p>Required DVNs</p>
      {c.requiredDVNs.length ? (
        c.requiredDVNs.map((a) => <code key={a}>{a}</code>)
      ) : (
        <p>None decoded</p>
      )}
      {c.optionalDVNs.length > 0 && (
        <>
          <p>Optional DVNs</p>
          {c.optionalDVNs.map((a) => (
            <code key={a}>{a}</code>
          ))}
        </>
      )}
    </>
  ) : (
    <p className="live-unknown">
      Configuration unavailable or incompatible. No quorum inferred.
    </p>
  );
}
function BridgePaths({ paths }: { paths: BridgePath[] }) {
  return (
    <>
      <div className="small-label" style={{ marginTop: 22 }}>
        INCOMING PATHS · {paths.length}
      </div>
      {paths.map((p) => (
        <details className="live-route" key={p.sourceEid}>
          <summary>
            {p.source} <span>{p.config ? quorum(p.config) : "Unresolved"}</span>
          </summary>
          <p>
            EID {p.sourceEid} · peer <code>{p.peer}</code>
          </p>
          <p>
            Receive library {short(p.receiveLibrary)}
            {p.usesDefault ? " · endpoint default" : ""}
          </p>
          <Config config={p.config} />
          {p.grace.map((g) => (
            <div className="live-warning" key={g.library}>
              Grace library {short(g.library)} accepted until block #
              {g.expiresAtBlock} ({g.scope}).
              <Config config={g.config} />
            </div>
          ))}
        </details>
      ))}
    </>
  );
}
export function Inspector({
  node: n,
  result,
  assessment,
  onSelect,
}: {
  node: DiscoveryNode;
  result: DiscoveryResult;
  assessment: ExposureAssessment;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className="detail-header">
        <div className="detail-kicker">LIVE DEPENDENCY INSPECTOR</div>
        <h3>{n.name}</h3>
        <p className="live-muted">
          {n.type} · {CHAINS[n.chainId ?? 0]?.name}
        </p>
        {n.address && n.chainId !== undefined && (
          <ExplorerLink chainId={n.chainId} address={n.address} />
        )}
      </div>
      <div className="detail-body">
        <NodeExposure assessment={assessment} id={n.id} />
        {n.source && (
          <div className={`live-source ${n.source.verified ? "verified" : ""}`}>
            <b>
              {n.source.verified
                ? "Runtime source matched"
                : "Source not established"}
            </b>
            <p>
              {n.source.verified
                ? `${n.source.name} · code hash checked at pinned block`
                : n.source.reason}
            </p>
          </div>
        )}
        {n.implementation && n.chainId !== undefined && (
          <p className="live-muted">
            Proxy implementation{" "}
            <ExplorerLink chainId={n.chainId} address={n.implementation} />
          </p>
        )}
        {n.totalSupply !== undefined && (
          <div className="live-fact">
            <span>Total supply</span>
            <b>{amount(n.totalSupply, n.decimals)}</b>
          </div>
        )}
        {n.observations.map((o, i) => (
          <div className="live-observation" key={i}>
            {o}
          </div>
        ))}
        {n.paths && <BridgePaths paths={n.paths} />}{" "}
        {result.edges
          .filter((e) => e.from === n.id && e.kind === "backing")
          .map((e) => {
            const child = result.nodes.find((c) => c.id === e.to);
            return (
              <div className="live-fact" key={e.to}>
                <span>{e.label}</span>
                <button onClick={() => onSelect(e.to)}>
                  {child?.symbol || "Dependency"} ↗
                </button>
                {e.amount !== undefined && (
                  <>
                    <b>{amount(e.amount, child?.decimals)}</b>
                    <small>{e.basis || "Raw protocol-reported amount"}</small>
                  </>
                )}
              </div>
            );
          })}
        <div className="small-label" style={{ marginTop: 24 }}>
          UNRESOLVED AT THIS LAYER
        </div>
        {n.unknowns.map((u, i) => (
          <p className="live-unknown" key={i}>
            <span>?</span>
            {u}
          </p>
        ))}
      </div>
    </>
  );
}
