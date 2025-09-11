import { toWords } from './news-utils.js';

const STOP = new Set(['in','on','for','of','and','the','to','has','have','with','into','from','this','that','is','are','was','will','a','an','advances','significant','breakthrough','technology','processing','capabilities']);
const COMPANY = new Set(['google','nvidia','intel','aws','apple','pytorch','github','opencv','ultralytics','tensorflow']);
const TEMPLATE_REGEX = /(.+?) announces breakthrough in (?:computer )?vision technology/i;

export function clusterItems(items, { threshold=0.86, titleMerge=false } = {}){
  const infos = items.map(it => buildTokenInfo(it));
  const clusters = [];
  for(let i=0;i<items.length;i++){
    const info = infos[i];
    let placed = false;
    for(const c of clusters){
      const sim = jaccard(info.tokens, c.rep);
      if(sim >= threshold){
        c.items.push(items[i]);
        c.tokenSets.push(info.tokens);
        c.rep = representative(c.tokenSets);
        placed = true; break;
      }
    }
    if(!placed){
      clusters.push({ id:'c'+clusters.length, items:[items[i]], tokenSets:[info.tokens], rep:new Set(info.tokens), templateId: info.templateId, company: info.company });
    }
  }
  templateMerge(clusters);
  if(titleMerge) titleSecondPass(clusters);
  renumber(clusters);
  return clusters;
}

export function groupByCompany(clusters){
  const map = new Map();
  for(const c of [...clusters]){
    if(c.items.length !== 1) continue;
    const comp = c.company;
    if(!comp) continue;
    if(!map.has(comp)) {
      map.set(comp, c);
    } else {
      const tgt = map.get(comp);
      tgt.items.push(...c.items);
      tgt.tokenSets.push(...c.tokenSets);
      tgt.rep = representative(tgt.tokenSets);
      clusters.splice(clusters.indexOf(c),1);
    }
  }
  renumber(clusters);
}

function buildTokenInfo(it){
  const words = toWords(it.title);
  const set = new Set();
  words.forEach(w=>{
    if(w.length<2) return;
    if(STOP.has(w) && !COMPANY.has(w)) return;
    set.add(w);
  });
  let templateId=null, company=null;
  const m = it.title.match(TEMPLATE_REGEX);
  if(m){
    templateId='T1';
    company = m[1].trim().split(/\s+/)[0];
    set.add(company.toLowerCase());
  } else {
    const low = it.title.toLowerCase();
    for(const c of COMPANY){ if(low.includes(c)) { company=c; set.add(c); break; } }
  }
  return { tokens:set, templateId, company };
}

function jaccard(a,b){
  if(!a.size || !b.size) return 0;
  let inter=0;
  for(const t of a) if(b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function representative(tokenSets){
  const freq = new Map();
  tokenSets.forEach(s=>{ s.forEach(t=> freq.set(t,(freq.get(t)||0)+1)); });
  const need = Math.ceil(tokenSets.length/2);
  const rep = new Set();
  for(const [t,c] of freq){ if(c>=need) rep.add(t); }
  if(!rep.size){
    tokenSets[0].forEach(t=> rep.size<6 && rep.add(t));
  }
  return rep;
}

function templateMerge(clusters){
  const bucket = new Map();
  for(const c of [...clusters]){
    if(c.items.length!==1) continue;
    if(!c.templateId) continue;
    if(!bucket.has(c.templateId)){
      bucket.set(c.templateId, c);
    } else {
      const tgt = bucket.get(c.templateId);
      tgt.items.push(...c.items);
      tgt.tokenSets.push(...c.tokenSets);
      tgt.rep = representative(tgt.tokenSets);
      clusters.splice(clusters.indexOf(c),1);
    }
  }
}

function titleSecondPass(clusters){
  let merged=true;
  while(merged){
    merged=false;
    outer:
    for(let i=0;i<clusters.length;i++){
      for(let j=i+1;j<clusters.length;j++){
        const A=clusters[i],B=clusters[j];
        const sim = titleSim(A.items[0].title, B.items[0].title);
        if(sim>0.93){
          A.items.push(...B.items);
          A.tokenSets.push(...B.tokenSets);
          A.rep = representative(A.tokenSets);
            clusters.splice(j,1);
          merged=true;
          break outer;
        }
      }
    }
  }
}

function titleSim(a,b){
  const s1=a.toLowerCase(), s2=b.toLowerCase();
  const bg = s=>{const arr=[];for(let i=0;i<s.length-1;i++) arr.push(s.slice(i,i+2));return new Set(arr);};
  const A=bg(s1),B=bg(s2);
  let inter=0;for(const g of A) if(B.has(g)) inter++;
  return (2*inter)/(A.size+B.size);
}

function renumber(clusters){ clusters.forEach((c,i)=> c.id='c'+i); }
