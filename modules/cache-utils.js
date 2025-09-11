import { hashString } from './news-utils.js';

const KEY = 'CLUSTER_CACHE_V1';

export function hashItems(items){
  // 用标题+摘要拼串 hash
  const concat = items.map(it=>`${it.title}|${it.summary||''}`).join('\n');
  return hashString(concat);
}

export function getCached(hash, params){
  try {
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(data.hash !== hash) return null;
    if(!sameParams(data.params, params)) return null;
    return data;
  } catch { return null; }
}

export function saveCache(hash, { threshold, titleMerge, clusters }){
  const obj = {
    hash,
    params: { threshold, titleMerge },
    timestamp: Date.now(),
    clusters: JSON.parse(JSON.stringify(clusters)) // deep clone (strip functions)
  };
  localStorage.setItem(KEY, JSON.stringify(obj));
}

export function clearCache(){
  localStorage.removeItem(KEY);
}

function sameParams(a,b){
  return a && b && a.threshold === b.threshold && !!a.titleMerge === !!b.titleMerge;
}
