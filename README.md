# Token Risk

A dark, colorful dependency-first prototype for understanding structural risk in EVM token positions. No build step or runtime dependencies are required.

## Run

```sh
npm run dev
# http://127.0.0.1:4173
npm test
npm run check
```

The deployed app consists of the files in `dist/`. `server.mjs` is for local development only.

## Current experience

- Interactive dependency graph, list view, and layer inspector with a navy, lime, violet, and cyan design.
- Distinct backing, mint/release authority, and network-security edges. Shared dependencies appear once.
- Acquisition-route independence: both authorities over a shared token/backing remain in scope whether the holder used the canonical bridge, an independent bridge, or a DEX.
- A shared-supply illustration and a sourced historical Kelp rsETH → Aave case study.
- Curated Ethereum lookup for ETH, stETH, wstETH, and USDC, scoped by chain.
- Illustrative wstETH–USDC LP and third-party bridge scenarios, plus a curated canonical Arbitrum bridge route.
- Qualitative risk factors, governance controls, source links, comparisons, local watchlist, JSON export, and explicit unknown states.
- Responsive layout, keyboard-accessible controls, reduced-motion support, and native dialogs.

## Data and limitations

This is a curated research snapshot dated 27 October 2026. It has **no live chain, reserve, incident, or governance feeds**. The USDC/Silicon Valley Bank event is included as a curated historical example and is inherited by positions containing USDC. The Kelp/LayerZero rsETH exploit on 18 April 2026 is a separate historical case study based on the Aave service-provider and LayerZero reports, not a live status or final recovery assessment. The LP is hypothetical and its 50/50 allocation is illustrative. The Arbitrum route is a scenario, not inferred from a contract address or transaction. Third-party bridge signer counts are explicitly hypothetical.

The overall qualitative label is the maximum ordinal label across reachable nodes. These editorial labels describe modeled trust assumptions, not loss probabilities or a score supplied by L2BEAT or DefiLlama. Unknown addresses receive no rating. Incident coverage is partial; other histories are unassessed, not assumed clean. Historical entries do not automatically change qualitative labels.

## Structure

- `dist/model.js`: token/system nodes, dependency edges, source registry, curated address resolution, traversal, and qualitative aggregation.
- `dist/app.js`: interactive dashboard, graph layout, comparison, watchlist, lookup validation, and exports.
- `dist/styles.css`: responsive dashboard styling.
- `tests/model.test.mjs`: recursion, deduplication, cycle tolerance, graph integrity, chain-scoped addresses, and validation.

A backing edge is `[parentId, childId, illustrativeWeight]`. A mint/release authority dependency uses `[dependentBackingId, authorityId, 1, "authority"]`. `supplyDomains` records explicitly verified or illustrative token membership, backing, and relevant authorities. `exposureEdges()` expands every authority in a reachable domain, independent of any acquisition-route annotation. The resolved edges are included in JSON exports (schema v2). A network dependency uses `[parentId, networkId, 1, "network"]`. Weights are displayed only for the hypothetical LP; graph traversal does not treat weights or ordinal labels as independent failure probabilities.

## Production address-resolution path

1. Resolve `(chainId, address)` against actual bytecode and token metadata at a recorded block.
2. Discover proxy implementations and route the contract to a versioned protocol adapter.
3. Read underlying assets: wrapper conversion, lending positions, LP reserves, staking claims, and vault holdings.
4. Trace recursively with cycle detection, depth/node budgets, and shared-entity identity.
5. Resolve the chain/contract identity, shared supply and redemption boundaries, every mint/release authority, common escrow, and destination network. Do not limit exposure to the holder’s bridge path. Identical symbols do not prove shared backing. Unauthorized minting can inflate claims; unauthorized release can reduce reserves with the same solvency effect. Authority coverage must be recorded as incomplete until discovery is comprehensive.
6. Attach timestamped governance evidence: signer threshold, signer independence, authority, ordinary and emergency upgrades, timelocks, and exit windows.
7. Reconcile incidents by affected protocol, contract, version, asset, impact, and remediation. Historical loss is evidence, not a future loss estimate.
8. Preserve unknowns and confidence at field level. Distinguish documented claims, on-chain observations, inference, and hypothetical scenarios.

Production adapters should return entities, edges, block number, observed time, source references, confidence, and explicit unknowns. A durable graph/cache and refresh workers would sit behind the current view model. Keep risk dimensions separate; correlated dependencies and partial exposures require a deliberate aggregation model.

## Research

- [L2BEAT Arbitrum risk and governance analysis](https://l2beat.com/layer2s/projects/arbitrum)
- [DefiLlama incident research](https://defillama.com/hacks)
- [Lido integration guide](https://docs.lido.fi/guides/lido-tokens-integration-guide/)
- [Lido wstETH mechanics](https://docs.lido.fi/contracts/wsteth/)
- [Lido deployments](https://docs.lido.fi/deployed-contracts/)
- [Circle official token addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)
- [Ethereum proof of stake](https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/)

## Kelp case-study boundaries

The forged Unichain-to-Ethereum message unlocked escrow without a corresponding source burn. The attacker used rsETH as Aave collateral. The historical model follows Aave → remote rsETH claims → shared bridge escrow → the affected LayerZero path and underlying Ethereum rsETH. The required DVN policy is labeled historical (1 of 1), not a property of all LayerZero applications or current configuration.

Remote escrow backing and mainnet staking backing are distinct. The April Aave report modeled different loss-allocation scenarios. The app does not assert a final haircut or automatically assign the escrow loss to all mainnet rsETH. Same-token and shared-backing exposure can apply irrespective of a holder’s route; unrelated tokens or separate reserves are not merged.

- [Aave rsETH incident report](https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580)
- [LayerZero Kelp incident report](https://layerzero.network/blog/layerzero-labs-kelpdao-incident-report)
