import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,nodes,collect,depth,riskFactors,riskLevel,lookup,validateAddress,relatedNodes} from '../dist/model.js';
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
 const {relevantIncidents}=await import('../dist/model.js');
 assert.equal(relevantIncidents(scenario('lp')).length,1);
 assert.equal(relevantIncidents(scenario('usdc'))[0].id,'usdc-svb-2023');
 assert.equal(relevantIncidents(scenario('eth')).length,0);
});
