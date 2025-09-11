export function hashItems(items){
  const str = items.map(i=>i.title).join('|');
  let h=0; for(let i=0;i<str.length;i++){ h=(h*131 + str.charCodeAt(i))>>>0; }
  return h.toString(36);
}
const KEY='CLUSTER_CACHE_V1';
export function getCached(hash, params){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(obj.hash===hash &&
       obj.params.threshold===params.threshold &&
       obj.params.titleMerge===params.titleMerge){
      return obj;
    }
    return null;
  }catch{ return null;}
}
export function saveCache(hash, params){
  localStorage.setItem(KEY, JSON.stringify({hash, params, clusters: params.clusters}));
}
export function clearCache(){
  localStorage.removeItem(KEY);
}
