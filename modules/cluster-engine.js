import { toWords } from './news-utils.js';

/**
 * Cluster algorithm:
 * 1. Tokenize (title + summary)
 * 2. Build DF map and dynamic high DF stop set (ratio > HIGH_DF_RATIO)
 * 3. Filter tokens: baseStop + dynamic high DF + length < 2
 * 4. Greedy clustering with Jaccard + intersection constraints
 * 5. Optional second-pass title merge (strict)
 */

const BASE_STOP = new Set([
  'in','on','for','of','and','the','to','has','have','with','into','from','this','that','is','are','was','will',
  'announces','announced','announce','breakthrough','significant','advances','advance',
  'processing','process','technology','technologies','vision','machine','learning','ai',
  '发布','重大','突破','显著','技术','计算机','视觉','有关','关于','最新'
]);

const COMPANY_HINT = new Set([
  'google','nvidia','intel','aws','microsoft','apple','github','pytorch','ultralytics','tensorflow','opencv'
]);

const HIGH_DF_RATIO = 0.5;
const MIN_INTERSECTION = 3;   // 至少共享 3 tokens
const MIN_NONEMPTY_INTER = 2; // 共享 token (过滤后) >=2

export function clusterItems(items, { threshold=0.88, titleMerge=false } = {}){
  const tokenInfo = buildTokenInfo(items);
  const clusters = [];

  for (let i=0;i<items.length;i++){
    const info = tokenInfo[i];
    let placed = false;
    for (const c of clusters){
      const sim = jaccard(info.tokens, c.repTokens);
      if (shouldMerge(sim, info, c, threshold)){
        c.items.push(items[i]);
        c.tokenSets.push(info.tokens);
        // 代表 tokens 可以取“出现频率 >= ceil(size/2)”的简化交集
        c.repTokens = refineRepresentative(c.tokenSets);
        c.companySig = unionSet(c.companySig, info.companyTokens);
        placed = true;
        break;
      }
    }
    if(!placed){
      clusters.push({
        id: 'c'+clusters.length,
        items: [items[i]],
        repTokens: new Set(info.tokens),
        tokenSets: [info.tokens],
        companySig: new Set(info.companyTokens),
        repTitle: items[i].title
      });
    }
  }

  if (titleMerge && clusters.length > 1){
    secondPassTitleMerge(clusters);
  }

  return clusters;
}

function buildTokenInfo(items){
  // raw tokens for DF
  const rawTokenSets = [];
  const df = new Map();

  items.forEach((it, idx)=>{
    const text = `${it.title} ${it.summary||''}`;
    const words = toWords(text);
    const set = new Set(words);
    rawTokenSets[idx] = set;
    set.forEach(w=>{
      df.set(w, (df.get(w)||0)+1);
    });
  });

  const highDF = new Set();
  const N = items.length;
  df.forEach((count, term)=>{
    if (count / N > HIGH_DF_RATIO) highDF.add(term);
  });

  const final = rawTokenSets.map((set, i)=>{
    const filtered = new Set();
    set.forEach(w=>{
      if (w.length < 2) return;
      if (BASE_STOP.has(w)) return;
      if (highDF.has(w)) return;
      filtered.add(w);
    });
    const companyTokens = [...filtered].filter(w=>COMPANY_HINT.has(w));
    return { tokens: filtered, companyTokens: new Set(companyTokens) };
  });

  // debug
  window.__TOKEN_DEBUG__ = {
    highDF: [...highDF].slice(0,80),
    baseStopSize: BASE_STOP.size,
    sample: final.slice(0,3).map(f=>[...f.tokens].slice(0,20))
  };

  return final;
}

function jaccard(a,b){
  if(!a.size || !b.size) return 0;
  let inter=0;
  for(const t of a) if(b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function intersectionSize(a,b){
  let n=0; for(const t of a) if(b.has(t)) n++; return n;
}

function shouldMerge(sim, info, cluster, threshold){
  if (sim < threshold) return false;
  const inter = intersectionSize(info.tokens, cluster.repTokens);
  if (inter < MIN_INTERSECTION) return false;
  if (inter < MIN_NONEMPTY_INTER) return false;

  // 如果公司集合完全不同，可要求稍高阈值（差异约束）
  if (!shareCompany(info.companyTokens, cluster.companySig) && sim < (threshold + 0.04)){
    return false;
  }
  return true;
}

function shareCompany(a,b){
  for(const t of a) if(b.has(t)) return true;
  return false;
}

function unionSet(a,b){
  const s = new Set(a);
  for(const x of b) s.add(x);
  return s;
}

function refineRepresentative(tokenSets){
  // 统计频率
  const freq = new Map();
  tokenSets.forEach(set=>{
    for(const t of set) freq.set(t, (freq.get(t)||0)+1);
  });
  const minOcc = Math.ceil(tokenSets.length/2); // 半数出现
  const rep = new Set();
  freq.forEach((c,t)=>{
    if (c >= minOcc) rep.add(t);
  });
  if(!rep.size){
    // fallback: 取第一个集合前 6 个
    const first = tokenSets[0];
    let i=0;
    for(const t of first){
      rep.add(t); if(++i>=6) break;
    }
  }
  return rep;
}

/**
 * Second pass: merge clusters with highly similar representative titles
 * - Only clusters with size <= 5 merge candidate
 * - Title similarity using Sorensen-Dice (bi-gram)
 * - Condition > 0.92
 */
function secondPassTitleMerge(clusters){
  let merged = true;
  while(merged){
    merged = false;
    outer:
    for (let i=0;i<clusters.length;i++){
      for (let j=i+1;j<clusters.length;j++){
        const A = clusters[i], B = clusters[j];
        if (A.items.length > 6 || B.items.length > 6) continue;
        const s = titleSimilarity(A.items[0].title, B.items[0].title);
        if (s > 0.92){
          // merge B into A
            A.items.push(...B.items);
            A.tokenSets.push(...B.tokenSets);
            A.repTokens = refineRepresentative(A.tokenSets);
            clusters.splice(j,1);
            merged = true;
            break outer;
        }
      }
    }
  }
}

function titleSimilarity(a,b){
  const bgA = bigrams(a.toLowerCase());
  const bgB = bigrams(b.toLowerCase());
  if(!bgA.size || !bgB.size) return 0;
  let inter=0;
  for(const g of bgA) if(bgB.has(g)) inter++;
  return (2*inter) / (bgA.size + bgB.size);
}

function bigrams(str){
  const arr = [];
  const s = str.replace(/\s+/g,' ');
  for(let i=0;i<s.length-1;i++){
    arr.push(s.slice(i,i+2));
  }
  return new Set(arr);
}
