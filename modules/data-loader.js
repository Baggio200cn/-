import { normalizeItem } from './news-utils.js';

let _cache = null;
export async function loadRawItems(){
  if(_cache) return _cache;
  try{
    const res = await fetch('./data/news.json?ts='+Date.now(), {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error('news.json 不是数组');
    _cache = data.map((d,i)=> normalizeItem(d,i));
  }catch(e){
    console.error('[data-loader] error', e);
    _cache = [];
  }
  window.__NEWS_LOAD__ = { count:_cache.length, first:_cache[0], lastError: _cache.length?null:'加载失败或为空' };
  return _cache;
}
