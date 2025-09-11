import { toWords, escapeHTML } from './news-utils.js';

const BANNED = new Set(['显著进展','重大突破','significant advances','groundbreaking','huge leap']);

export function generateHeuristicsForClusters(clusters){
  clusters.forEach(c=>{
    if (!c.topic) {
      const topic = makeTopic(c);
      c.topic = sanitize(topic);
    }
    if (!c.summary) {
      c.summary = sanitize(makeSummary(c));
    }
    if (!c.keyPoints) {
      c.keyPoints = makeKeyPoints(c);
    }
    if (!c.tags || !c.tags.length){
      c.tags = deduceTags(c);
    }
  });
}

function sanitize(str){
  let s = (str||'').trim();
  BANNED.forEach(w=>{
    s = s.replace(new RegExp(w,'ig'), '');
  });
  return s.replace(/\s+/g,' ').trim();
}

function makeTopic(cluster){
  // 基于词频 + 公司词汇抽取
  const freq = new Map();
  cluster.items.forEach(it=>{
    const words = toWords(it.title);
    words.forEach(w=>{
      if (w.length < 2) return;
      freq.set(w,(freq.get(w)||0)+1);
    });
  });
  // 排序：频率高 -> 长度适中 -> 字母序
  const sorted = [...freq.entries()].sort((a,b)=>{
    if (b[1] !== a[1]) return b[1]-a[1];
    return a[0].localeCompare(b[0]);
  }).map(x=>x[0]);

  // 过滤常泛词
  const generic = new Set(['in','on','for','and','the','with','vision','machine','learning','technology','processing','ai']);
  const picked = [];
  for(const w of sorted){
    if(generic.has(w)) continue;
    picked.push(capFirst(w));
    if(picked.length >= 3) break;
  }
  if(!picked.length) picked.push(capFirst(sorted[0]||'Topic'));

  return picked.join(' ') + (picked.length ? '' : ' Update');
}

function makeSummary(cluster){
  // 取前若干条标题关键短语
  const titles = cluster.items.slice(0,6).map(it => it.title);
  let base = titles.join('；');
  if (base.length > 60) base = base.slice(0,58)+'…';
  return `包含 ${cluster.items.length} 条相关新闻：${base}`;
}

function makeKeyPoints(cluster){
  const uniq = new Set();
  const points = [];
  for(const it of cluster.items){
    const t = it.title.trim();
    if(!t || uniq.has(t.toLowerCase())) continue;
    uniq.add(t.toLowerCase());
    points.push(t);
    if(points.length>=5) break;
  }
  if (!points.length) points.push('（暂无可提取要点）');
  return points;
}

function deduceTags(cluster){
  const map = new Map();
  cluster.items.forEach(it=>{
    (it.tags||[]).forEach(tag=>{
      const k = tag.trim();
      if(!k) return;
      map.set(k, (map.get(k)||0)+1);
    });
  });
  const arr = [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]);
  return arr;
}

function capFirst(w){
  return w ? (w.charAt(0).toUpperCase()+w.slice(1)) : '';
}
