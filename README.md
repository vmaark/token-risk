# Token Risk

A browser-only EVM dependency explorer with a dark dashboard. Address discovery reads public JSON-RPC endpoints and Sourcify directly; no application server, wallet, or secret API key is required. A static bundle is published through Sites.

## Run

```sh
npm ci
npm run dev
# http://127.0.0.1:4173
npm test
npm run check
npm run build
```

`server.mjs` serves the built files locally. It contains no discovery API. Source lives in `web/` and `discovery/`; esbuild bundles viem into `dist/`.

## Live address discovery

Supported networks: Ethereum, Arbitrum, Base, Optimism. Identity is `(chainId, address)`, never a symbol. Every chain is checked against `eth_chainId`; reads use an independently pinned finalized block (or a labeled latest-block fallback). Cross-chain snapshots are not atomic.

Adapters currently inspect:

- ERC-4626: immediate asset, totalAssets, share conversion; recognizes Morpho/Yearn interfaces but does not claim full strategy allocation coverage.
- V2-style LPs: token0/token1, reserves and factory registration cross-check. Amounts are underlying units, not invented portfolio weights.
- V3-style pools: factory/pool registration and asset pair. A pool address is not an NFT position; position-token discovery remains unsupported.
- Aave V3-style deposit tokens: underlying and reserve aToken cross-check. Pool versions with incompatible reserve layouts remain unresolved.
- Compound V2-style tokens: controller listing and reported cash, borrow and reserve accounting.
- Balancer V2-style pools: Vault pool registration and token balances, excluding self-held BPT.
- Lido wstETH/stETH and native ETH wrappers: distinct staking/network boundaries.
- Kelp rsETH: config and deposit-pool cross-references, supported assets with nonzero protocol-reported deposits. AVSs, operators, minters, loss allocation and detailed custody remain incomplete.
- LayerZero V2 OFTs/adapters: configured peers over a catalog of 186 known mainnet endpoint IDs; reciprocal Ethereum escrow; token escrow balance; incoming receive libraries, effective ULN configurations and applicable active grace-library configurations. Grace expiry is a **block number**, and only the application's or default timeout applies according to the selected receive library.
- Privileged controls: EIP-1967 implementation, admin and beacon slots; owner/minter interfaces; multisig-style owners and threshold when readable.

Interface cross-checks do not authenticate a deployment or prove safety. Verified source is accepted only when Sourcify's on-chain runtime bytecode matches the pinned RPC bytecode hash. Other proxies, custom code, complete role histories, canonical bridges, Curve, NFT holdings, synthetic collateral and off-chain reserves need further adapters. An unmatched contract is unclassified, not assumed to be a base asset.

Live results receive no numerical or editorial risk score. The graph distinguishes backing, bridge authority, governance, market and network dependencies. Every observed incoming mint/release path stays relevant regardless of a holder's acquisition route. Complete authority coverage is always marked partial. Contract-reported balances and accounting are not a cross-chain solvency proof; in-flight messages and liabilities are not reconciled.

## Caching and limits

IndexedDB stores versioned results for two minutes and verified contract metadata for 24 hours, keyed by chain, address and current code hash. Refresh bypasses result caching. After a failed lookup an expired snapshot may be shown with an explicit stale label. Cancelled and interrupted scans do not replace a prior complete scan. Storage failure leaves live reads usable. Cache entries are bounded to 80, at most 4 MB each; Clear local cache removes them.

Discovery is bounded by four recursive edges, 32 inspected contract nodes, 1,400 logical RPC reads and a 90-second deadline. Calls are grouped in batches of 25. Storage and source lookups are also block-pinned where applicable. Public RPCs/registries see lookup traffic and can rate-limit or reject CORS requests. No credentials are stored. JSON exports (schema 3) contain pinned blocks, decoded observations, raw call results, errors, coverage and remaining unknowns.

## Curated research

Name-based searches and example scenarios remain separately labeled curated research dated 27 October 2026, including the historical Kelp/LayerZero/Aave incident of 18 April 2026. The incident does not imply a current impairment or current one-DVN policy. Its escrow-release mechanism is distinct from minting mainnet rsETH; remote bridge backing and mainnet staking backing are separate accounting boundaries. No final haircut is asserted.

Curated qualitative labels use the maximum ordinal label among reachable modeled dependencies; they are not loss probabilities or L2BEAT/DefiLlama scores. The hypothetical LP uses an explicitly illustrative 50/50 allocation. The local watchlist, comparison and incident views apply to curated scenarios.

## Structure

- `discovery/rpc.js`: chain validation, block snapshots, bounded JSON responses, batching, call evidence and proxy constants.
- `discovery/engine.js`: recursive graph and protocol adapters, source bytecode checks, bridge configurations.
- `discovery/cache.js`: IndexedDB and result-cache policy.
- `discovery/lz-catalog.json`: versioned LayerZero endpoint catalog with source/date.
- `web/live.js`: live dashboard, progress/cancellation, dependency inspector, cache controls and evidence export.
- `web/model.js`, `web/app.js`: curated graph model and shared application shell.
- `tests/`: graph invariants, adapter cross-checks, reciprocal escrow, ULN decoding, cache expiry/refresh/stale behavior, bytecode matching and chain/block validation.

## Sources

- [L2BEAT Arbitrum](https://l2beat.com/layer2s/projects/arbitrum)
- [DefiLlama hacks](https://defillama.com/hacks)
- [Sourcify V2 API](https://docs.sourcify.dev/docs/api/)
- [ERC-4626](https://eips.ethereum.org/EIPS/eip-4626)
- [Kelp contracts](https://github.com/Kelp-DAO/LRT-rsETH)
- [LayerZero receive library implementation](https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/protocol/contracts/MessageLibManager.sol)
- [LayerZero ULN implementation](https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/packages/layerzero-v2/evm/messagelib/contracts/uln/UlnBase.sol)
- [LayerZero endpoint metadata](https://metadata.layerzero-api.com/v1/metadata)
- [Aave V3 contracts](https://github.com/aave/aave-v3-origin)
- [Balancer V2 interfaces](https://github.com/balancer/balancer-v2-monorepo/tree/master/pkg/interfaces)
- [Compound V2 contracts](https://github.com/compound-finance/compound-protocol)
- [Lido deployments](https://docs.lido.fi/deployed-contracts/)
- [Aave rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580)
- [LayerZero Kelp incident report](https://layerzero.network/blog/layerzero-labs-kelpdao-incident-report)
