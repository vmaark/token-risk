import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CHAIN_LIST, CHAINS, CHAIN_SELECTION } from "../discovery/chains.ts";
import { LIVE_EXAMPLES } from "../discovery/engine.ts";
import { BrowserCache } from "../discovery/cache.ts";
import { isAddress } from "../discovery/rpc.ts";
import type { TokenInput } from "../discovery/types.ts";
import { DiscoveryController } from "./discovery-state.ts";
import { initialInput, tokenUrl } from "./url-state.ts";
import { Icon } from "./components/Icon.tsx";
import { DiscoveryResultView } from "./components/DiscoveryResult.tsx";
import { Methodology } from "./components/Methodology.tsx";
import { short } from "./components/Inspector.tsx";

type Page = "explorer" | "watchlist" | "methodology";
const savedKey = "token-risk-address-watchlist";
const sameInput = (a: TokenInput, b: TokenInput) =>
  a.chainId === b.chainId &&
  a.address.toLowerCase() === b.address.toLowerCase();
function isInput(value: unknown): value is TokenInput {
  return (
    !!value &&
    typeof value === "object" &&
    "chainId" in value &&
    typeof value.chainId === "number" &&
    !!CHAINS[value.chainId] &&
    "address" in value &&
    isAddress(value.address)
  );
}
function savedAddresses(): TokenInput[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(savedKey) || "[]");
    return Array.isArray(value) ? value.filter(isInput) : [];
  } catch {
    return [];
  }
}
function Intro({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="intro-row">
      <div>
        <div className="eyebrow">
          <Icon name="eye" /> TOKEN ANALYSIS
        </div>
        <h1>{title}</h1>
        <p className="intro-text">{children}</p>
      </div>
      {action}
    </div>
  );
}
function Footer() {
  return (
    <footer className="page-footer">
      <div className="powered">
        References{" "}
        <a href="https://l2beat.com" target="_blank" rel="noopener">
          L2BEAT ↗
        </a>
        <a
          href="https://defillama.com/chains/evm"
          target="_blank"
          rel="noopener"
        >
          DefiLlama ↗
        </a>
      </div>
      <span>On-chain discovery · cached on this device</span>
    </footer>
  );
}
function SourcesDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      id="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div id="modal-content">
        <div className="modal-header">
          <h2>Data sources</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="method-page">
          <p>
            Token results are calculated from public RPC reads. Runtime source
            matching uses{" "}
            <a href="https://sourcify.dev" target="_blank" rel="noopener">
              Sourcify ↗
            </a>
            . Observed bridge configurations come from contracts, with peer IDs
            from{" "}
            <a
              href="https://metadata.layerzero-api.com/v1/metadata"
              target="_blank"
              rel="noopener"
            >
              LayerZero metadata ↗
            </a>
            .
          </p>
          <p>
            The network selection uses{" "}
            <a href={CHAIN_SELECTION.source} target="_blank" rel="noopener">
              DefiLlama chain TVL ↗
            </a>
            , reviewed {CHAIN_SELECTION.asOf}.{" "}
            <a href="https://l2beat.com" target="_blank" rel="noopener">
              L2BEAT ↗
            </a>{" "}
            is a reference for further network research; its ratings are not
            imported into the exposure metric.
          </p>
          <p>
            Inspect Evidence &amp; coverage in a result for its block numbers,
            evidence checks, read log and discovery limits.
          </p>
        </div>
      </div>
    </dialog>
  );
}
export function App() {
  const [initial] = useState(() => initialInput(location.href));
  const [page, setPage] = useState<Page>("explorer"),
    [chainId, setChainId] = useState(initial?.chainId || 1),
    [address, setAddress] = useState(initial?.address || "");
  const [saved, setSaved] = useState(savedAddresses),
    [sources, setSources] = useState(false),
    [menu, setMenu] = useState(false),
    [formError, setFormError] = useState(""),
    [toast, setToast] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const cache = useMemo(() => new BrowserCache(), []),
    controller = useMemo(() => new DiscoveryController(cache), [cache]);
  const lookup = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  useEffect(() => {
    if (initial) {
      history.replaceState(null, "", tokenUrl(location.href, initial));
      void controller.lookup(initial);
    }
    return () => controller.dispose();
  }, [controller, initial]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "SELECT", "TEXTAREA"].includes(
          document.activeElement?.tagName || "",
        ) &&
        !sources
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [sources]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (next: Page) => {
    setPage(next);
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const open = (input: TokenInput) => {
    const normalized = {
      chainId: input.chainId,
      address: input.address.toLowerCase(),
    };
    setPage("explorer");
    setChainId(normalized.chainId);
    setAddress(normalized.address);
    setFormError("");
    setMenu(false);
    history.replaceState(null, "", tokenUrl(location.href, normalized));
    void controller.lookup(normalized);
  };
  const persist = (next: TokenInput[]) => {
    setSaved(next);
    try {
      localStorage.setItem(savedKey, JSON.stringify(next));
    } catch {
      setToast("Browser storage is unavailable.");
    }
  };
  const isSaved =
    !!lookup.input && saved.some((x) => sameInput(x, lookup.input!));
  const toggleSaved = () => {
    if (!lookup.input) return;
    persist(
      isSaved
        ? saved.filter((x) => !sameInput(x, lookup.input!))
        : [...saved, lookup.input],
    );
  };
  const result = lookup.result,
    input = lookup.input;
  return (
    <>
      <div className="app-shell">
        <div
          className={`mobile-overlay ${menu ? "open" : ""}`}
          onClick={() => setMenu(false)}
        />
        <aside className={`sidebar ${menu ? "open" : ""}`}>
          <a className="brand" href="./" aria-label="Token Risk home">
            <span className="brand-mark">
              <svg
                viewBox="0 0 36 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="m18 2 16 9v18l-16 9-16-9V11Zm0 0v18m16-9-16 9-16-9m16 9v18" />
                <path d="m10 7 16 9v9l-8 5-8-5V15l8-5" opacity=".4" />
              </svg>
            </span>
            <span>
              token<span>risk</span>
            </span>
          </a>
          <div className="brand-sub">EVM token analysis</div>
          <div className="nav-section">WORKSPACE</div>
          <nav>
            <button
              className={`nav-item ${page === "explorer" ? "active" : ""}`}
              onClick={() => navigate("explorer")}
            >
              <Icon name="layers" />
              Token explorer
            </button>
            <button
              className={`nav-item ${page === "watchlist" ? "active" : ""}`}
              onClick={() => navigate("watchlist")}
            >
              <Icon name="bookmark" />
              Watchlist<span className="counter">{saved.length}</span>
            </button>
          </nav>
          <div className="nav-section" style={{ marginTop: 30 }}>
            RESOURCES
          </div>
          <button
            className={`nav-item ${page === "methodology" ? "active" : ""}`}
            onClick={() => navigate("methodology")}
          >
            <Icon name="book" />
            Methodology
          </button>
          <button className="nav-item" onClick={() => setSources(true)}>
            <Icon name="network" />
            Data sources <Icon name="external" />
          </button>
          <div className="sidebar-bottom">
            <div className="data-note">
              <b>
                <span className="live-dot" />
                Evidence and coverage
              </b>
              Sources, observed controls
              <br />
              and unresolved questions.
            </div>
            <div className="side-footer">
              <span className="avatar">TR</span>Research
              <span className="pill">BETA</span>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button
              className="mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle navigation"
              aria-expanded={menu}
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumb">
              Workspace <Icon name="chevron" />
              <b>
                {page === "explorer"
                  ? "Token explorer"
                  : page === "watchlist"
                    ? "Watchlist"
                    : "Methodology"}
              </b>
            </div>
            <div className="topbar-right">
              <span className="version">RESEARCH BETA</span>
              <button
                className="topbar-link"
                onClick={() => navigate("methodology")}
              >
                How it works <Icon name="external" />
              </button>
            </div>
          </header>
          <main id="main">
            {page === "explorer" ? (
              <>
                <Intro
                  title="Token explorer"
                  action={
                    <button
                      className="outline-btn"
                      onClick={() => navigate("methodology")}
                    >
                      <Icon name="book" />
                      Methodology
                    </button>
                  }
                >
                  Inspect underlying assets, bridge paths and privileged
                  controls for an EVM token.
                </Intro>
                <section className="search-panel" aria-label="Token lookup">
                  <form
                    className="search-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!isAddress(address.trim())) {
                        setFormError(
                          "Enter a contract address: 0x followed by 40 hexadecimal characters.",
                        );
                        search.current?.focus();
                        return;
                      }
                      open({ chainId, address: address.trim() });
                    }}
                  >
                    <Icon name="search" className="search-icon" />
                    <input
                      ref={search}
                      id="token-search"
                      aria-label="Token contract address"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Paste a token contract address (0x…)"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <select
                      id="chain"
                      className="chain-select"
                      aria-label="Blockchain"
                      value={chainId}
                      onChange={(e) => setChainId(Number(e.target.value))}
                    >
                      {CHAIN_LIST.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="solid-btn">
                      Analyze token <Icon name="arrow" />
                    </button>
                  </form>
                  <div className="examples">
                    <span>EXAMPLES</span>
                    {LIVE_EXAMPLES.map((x) => (
                      <button
                        key={x.address}
                        className={`example-chip live-example ${input && sameInput(input, x) ? "selected" : ""}`}
                        onClick={() => open(x)}
                      >
                        {x.label}
                      </button>
                    ))}
                  </div>
                  <div className="search-network-note">
                    20 EVM networks · selected by{" "}
                    <a
                      href={CHAIN_SELECTION.url}
                      target="_blank"
                      rel="noopener"
                    >
                      DeFi TVL ↗
                    </a>{" "}
                    · {CHAIN_SELECTION.asOf}
                  </div>
                  {formError && (
                    <div className="search-error" role="status">
                      {formError}
                    </div>
                  )}
                </section>
                {lookup.loading && (
                  <section className="panel live-loading">
                    <div className="live-orbit">
                      <i />
                      <i />
                      <i />
                    </div>
                    <span className="eyebrow">DISCOVERING ON-CHAIN</span>
                    <h2>
                      {lookup.refreshing
                        ? "Refreshing the snapshot"
                        : "Reading token dependencies"}
                    </h2>
                    <p role="status" aria-live="polite">
                      {lookup.progress}
                    </p>
                    <p className="live-muted">
                      Reads go directly from your browser to public RPCs and
                      source registries.
                      <br />
                      Broad bridge scans can take up to 90 seconds.
                    </p>
                    <button
                      className="outline-btn"
                      onClick={() => controller.cancel()}
                    >
                      Cancel lookup
                    </button>
                  </section>
                )}
                {result && input ? (
                  <div hidden={lookup.loading}>
                    <DiscoveryResultView
                      key={`${input.chainId}:${input.address}`}
                      result={result}
                      input={input}
                      saved={isSaved}
                      error={lookup.error}
                      storageAvailable={cache.available}
                      onSave={toggleSaved}
                      onRefresh={() => void controller.lookup(input, true)}
                      onClear={() => cache.clear()}
                    />
                  </div>
                ) : lookup.loading ? null : input ? (
                  <section className="panel live-loading">
                    <span className="badge high">
                      {lookup.error?.startsWith("Lookup cancelled")
                        ? "Lookup cancelled"
                        : "Lookup unavailable"}
                    </span>
                    <h2>Could not read this snapshot.</h2>
                    <p>{lookup.error}</p>
                    <button
                      className="solid-btn"
                      onClick={() => void controller.lookup(input, true)}
                    >
                      Try again
                    </button>
                  </section>
                ) : (
                  <section className="panel explorer-empty">
                    <span className="eyebrow">ADDRESS LOOKUP</span>
                    <h2>Choose a token to inspect</h2>
                    <p>
                      Paste its contract address and select the network, or
                      choose one of the four examples above. Each lookup reads
                      the token’s contracts and backing relationships directly
                      from chain.
                    </p>
                  </section>
                )}
              </>
            ) : page === "watchlist" ? (
              <>
                <Intro title="Watchlist">
                  Saved addresses on this device. Open an address to fetch its
                  current dependencies.
                </Intro>
                <section className="panel live-watchlist">
                  {saved.length ? (
                    saved.map((x) => (
                      <div key={`${x.chainId}:${x.address}`}>
                        <button onClick={() => open(x)}>
                          <b>{CHAINS[x.chainId].name}</b>
                          <span>{x.address}</span>
                        </button>
                        <button
                          className="outline-btn"
                          aria-label={`Remove ${short(x.address)}`}
                          onClick={() =>
                            persist(saved.filter((y) => !sameInput(x, y)))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>
                      No saved addresses yet. Analyze a token and select “Save
                      address”.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <>
                <Intro title="Methodology">
                  How token dependencies and exposure units are derived.
                </Intro>
                <Methodology />
              </>
            )}
            <Footer />
          </main>
        </div>
      </div>
      <div id="toast" role="status" className={toast ? "show" : ""}>
        {toast}
      </div>
      {sources && <SourcesDialog onClose={() => setSources(false)} />}
    </>
  );
}
