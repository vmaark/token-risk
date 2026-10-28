import { CATEGORIES, assessExposure } from './exposure.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const views=new Map();
export function exposureBadge(assessment,id){const n=assessment.perNode[id];return n?`<span class="eu-node-badge" title="Known dimensions introduced here; severity unassessed">+${n.units} EU${n.unresolved?' <i>?</i>':''}</span>`:'';}
export function nodeExposure(assessment,id){const n=assessment.perNode[id];if(!n)return '';return `<section class="eu-node-assessment"><div class="small-label">EXPOSURE UNITS · V1.1</div><div class="eu-node-number">+${n.units}<span>EU introduced here</span></div><p>Severity unassessed. Shared system dimensions are assigned once at the earliest layer.</p>${n.dimensions.length?`<ul>${n.dimensions.map(f=>`<li><i style="background:${CATEGORIES.find(c=>c.id===f.category).color}"></i>${esc(f.label)} <b>+1</b></li>`).join('')}</ul>`:n.inheritedDimensions.length?`<p>${n.inheritedDimensions.map(r=>`${esc(r.dimension)} exposure is inherited through ${esc(r.name)} and counted there.`).join(' ')} This model has not separately assessed the representation contract’s code or local controls; those remain unknown.</p>`:'<p>No additional dimension established. This is not evidence of safety.</p>'}<details><summary>Evidence checks · ${n.checks.filter(c=>c.passed).length}/${n.checks.length}</summary>${n.checks.map(c=>`<div class="eu-check"><span>${c.passed?'✓':'?'}</span>${esc(c.label)}</div>`).join('')}</details></section>`;}
export function exposurePanel(graph,scope){
 const assessment=assessExposure(graph);
 const previous=views.get(scope);
 const fingerprint=JSON.stringify([graph.root,graph.nodes.map(n=>n.id).sort(),assessment.total]);
 const same=previous?.fingerprint===fingerprint;
 const record={graph,assessment,fingerprint,expanded:same?previous.expanded:false,mode:same?previous.mode:'cumulative',stage:same?Math.min(previous.stage,assessment.layers.length-1):assessment.layers.length-1};
 views.set(scope,record);
 return markup(record,scope);
}
function markup(record,scope){
 const {assessment:a,graph,mode,stage,expanded}=record;
 const isCumulative=!expanded||mode==='cumulative';
 const layer=a.layers[expanded?stage:a.layers.length-1];
 const chartLayers=expanded?a.layers:[a.layers.at(-1)];
 const max=Math.max(4,...chartLayers.map(l=>isCumulative?l.totalUnits:l.addedUnits));
 const ceiling=Math.ceil(max/4)*4;
 const units=ceiling/4;
 const categories=CATEGORIES.filter(c=>a.categoryTotals[c.id]);
 const nodeIds=expanded?layer.nodes:a.layers.flatMap(l=>l.nodes);
 const root=graph.nodes.find(n=>n.id===graph.root);
 const tokenLabel=root?.name||root?.symbol||layer.label;
 const backingCount=graph.edges.filter(e=>e.kind==='backing'&&a.perNode[e.from]&&a.perNode[e.to]).length;
 return `<section class="panel exposure-panel ${expanded?'eu-expanded':'eu-collapsed'}" data-exposure-panel="${esc(scope)}" aria-label="Exposure by layer chart">
 <div class="panel-header"><div><div class="panel-title">Exposure by layer <span class="pill">EXPOSURE UNITS · V1.1</span></div><div class="panel-desc">${expanded?'Exposure introduced at each dependency layer, from base assets to the selected token.':'Full known exposure for the selected token, including its underlying systems.'}</div></div><button class="solid-btn eu-breakdown-toggle" data-exposure-toggle aria-expanded="${expanded}" aria-controls="${esc(scope)}-exposure-chart"><span aria-hidden="true">${expanded?'−':'+'}</span>${expanded?'Show full exposure':'Show layer breakdown'}</button></div>
 <div class="eu-summary" aria-label="Exposure summary"><div><b>${a.total}<small>EU</small></b><span>Known exposure units</span></div><div><b>${a.layers.length}</b><span>Structural layers</span></div><div><b>${backingCount}</b><span>Backing relationships</span></div><div><b>${a.checks.passed}<small>/ ${a.checks.total}</small></b><span>Evidence checks answered</span></div></div>
 ${expanded?`<div class="eu-chart-controls"><span>View exposure by layer</span><div class="switcher" aria-label="Chart aggregation"><button data-exposure-mode="cumulative" aria-pressed="${isCumulative}" class="${isCumulative?'active':''}">Cumulative</button><button data-exposure-mode="added" aria-pressed="${!isCumulative}" class="${!isCumulative?'active':''}">Added per layer</button></div></div>`:''}
 <div class="eu-chart-layout" id="${esc(scope)}-exposure-chart"><div class="eu-chart-scroll"><div class="eu-chart" style="--eu-columns:${chartLayers.length};${expanded?`min-width:${Math.max(520,chartLayers.length*125)}px`:''}"><div class="eu-axis-label">${expanded?(isCumulative?'Cumulative':'Added'):'Full'} exposure units</div><div class="eu-grid" aria-hidden="true">${[4,3,2,1,0].map(i=>`<div style="top:${(4-i)*25}%"><span>${i*units}</span></div>`).join('')}</div><div class="eu-columns">${chartLayers.map(l=>{
  const i=a.layers.indexOf(l),counts=isCumulative?l.totals:l.added;
  const value=isCumulative?l.totalUnits:l.addedUnits;
  const unknown=isCumulative?l.cumulativeUnknown:l.unresolved;
  return `<${expanded?'button':'div'} class="eu-column ${expanded&&stage===i?'selected':''}" ${expanded?`data-exposure-stage="${i}" aria-pressed="${stage===i}"`:''} aria-label="${expanded?'Layer '+(i+1)+': '+esc(l.label):'Full exposure for '+esc(tokenLabel)}, ${value} ${isCumulative?'cumulative':'added'} exposure units; ${unknown} nodes unresolved"><div class="eu-stack-space"><div class="eu-stack" style="height:${value/ceiling*100}%"><strong>${value}</strong>${CATEGORIES.filter(c=>counts[c.id]).map(c=>`<span class="eu-segment" style="height:${counts[c.id]/Math.max(value,1)*100}%;background:${c.color}" title="${esc(c.name)}: ${counts[c.id]} EU">${counts[c.id]>=2?counts[c.id]:''}</span>`).reverse().join('')}</div></div><div class="eu-column-label"><small>${expanded?(i===a.layers.length-1?'YOUR TOKEN':'LAYER '+(i+1)):'ALL LAYERS COMBINED'}</small><b>${esc(expanded?(l.label||'Base systems'):tokenLabel)}</b><span>${expanded?'+'+l.addedUnits+' EU this layer':value+' EU total'}</span></div></${expanded?'button':'div'}>`;
 }).join('')}</div></div></div>
 ${expanded?'':`<div class="eu-total-categories"><h3>Exposure by category</h3><p>Each category includes the distinct systems across all ${a.layers.length} layers.</p><dl>${categories.map(c=>`<div><dt><i style="background:${c.color}"></i>${esc(c.name)}</dt><dd>${a.categoryTotals[c.id]} <span>EU</span></dd></div>`).join('')}</dl></div>`}</div>
 ${expanded?`<div class="eu-legend">${categories.map(c=>`<span><i style="background:${c.color}"></i>${esc(c.name)} <b>${a.categoryTotals[c.id]}</b></span>`).join('')}</div>`:''}
 <div class="eu-layer-detail" aria-live="polite"><div class="eu-layer-intro"><span class="eyebrow">${expanded?'LAYER '+(stage+1)+' · '+esc(layer.label):'ALL CONTRIBUTING SYSTEMS'}</span><h3>${expanded?'+'+layer.addedUnits+' EU added <span>→ '+layer.totalUnits+' EU cumulative</span>':a.total+' EU across '+nodeIds.length+' systems'}</h3><p>${expanded?layer.unresolved+' newly introduced nodes have unresolved questions.':a.unresolvedNodes+' nodes across the full dependency graph have unresolved questions.'} Select a system to inspect its contribution.</p></div><div class="eu-layer-nodes">${nodeIds.map(id=>{const n=graph.nodes.find(n=>n.id===id);return `<button data-exposure-node="${esc(id)}"><span>${esc(n.symbol||n.name)}<small>${esc(n.type)}</small></span>${exposureBadge(a,id)}</button>`;}).join('')}</div></div>
 <div class="eu-footnote"><b>1 EU = one distinct system × risk dimension.</b> Shared dimensions count once. Equal weights measure discovered exposure breadth, not loss probability or severity. Partial coverage can undercount exposure; comparisons require matching scope.</div><details class="eu-method"><summary>Metric rules, limitations & full data table</summary><p>${esc(a.formula)}. No 0–100 normalization, economic-value weights or automatic “safe” labels are applied. Verifier/signer quorums remain visible evidence and do not create automatic score discounts.</p><p>Chart stages follow backing relationships, with shared controls at the earliest dependent layer; they are not transaction history. Cyclic backing components share one stage. Explicitly modeled bridge/representation pairs share a chart step; the representation inherits the bridge dimension already counted at the bridge. Both graph nodes remain available for inspection.</p><p>Evidence checks count only the displayed checklist items; this is not percentage coverage of all risks. Missing sources, incomplete authority discovery and unassessed incidents can matter beyond these counts.</p><table><caption>${esc(isCumulative?'Cumulative exposure by stage':'Exposure introduced at each stage')} · EU</caption><thead><tr><th>Layer</th>${CATEGORIES.map(c=>`<th>${esc(c.name)}</th>`).join('')}<th>Total</th><th>Added</th><th>Unresolved nodes</th></tr></thead><tbody>${a.layers.map(l=>`<tr><th>${esc(l.label)}</th>${CATEGORIES.map(c=>`<td>${(isCumulative?l.totals:l.added)[c.id]}</td>`).join('')}<td>${isCumulative?l.totalUnits:l.addedUnits}</td><td>${l.addedUnits}</td><td>${isCumulative?l.cumulativeUnknown:l.unresolved}</td></tr>`).join('')}</tbody></table></details></section>`;
}
export function handleExposureClick(event,selectNode){
 const panel=event.target.closest('[data-exposure-panel]');if(!panel)return false;
 const scope=panel.dataset.exposurePanel,record=views.get(scope);if(!record)return false;
 const toggle=event.target.closest('[data-exposure-toggle]'),mode=event.target.closest('[data-exposure-mode]'),stage=event.target.closest('[data-exposure-stage]'),node=event.target.closest('[data-exposure-node]');
 if(node){selectNode(node.dataset.exposureNode);return true;}
 if(toggle)record.expanded=!record.expanded;
 else if(mode)record.mode=mode.dataset.exposureMode;
 else if(stage)record.stage=Number(stage.dataset.exposureStage);
 else return false;
 panel.outerHTML=markup(record,scope);
 const updated=document.querySelector(`[data-exposure-panel="${scope}"]`);
 updated?.querySelector(toggle?'[data-exposure-toggle]':mode?`[data-exposure-mode="${record.mode}"]`:`[data-exposure-stage="${record.stage}"]`)?.focus({preventScroll:true});
 return true;
}
