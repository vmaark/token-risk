import { encodeFunctionData, decodeFunctionResult, parseAbi, keccak256 } from 'viem';
export const ZERO='0x0000000000000000000000000000000000000000';
import { CHAINS } from './chains.js';
export { CHAINS } from './chains.js';
export const isAddress=a=>typeof a==='string'&&/^0x[0-9a-fA-F]{40}$/.test(a);
export const lower=a=>a.toLowerCase();
export const nodeId=(chainId,address)=>`${chainId}:${lower(address)}`;
export class DiscoveryError extends Error {constructor(code,message,status=502){super(message);this.code=code;this.status=status;}}
export async function boundedJson(response,maxBytes=2_000_000){
 if(!response.ok)throw new DiscoveryError('UPSTREAM_UNAVAILABLE',`Upstream returned HTTP ${response.status}.`);
 if(Number(response.headers.get('content-length')||0)>maxBytes)throw new DiscoveryError('RESPONSE_TOO_LARGE','Upstream response exceeded the discovery limit.');
 const reader=response.body.getReader();let total=0;const chunks=[];
 try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>maxBytes)throw new DiscoveryError('RESPONSE_TOO_LARGE','Upstream response exceeded the discovery limit.');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new DiscoveryError('INVALID_UPSTREAM_RESPONSE','Upstream did not return valid JSON.');}
}
export class ReadSession{
 constructor(env={},fetcher=fetch,options={}){this.env=env;this.fetcher=(...args)=>fetcher(...args);this.snapshots=new Map();this.cache=new Map();this.reads=[];this.calls=0;this.maxCalls=options.maxCalls||900;this.deadline=Date.now()+(options.timeoutMs||45000);this.signal=options.signal;}
 check(){if(this.signal?.aborted)throw new DiscoveryError('ABORTED','Lookup cancelled.',499);if(Date.now()>this.deadline)throw new DiscoveryError('TIME_BUDGET','Lookup time budget reached.');if(this.calls>this.maxCalls)throw new DiscoveryError('READ_BUDGET','RPC read budget reached.');}
 async rpc(chainId,items){
  this.check();const chain=CHAINS[chainId];if(!chain)throw new DiscoveryError('UNSUPPORTED_CHAIN','This network is not enabled.',400);
  const urls=this.env[`RPC_URL_${chainId}`]?[this.env[`RPC_URL_${chainId}`]]:chain.rpc;
  const queries=items.map((item,i)=>({jsonrpc:'2.0',id:i+1,method:item.method,params:item.params}));if(this.calls+queries.length>this.maxCalls)throw new DiscoveryError('READ_BUDGET','RPC read budget reached.');this.calls+=queries.length;
  let failure;
  for(const url of urls){
   try{
    if(!/^https:\/\//.test(url))throw new Error('Invalid RPC configuration');
    const response=await this.fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(queries.length===1?queries[0]:queries),signal:AbortSignal.any([AbortSignal.timeout(Math.max(1,Math.min(10000,this.deadline-Date.now()))),...(this.signal?[this.signal]:[])])});
    const body=await boundedJson(response);const list=Array.isArray(body)?body:[body];
    if(list.length!==queries.length)throw new Error('Incomplete RPC batch');
    return queries.map(q=>{const r=list.find(x=>x.id===q.id);if(!r||(!('result'in r)&&!r.error))throw new Error('Invalid RPC item');return r.error?{ok:false,error:{code:r.error.code,message:'RPC call reverted or is unavailable.'}}:{ok:true,value:r.result};});
   }catch(error){failure=error;}
  }
  throw new DiscoveryError('RPC_UNAVAILABLE',failure?.code==='TIME_BUDGET'?failure.message:`${chain.name} RPC is unavailable (${String(failure?.message||"network request failed").slice(0,160)}). Try again shortly.`);
 }
 async snapshot(chainId){
  if(this.snapshots.has(chainId))return this.snapshots.get(chainId);
  const pending=(async()=>{
   const [identity,block]=await this.rpc(chainId,[{method:'eth_chainId',params:[]},{method:'eth_getBlockByNumber',params:['finalized',false]}]);
   if(!identity.ok||Number(BigInt(identity.value))!==Number(chainId))throw new DiscoveryError('CHAIN_MISMATCH','RPC returned the wrong network.');
   let selected=block,finality='finalized';if(!selected.ok||!selected.value){[selected]=await this.rpc(chainId,[{method:'eth_getBlockByNumber',params:['latest',false]}]);finality='latest-unfinalized';}
   if(!selected.ok||!selected.value?.number||!selected.value?.hash)throw new DiscoveryError('BLOCK_UNAVAILABLE','Could not pin a chain snapshot.');
   const b=selected.value;return {chainId:Number(chainId),chain:CHAINS[chainId].name,number:Number(BigInt(b.number)),hex:b.number,hash:b.hash,timestamp:Number(BigInt(b.timestamp)),finality};
  })();this.snapshots.set(chainId,pending);return pending;
 }
 async batch(chainId,calls){
  const block=await this.snapshot(chainId);const outputs=[];
  for(let offset=0;offset<calls.length;offset+=25){
   const group=calls.slice(offset,offset+25);const uncached=[];const prepared=group.map(c=>{const abi=parseAbi([c.signature]);const name=c.signature.match(/function\s+(\w+)/)[1];const data=encodeFunctionData({abi,functionName:name,args:c.args||[]});const key=`${chainId}:${lower(c.address)}:${data}:${block.hex}`;if(!this.cache.has(key))uncached.push({key,c,abi,name,data});return {key,c,abi,name,data};});
   if(uncached.length){const replies=await this.rpc(chainId,uncached.map(q=>({method:'eth_call',params:[{to:q.c.address,data:q.data},block.hex]})));replies.forEach((r,i)=>{const q=uncached[i];let result=r;try{if(r.ok)result={ok:true,value:decodeFunctionResult({abi:q.abi,functionName:q.name,data:r.value}),raw:r.value};}catch{result={ok:false,error:{code:'ABI_DECODE',message:'Return data did not match the interface.'}};}this.cache.set(q.key,result);this.reads.push({chainId,blockNumber:block.number,address:lower(q.c.address),method:q.c.signature,args:(q.c.args||[]).map(v=>typeof v==='bigint'?v.toString():v),ok:result.ok,...(result.ok?{raw:result.raw}:{error:result.error.code})});});}
   outputs.push(...prepared.map(q=>this.cache.get(q.key)));
  }
  return outputs;
 }
 async read(chainId,address,signature,args=[]){return (await this.batch(chainId,[{address,signature,args}]))[0];}
 async code(chainId,address){const block=await this.snapshot(chainId);const [r]=await this.rpc(chainId,[{method:'eth_getCode',params:[address,block.hex]}]);this.reads.push({chainId,blockNumber:block.number,address:lower(address),method:'eth_getCode',args:[],ok:r.ok,...(r.ok?{raw:r.value}:{error:r.error.code})});if(!r.ok)throw new DiscoveryError('CODE_UNAVAILABLE','Contract bytecode could not be read.');return r.value;}
 async storage(chainId,address,slot){const b=await this.snapshot(chainId);const [r]=await this.rpc(chainId,[{method:'eth_getStorageAt',params:[address,slot,b.hex]}]);this.reads.push({chainId,blockNumber:b.number,address:lower(address),method:'eth_getStorageAt',args:[slot],ok:r.ok,...(r.ok?{raw:r.value}:{error:r.error.code})});return r.ok?r.value:null;}
 async states(){return Promise.all([...this.snapshots.values()]);}
}
export const IMPLEMENTATION_SLOT='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
export const ADMIN_SLOT='0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
export const BEACON_SLOT='0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
export const slotAddress=v=>v&&/^0x[0-9a-fA-F]{64}$/.test(v)&&v.slice(-40)!=='0'.repeat(40)?'0x'+v.slice(-40):null;
export const hashCode=code=>keccak256(code);
