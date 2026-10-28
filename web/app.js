import {liveMarkup,lookupLive,hasLive,onLiveRender,liveExamples,handleLiveClick,activeInput} from './live.js';
import {CHAINS,CHAIN_LIST,CHAIN_SELECTION} from '../discovery/chains.js';
import {isAddress} from '../discovery/rpc.js';
const $ = (s,root=document)=>root.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 cube:'m9 3 7-4 7 4v8l-7 4-7-4Z',
 layers:'m3 7 9-5 9 5-9 5Zm0 5 9 5 9-5M3 17l9 5 9-5',
 grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 search:'M21 21l-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16',
 arrow:'M5 12h14m-5-5 5 5-5 5',
 external:'M14 3h7v7m0-7L10 14M10 3H4v17h17v-6',
 book:'M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1Zm0 0v16',
 bookmark:'M6 3h12v18l-6-4-6 4Z',
 chevron:'m9 5 7 7-7 7',
 down:'m6 9 6 6 6-6',
 info:'M12 11v6m0-11v1m0 15a10 10 0 1 0 0-20 10 10 0 0 0 0 20',
 check:'m5 12 4 4L19 6',
 shield:'m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 10 3 3 5-6',
 history:'M3 10a9 9 0 1 1 1 7M3 3v7h7m2-4v6l4 2',
 network:'M12 3v6m-7 9v-5h14v5M9 3h6v5H9zM2 18h6v5H2zM16 18h6v5h-6z',
 list:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
 close:'m6 6 12 12M6 18 18 6',
 warning:'M12 3 1 21h22ZM12 9v5m0 3v1',
 download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
 copy:'M9 9h12v12H9zM15 9V3H3v12h6',
 compare:'M7 3v18m10-18v18M3 7l4-4 4 4m2 10 4 4 4-4',
 sliders:'M3 7h4m4 0h10M3 17h10m4 0h4M7 3h4v8H7zM13 13h4v8h-4z',
 eye:'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
 globe:'M22 12A10 10 0 1 0 2 12a10 10 0 0 0 20 0ZM2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20',
 menu:'M3 6h18M3 12h18M3 18h18',
 fit:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
 plus:'M12 5v14M5 12h14',minus:'M5 12h14',
};
function icon(name,extra=''){return `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.layers}"/></svg>`;}

const params=new URLSearchParams(location.search);
const state={page:'explorer',chainId:CHAINS[Number(params.get('chainId'))]?Number(params.get('chainId')):1};
const savedKey='token-risk-address-watchlist';
let saved=[];
try{saved=JSON.parse(localStorage.getItem(savedKey)||'[]').filter(x=>CHAINS[x.chainId]&&isAddress(x.address));}catch{}
const app=$('#app');
function shell(){app.innerHTML=`<div class="app-shell"><div class="mobile-overlay" data-action="menu"></div><aside class="sidebar"><a class="brand" href="./" aria-label="Token Risk home"><span class="brand-mark"><svg viewBox="0 0 36 40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m18 2 16 9v18l-16 9-16-9V11Zm0 0v18m16-9-16 9-16-9m16 9v18"/><path d="m10 7 16 9v9l-8 5-8-5V15l8-5" opacity=".4"/></svg></span><span>token<span>risk</span></span></a><div class="brand-sub">EVM token analysis</div><div class="nav-section">WORKSPACE</div><nav><button class="nav-item ${state.page==='explorer'?'active':''}" data-page="explorer">${icon('layers')}Token explorer</button><button class="nav-item ${state.page==='watchlist'?'active':''}" data-page="watchlist">${icon('bookmark')}Watchlist<span class="counter">${saved.length}</span></button></nav><div class="nav-section" style="margin-top:30px">RESOURCES</div><button class="nav-item ${state.page==='methodology'?'active':''}" data-page="methodology">${icon('book')}Methodology</button><button class="nav-item" data-action="sources">${icon('network')}Data sources ${icon('external')}</button><div class="sidebar-bottom"><div class="data-note"><b><span class="live-dot"></span>Evidence and coverage</b>Sources, observed controls<br>and unresolved questions.</div><div class="side-footer"><span class="avatar">TR</span>Research<span class="pill">BETA</span></div></div></aside><div class="workspace"><header class="topbar"><button class="mobile-menu" data-action="menu" aria-label="Toggle navigation">${icon('menu')}</button><div class="breadcrumb">Workspace ${icon('chevron')}<b>${state.page==='explorer'?'Token explorer':state.page==='watchlist'?'Watchlist':'Methodology'}</b></div><div class="topbar-right"><span class="version">RESEARCH BETA</span><button class="topbar-link" data-page="methodology">How it works ${icon('external')}</button></div></header><main id="main"></main></div></div>`;
 renderPage();}

function renderPage(){if(state.page==='watchlist')renderWatchlist();else if(state.page==='methodology')renderMethodology();else renderExplorer();}
function intro(title,subtitle,button=''){return `<div class="intro-row"><div><div class="eyebrow">${icon('eye')} TOKEN ANALYSIS</div><h1>${title}</h1><p class="intro-text">${subtitle}</p></div>${button}</div>`;}
function footer(){return `<footer class="page-footer"><div class="powered">References <a href="https://l2beat.com" target="_blank" rel="noopener">L2BEAT ↗</a><a href="https://defillama.com/chains/evm" target="_blank" rel="noopener">DefiLlama ↗</a></div><span>On-chain discovery · cached on this device</span></footer>`;}
const short=a=>`${a.slice(0,6)}…${a.slice(-4)}`;
const savedInput=()=>saved.some(x=>x.chainId===activeInput()?.chainId&&x.address.toLowerCase()===activeInput()?.address);
function renderExplorer(){
 const input=activeInput();
 $('#main').innerHTML=intro('Token explorer','Inspect underlying assets, bridge paths and privileged controls for an EVM token.',`<button class="outline-btn" data-page="methodology">${icon('book')}Methodology</button>`)+`
 <section class="search-panel" aria-label="Token lookup"><form id="search-form" class="search-box">${icon('search','search-icon')}<input id="token-search" aria-label="Token contract address" autocomplete="off" spellcheck="false" placeholder="Paste a token contract address (0x…)"><select id="chain" class="chain-select" aria-label="Blockchain">${CHAIN_LIST.map(c=>`<option value="${c.id}" ${state.chainId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><button type="submit" class="solid-btn">Analyze token ${icon('arrow')}</button></form><div class="examples"><span>EXAMPLES</span>${liveExamples.map((x,i)=>`<button class="example-chip live-example ${input?.chainId===x.chainId&&input?.address===x.address.toLowerCase()?'selected':''}" data-live-example="${i}">${esc(x.label)}</button>`).join('')}</div><div class="search-network-note">20 EVM networks · selected by <a href="${CHAIN_SELECTION.url}" target="_blank" rel="noopener">DeFi TVL ↗</a> · ${CHAIN_SELECTION.asOf}</div><div id="search-error" class="search-error" role="status" hidden></div></section>
 ${hasLive()?liveMarkup({saved:savedInput()}):`<section class="panel explorer-empty"><span class="eyebrow">ADDRESS LOOKUP</span><h2>Choose a token to inspect</h2><p>Paste its contract address and select the network, or choose one of the four examples above. Each lookup reads the token’s contracts and backing relationships directly from chain.</p></section>`}${footer()}`;
 if(input)$('#token-search').value=input.address;
}
function renderWatchlist(){
 $('#main').innerHTML=intro('Watchlist','Saved addresses on this device. Open an address to fetch its current dependencies.')+`<section class="panel live-watchlist">${saved.length?saved.map((x,i)=>`<div><button data-saved-address="${i}"><b>${esc(CHAINS[x.chainId].name)}</b><span>${esc(x.address)}</span></button><button class="outline-btn" data-remove-address="${i}" aria-label="Remove ${esc(short(x.address))}">Remove</button></div>`).join(''):'<p>No saved addresses yet. Analyze a token and select “Save address”.</p>'}</section>`+footer();
}
function renderMethodology(){
 $('#main').innerHTML=intro('Methodology','How token dependencies and exposure units are derived.')+`<section class="panel method-page"><h2>Read dependencies from contracts</h2><p>Lookups use chain ID and token address. Reads are pinned to a block on each network. Supported interfaces resolve vault assets, pool reserves, lending assets, staking wrappers, privileged addresses and observed bridge verification paths. Each result retains the calls and observations behind it. An interface response does not authenticate a protocol or prove solvency.</p><h2>Exposure units</h2><p>One EU counts one distinct system × risk dimension, with equal weights. Shared dimensions count once. The chart accumulates dependencies from base systems to the selected token. It measures discovered exposure breadth, not severity, expected loss, a safety ranking or probability of loss. Missing adapters can produce lower counts without lower risk.</p><h2>Layer breakdown</h2><p>The default chart shows the full discovered exposure. “Show layer breakdown” compares cumulative units with units added at each structural layer. Shared controls attach at the earliest dependent stage, and cyclic backing components share a stage. Layers describe composition, not transaction history.</p><h2>Evidence & coverage</h2><p>Evidence checks describe only the displayed checklist: deployed bytecode, matched runtime source, recognized backing interfaces and decoded control or bridge policies. The fraction is not overall risk-assessment coverage. Missing authority paths, reserves, strategies and incident history remain unresolved where the adapters cannot establish them.</p><h2>Networks and bridges</h2><p>Network configurations cover the 20 EVM mainnets selected by chain DeFi TVL on ${CHAIN_SELECTION.asOf}, including Polygon PoS. Hyperliquid L1 selects its HyperEVM execution environment; its chain TVL also covers activity outside that environment. Layer 2 and checkpoint dependencies use configured parent networks. Independent L1s do not inherit Ethereum automatically.</p><p>Observed mint and release paths affect every fungible claim sharing that token or backing, independent of acquisition route. Bridge discovery is bounded, and does not establish exhaustive mint permissions or cross-chain solvency. LayerZero peer IDs come from its published metadata catalog.</p><h2>Browser caching</h2><p>Results are cached for two minutes in IndexedDB. Runtime-matched metadata is cached by code hash for 24 hours. Refresh bypasses the result cache. Expired snapshots used after a failed request are labeled; cancelled or interrupted scans do not replace a completed cached result. No backend, wallet connection or API key is required.</p><h2>Examples</h2><p>The four shortcuts contain addresses only: rsETH on Arbitrum, an ERC-4626 vault, a V2 LP token and an Aave deposit token. They invoke the same discovery path as a pasted address. The app contains no precomputed token graphs, scores, risk ratings or incident results.</p></section>`+footer();
}
function showSources(){
 $('#modal-content').innerHTML=`<div class="modal-header"><h2>Data sources</h2><button class="icon-btn" data-action="close" aria-label="Close">${icon('close')}</button></div><div class="method-page"><p>Token results are calculated from public RPC reads. Runtime source matching uses <a href="https://sourcify.dev" target="_blank" rel="noopener">Sourcify ↗</a>. Observed bridge configurations come from contracts, with peer IDs from <a href="https://metadata.layerzero-api.com/v1/metadata" target="_blank" rel="noopener">LayerZero metadata ↗</a>.</p><p>The network selection uses <a href="${CHAIN_SELECTION.source}" target="_blank" rel="noopener">DefiLlama chain TVL ↗</a>, reviewed ${CHAIN_SELECTION.asOf}. <a href="https://l2beat.com" target="_blank" rel="noopener">L2BEAT ↗</a> is a reference for further network research; its ratings are not imported into the exposure metric.</p><p>Inspect Evidence & coverage in a result for its block numbers, evidence checks, read log and discovery limits.</p></div>`;
 $('#modal').showModal();
}
function persist(){try{localStorage.setItem(savedKey,JSON.stringify(saved));}catch{toast('Browser storage is unavailable.');}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);}
function openAddress(chainId,address){state.chainId=Number(chainId);state.page='explorer';lookupLive(state.chainId,address);}
document.addEventListener('click',e=>{
 if(handleLiveClick(e))return;
 const example=e.target.closest('[data-live-example]');if(example){const x=liveExamples[Number(example.dataset.liveExample)];openAddress(x.chainId,x.address);return;}
 const page=e.target.closest('[data-page]');if(page){state.page=page.dataset.page;shell();window.scrollTo(0,0);return;}
 const address=e.target.closest('[data-saved-address]');if(address){const x=saved[Number(address.dataset.savedAddress)];openAddress(x.chainId,x.address);return;}
 const remove=e.target.closest('[data-remove-address]');if(remove){saved.splice(Number(remove.dataset.removeAddress),1);persist();shell();return;}
 const action=e.target.closest('[data-action]')?.dataset.action;
 if(action==='menu'){$('.sidebar').classList.toggle('open');$('.mobile-overlay').classList.toggle('open');}
 if(action==='sources')showSources();if(action==='close')$('#modal').close();
 if(action==='save'&&activeInput()){const x=activeInput();saved=savedInput()?saved.filter(y=>!(y.chainId===x.chainId&&y.address.toLowerCase()===x.address)):[...saved,{...x}];persist();shell();}
});
document.addEventListener('change',e=>{if(e.target.id==='chain')state.chainId=Number(e.target.value);});
document.addEventListener('submit',e=>{
 if(e.target.id!=='search-form')return;e.preventDefault();const address=$('#token-search').value.trim();state.chainId=Number($('#chain').value);
 if(!isAddress(address)){const error=$('#search-error');error.textContent='Enter a contract address: 0x followed by 40 hexadecimal characters.';error.hidden=false;$('#token-search').focus();return;}
 openAddress(state.chainId,address);
});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('#modal').open){e.preventDefault();$('#token-search')?.focus();}});
onLiveRender((chainId,starting)=>{if(starting)state.page='explorer';if(state.page==='explorer'){state.chainId=Number(chainId)||state.chainId;shell();}});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}});
shell();
// Preserve existing real-address links without retaining curated analysis results.
const legacyAddresses={wsteth:'0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',steth:'0xae7ab96520de3a18e5e111b5eaab095312d7fe84'};
if(isAddress(params.get('address')||'')&&CHAINS[Number(params.get('chainId'))])openAddress(Number(params.get('chainId')),params.get('address'));
else if(legacyAddresses[params.get('asset')])openAddress(1,legacyAddresses[params.get('asset')]);
