// Exposure Units v1 are a structural count, not estimated severity or loss probability.
// A fact is one distinct system × risk dimension. All facts have weight 1.
export const METRIC_VERSION='exposure-units-v1';
export const CATEGORIES=[
 {id:'network',name:'Network & cryptography',color:'#66c6da'},
 {id:'code',name:'Contract code',color:'#ad95f7'},
 {id:'control',name:'Privileged controls',color:'#efa76e'},
 {id:'bridge',name:'Bridge verification',color:'#ef87b7'},
 {id:'staking',name:'Staking & restaking',color:'#b6df83'},
 {id:'market',name:'Markets & oracles',color:'#719de9'},
 {id:'issuer',name:'Issuer & reserves',color:'#e3cc79'},
];
const riskMap={Consensus:['network','consensus'],Cryptography:['network','cryptography'],Infrastructure:['network','infrastructure'],'Smart contract':['code','contract-code'],Governance:['control','governance'],'Supply integrity':['control','supply-integrity'],Bridge:['bridge','message-verification'],Staking:['staking','staking'],Liquidity:['market','liquidity'],Market:['market','market'],Lending:['market','lending'],Oracle:['market','oracle'],'Issuer & reserves':['issuer','issuer-reserves']};
export function curatedGraph(scenario,nodes,edges){return {root:scenario.root,mode:'curated',nodes:nodes.map(n=>({...n,provenance:'curated'})),edges:edges.map(e=>({from:e[0],to:e[1],kind:e[3]||'backing'}))};}
function identity(n){return n.address&&n.chainId?`${n.chainId}:${n.address.toLowerCase()}`:n.id;}
function nodeFacts(n){
 const facts=[];const add=(category,dimension,label,system=identity(n))=>facts.push({key:`${system}|${dimension}`,nodeId:n.id,category,dimension,label,units:1});
 if(n.provenance==='curated'){
  for(const [risk,description] of n.risks||[]){const m=riskMap[risk];if(!m)continue;let system=identity(n);if(n.id==='eth')system='network:1';if(['usd','usdc'].includes(n.id)&&m[0]==='issuer')system='issuer:circle';add(m[0],m[1],`${risk}: ${description}`,system);}return facts;
 }
 const type=n.type||'';
 if(type==='Network security'){add('network','consensus','Network execution, consensus and liveness');add('network','cryptography','Signature and hash assumptions');}
 // Code is observed only when the bytecode read succeeded. Source matching is not a safety discount.
 if(n.codeHash)add('code','contract-code','Deployed contract code introduces an implementation dependency');
 if(type==='Governance / privileged control')add('control','governance','Observed privileged address can affect a dependent system');
 if(type==='Bridge authorization'){
  if(n.paths?.length)for(const p of n.paths){const system=`${n.id}:eid:${p.sourceEid}`;add('bridge','message-verification',`Inbound ${p.source} message policy`,system);for(const g of p.grace||[])add('bridge',`grace:${String(g.library).toLowerCase()}`,`Additional receive library accepted through block ${g.expiresAtBlock}`,system);}
  else add('bridge','message-verification','Bridge authorization interface; incoming paths unresolved');
 }
 if(['Liquid staked ETH','Staking system'].includes(type))add('staking','staking','Ethereum staking through Lido adds operator and slashing exposure','staking:lido');
 if(['Kelp liquid restaking token','Staking / custody'].includes(type))add('staking','staking','Kelp staking/restaking and custody dependencies','staking:kelp');
 if(['ERC-4626 vault','Aave-style deposit token','Compound-style lending token'].includes(type))add('market','liquidity','Redemption depends on protocol liquidity and withdrawal mechanics');
 if(type==='V2-style LP token'||type==='Balancer V2-style pool'||type==='Concentrated liquidity pool'){add('market','market','Pool-relative price exposure and LP payoff');add('market','liquidity','Pool liquidity and exit mechanics');}
 return facts;
}
function checksFor(n){
 if(n.provenance==='curated')return [{label:'Source references provided',passed:!!n.source?.length},{label:'Current chain state verified',passed:false}];
 if(n.type==='Network security')return [{label:'Network control configuration reviewed',passed:false}];
 if(n.type==='Bridge authorization')return n.paths?.length?n.paths.flatMap(p=>[{label:`${p.source}: receive policy decoded`,passed:!!p.config},...(p.grace||[]).map(g=>({label:`${p.source}: grace-library policy decoded`,passed:!!g.config}))]):[{label:'Incoming bridge policy decoded',passed:false}];
 if(n.type==='Governance / privileged control')return [{label:'Signer quorum decoded',passed:!!n.owners?.length&&n.threshold!==undefined}];
 if(n.address)return [{label:'Deployed bytecode read',passed:!!n.codeHash},{label:'Runtime source matched',passed:!!n.source?.verified},{label:'Backing interface recognized',passed:!!n.adapter||['Liquid staked ETH','Lido wrapped staking token','Wrapped native ETH'].includes(n.type)}];
 return [{label:'Detailed system controls reviewed',passed:false}];
}
// SCC condensation gives deterministic stages even when an adapter reports cycles.
function backingStages(ids,edges,byId){
 const adjacency=new Map(ids.map(id=>[id,[]]));for(const e of edges)if(['backing','market','strategy','collateral'].includes(e.kind)&&adjacency.has(e.from)&&adjacency.has(e.to))adjacency.get(e.from).push(e.to);
 let next=0;const index=new Map(),low=new Map(),stack=[],onStack=new Set(),components=[];
 function visit(v){index.set(v,next);low.set(v,next++);stack.push(v);onStack.add(v);for(const w of adjacency.get(v)){if(!index.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}else if(onStack.has(w))low.set(v,Math.min(low.get(v),index.get(w)));}if(low.get(v)===index.get(v)){const component=[];let w;do{w=stack.pop();onStack.delete(w);component.push(w);}while(w!==v);components.push(component);}}
 for(const id of [...ids].sort())if(!index.has(id))visit(id);
 const componentOf=new Map();components.forEach((c,i)=>c.forEach(id=>componentOf.set(id,i)));const memo=new Map();function height(i){if(memo.has(i))return memo.get(i);const children=new Set(components[i].flatMap(id=>adjacency.get(id)).map(id=>componentOf.get(id)).filter(j=>j!==i));const floor=components[i].every(id=>['Native asset','Network security','Off-chain backing'].includes(byId.get(id)?.type))?0:1;const value=children.size?Math.max(floor,1+Math.max(...[...children].map(height))):floor;memo.set(i,value);return value;}
 return {stages:new Map(ids.map(id=>[id,height(componentOf.get(id))])),cycles:components.filter(c=>c.length>1||adjacency.get(c[0]).includes(c[0]))};
}
export function assessExposure(graph){
 const byId=new Map(graph.nodes.map(n=>[n.id,n]));const reachable=new Set();const outgoing=new Map();for(const e of graph.edges)(outgoing.get(e.from)||outgoing.set(e.from,[]).get(e.from)).push(e);
 function walk(id){if(reachable.has(id)||!byId.has(id))return;reachable.add(id);for(const e of outgoing.get(id)||[])walk(e.to);}walk(graph.root);
 const activeNodes=[...reachable].map(id=>byId.get(id));const edges=graph.edges.filter(e=>reachable.has(e.from)&&reachable.has(e.to));
 const structural=new Set([graph.root]);function walkBacking(id){for(const e of outgoing.get(id)||[])if(['backing','market','strategy','collateral'].includes(e.kind)&&reachable.has(e.to)&&!structural.has(e.to)){structural.add(e.to);walkBacking(e.to);}}walkBacking(graph.root);
 const {stages,cycles}=backingStages([...structural],edges,byId);
 // Shared side controls are first introduced at the earliest dependent layer.
 for(let i=0;i<activeNodes.length;i++){let changed=false;for(const e of edges){if(['backing','market','strategy','collateral'].includes(e.kind)||!stages.has(e.from)||structural.has(e.to))continue;const candidate=stages.get(e.from);if(!stages.has(e.to)||stages.get(e.to)>candidate){stages.set(e.to,candidate);changed=true;}}if(!changed)break;}
 for(const n of activeNodes)if(!stages.has(n.id))stages.set(n.id,0);if(reachable.has('network:1'))stages.set('network:1',0);if(reachable.has('eth'))stages.set('eth',0);
 const allFacts=activeNodes.flatMap(nodeFacts);const chosen=new Map();for(const f of allFacts){const previous=chosen.get(f.key);if(!previous||stages.get(f.nodeId)<stages.get(previous.nodeId)||(stages.get(f.nodeId)===stages.get(previous.nodeId)&&f.nodeId.localeCompare(previous.nodeId)<0))chosen.set(f.key,f);}
 const facts=[...chosen.values()].sort((a,b)=>a.key.localeCompare(b.key));
 const perNode={};for(const n of activeNodes){const own=facts.filter(f=>f.nodeId===n.id);const checks=checksFor(n);const gaps=[...(n.unknowns||[])];if(n.provenance==='curated')gaps.push('Curated or illustrative model; current on-chain controls and full authority coverage are not verified.');if(cycles.some(c=>c.includes(n.id)))gaps.push('Cyclic backing relationship; cyclic nodes share a chart stage.');const hasGaps=gaps.length>0||checks.some(c=>!c.passed);perNode[n.id]={units:own.length,dimensions:own,checks,unresolved:hasGaps,gaps,stage:stages.get(n.id),severity:'not-assessed'};}
 const stageNumbers=[...new Set(stages.values())].sort((a,b)=>a-b);const totals=Object.fromEntries(CATEGORIES.map(c=>[c.id,0]));let cumulativeUnknown=0;
 const layers=stageNumbers.map((stage,i)=>{const addedNodes=activeNodes.filter(n=>stages.get(n.id)===stage).sort((a,b)=>a.id.localeCompare(b.id));const addedFacts=facts.filter(f=>stages.get(f.nodeId)===stage);const added=Object.fromEntries(CATEGORIES.map(c=>[c.id,addedFacts.filter(f=>f.category===c.id).length]));for(const c of CATEGORIES)totals[c.id]+=added[c.id];const unresolved=addedNodes.filter(n=>perNode[n.id].unresolved).length;cumulativeUnknown+=unresolved;const principal=addedNodes.filter(n=>structural.has(n.id));const names=(principal.length?principal:addedNodes).map(n=>n.id==='arbwsteth'?'Arbitrum wstETH':n.id==='bridge'?'Canonical bridge':n.type==='LayerZero OFT adapter / escrow'?(n.chainId===1?'Ethereum escrow':'Bridge escrow'):n.type==='Kelp liquid restaking token'?'Mainnet rsETH':n.id===graph.root&&n.chainId===42161?`Arbitrum ${n.symbol||n.name}`:n.symbol||n.name);return {index:i,stage,label:names.length>2?'Backing assets':names.join(' + '),nodes:addedNodes.map(n=>n.id),added,totals:{...totals},addedUnits:addedFacts.length,totalUnits:Object.values(totals).reduce((a,b)=>a+b,0),unresolved,cumulativeUnknown};});
 const checks=Object.values(perNode).flatMap(n=>n.checks);return {version:METRIC_VERSION,unit:'EU',formula:'1 EU per unique system × risk dimension; all dimensions weight 1; shared facts counted once',total:facts.length,categoryTotals:totals,perNode,layers,cycles,checks:{passed:checks.filter(c=>c.passed).length,total:checks.length},unresolvedNodes:Object.values(perNode).filter(n=>n.unresolved).length,limitations:['Structural exposure count, not severity, probability of loss, or a safety ranking.','Counts depend on adapter/model coverage; undiscovered dependencies contribute no known units. Unknown magnitude is not quantified.','Equal weights are a transparent v1 convention. Multisig/DVN counts, audits and incidents do not mechanically discount or increase units.','Branches accumulate as a union of dependencies; stage order is structural, not transaction history. No economic-value weights are applied.']};
}
