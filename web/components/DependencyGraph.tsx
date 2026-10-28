import type {
  DiscoveryNode,
  DiscoveryResult,
  ExposureAssessment,
} from "../../discovery/types.ts";
import { CHAINS } from "../../discovery/chains.ts";
import { ExposureBadge } from "./ExposurePanel.tsx";
export function layoutGraph(current: DiscoveryResult) {
  const pos = new Map<string, [number, number]>(),
    levels = new Map<string, number>([[current.root, 0]]);
  for (let pass = 0; pass < 5; pass++)
    for (const e of current.edges)
      if (e.kind === "backing" && levels.has(e.from) && !levels.has(e.to))
        levels.set(e.to, levels.get(e.from)! + 1);
  const groups: DiscoveryNode[][] = [];
  for (const n of current.nodes.filter((n) => levels.has(n.id)))
    (groups[levels.get(n.id)!] ??= []).push(n);
  const occupied = new Set<string>();
  let nextRow = 0;
  const place = (n: DiscoveryNode, row: number, col: number) => {
    pos.set(n.id, [col * 210 + 12, row * 150 + 28]);
    occupied.add(`${row}:${col}`);
  };
  for (const group of groups.filter(Boolean)) {
    const start = nextRow;
    group.forEach((n, i) => {
      const row = start + Math.floor(i / 3),
        col = group.length === 1 ? 1 : group.length === 2 ? i * 2 : i % 3;
      place(n, row, col);
    });
    nextRow += Math.ceil(group.length / 3);
  }
  const priority = [
    "Bridge authorization",
    "Governance / privileged control",
    "Network security",
  ];
  const extras = current.nodes
    .filter((n) => !pos.has(n.id))
    .sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type));
  for (const n of extras) {
    const parent = current.edges.find((e) => e.to === n.id && pos.has(e.from));
    let row =
      n.type === "Network security"
        ? nextRow
        : parent
          ? Math.round((pos.get(parent.from)![1] - 28) / 150)
          : nextRow;
    let found = false;
    while (!found) {
      for (const col of n.type === "Bridge authorization"
        ? [2, 0, 1]
        : [0, 2, 1])
        if (!occupied.has(`${row}:${col}`)) {
          place(n, row, col);
          found = true;
          break;
        }
      if (!found) row++;
    }
    nextRow = Math.max(nextRow, row + 1);
  }
  return { pos, width: 645, height: Math.max(340, nextRow * 150 + 45) };
}
const tone = (n: DiscoveryNode) =>
  n.type === "Bridge authorization"
    ? "authority"
    : n.type === "Governance / privileged control"
      ? "governance"
      : n.type === "Network security"
        ? "network"
        : "backing";
export function DependencyGraph({
  result,
  assessment,
  selected,
  onSelect,
}: {
  result: DiscoveryResult;
  assessment: ExposureAssessment;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { pos, width, height } = layoutGraph(result);
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Dependency graph</div>
          <div className="panel-desc">
            Select a node to inspect its evidence and remaining unknowns.
          </div>
        </div>
        <span className="badge unknown">{result.nodes.length} nodes</span>
      </div>
      <div className="live-map-scroll">
        <div
          className="live-map"
          style={{ width: "100%", minWidth: 550, height }}
        >
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {result.edges.map((e) => {
              const a = pos.get(e.from),
                b = pos.get(e.to);
              if (!a || !b) return null;
              const vertical = a[1] !== b[1],
                ax = vertical ? a[0] + 97.5 : a[0] + (a[0] < b[0] ? 195 : 0),
                ay = vertical ? a[1] + 112 : a[1] + 56,
                bx = vertical ? b[0] + 97.5 : b[0] + (a[0] < b[0] ? 0 : 195),
                by = vertical ? b[1] : b[1] + 56;
              return (
                <path
                  key={`${e.from}:${e.to}:${e.kind}`}
                  className={`live-link ${e.kind}`}
                  d={`M${ax},${ay} C${vertical ? ax : (ax + bx) / 2},${vertical ? (ay + by) / 2 : ay} ${vertical ? bx : (ax + bx) / 2},${vertical ? (ay + by) / 2 : by} ${bx},${by}`}
                />
              );
            })}
          </svg>
          {result.nodes.map((n) => {
            const p = pos.get(n.id);
            if (!p) return null;
            return (
              <button
                key={n.id}
                className={`live-map-node ${tone(n)} ${selected === n.id ? "selected" : ""}`}
                style={{
                  left: `${(p[0] / width) * 100}%`,
                  top: p[1],
                  width: `${(195 / width) * 100}%`,
                }}
                onClick={() => onSelect(n.id)}
                aria-pressed={selected === n.id}
              >
                <span className="live-node-kicker">
                  {n.id === result.root
                    ? "YOUR TOKEN"
                    : CHAINS[n.chainId ?? 0]?.name || "Dependency"}
                </span>
                <b>{n.symbol}</b>
                <small>{n.type}</small>
                <ExposureBadge assessment={assessment} id={n.id} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="live-legend">
        {[
          ["backing", "Backing"],
          ["authority", "Bridge authority"],
          ["governance", "Privileged control"],
          ["network", "Network"],
        ].map(([kind, label]) => (
          <span key={kind}>
            <i className={kind} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
