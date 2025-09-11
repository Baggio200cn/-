import { toWords } from './news-utils.js';

/**
 * 主题生成策略：
 *  - 多公司：Multi‑vendor Vision Updates
 *  - 单公司：{Company} Vision Update
 *  - 若检测到 keywords (model, release, sdk) 拼成组合
 */
const TEMPLATE_WORD_FILTER = new Set([
  'announces','announce','announced','breakthrough','significant','advance','advances',
  'in','the','of','for','has','have','with','and','processing','computer'
]);

export function generateHeuristicsForClusters(clusters){
  clusters.forEach(c=>{
    if(!c.topic){
      c.topic = makeTopic(c);
    }
    c.summary = makeSummary(c);
    c.keyPoints = makeKeyPoints(c);
    if(!c.tags || !c.tags.length){
      c.tags = deriveTags(c);
    }
  });
}

function makeTopic(c){
  const companies = collectCompanies(c);
  if(companies.size > 3){
    return 'Multi-vendor Vision Updates';
  } else if (companies.size > 1){
    return [...companies].join('/') + ' Vision Updates';
  } else if (companies.size === 1){
    return [...companies][0] + ' Vision Update';
  }

  // 无公司：用高频非模板词
  const freq = new Map();
  c.items.forEach(it=>{
    toWords(it.title).forEach(w=>{
      if(TEMPLATE_WORD_FILTER.has(w)) return;
      if(w.length < 3) return;
      freq.set(w,(freq.get(w)||0)+1);
    });
  });
  const sorted = [...freq.entries()].sort((a,b)=> b[1]-a[1]);
  if(!sorted.length) return 'General Vision News';
  return capitalize(sorted[0][0]) + ' Update';
}

function makeSummary(c){
  const companies = [...collectCompanies(c)];
  const compText = companies.length
    ? (companies.length===1 ? companies[0] : companies.join(', '))
    : '多来源';
  return `包含 ${c.items.length} 条相关新闻，涉及：${compText}。`
}

function makeKeyPoints(c){
  const companies = [...collectCompanies(c)];
  const uniq = [];
  const seen = new Set();
  c.items.forEach(it=>{
    const t = it.title.trim();
    if(!t) return;
    const lowered = t.toLowerCase();
    if(seen.has(lowered)) return;
    seen.add(lowered);
    // 强调公司 + 核心动作
    const concise = condenseTitle(t);
    uniq.push(concise);
  });

  // 去模板冗余（多个标题只有公司不同）
  if(uniq.length > 6){
    const reduced = [];
    const skeletonSeen = new Set();
    uniq.forEach(line=>{
      const sk = line.replace(/^[A-Z][A-Za-z0-9_-]+\s+/,''); // 去公司前缀
      if(skeletonSeen.has(sk)) return;
      skeletonSeen.add(sk);
      reduced.push(line);
    });
    if(reduced.length >= 3) uniq.splice(0, uniq.length, ...reduced);
  }

  if(uniq.length < 3){
    if(companies.length>1) uniq.push('多家厂商同步在视觉/AI 方向发布进展');
    if(c.items.length>4) uniq.push('该主题在本周期出现多条重复报道');
  }
  return uniq.slice(0,5);
}

function deriveTags(c){
  const set = new Set();
  collectCompanies(c).forEach(x=>set.add(x));
  toWords(c.items[0]?.title||'')
    .filter(w=> w.length>3 && !TEMPLATE_WORD_FILTER.has(w))
    .slice(0,4)
    .forEach(w=> set.add(capitalize(w)));
  return [...set].slice(0,8);
}

function collectCompanies(c){
  const out = new Set();
  c.items.forEach(it=>{
    const m = it.title.match(/^(Google|NVIDIA|Intel|Apple|AWS|Microsoft|GitHub|PyTorch|Ultralytics|TensorFlow|OpenCV)\b/i);
    if(m) out.add(capitalize(m[1].toLowerCase()));
  });
  return out;
}

function condenseTitle(title){
  // 取 “Company + 核心短语”
  const companyMatch = title.match(/^(Google|NVIDIA|Intel|Apple|AWS|Microsoft|GitHub|PyTorch|Ultralytics|TensorFlow|OpenCV)\b/i);
  let company = companyMatch ? capitalize(companyMatch[1].toLowerCase()) : null;
  const lower = title.toLowerCase();
  // 去掉 announces / has announced 等
  let core = lower
    .replace(/.*?(announces|has announced)\s+/,'')
    .replace(/\b(in|for|the|a|of)\b/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
  if(core.length > 70) core = core.slice(0,67)+'…';
  if(company) return company + ' ' + capitalizeSentence(core);
  return capitalizeSentence(core);
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
function capitalizeSentence(s){
  return s.split(' ').map(w=> capitalize(w)).join(' ');
}
