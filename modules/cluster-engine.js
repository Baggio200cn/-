import { buildTopicAndSummary } from './topic-extract.js';

export function clusterItems(rawItems, { threshold, titleMerge }) {
  const clusters = [];
  const tokenCache = new Map();

  function tokens(str) {
    if (tokenCache.has(str)) return tokenCache.get(str);
    const t = str.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff ]+/gi,' ')
      .split(/\s+/).filter(w=>w.length>1);
    const set = new Set(t);
    tokenCache.set(str,set);
    return set;
  }
  function jaccard(aSet, bSet) {
    const inter = [...aSet].filter(x=>bSet.has(x)).length;
    const uni = aSet.size + bSet.size - inter;
    return uni === 0 ? 0 : inter / uni;
  }

  rawItems.forEach(item=>{
    const aTokens = tokens(item.title + ' ' + item.summary);
    let found = null;
    for (const c of clusters) {
      if (c._frozen) continue;
      const rep = c.sources[0];
      const bTokens = tokens(rep.title + ' ' + rep.summary);
      if (jaccard(aTokens, bTokens) >= threshold) {
        found = c;
        break;
      }
    }
    if (!found) {
      clusters.push({
        id: 'c'+clusters.length,
        sources: [item],
        tags: [...item.tags||[]]
      });
    } else {
      found.sources.push(item);
      found.tags.push(...item.tags||[]);
    }
  });

  if (titleMerge) {
    let merged = true;
    while (merged) {
      merged = false;
      outer:
      for (let i=0; i<clusters.length; i++) {
        for (let j=i+1; j<clusters.length; j++) {
          const aT = tokens(clusters[i].sources[0].title);
          const bT = tokens(clusters[j].sources[0].title);
          if (jaccard(aT,bT) > 0.92) {
            clusters[i].sources.push(...clusters[j].sources);
            clusters[i].tags.push(...clusters[j].tags);
            clusters.splice(j,1);
            merged = true;
            break outer;
          }
        }
      }
    }
  }

  clusters.forEach(c=>{
    c.tags = Array.from(new Set(c.tags)).slice(0,12);
    buildTopicAndSummary(c);
  });

  return clusters;
}
