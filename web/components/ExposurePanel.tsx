import { useState, type CSSProperties } from "react";
import type {
  ExposureAssessment,
  ExposureGraph,
  ExposureLayer,
} from "../../discovery/types.ts";
import { CATEGORIES } from "../exposure.ts";
export function ExposureBadge({
  assessment,
  id,
}: {
  assessment: ExposureAssessment;
  id: string;
}) {
  const node = assessment.perNode[id];
  return node ? (
    <span
      className="eu-node-badge"
      title="Known dimensions introduced here; severity unassessed"
    >
      +{node.units} EU{node.unresolved && <i>?</i>}
    </span>
  ) : null;
}
export function NodeExposure({
  assessment,
  id,
}: {
  assessment: ExposureAssessment;
  id: string;
}) {
  const n = assessment.perNode[id];
  if (!n) return null;
  return (
    <section className="eu-node-assessment">
      <div className="small-label">EXPOSURE UNITS · V1.1</div>
      <div className="eu-node-number">
        +{n.units}
        <span>EU introduced here</span>
      </div>
      <p>
        Severity unassessed. Shared system dimensions are assigned once at the
        earliest layer.
      </p>
      {n.dimensions.length ? (
        <ul>
          {n.dimensions.map((f) => (
            <li key={f.key}>
              <i
                style={{
                  background: CATEGORIES.find((c) => c.id === f.category)
                    ?.color,
                }}
              />
              {f.label}
              <b>+1</b>
            </li>
          ))}
        </ul>
      ) : n.inheritedDimensions.length ? (
        <p>
          {n.inheritedDimensions
            .map(
              (r) =>
                `${r.dimension} exposure is inherited through ${r.name} and counted there.`,
            )
            .join(" ")}{" "}
          This model has not separately assessed the representation contract’s
          code or local controls; those remain unknown.
        </p>
      ) : (
        <p>
          No additional dimension established. This is not evidence of safety.
        </p>
      )}
      <details>
        <summary>
          Evidence checks · {n.checks.filter((c) => c.passed).length}/
          {n.checks.length}
        </summary>
        {n.checks.map((c, i) => (
          <div className="eu-check" key={i}>
            <span>{c.passed ? "✓" : "?"}</span>
            {c.label}
          </div>
        ))}
      </details>
    </section>
  );
}
interface Props {
  graph: ExposureGraph;
  assessment: ExposureAssessment;
  onSelectNode: (id: string) => void;
}
export function ExposurePanel({ graph, assessment: a, onSelectNode }: Props) {
  const [expanded, setExpanded] = useState(false),
    [mode, setMode] = useState<"cumulative" | "added">("cumulative"),
    [selectedStage, setStage] = useState<number | null>(null);
  const stage = Math.min(
      selectedStage ?? a.layers.length - 1,
      a.layers.length - 1,
    ),
    cumulative = !expanded || mode === "cumulative";
  const layer = a.layers[expanded ? stage : a.layers.length - 1];
  if (!layer) return null;
  const layers = expanded ? a.layers : [a.layers.at(-1)!];
  const ceiling =
    Math.ceil(
      Math.max(
        4,
        ...layers.map((l) => (cumulative ? l.totalUnits : l.addedUnits)),
      ) / 4,
    ) * 4;
  const categories = CATEGORIES.filter((c) => a.categoryTotals[c.id]),
    nodeIds = expanded ? layer.nodes : a.layers.flatMap((l) => l.nodes);
  const root = graph.nodes.find((n) => n.id === graph.root),
    tokenLabel = root?.name || root?.symbol || layer.label;
  const backingCount = graph.edges.filter(
    (e) => e.kind === "backing" && a.perNode[e.from] && a.perNode[e.to],
  ).length;
  const column = (l: ExposureLayer) => {
    const i = a.layers.indexOf(l),
      counts = cumulative ? l.totals : l.added,
      value = cumulative ? l.totalUnits : l.addedUnits;
    const label = `${expanded ? `Layer ${i + 1}: ${l.label}` : `Full exposure for ${tokenLabel}`}, ${value} ${cumulative ? "cumulative" : "added"} exposure units`;
    const contents = (
      <>
        <div className="eu-stack-space">
          <div
            className="eu-stack"
            style={{ height: `${(value / ceiling) * 100}%` }}
          >
            <strong>{value}</strong>
            {CATEGORIES.filter((c) => counts[c.id])
              .map((c) => (
                <span
                  key={c.id}
                  className="eu-segment"
                  style={{
                    height: `${(counts[c.id] / Math.max(value, 1)) * 100}%`,
                    background: c.color,
                  }}
                  title={`${c.name}: ${counts[c.id]} EU`}
                >
                  {counts[c.id] >= 2 ? counts[c.id] : ""}
                </span>
              ))
              .reverse()}
          </div>
        </div>
        <div className="eu-column-label">
          <small>
            {expanded
              ? i === a.layers.length - 1
                ? "YOUR TOKEN"
                : `LAYER ${i + 1}`
              : "ALL LAYERS COMBINED"}
          </small>
          <b>{expanded ? l.label || "Base systems" : tokenLabel}</b>
          <span>
            {expanded ? `+${l.addedUnits} EU this layer` : `${value} EU total`}
          </span>
        </div>
      </>
    );
    return expanded ? (
      <button
        key={i}
        className={`eu-column ${stage === i ? "selected" : ""}`}
        aria-label={label}
        aria-pressed={stage === i}
        onClick={() => setStage(i)}
      >
        {contents}
      </button>
    ) : (
      <div key={i} className="eu-column" aria-label={label}>
        {contents}
      </div>
    );
  };
  return (
    <section
      className={`panel exposure-panel ${expanded ? "eu-expanded" : "eu-collapsed"}`}
      aria-label="Exposure by layer chart"
    >
      <div className="panel-header">
        <div>
          <div className="panel-title">
            Exposure by layer{" "}
            <span className="pill">EXPOSURE UNITS · V1.1</span>
          </div>
          <div className="panel-desc">
            {expanded
              ? "Exposure introduced at each dependency layer, from base assets to the selected token."
              : "Full known exposure for the selected token, including its underlying systems."}
          </div>
        </div>
        <button
          className="solid-btn eu-breakdown-toggle"
          aria-expanded={expanded}
          aria-controls="exposure-chart"
          onClick={() => setExpanded(!expanded)}
        >
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          {expanded ? "Show full exposure" : "Show layer breakdown"}
        </button>
      </div>
      <div className="eu-summary" aria-label="Exposure summary">
        <div>
          <b>
            {a.total}
            <small>EU</small>
          </b>
          <span>Known exposure units</span>
        </div>
        <div>
          <b>{a.layers.length}</b>
          <span>Structural layers</span>
        </div>
        <div>
          <b>{backingCount}</b>
          <span>Backing relationships</span>
        </div>
      </div>
      {expanded && (
        <div className="eu-chart-controls">
          <span>View exposure by layer</span>
          <div className="switcher" aria-label="Chart aggregation">
            {(["cumulative", "added"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={mode === value}
                className={mode === value ? "active" : ""}
                onClick={() => setMode(value)}
              >
                {value === "cumulative" ? "Cumulative" : "Added per layer"}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="eu-chart-layout" id="exposure-chart">
        <div className="eu-chart-scroll">
          <div
            className="eu-chart"
            style={
              {
                "--eu-columns": layers.length,
                minWidth: expanded
                  ? Math.max(520, layers.length * 125)
                  : undefined,
              } as CSSProperties
            }
          >
            <div className="eu-axis-label">
              {expanded ? (cumulative ? "Cumulative" : "Added") : "Full"}{" "}
              exposure units
            </div>
            <div className="eu-grid" aria-hidden="true">
              {[4, 3, 2, 1, 0].map((i) => (
                <div key={i} style={{ top: `${(4 - i) * 25}%` }}>
                  <span>{(i * ceiling) / 4}</span>
                </div>
              ))}
            </div>
            <div className="eu-columns">{layers.map(column)}</div>
          </div>
        </div>
        {!expanded && (
          <div className="eu-total-categories">
            <h3>Exposure by category</h3>
            <p>
              Each category includes the distinct systems across all{" "}
              {a.layers.length} {a.layers.length === 1 ? "layer" : "layers"}.
            </p>
            <dl>
              {categories.map((c) => (
                <div key={c.id}>
                  <dt>
                    <i style={{ background: c.color }} />
                    {c.name}
                  </dt>
                  <dd>
                    {a.categoryTotals[c.id]} <span>EU</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      {expanded && (
        <div className="eu-legend">
          {categories.map((c) => (
            <span key={c.id}>
              <i style={{ background: c.color }} />
              {c.name} <b>{a.categoryTotals[c.id]}</b>
            </span>
          ))}
        </div>
      )}
      <div className="eu-layer-detail" aria-live="polite">
        <div className="eu-layer-intro">
          <span className="eyebrow">
            {expanded
              ? `LAYER ${stage + 1} · ${layer.label}`
              : "ALL CONTRIBUTING SYSTEMS"}
          </span>
          <h3>
            {expanded ? (
              <>
                +{layer.addedUnits} EU added{" "}
                <span>→ {layer.totalUnits} EU cumulative</span>
              </>
            ) : (
              `${a.total} EU across ${nodeIds.length} systems`
            )}
          </h3>
          <p>
            {expanded
              ? `${layer.unresolved} newly introduced nodes have unresolved questions.`
              : `${a.unresolvedNodes} nodes across the full dependency graph have unresolved questions.`}{" "}
            Select a system to inspect its contribution.
          </p>
        </div>
        <div className="eu-layer-nodes">
          {nodeIds.map((id) => {
            const n = graph.nodes.find((n) => n.id === id)!;
            return (
              <button key={id} onClick={() => onSelectNode(id)}>
                <span>
                  {n.symbol || n.name}
                  <small>{n.type}</small>
                </span>
                <ExposureBadge assessment={a} id={id} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="eu-footnote">
        <b>1 EU = one distinct system × risk dimension.</b> Shared dimensions
        count once. Equal weights measure discovered exposure breadth, not loss
        probability or severity. Partial coverage can undercount exposure;
        comparisons require matching scope.
      </div>
      <details className="eu-method">
        <summary>Metric rules, limitations &amp; full data table</summary>
        <p>
          {a.formula}. No 0–100 normalization, economic-value weights or
          automatic “safe” labels are applied. Verifier/signer quorums remain
          visible evidence and do not create automatic score discounts.
        </p>
        <p>
          Chart stages follow backing relationships, with shared controls at the
          earliest dependent layer; they are not transaction history. Cyclic
          backing components share one stage. Related bridge and representation
          nodes may share a chart step; shared dimensions count once.
        </p>
        <p>
          Evidence checks count only the displayed checklist items; this is not
          percentage coverage of all risks. Missing sources, incomplete
          authority discovery and unassessed incidents can matter beyond these
          counts.
        </p>
        <table>
          <caption>
            {cumulative
              ? "Cumulative exposure by stage"
              : "Exposure introduced at each stage"}{" "}
            · EU
          </caption>
          <thead>
            <tr>
              <th>Layer</th>
              {CATEGORIES.map((c) => (
                <th key={c.id}>{c.name}</th>
              ))}
              <th>Total</th>
              <th>Added</th>
              <th>Unresolved nodes</th>
            </tr>
          </thead>
          <tbody>
            {a.layers.map((l) => (
              <tr key={l.index}>
                <th>{l.label}</th>
                {CATEGORIES.map((c) => (
                  <td key={c.id}>{(cumulative ? l.totals : l.added)[c.id]}</td>
                ))}
                <td>{cumulative ? l.totalUnits : l.addedUnits}</td>
                <td>{l.addedUnits}</td>
                <td>{cumulative ? l.cumulativeUnknown : l.unresolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
