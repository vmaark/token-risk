// Each entry is bounded and versioned. A failed storage operation leaves live reads usable.
export const CACHE_VERSION=4;
export const RESULT_TTL=120_000;
export const METADATA_TTL=86_400_000;
export class BrowserCache {
 constructor(){this.available=true;this.pending=null;}
 async db(){if(!this.pending)this.pending=new Promise((resolve,reject)=>{const request=indexedDB.open('token-risk-discovery',CACHE_VERSION);request.onupgradeneeded=()=>{const db=request.result;for(const s of [...db.objectStoreNames])db.deleteObjectStore(s);db.createObjectStore('entries',{keyPath:'key'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return this.pending;}
 async get(key,{allowExpired=false,now=Date.now()}={}){try{const db=await this.db();const row=await new Promise((resolve,reject)=>{const r=db.transaction('entries').objectStore('entries').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(!row||row.version!==CACHE_VERSION||(!allowExpired&&row.expiresAt<=now))return null;return {value:row.value,savedAt:row.savedAt,expiresAt:row.expiresAt,stale:row.expiresAt<=now};}catch{this.available=false;return null;}}
 async set(key,value,ttl){try{if(JSON.stringify(value).length>4_000_000)return;const db=await this.db();await new Promise((resolve,reject)=>{const tx=db.transaction('entries','readwrite');const store=tx.objectStore('entries');const r=store.getAll();r.onsuccess=()=>{const entries=r.result.sort((a,b)=>b.savedAt-a.savedAt);for(const old of entries.slice(79))store.delete(old.key);store.put({key,value,savedAt:Date.now(),expiresAt:Date.now()+ttl,version:CACHE_VERSION});};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{this.available=false;}}
 async clear(){try{const db=await this.db();await new Promise((resolve,reject)=>{const t=db.transaction('entries','readwrite');t.objectStore('entries').clear();t.oncomplete=resolve;t.onerror=()=>reject(t.error);});return true;}catch{this.available=false;return false;}}
}
export const RESULT_SCHEMA_VERSION=5;
export const resultKey=(chain,address)=>`result:${RESULT_SCHEMA_VERSION}:${CACHE_VERSION}:${chain}:${address.toLowerCase()}`;
export async function cachedDiscovery(input,{cache,refresh=false,run}){
 const key=resultKey(input.chainId,input.address);
 if(!refresh){const hit=await cache.get(key);if(hit)return {...hit.value,cache:{status:'hit',savedAt:hit.savedAt,expiresAt:hit.expiresAt}};}
 try{const value=await run();if(value.coverage.interrupted)return {...value,cache:{status:'partial',savedAt:null}};await cache.set(key,value,RESULT_TTL);return {...value,cache:{status:'fresh',savedAt:Date.now(),expiresAt:Date.now()+RESULT_TTL}};}
 catch(error){if(error.code==='ABORTED'||error.name==='AbortError')throw error;const prior=await cache.get(key,{allowExpired:true});if(prior)return {...prior.value,cache:{status:'stale',savedAt:prior.savedAt,expiresAt:prior.expiresAt,error:error.message}};throw error;}
}
