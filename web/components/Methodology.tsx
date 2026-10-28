import { CHAIN_SELECTION } from "../../discovery/chains.ts";
export function Methodology() {
  return (
    <section className="panel method-page">
      <h2>Read dependencies from contracts</h2>
      <p>
        Lookups use chain ID and token address. Reads are pinned to a block on
        each network. Supported interfaces resolve vault assets, pool reserves,
        lending assets, staking wrappers, privileged addresses and observed
        bridge verification paths. Each result retains the calls and
        observations behind it. An interface response does not authenticate a
        protocol or prove solvency.
      </p>
      <h2>Exposure units</h2>
      <p>
        One EU counts one distinct system × risk dimension, with equal weights.
        Shared dimensions count once. The chart accumulates dependencies from
        base systems to the selected token. It measures discovered exposure
        breadth, not severity, expected loss, a safety ranking or probability of
        loss. Missing adapters can produce lower counts without lower risk.
      </p>
      <h2>Layer breakdown</h2>
      <p>
        The default chart shows the full discovered exposure. “Show layer
        breakdown” compares cumulative units with units added at each structural
        layer. Shared controls attach at the earliest dependent stage, and
        cyclic backing components share a stage. Layers describe composition,
        not transaction history.
      </p>
      <h2>Evidence & coverage</h2>
      <p>
        Evidence checks describe only the displayed checklist: deployed
        bytecode, matched runtime source, recognized backing interfaces and
        decoded control or bridge policies. The fraction is not overall
        risk-assessment coverage. Missing authority paths, reserves, strategies
        and incident history remain unresolved where the adapters cannot
        establish them.
      </p>
      <h2>Networks and bridges</h2>
      <p>
        Network configurations cover the 20 EVM mainnets selected by chain DeFi
        TVL on {CHAIN_SELECTION.asOf}, including Polygon PoS. Hyperliquid L1
        selects its HyperEVM execution environment; its chain TVL also covers
        activity outside that environment. Layer 2 and checkpoint dependencies
        use configured parent networks. Independent L1s do not inherit Ethereum
        automatically.
      </p>
      <p>
        Observed mint and release paths affect every fungible claim sharing that
        token or backing, independent of acquisition route. Bridge discovery is
        bounded, and does not establish exhaustive mint permissions or
        cross-chain solvency. LayerZero peer IDs come from its published
        metadata catalog.
      </p>
      <h2>Browser caching</h2>
      <p>
        Results are cached for two minutes in IndexedDB. Runtime-matched
        metadata is cached by code hash for 24 hours. Refresh bypasses the
        result cache. Expired snapshots used after a failed request are labeled;
        cancelled or interrupted scans do not replace a completed cached result.
        No backend, wallet connection or API key is required.
      </p>
      <h2>Examples</h2>
      <p>
        The four shortcuts contain addresses only: rsETH on Arbitrum, an
        ERC-4626 vault, a V2 LP token and an Aave deposit token. They invoke the
        same discovery path as a pasted address. The app contains no precomputed
        token graphs, scores, risk ratings or incident results.
      </p>
    </section>
  );
}
