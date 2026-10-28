// Network configuration, not token-analysis results. Selection reviewed against DefiLlama on 2026-10-28.
export const CHAIN_SELECTION={asOf:'2026-10-28',source:'https://api.llama.fi/v2/chains',url:'https://defillama.com/chains/evm',method:'Top 20 EVM mainnets by chain DeFi TVL; includes Polygon PoS. Hyperliquid L1 TVL selects its HyperEVM execution environment.'};
export const CHAIN_LIST=[
  {
    "id": 1,
    "name": "Ethereum",
    "llamaName": "Ethereum",
    "kind": "L1",
    "rpc": [
      "https://ethereum-rpc.publicnode.com",
      "https://ethereum.reth.rs/rpc"
    ],
    "explorer": "https://etherscan.io",
    "nativeSymbol": "ETH",
    "eid": 30101
  },
  {
    "id": 8453,
    "name": "Base",
    "llamaName": "Base",
    "kind": "L2",
    "parentId": 1,
    "rpc": [
      "https://mainnet.base.org",
      "https://base-rpc.publicnode.com"
    ],
    "explorer": "https://basescan.org",
    "nativeSymbol": "ETH",
    "eid": 30184
  },
  {
    "id": 56,
    "name": "BNB Smart Chain",
    "llamaName": "BSC",
    "kind": "L1",
    "rpc": [
      "https://bsc-rpc.publicnode.com",
      "https://56.rpc.thirdweb.com"
    ],
    "explorer": "https://bscscan.com",
    "nativeSymbol": "BNB",
    "eid": 30102
  },
  {
    "id": 999,
    "name": "HyperEVM",
    "llamaName": "Hyperliquid L1",
    "kind": "L1",
    "rpc": [
      "https://rpc.hyperliquid.xyz/evm"
    ],
    "explorer": "https://hyperevmscan.io",
    "nativeSymbol": "HYPE",
    "eid": 30367
  },
  {
    "id": 42161,
    "name": "Arbitrum One",
    "llamaName": "Arbitrum",
    "kind": "L2",
    "parentId": 1,
    "rpc": [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum-one-rpc.publicnode.com"
    ],
    "explorer": "https://arbiscan.io",
    "nativeSymbol": "ETH",
    "eid": 30110
  },
  {
    "id": 4663,
    "name": "Robinhood Chain",
    "llamaName": "Robinhood Chain",
    "kind": "L2",
    "parentId": 1,
    "rpc": [
      "https://rpc.mainnet.chain.robinhood.com",
      "https://rpc.ordofi.network"
    ],
    "explorer": "https://robinhoodchain.blockscout.com",
    "nativeSymbol": "ETH",
    "eid": 30416
  },
  {
    "id": 143,
    "name": "Monad",
    "llamaName": "Monad",
    "kind": "L1",
    "rpc": [
      "https://rpc.monad.xyz"
    ],
    "explorer": "https://monadscan.com",
    "nativeSymbol": "MON",
    "eid": 30390
  },
  {
    "id": 137,
    "name": "Polygon PoS",
    "llamaName": "Polygon",
    "kind": "Sidechain",
    "parentId": 1,
    "rpc": [
      "https://polygon.drpc.org"
    ],
    "explorer": "https://polygonscan.com",
    "nativeSymbol": "POL",
    "eid": 30109
  },
  {
    "id": 5042,
    "name": "Arc",
    "llamaName": "Arc",
    "kind": "L1",
    "rpc": [
      "https://rpc.mainnet.arc.io",
      "https://rpc.blockdaemon.mainnet.arc.io",
      "https://rpc.drpc.mainnet.arc.io",
      "https://rpc.quicknode.mainnet.arc.io"
    ],
    "explorer": "https://explorer.arc.io",
    "nativeSymbol": "USDC",
    "eid": 30417
  },
  {
    "id": 43114,
    "name": "Avalanche",
    "llamaName": "Avalanche",
    "kind": "L1",
    "rpc": [
      "https://api.avax.network/ext/bc/C/rpc"
    ],
    "explorer": "https://snowtrace.io",
    "nativeSymbol": "AVAX",
    "eid": 30106
  },
  {
    "id": 9745,
    "name": "Plasma",
    "llamaName": "Plasma",
    "kind": "L1",
    "rpc": [
      "https://rpc.plasma.to"
    ],
    "explorer": "https://plasmascan.to",
    "nativeSymbol": "XPL",
    "eid": 30383
  },
  {
    "id": 10,
    "name": "OP Mainnet",
    "llamaName": "OP Mainnet",
    "kind": "L2",
    "parentId": 1,
    "rpc": [
      "https://mainnet.optimism.io"
    ],
    "explorer": "https://optimistic.etherscan.io",
    "nativeSymbol": "ETH",
    "eid": 30111
  },
  {
    "id": 6714,
    "name": "Anubis",
    "llamaName": "Anubis",
    "kind": "L1",
    "rpc": [
      "https://rpc.anubispace.org",
      "https://rpc2.anubispace.org"
    ],
    "explorer": "https://browser.anubispace.org",
    "nativeSymbol": "gasDAI",
    "eid": 30465
  },
  {
    "id": 57073,
    "name": "Ink",
    "llamaName": "Ink",
    "kind": "L2",
    "parentId": 1,
    "rpc": [
      "https://rpc-gel.inkonchain.com",
      "https://rpc-qnd.inkonchain.com"
    ],
    "explorer": "https://explorer.inkonchain.com",
    "nativeSymbol": "ETH",
    "eid": 30339
  },
  {
    "id": 14,
    "name": "Flare",
    "llamaName": "Flare",
    "kind": "L1",
    "rpc": [
      "https://flare-api.flare.network/ext/C/rpc"
    ],
    "explorer": "https://flare-explorer.flare.network",
    "nativeSymbol": "FLR",
    "eid": 30295
  },
  {
    "id": 196,
    "name": "X Layer",
    "llamaName": "X Layer",
    "kind": "L2",
    "parentId": 1,
    "rpc": [
      "https://xlayerrpc.okx.com"
    ],
    "explorer": "https://www.oklink.com/xlayer",
    "nativeSymbol": "OKB",
    "eid": 30274
  },
  {
    "id": 25,
    "name": "Cronos",
    "llamaName": "Cronos",
    "kind": "L1",
    "rpc": [
      "https://evm.cronos.org"
    ],
    "explorer": "https://explorer.cronos.org",
    "nativeSymbol": "CRO",
    "eid": 30359
  },
  {
    "id": 5000,
    "name": "Mantle",
    "llamaName": "Mantle",
    "kind": "L2",
    "parentId": 1,
    "rpc": [
      "https://rpc.mantle.xyz"
    ],
    "explorer": "https://mantlescan.xyz/",
    "nativeSymbol": "MNT",
    "eid": 30181
  },
  {
    "id": 4217,
    "name": "Tempo",
    "llamaName": "Tempo",
    "kind": "L1",
    "rpc": [
      "https://rpc.tempo.xyz"
    ],
    "explorer": "https://explore.tempo.xyz",
    "nativeSymbol": "USD",
    "eid": 30410
  },
  {
    "id": 100,
    "name": "Gnosis",
    "llamaName": "Gnosis",
    "kind": "L1",
    "rpc": [
      "https://rpc.gnosischain.com"
    ],
    "explorer": "https://gnosisscan.io",
    "nativeSymbol": "XDAI",
    "eid": 30145
  }
];
export const CHAINS=Object.fromEntries(CHAIN_LIST.map(c=>[c.id,c]));
