import type {
  DiscoveryResult,
  ExposureAssessment,
} from "../../discovery/types.ts";
import { CHAINS } from "../../discovery/chains.ts";
import { short } from "./Inspector.tsx";
export function Evidence({
  result,
  assessment,
}: {
  result: DiscoveryResult;
  assessment: ExposureAssessment;
}) {
  const controls = result.nodes.filter(
    (n) => n.type === "Bridge authorization",
  );
  return (
    <section className="panel live-evidence">
      <div className="panel-header">
        <div>
          <div className="panel-title">Evidence &amp; coverage</div>
          <div className="panel-desc">
            Block-pinned reads, with no server or wallet connection.
          </div>
        </div>
      </div>
      <div className="live-evidence-body">
        <dl className="live-scan-summary">
          <div>
            <dt>Evidence checks answered</dt>
            <dd>
              {assessment.checks.passed}
              <small>/ {assessment.checks.total}</small>
            </dd>
          </div>
          <div>
            <dt>Pinned networks</dt>
            <dd>{result.snapshots.length}</dd>
          </div>
          <div>
            <dt>RPC reads</dt>
            <dd>{result.coverage.rpcReads}</dd>
          </div>
          {controls.length > 0 && (
            <div>
              <dt>Observed bridge peers</dt>
              <dd>
                {controls.reduce((sum, n) => sum + (n.paths?.length || 0), 0)}{" "}
                <small>across {controls.length} receiving contracts</small>
              </dd>
            </div>
          )}
        </dl>
        <div className="live-blocks">
          {result.snapshots.map((s) => (
            <a
              key={s.chainId}
              href={`${CHAINS[s.chainId].explorer}/block/${s.number}`}
              target="_blank"
              rel="noopener"
            >
              <span>{s.chain}</span>
              <b>#{s.number.toLocaleString()} ↗</b>
              <small>
                {new Date(s.timestamp * 1000).toLocaleString()} · {s.finality}
              </small>
            </a>
          ))}
        </div>
        <details>
          <summary>Supported adapters &amp; boundaries</summary>
          <p>
            ERC-4626 vaults, V2-style LPs, concentrated-liquidity pools,
            Aave-style deposit tokens, Compound-style lending tokens, Balancer
            V2-style pools, Lido wrappers, Kelp rsETH, and LayerZero V2
            peers/configurations.
          </p>
          <p>
            Interface cross-checks do not authenticate a protocol deployment.
            Source matches are checked against pinned runtime bytecode when
            available. Curve, NFT positions, detailed Morpho/Yearn allocations,
            synthetic collateral, issuer reserves, complete role histories and
            general canonical bridges need additional adapters. Unmatched
            contracts remain unclassified.
          </p>
          <p>
            Two-minute result cache; verified metadata cached for 24 hours by
            runtime code hash. Up to 80 entries, four-megabyte entry limit, four
            recursive edges and 32 inspected contracts. Refresh bypasses result
            caching; stale fallback is clearly labeled.
          </p>
        </details>
        <details>
          <summary>Discovery limitations</summary>
          <ul>
            {result.warnings.map((w, i) => (
              <li key={i}>
                {w.startsWith("No numerical risk score")
                  ? "Exposure units count known system/risk dimensions. Severity and loss probability remain unassessed."
                  : w}
              </li>
            ))}
            <li>Incident history is not fetched live.</li>
            <li>
              All decoded observations are claims made by the inspected
              contracts. Exposure units count known dimensions using equal
              weights; severity, loss probability and security certification are
              not inferred.
            </li>
            <li>
              Bridge peer catalog: {result.catalog.endpointCount} known V2
              mainnet IDs, dated {result.catalog.asOf}. Custom IDs and other
              bridge families may be missed.
            </li>
          </ul>
        </details>
        <details>
          <summary>Read log · {result.reads.length} contract calls</summary>
          <div className="live-read-log">
            {result.reads.map((r, i) => (
              <div key={i}>
                <span className={r.ok ? "ok" : "miss"}>
                  {r.ok ? "READ" : "UNAVAILABLE"}
                </span>{" "}
                {CHAINS[r.chainId].name} #{r.blockNumber} · {short(r.address)}
                <code>{r.method.replace("function ", "")}</code>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
