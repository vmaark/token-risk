import { useEffect, useMemo, useRef, useState } from "react";
import type { CachedResult, TokenInput } from "../../discovery/types.ts";
import { CHAINS } from "../../discovery/chains.ts";
import { assessExposure } from "../exposure.ts";
import { ExposurePanel } from "./ExposurePanel.tsx";
import { DependencyGraph } from "./DependencyGraph.tsx";
import { Inspector, ExplorerLink } from "./Inspector.tsx";
import { Evidence } from "./Evidence.tsx";
function CacheBar({
  result,
  onClear,
}: {
  result: CachedResult;
  onClear: () => Promise<boolean>;
}) {
  const [now, setNow] = useState(Date.now),
    [cleared, setCleared] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const age = Math.max(
    0,
    Math.floor(
      (now - (result.cache.savedAt || Date.parse(result.generatedAt))) / 1000,
    ),
  );
  const expired = !!result.cache.expiresAt && now >= result.cache.expiresAt,
    stale = result.cache.status === "stale";
  const status = stale
    ? "Saved snapshot · refresh failed"
    : result.cache.status === "hit"
      ? "Loaded from this device"
      : "Read directly from chain";
  return (
    <div className={`live-cache-bar ${stale || expired ? "stale" : ""}`}>
      <span>
        <i className="live-dot" />
        {status} · {age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`} ago
        {expired ? " · expired, refresh recommended" : ""}
        {result.coverage.interrupted ? " · INCOMPLETE LOOKUP" : ""}
      </span>
      <button
        onClick={async () =>
          setCleared(
            (await onClear()) ? "Local cache cleared" : "Storage unavailable",
          )
        }
      >
        {cleared || "Clear local cache"}
      </button>
    </div>
  );
}
export function DiscoveryResultView({
  result,
  input,
  saved,
  error,
  storageAvailable,
  onSave,
  onRefresh,
  onClear,
}: {
  result: CachedResult;
  input: TokenInput;
  saved: boolean;
  error: string | null;
  storageAvailable: boolean;
  onSave: () => void;
  onRefresh: () => void;
  onClear: () => Promise<boolean>;
}) {
  const assessment = useMemo(() => assessExposure(result), [result]);
  const [selected, setSelected] = useState(result.root),
    inspector = useRef<HTMLElement>(null);
  const root = result.nodes.find((n) => n.id === result.root)!,
    node = result.nodes.find((n) => n.id === selected) || root;
  const select = (id: string, scroll = false) => {
    setSelected(id);
    if (scroll)
      inspector.current?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
  };
  const exportEvidence = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { ...result, exposureAssessment: assessment },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `token-risk-${input.chainId}-${input.address}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="live-result" aria-label="Live discovery result">
      <section className="asset-row">
        <div className="asset-heading">
          <span className="live-token">{root.symbol.slice(0, 2)}</span>
          <div>
            <h2>
              {root.symbol}
              <span className="pill">LIVE DISCOVERY</span>
            </h2>
            <div className="asset-sub">
              {CHAINS[input.chainId].name} · {root.type} ·{" "}
              <ExplorerLink chainId={input.chainId} address={input.address} />
            </div>
          </div>
        </div>
        <div className="asset-actions">
          <button className="outline-btn" onClick={onSave}>
            {saved ? "Remove from watchlist" : "Save address"}
          </button>
          <button className="outline-btn" onClick={exportEvidence}>
            ↓ Export evidence
          </button>
          <button className="solid-btn" onClick={onRefresh}>
            ↻ Refresh
          </button>
        </div>
      </section>
      <CacheBar result={result} onClear={onClear} />
      {error && (
        <div className="live-warning" role="alert">
          {error} Displaying the prior snapshot.
        </div>
      )}
      {result.cache.status === "stale" && (
        <div className="live-warning" role="alert">
          Live reads failed: {result.cache.error}. This cached snapshot has
          expired and may no longer reflect current controls.
        </div>
      )}
      {!storageAvailable && (
        <div className="live-warning">
          Browser storage is unavailable. Discovery works, but results will not
          persist.
        </div>
      )}
      <ExposurePanel
        graph={result}
        assessment={assessment}
        onSelectNode={(id) => select(id, true)}
      />
      <div className="live-workbench">
        <DependencyGraph
          result={result}
          assessment={assessment}
          selected={node.id}
          onSelect={(id) => select(id)}
        />
        <aside
          className="panel live-inspector"
          id="live-inspector"
          ref={inspector}
        >
          <Inspector
            node={node}
            result={result}
            assessment={assessment}
            onSelect={(id) => select(id)}
          />
        </aside>
      </div>
      <Evidence result={result} assessment={assessment} />
    </div>
  );
}
