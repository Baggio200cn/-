import { toWords } from './news-utils.js';

/**
 * 改进版聚类流程：
 * 1. 初步分词 + DF 去高频
 * 2. 贪心 Jaccard 聚类
 * 3. 模板化标题检测，把 size=1 且共享相同模板骨架的单条再归并
 * 4. 可选标题二次合并（原逻辑）
 * 5. 按公司再聚合（外部按钮可触发）
 */

const BASE_STOP = new Set([
  'in','on','for','of','and','the','to','has','have','with','into','from','this','that','is','are','was','will',
  'significant','advance','advances','processing','process','technology','technologies','vision','machine','learning',
  '发布','重大','突破','显著','技术','计算机','视觉','最新'
]);

// 公司白名单：永不当作高频停用去掉
const COMPANY_TOKENS = new Set([
  'google','nvidia','intel','aws','microsoft','apple','github','pytorch','ultralytics','tensorflow','opencv'
]);

const TEMPLATE_PATTERNS = [
  /(.+?) announces breakthrough in (?:computer )?vision technology/i,
  /(.+?) has announced (?:significant )?advances in (?:machine )?vision (?:and )?ai processing/i,
  /(.+?) announces (?:.*)in computer vision/i
];

const HIGH_DF_RATIO = 0.5;
const MIN_INTERSECTION = 2;

export function clusterItems(items, { threshold=0.88, titleMerge=false } = {}){
  const tokenInfo = buildTokenInfo(items);
  const clusters = [];

  for (let i=0;i<items.length;i++){
    const info = tokenInfo[i];
    let placed = false;
    for (const c of clusters){
      const sim = jaccard(info.tokens, c.repTokens);
      if (sim >= threshold && intersectionSize(info.tokens,c.repTokens) >= MIN_INTERSECTION){
        c.items.push(items[i]);
        c.tokenSets.push(info.tokens);
        c.repTokens = refineRepresentative(c.tokenSets);
        placed = true;
        break;
      }
    }
    if(!placed){
      clusters.push({
        id:'c'+clusters.length,
        items:[items[i]],
        tokenSets:[info.tokens],
        repTokens:new Set(info.tokens),
        templateId: info.templateId,
        company: info.companyName
      });
    }
  }

  // 第三步：模板化标题再聚合（只针对 size=1 的小集群）
  mergeTemplateSingletons(clusters);

  if (titleMerge) {
    secondPassTitleMerge(clusters);
  }

  return clusters;
}

// 对外提供：按公司聚合（主页按钮触发）
export function groupByCompany(clusters){
  const map = new Map(); // company -> cluster
  for (const c of [...clusters]) {
    // 只有单条才考虑合并
    if (c.items.length !== 1) continue;
    const comp = extractCompanyFromTitle(c.items[0].title);
    if(!comp) continue;
    if(!map.has(comp)){
      map.set(comp, c);
    } else {
      const target = map.get(comp);
      target.items.push(...c.items);
      target.tokenSets.push(...c.tokenSets);
      target.repTokens = refineRepresentative(target.tokenSets);
      // 删除原 c
      const idx = clusters.indexOf(c);
      if(idx>=0) clusters.splice(idx,1);
    }
  }
  reindexIds(clusters);
  return clusters;
}

function buildTokenInfo(items){
  const df = new Map();
  const rawTokenSets = [];
  const templateIds = [];
  const companies = [];

  items.forEach((it, idx)=>{
    const words = toWords(it.title + ' ' + (it.summary||''));
    const set = new Set(words);
    rawTokenSets[idx] = set;
    set.forEach(w=> df.set(w,(df.get(w)||0)+1));
    const { templateId, companyName } = detectTemplate(it.title);
    templateIds[idx] = templateId;
    companies[idx] = companyName;
  });

  const highDF = new Set();
  const N = items.length;
  df.forEach((count, term)=>{
    if (count/N > HIGH_DF_RATIO && !COMPANY_TOKENS.has(term)) highDF.add(term);
  });

  return rawTokenSets.map((set,i)=>{
    const filtered = new Set();
    set.forEach(w=>{
      if (w.length < 2) return;
      if (BASE_STOP.has(w)) return;
      if (highDF.has(w) && !COMPANY_TOKENS.has(w)) return;
      filtered.add(w);
    });
    // 确保公司 token 如果被过滤又补回
    if (companies[i]) filtered.add(companies[i].toLowerCase());
    return {
      tokens: filtered,
      templateId: templateIds[i],
      companyName: companies[i]
    };
  });
}

function jaccard(a,b){
  if(!a.size || !b.size) return 0;
  let inter=0;
  for(const t of a) if(b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function intersectionSize(a,b){
  let n=0; for(const x of a) if(b.has(x)) n++; return n;
}

function refineRepresentative(tokenSets){
  const freq = new Map();
  tokenSets.forEach(s=>{
    for(const t of s) freq.set(t,(freq.get(t)||0)+1);
  });
  const minOcc = Math.ceil(tokenSets.length/2);
  const rep = new Set();
  freq.forEach((c,t)=>{ if(c>=minOcc) rep.add(t); });
  if(!rep.size){
    for(const t of tokenSets[0]) { rep.add(t); if(rep.size>=6) break; }
  }
  return rep;
}

function mergeTemplateSingletons(clusters){
  const buckets = new Map(); // templateId -> cluster
  for (const c of [...clusters]) {
    if (c.items.length !== 1) continue;
    if (!c.templateId) continue;
    if(!buckets.has(c.templateId)){
      buckets.set(c.templateId, c);
    } else {
      const target = buckets.get(c.templateId);
      target.items.push(...c.items);
      target.tokenSets.push(...c.tokenSets);
      target.repTokens = refineRepresentative(target.tokenSets);
      const idx = clusters.indexOf(c);
      if(idx>=0) clusters.splice(idx,1);
    }
  }
  reindexIds(clusters);
}

function reindexIds(clusters){
  clusters.forEach((c,i)=> c.id='c'+i);
}

function detectTemplate(title){
  for(let i=0;i<TEMPLATE_PATTERNS.length;i++){
    const m = title.match(TEMPLATE_PATTERNS[i]);
    if(m){
      const companyName = m[1].trim().split(/\s+/)[0]; // 取第一个词
      return { templateId: 'T'+i, companyName };
    }
  }
  return { templateId:null, companyName: extractCompanyFromTitle(title) };
}

function extractCompanyFromTitle(t=''){
  const lower = t.toLowerCase();
  for(const c of COMPANY_TOKENS){
    if(lower.includes(c)) return capitalize(c);
  }
  return null;
}

function capitalize(s){
  return s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
}

// 第二遍标题相似聚合（保持原逻辑收紧）
function secondPassTitleMerge(clusters){
  let merged=true;
  while(merged){
    merged=false;
    outer:
    for(let i=0;i<clusters.length;i++){
      for(let j=i+1;j<clusters.length;j++){
        const A = clusters[i], B = clusters[j];
        if(A.items.length>8 || B.items.length>8) continue;
        const sim = titleSimilarity(A.items[0].title, B.items[0].title);
        if(sim>0.93){
          A.items.push(...B.items);
          A.tokenSets.push(...B.tokenSets);
          A.repTokens = refineRepresentative(A.tokenSets);
          clusters.splice(j,1);
          merged=true;
          break outer;
        }
      }
    }
  }
  reindexIds(clusters);
}

function titleSimilarity(a,b){
  const bgA = bigrams(a.toLowerCase());
  const bgB = bigrams(b.toLowerCase());
  if(!bgA.size || !bgB.size) return 0;
  let inter=0;
  for(const g of bgA) if(bgB.has(g)) inter++;
  return (2*inter)/(bgA.size+bgB.size);
}

function bigrams(str){
  const out=[];
  const s=str.replace(/\s+/g,' ');
  for(let i=0;i<s.length-1;i++) out.push(s.slice(i,i+2));
  return new Set(out);
}
