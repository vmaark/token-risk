# Token Risk

A browser-only EVM token dependency explorer. Every analysis starts from a chain ID and contract address, reads pinned on-chain state, and computes its graph and exposure units from those observations. No precomputed token results or editorial risk ratings ship in the app.

## Development

```sh
npm install
npm run dev
npm run check
npm test
npm run build
```

`server.mjs` serves the static `dist/` directory locally at port 4173. It has no discovery API. Source lives in `web/` and `discovery/`; esbuild bundles viem into the browser entry point. Build output is ignored by Git. Repository commits are unsigned (`commit.gpgsign=false` locally).

## Live address lookups

Select a network and paste a 20-byte EVM contract address. Four example shortcuts contain addresses only and invoke the same discovery engine:

- rsETH on Arbitrum: recursive staking and observed bridge configurations.
- sDAI on Ethereum: ERC-4626 share and underlying interfaces.
- USDC/WETH V2 pair on Ethereum: factory registration and reserves.
- Aave aWETH on Ethereum: reserve registration and underlying asset.

The root page has no selected token or fabricated result. Existing `?chainId=...&address=...` links run live discovery. Legacy `?asset=wsteth` and `?asset=steth` links resolve the real mainnet addresses; other retired curated links show the address entry state.

### Network selection

`discovery/chains.js` holds the 20 EVM mainnets selected by DefiLlama chain DeFi TVL on **2026-10-28**, in descending order. It is a dated network-selection snapshot, not a live TVL feed or token-risk result. Source: https://api.llama.fi/v2/chains and https://defillama.com/chains/evm.

1. Ethereum — 1
2. Base — 8453
3. BNB Smart Chain — 56
4. HyperEVM — 999 (selected by Hyperliquid L1 TVL, which includes its other execution activity)
5. Arbitrum One — 42161
6. Robinhood Chain — 4663
7. Monad — 143
8. Polygon PoS — 137 (EVM sidechain with Ethereum checkpoint dependencies)
9. Arc — 5042
10. Avalanche — 43114
11. Plasma — 9745
12. OP Mainnet — 10
13. Anubis — 6714
14. Ink — 57073
15. Flare — 14
16. X Layer — 196
17. Cronos — 25
18. Mantle — 5000
19. Tempo — 4217
20. Gnosis — 100

RPC identities and batch-read support were checked for each network. Public endpoints can be unavailable or rate-limited. Anubis chain ID 6714 was verified through RPC and The Graph's network registry; older Anubis wallet documentation lists conflicting IDs. Network configuration uses viem's mainnet registry where available and published network documentation. Source references:

- https://github.com/wevm/viem/tree/main/src/chains/definitions
- https://robinhood.com/us/en/support/articles/robinhood-chain-mainnet/
- https://docs.arc.io/arc/references/connect-to-arc
- https://thegraph.com/docs/en/supported-networks/anubis/
- https://docs.anubispace.org/anubis-chain/developers/json_rpc/json-rpc-endpoint/

Independent L1s have their own network dependency. Configured L2s depend on Ethereum; Polygon includes its Ethereum checkpoint dependency. Controls, consensus details and data availability are not comprehensively assessed by this configuration.

## Discovery

`discovery/engine.js` implements bounded recursive adapters for:

- ERC-4626 assets and conversions; Morpho/Yearn-style interfaces are detected without inventing strategy allocations.
- V2 LP reserves and factory cross-references; concentrated-liquidity pool assets without inventing an NFT holding.
- Aave-style reserve registration, Compound-style listing/accounting and Balancer V2 Vault registration.
- Lido wrappers and staking boundaries, and Kelp configuration cross-references and deposit accounting.
- EIP-1967 proxy, admin and beacon observations, owner/minter controls, multisig and timelock interfaces.
- LayerZero V2 observed incoming peers, receive libraries, verifier configurations and active grace policies.

Interfaces are contract-reported observations, not deployment authentication or solvency proofs. Unknown contracts remain unclassified. Protocol-specific configuration and known addresses are adapter inputs, never replacement analysis results. Detailed strategies, synthetic collateral, off-chain reserves, exhaustive role history, arbitrary bridge families and incident history remain incomplete.

Every observed mint/release authority stays relevant to all holders sharing the same supply or backing, independent of acquisition route. The engine does not claim that it discovers all such authorities. Reciprocal peers and Ethereum escrow are cross-checked before adding a backing edge.

`discovery/rpc.js` validates chain identity, pins a finalized block when available (otherwise explicitly labels a latest block), enforces time/read/response limits and records calls. Source metadata is accepted only when pinned runtime bytecode matches; source matching is not a safety rating.

## Exposure units

`web/exposure.js` computes Exposure Units v1.1: **1 EU per unique system × risk dimension**, equal weights. Shared dimensions count once. Dependencies accumulate as a union, cycles share a stage, and controls attach at the earliest dependent stage.

EU measures discovered structural breadth, not severity, expected loss, loss probability or an investment ranking. Counts can understate exposure when discovery is incomplete. Verifier/signer quorums, audits and past incidents do not mechanically add or discount units.

The default chart shows the full cumulative exposure. The layer breakdown offers cumulative and added-per-layer views. Evidence checks appear in **Evidence & coverage**, alongside pinned networks, RPC reads, relevant bridge observations and raw call logs. They describe a limited checklist, not overall risk-assessment coverage.

## Browser storage

`discovery/cache.js` uses IndexedDB:

- Results: two-minute TTL, keyed by result schema version, chain and address.
- Matched metadata: 24-hour TTL, keyed by chain/address/runtime code hash.
- Up to 80 entries and a four-megabyte limit per entry.
- Refresh bypasses result caching; expired fallback after failed reads is labeled.
- Cancelled or interrupted scans never overwrite completed cached results.
- Storage failure leaves live reads usable.

The separate result schema version invalidates older discovery graphs without blocking on an IndexedDB upgrade in another open tab. The address watchlist stores chain/address pairs only in localStorage; it stores no precomputed analysis.

## Tests and deployment

Tests cover recursion, cycles, deduplication, protocol cross-checks, source matching, chain identity, network parent relationships, cache behavior and bridge path accounting. Former curated models exist only in `tests/fixtures/` for regression tests and are excluded from the browser build.

`.openai/hosting.json` identifies the existing static Site. Build `dist/` before packaging; ignored build assets remain part of the deployment archive. The published Site keeps its existing private audience.
