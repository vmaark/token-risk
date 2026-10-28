import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAbiParameters } from 'viem';
import { Discovery, decodeUln, peerAddress, verifiedMetadata } from '../discovery/engine.js';
import { ReadSession, ZERO, nodeId } from '../discovery/rpc.js';
import { cachedDiscovery, RESULT_TTL, resultKey } from '../discovery/cache.js';
const A='0x1111111111111111111111111111111111111111', B='0x2222222222222222222222222222222222222222', C='0x3333333333333333333333333333333333333333', D='0x4444444444444444444444444444444444444444', E='0x5555555555555555555555555555555555555555';
const peer=a=>'0x'+'0'.repeat(24)+a.slice(2);
const ok=value=>({ok:true,value}),fail={ok:false,error:{code:'REVERT'}};
class MockSession {
 constructor(resolve){this.resolve=resolve;this.calls=0;this.reads=[];this.fetcher=async()=>new Response('{}',{status:404});}
 async snapshot(chainId){return {chainId,number:100,hex:'0x64',hash:'0xabc',timestamp:1000,finality:'finalized'};}
 async code(){return '0x6000';}async storage(){return '0x'+'0'.repeat(64);}
 async batch(chain,calls){this.calls+=calls.length;return calls.map(c=>this.resolve(chain,c.address,c.signature,c.args||[])??fail);}
 async read(chain,address,signature,args=[]){return (await this.batch(chain,[{address,signature,args}]))[0];}
 async states(){return [await this.snapshot(1)];}
}
const fn=s=>s.match(/function (\w+)/)[1];
const rootMeta=(a,s)=>['symbol','name'].includes(fn(s))?ok(a===A?'VAULT':'ASSET'):fn(s)==='decimals'?ok(18):fn(s)==='totalSupply'?ok(100n):undefined;
test('ERC-4626 recursively resolves assets, handles cycles, and never invents weights',async()=>{
 const session=new MockSession((c,a,s)=>rootMeta(a,s)||({'asset':ok(a===A?B:A),'totalAssets':ok(200n),'convertToAssets':ok(2n)})[fn(s)]);
 const result=await new Discovery({session}).run({chainId:1,address:A});assert.equal(result.nodes.filter(n=>n.address===A).length,1);assert.equal(result.edges.filter(e=>e.kind==='backing').length,2);assert.equal(result.nodes.find(n=>n.id===nodeId(1,A)).adapter,'erc4626');assert.equal(result.edges[1]?.weight,undefined);assert.match(result.coverage.authority,/partial/);
});
test('V2 factory registration must point back to the pair',async()=>{
 const resolve=registered=>(c,a,s)=>rootMeta(a,s)||(a===A?({token0:ok(B),token1:ok(C),factory:ok(D),getReserves:ok([12n,34n,0])})[fn(s)]:a===D&&fn(s)==='getPair'?ok(registered):undefined);
 const yes=await new Discovery({session:new MockSession(resolve(A))}).run({chainId:1,address:A});assert.equal(yes.nodes[0].adapter,'uniswap-v2');assert.equal(yes.edges.filter(e=>e.kind==='backing').length,2);
 const no=await new Discovery({session:new MockSession(resolve(E))}).run({chainId:1,address:A});assert.equal(no.edges.filter(e=>e.kind==='backing').length,0);
});
test('Unknown token and synthetic minter do not imply on-chain collateral',async()=>{
 const session=new MockSession((c,a,s)=>rootMeta(a,s)||(a===A&&fn(s)==='minter'?ok(B):undefined));const result=await new Discovery({session}).run({chainId:1,address:A});assert.equal(result.edges.filter(e=>e.kind==='backing').length,0);assert.ok(result.edges.some(e=>e.kind==='governance'));assert.match(result.nodes[0].unknowns.join(' '),/Off-chain backing is not inferred/);
});
const ulndata=encodeAbiParameters([{type:'tuple',components:[{type:'uint64'},{type:'uint8'},{type:'uint8'},{type:'uint8'},{type:'address[]'},{type:'address[]'}]}],[[20n,1,2,1,[D],[B,C]]]);
test('ULN keeps required and optional quorum separate; non-EVM peers are not truncated',()=>{const c=decodeUln(ulndata);assert.equal(c.requiredDVNCount,1);assert.equal(c.optionalDVNThreshold,1);assert.equal(c.optionalDVNs.length,2);assert.equal(peerAddress(peer(A)),A);assert.equal(peerAddress('0x'+'1'.repeat(64)),null);assert.equal(decodeUln('0xdead'),null);});
test('OFT follows reciprocal escrow and every observed incoming release path, including grace library',async()=>{
 const endpoints=[{eid:30101,name:'Ethereum'},{eid:30110,name:'Arbitrum'},{eid:99999,name:'Other source'}];
 const session=new MockSession((chain,a,s,args)=>{
  const f=fn(s);if(rootMeta(a,s))return rootMeta(a,s);
  if(f==='endpoint'&&[A,B].includes(a))return ok(E);
  if(f==='token'&&a===A)return ok(A);if(f==='token'&&a===B)return ok(C);
  if(f==='peers'){if(a===A&&args[0]===30101)return ok(peer(B));if(a===B&&args[0]===30110)return ok(peer(A));if(a===B&&args[0]===99999)return ok(peer(D));return ok('0x'+'0'.repeat(64));}
  if(f==='getReceiveLibrary')return ok([D,false]);if(f==='receiveLibraryTimeout')return ok([C,500n]);if(f==='defaultReceiveLibraryTimeout')return ok([ZERO,0n]);if(f==='getConfig')return ok(ulndata);if(f==='balanceOf')return ok(123n);
 });
 const result=await new Discovery({session,catalog:endpoints}).run({chainId:42161,address:A});const groups=result.nodes.filter(n=>n.type==='Bridge authorization');assert.equal(groups.length,2);const escrow=groups.find(n=>n.chainId===1);assert.equal(escrow.paths.length,2);assert.ok(escrow.paths.some(p=>p.sourceEid===99999));assert.equal(escrow.paths[0].grace.length,1);assert.equal(escrow.paths[0].grace[0].config.requiredDVNs[0].toLowerCase(),D);assert.ok(result.edges.some(e=>e.from===nodeId(1,B)&&e.to===nodeId(1,C)&&e.kind==='backing'));assert.equal(result.edges.find(e=>e.from===nodeId(1,B)&&e.to===nodeId(1,C)).amount,'123');
});
test('Missing reciprocal peer does not create an escrow backing edge',async()=>{const session=new MockSession((c,a,s,args)=>rootMeta(a,s)||({endpoint:ok(E),token:ok(a),peers:ok(a===A?peer(B):'0x'+'0'.repeat(64))})[fn(s)]);const result=await new Discovery({session,catalog:[{eid:30101,name:'Ethereum'}]}).run({chainId:42161,address:A});assert.equal(result.edges.filter(e=>e.kind==='backing').length,0);});
class MemoryCache {constructor(){this.entries=new Map();this.now=Date.now();}async get(k,{allowExpired=false}={}){const e=this.entries.get(k);return e&&(allowExpired||e.expiresAt>this.now)?{...e,stale:e.expiresAt<=this.now}:null;}async set(k,value,ttl){this.entries.set(k,{value,savedAt:this.now,expiresAt:this.now+ttl});}}
test('Result cache respects chain, casing, TTL and explicit refresh',async()=>{const cache=new MemoryCache();let calls=0;const input={chainId:1,address:A};const run=async()=>({coverage:{interrupted:false},n:++calls});assert.equal((await cachedDiscovery(input,{cache,run})).cache.status,'fresh');assert.equal((await cachedDiscovery(input,{cache,run})).cache.status,'hit');assert.equal(calls,1);await cachedDiscovery(input,{cache,run,refresh:true});assert.equal(calls,2);cache.now+=RESULT_TTL+1;await cachedDiscovery(input,{cache,run});assert.equal(calls,3);assert.notEqual(resultKey(1,A),resultKey(42161,A));assert.equal(resultKey(1,A),resultKey(1,A.toUpperCase()));});
test('Expired cache fallback is labeled stale; interrupted or cancelled scans do not overwrite it',async()=>{const cache=new MemoryCache(),input={chainId:1,address:A};await cachedDiscovery(input,{cache,run:async()=>({coverage:{interrupted:false},n:1})});cache.now+=RESULT_TTL+1;const stale=await cachedDiscovery(input,{cache,run:async()=>{throw new Error('offline');}});assert.equal(stale.cache.status,'stale');assert.equal(stale.n,1);await cachedDiscovery(input,{cache,run:async()=>({coverage:{interrupted:true},n:2})});assert.equal((await cache.get(resultKey(1,A),{allowExpired:true})).value.n,1);await assert.rejects(()=>cachedDiscovery(input,{cache,run:async()=>{throw Object.assign(new Error('cancelled'),{code:'ABORTED'});}}));});
test('Source metadata is accepted only when runtime code hash matches',async()=>{const session={fetcher:async()=>new Response(JSON.stringify({runtimeMatch:'exact_match',runtimeBytecode:{onchainBytecode:'0x6001'},abi:[]}))};assert.equal((await verifiedMetadata(session,1,A,'0x6000')).verified,false);assert.equal((await verifiedMetadata(session,1,A,'0x6001')).verified,true);});
test('RPC refuses a wrong chain and pins contract reads to a recorded block',async()=>{const requested=[];const fetcher=async(url,options)=>{const body=JSON.parse(options.body);const queries=Array.isArray(body)?body:[body];requested.push(...queries);return new Response(JSON.stringify(queries.map(q=>({jsonrpc:'2.0',id:q.id,result:q.method==='eth_chainId'?'0x1':q.method==='eth_getBlockByNumber'?{number:'0x64',hash:'0xabc',timestamp:'0x1'}:q.method==='eth_getCode'?'0x6000':'0x'}))));};const session=new ReadSession({},fetcher);await session.code(1,A);assert.equal(requested.find(q=>q.method==='eth_getCode').params[1],'0x64');await assert.rejects(()=>new ReadSession({},fetcher).snapshot(42161),/wrong network/);});
test('Aave reserve cross-check rejects a different aToken and accepts matching registration',async()=>{
 const resolve=registered=>(c,a,s)=>rootMeta(a,s)||(a===A?({UNDERLYING_ASSET_ADDRESS:ok(B),POOL:ok(C)})[fn(s)]:a===C&&fn(s)==='getReserveData'?ok([0n,0n,0n,0n,0n,0n,0n,0,registered,ZERO,ZERO,ZERO,0n,0n,0n]):undefined);
 const no=await new Discovery({session:new MockSession(resolve(D))}).run({chainId:1,address:A});assert.equal(no.edges.filter(e=>e.kind==='backing').length,0);
 const yes=await new Discovery({session:new MockSession(resolve(A))}).run({chainId:1,address:A});assert.equal(yes.nodes[0].adapter,'aave-v3');assert.ok(yes.edges.some(e=>e.to===nodeId(1,B)&&e.kind==='backing'));
});
test('Recursion boundary leaves an explicit unresolved dependency',async()=>{const session=new MockSession((c,a,s)=>rootMeta(a,s)||({asset:ok(a===A?B:C),totalAssets:ok(5n),convertToAssets:ok(1n)})[fn(s)]);const result=await new Discovery({session,maxDepth:0}).run({chainId:1,address:A});const child=result.nodes.find(n=>n.id===nodeId(1,B));assert.match(child.unknowns.join(' '),/Recursion limit/);assert.equal(result.edges.filter(e=>e.kind==='backing').length,1);});
test('RPC read budget is enforced before issuing a batch',async()=>{let fetched=false;const s=new ReadSession({},async()=>{fetched=true;throw new Error('must not fetch');},{maxCalls:1});await assert.rejects(()=>s.rpc(1,[{method:'eth_chainId',params:[]},{method:'eth_chainId',params:[]}]),/budget/);assert.equal(fetched,false);});

test('Independent EVM L1s do not inherit Ethereum; L2s and checkpoints retain their parent',()=>{
 const l1=new Discovery({session:new MockSession(()=>fail)});l1.network({id:'token',chainId:56});
 assert.deepEqual(l1.nodes.map(n=>n.id),['network:56']);
 assert.ok(l1.nodes[0].unknowns.every(s=>!s.includes('sequencer')));
 const l2=new Discovery({session:new MockSession(()=>fail)});l2.network({id:'token',chainId:8453});
 assert.deepEqual(new Set(l2.nodes.map(n=>n.id)),new Set(['network:8453','network:1']));
 assert.ok(l2.edges.some(e=>e.from==='network:8453'&&e.to==='network:1'));
 const sidechain=new Discovery({session:new MockSession(()=>fail)});sidechain.network({id:'token',chainId:137});
 assert.ok(sidechain.nodes.find(n=>n.id==='network:137').unknowns.some(s=>s.includes('checkpoint')));
 assert.ok(sidechain.edges.some(e=>e.from==='network:137'&&e.to==='network:1'));
});
