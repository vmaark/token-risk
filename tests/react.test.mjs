import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DiscoveryController } from "../web/discovery-state.ts";
import { initialInput, tokenUrl } from "../web/url-state.ts";
import { ExposurePanel } from "../web/components/ExposurePanel.tsx";
import { Evidence } from "../web/components/Evidence.tsx";
import { layoutGraph } from "../web/components/DependencyGraph.tsx";
import { assessExposure } from "../web/exposure.ts";
const A = { chainId: 1, address: "0x1111111111111111111111111111111111111111" };
const B = {
  chainId: 56,
  address: "0x2222222222222222222222222222222222222222",
};
const result = (input) => ({
  schemaVersion: 3,
  input,
  generatedAt: new Date().toISOString(),
  root: input.address,
  nodes: [
    {
      id: input.address,
      chainId: input.chainId,
      address: input.address,
      name: "Token",
      symbol: "TOK",
      type: "ERC-20 token",
      codeHash: "0x12",
      observations: [],
      unknowns: [],
    },
    {
      id: `network:${input.chainId}`,
      chainId: input.chainId,
      name: "Network",
      symbol: "Network",
      type: "Network security",
      observations: [],
      unknowns: [],
    },
  ],
  edges: [
    { from: input.address, to: `network:${input.chainId}`, kind: "network" },
  ],
  coverage: { interrupted: false, rpcReads: 25 },
  snapshots: [],
  reads: [],
  warnings: [],
  catalog: { endpointCount: 0, asOf: "2026-10-28", source: "test" },
});
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
class MemoryCache {
  entries = new Map();
  writes = [];
  async get(key) {
    return this.entries.get(key) || null;
  }
  async set(key, value, ttl) {
    this.writes.push(value.root);
    this.entries.set(key, {
      value,
      savedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      stale: false,
    });
  }
}
const started = () => new Promise((resolve) => setImmediate(resolve));
test("A superseded lookup cannot replace the latest result or write its aborted result to cache", async () => {
  const cache = new MemoryCache(),
    first = deferred(),
    second = deferred();
  let firstSignal;
  const c = new DiscoveryController(cache, (input, { signal }) => {
    if (input.chainId === 1) {
      firstSignal = signal;
      return first.promise;
    }
    return second.promise;
  });
  const a = c.lookup(A);
  await started();
  const b = c.lookup(B);
  await started();
  assert.equal(firstSignal.aborted, true);
  second.resolve(result(B));
  await b;
  first.resolve(result(A));
  await a;
  assert.equal(c.getSnapshot().result.root, B.address);
  assert.deepEqual(cache.writes, [B.address]);
  assert.equal(c.getSnapshot().loading, false);
});
test("Cancelling a lookup rejects a late completion without saving or displaying it", async () => {
  const cache = new MemoryCache(),
    pending = deferred();
  const c = new DiscoveryController(cache, () => pending.promise);
  const lookup = c.lookup(A);
  await started();
  c.cancel();
  pending.resolve(result(A));
  await lookup;
  assert.equal(c.getSnapshot().loading, false);
  assert.equal(c.getSnapshot().result, null);
  assert.match(c.getSnapshot().error, /cancelled/);
  assert.deepEqual(cache.writes, []);
});
test("Failed refresh retains a labeled snapshot, while a cancelled refresh retains prior results", async () => {
  const cache = new MemoryCache();
  let count = 0;
  const pending = deferred();
  const c = new DiscoveryController(cache, async () => {
    count++;
    if (count === 1) return result(A);
    if (count === 2) throw new Error("RPC offline");
    return pending.promise;
  });
  await c.lookup(A);
  await c.lookup(A, true);
  assert.equal(c.getSnapshot().result.cache.status, "stale");
  assert.equal(c.getSnapshot().result.cache.error, "RPC offline");
  const refresh = c.lookup(A, true);
  await started();
  c.cancel();
  pending.resolve(result(A));
  await refresh;
  assert.equal(c.getSnapshot().result.root, A.address);
  assert.equal(c.getSnapshot().loading, false);
  assert.deepEqual(cache.writes, [A.address]);
});
test("Disposing the controller aborts reads and stops updates to unmounted React subscribers", async () => {
  const pending = deferred(),
    cache = new MemoryCache();
  let signal,
    updates = 0;
  const c = new DiscoveryController(cache, (_, options) => {
    signal = options.signal;
    return pending.promise;
  });
  c.subscribe(() => updates++);
  const lookup = c.lookup(A);
  await started();
  c.dispose();
  const before = updates;
  pending.resolve(result(A));
  await lookup;
  assert.equal(signal.aborted, true);
  assert.equal(updates, before);
  assert.deepEqual(cache.writes, []);
});
test("Partial discovery remains inspectable without replacing a completed cache entry", async () => {
  const cache = new MemoryCache(),
    value = result(A);
  value.coverage.interrupted = true;
  const c = new DiscoveryController(cache, async () => value);
  await c.lookup(A);
  assert.equal(c.getSnapshot().result.cache.status, "partial");
  assert.deepEqual(cache.writes, []);
});
test("Token links and legacy real-address links preserve the GitHub Pages project path", () => {
  const url = tokenUrl("https://vmaark.github.io/token-risk/?asset=wsteth", B);
  assert.equal(url.pathname, "/token-risk/");
  assert.equal(url.searchParams.has("asset"), false);
  assert.deepEqual(initialInput(url.href), B);
  assert.equal(
    initialInput("https://vmaark.github.io/token-risk/?asset=wsteth").chainId,
    1,
  );
  assert.equal(
    initialInput("https://vmaark.github.io/token-risk/?asset=shared"),
    null,
  );
  assert.equal(
    initialInput(
      "https://vmaark.github.io/token-risk/?chainId=999999&address=" +
        A.address,
    ),
    null,
  );
});
test("React renders one full exposure column, excludes evidence checks from the summary and escapes token text", () => {
  const graph = result(A);
  graph.nodes[0].name = "<img src=x onerror=alert(1)>";
  const html = renderToStaticMarkup(
    createElement(ExposurePanel, {
      graph,
      assessment: assessExposure(graph),
      onSelectNode: () => {},
    }),
  );
  assert.equal((html.match(/class="eu-column"/g) || []).length, 1);
  assert.match(html, /Show layer breakdown/);
  assert.match(html, /3 EU total/);
  assert.doesNotMatch(html, /Evidence checks answered|eu-unknown-cap|<img/);
  assert.match(html, /&lt;img/);
});
test("React evidence panel contains evidence checks and omits empty bridge observations", () => {
  const graph = result(A),
    html = renderToStaticMarkup(
      createElement(Evidence, {
        result: graph,
        assessment: assessExposure(graph),
      }),
    );
  assert.match(html, /Evidence checks answered/);
  assert.match(html, /RPC reads/);
  assert.doesNotMatch(html, /Observed bridge peers/);
});
test("React graph layout gives unique finite positions to cyclic backing and shared network nodes", () => {
  const graph = result(A);
  graph.nodes.push({
    id: "backing",
    chainId: 1,
    name: "Backing",
    symbol: "B",
    type: "ERC-20 token",
    observations: [],
    unknowns: [],
  });
  graph.edges.push(
    { from: A.address, to: "backing", kind: "backing" },
    { from: "backing", to: A.address, kind: "backing" },
  );
  const { pos, height } = layoutGraph(graph);
  assert.equal(pos.size, graph.nodes.length);
  assert.ok(Number.isFinite(height));
  assert.equal(
    new Set([...pos.values()].map((p) => p.join(":"))).size,
    graph.nodes.length,
  );
  assert.ok([...pos.values()].flat().every(Number.isFinite));
});
