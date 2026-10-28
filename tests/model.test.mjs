import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,nodes,collect,depth,riskFactors,riskLevel,lookup,validateAddress,relatedNodes,exposureEdges,authorityExposure,relevantIncidents} from './fixtures/curated-model.js';
const scenario=id=>scenarios.find(s=>s.id===id);
test('LP recursively resolves wrapped staking and reserves; shared Ethereum is counted once',()=>{
 const result=collect(scenario('lp'));
 assert.equal(result.length,6);
 assert.equal(result.filter(n=>n.id==='eth').length,1);
 assert.deepEqual(new Set(result.map(n=>n.id)),new Set(['lp','wsteth','steth','eth','usdc','usd']));
 assert.equal(depth(scenario('lp')),4);
 assert.ok(riskFactors(scenario('lp')).includes('Issuer & reserves'));
 assert.ok(riskFactors(scenario('lp')).includes('Staking'));
 assert.equal(riskLevel(scenario('lp')),'high');
});
test('canonical bridge contributes governance and bridge risk while preserving underlying exposure',()=>{
 const s=scenario('arbitrum');
 assert.equal(depth(s),5);
 assert.ok(collect(s).some(n=>n.id==='eth'));
 assert.ok(riskFactors(s).includes('Bridge'));
 assert.ok(riskFactors(s).includes('Staking'));
 assert.equal(nodes.bridge.controls.find(c=>c[0]==='Security council')[1],'9 of 12 signatures');
});
test('native ETH has one base layer and no wrapper dependencies',()=>{
 const s=scenario('eth');
 assert.equal(collect(s).length,1);
 assert.equal(depth(s),1);
 assert.equal(riskLevel(s),'low');
 assert.deepEqual(riskFactors(s),['Consensus','Cryptography']);
});
test('addresses are case insensitive, trimmed, and scoped by chain',()=>{
 const s=scenario('wsteth');
 assert.equal(lookup(` ${s.address.toUpperCase()} `,'ethereum'),s);
 assert.equal(lookup(s.address,'arbitrum'),undefined);
 assert.equal(lookup('USDC','ethereum'),scenario('usdc'));
 assert.equal(lookup('USDC','arbitrum'),undefined);
 assert.equal(lookup('0x0000000000000000000000000000000000000000','ethereum'),undefined);
});
test('EVM address validation rejects invalid formats',()=>{
 assert.equal(validateAddress(scenario('steth').address),true);
 for(const value of ['0x1234','0x'+'g'.repeat(40),'0x'+'a'.repeat(41),'USDC',''])assert.equal(validateAddress(value),false);
});
test('dependency selection follows descendants without unrelated assets',()=>{
 const related=relatedNodes(scenario('lp'),'wsteth');
 assert.deepEqual(related,new Set(['wsteth','steth','eth']));
 assert.equal(related.has('usdc'),false);
});
test('graph traversal and depth tolerate a cycle in adapter input',()=>{
 const s={root:'eth',edges:[['eth','steth',1],['steth','eth',1]]};
 assert.equal(collect(s).length,2);
 assert.equal(depth(s),2);
});
test('every registered scenario references existing nodes and all nodes are reachable',()=>{
 for(const s of scenarios){assert.ok(nodes[s.root]);for(const [a,b]of s.edges){assert.ok(nodes[a]);assert.ok(nodes[b]);}assert.ok(collect(s).length>0);}
});

test('a historical reserve event is inherited by LP exposure and deduplicated',async()=>{
 const {relevantIncidents}=await import('./fixtures/curated-model.js');
 assert.equal(relevantIncidents(scenario('lp')).length,1);
 assert.equal(relevantIncidents(scenario('usdc'))[0].id,'usdc-svb-2023');
 assert.equal(relevantIncidents(scenario('eth')).length,0);
});

test('shared supply inherits every authority regardless of acquisition route',()=>{
 const base=scenario('shared');
 const baseline=collect(base).map(n=>n.id).sort();
 assert.ok(baseline.includes('demoexternal'));
 assert.ok(baseline.includes('democanonical'));
 // Authorities are discovered from the supply domain, not manually selected route edges.
 assert.equal(base.edges.some(e=>e[1]==='demoexternal'),false);
 for(const acquisitionRoute of ['canonical','external','dex']){
   const s={...base,acquisitionRoute};
   assert.deepEqual(collect(s).map(n=>n.id).sort(),baseline);
   assert.deepEqual(authorityExposure(s).map(n=>n.id).sort(),['democanonical','demoexternal']);
   assert.equal(riskLevel(s),'high');
   assert.ok(riskFactors(s).includes('Supply integrity'));
 }
});

test('backing and authority edges are distinct and authority discovery is deduplicated',()=>{
 const base=scenario('shared');
 const s={...base,edges:[...base.edges,['demobacking','demoexternal',1,'authority']]};
 const edges=exposureEdges(s);
 assert.equal(edges.filter(e=>e[0]==='demobacking'&&e[1]==='demoexternal'&&e[3]==='authority').length,1);
 assert.ok(edges.some(e=>e[0]==='sharedtoken'&&e[1]==='demobacking'&&e[3]==='backing'));
 assert.equal(collect(s).filter(n=>n.id==='demobacking').length,1);
});

test('Kelp incident propagates through shared escrow into an Aave position',()=>{
 const s=scenario('kelp');
 const ids=collect(s).map(n=>n.id);
 assert.ok(ids.includes('kelproute'));
 assert.ok(ids.includes('kelpescrow'));
 assert.ok(ids.includes('rseth'));
 assert.ok(relatedNodes(s,'l2rseth').has('kelproute'));
 assert.equal(relevantIncidents(s).filter(i=>i.id==='kelp-rseth-2026').length,1);
 assert.equal(s.authorityCoverage,'partial-historical');
 assert.equal(depth(s),5);
});

test('supply-domain exposure is not inferred from token symbols or unrelated routes',()=>{
 for(const id of ['eth','wsteth','arbitrum']){
   assert.equal(collect(scenario(id)).some(n=>n.id==='kelproute'),false);
   assert.equal(relevantIncidents(scenario(id)).some(i=>i.id==='kelp-rseth-2026'),false);
 }
 assert.equal(relevantIncidents({...scenario('eth'),root:'rseth',edges:[['rseth','eth',1]]}).some(i=>i.id==='kelp-rseth-2026'),false);
});

test('an authority failure highlights dependent token holders and Aave, without inferring unrelated base-asset losses',async()=>{
 const {affectedDependents}=await import('./fixtures/curated-model.js');
 assert.deepEqual(affectedDependents(scenario('shared'),'demoexternal'),new Set(['demoexternal','demobacking','sharedtoken']));
 assert.deepEqual(affectedDependents(scenario('kelp'),'kelproute'),new Set(['kelproute','kelpescrow','l2rseth','aaverseth']));
 assert.equal(affectedDependents(scenario('kelp'),'kelproute').has('rseth'),false);
 assert.equal(affectedDependents(scenario('kelp'),'kelproute').has('eth'),false);
});
