export function generateHeuristicsForClusters(clusters){
  clusters.forEach(c=>{
    c.topic = buildTopic(c);
    c.summary = `包含 ${c.items.length} 条相关新闻。` + (c.items.length>1?'多家公司在计算机视觉方向出现相似发布。':'');
    c.keyPoints = buildKeyPoints(c);
    c.tags = deriveTags(c);
  });
}

function buildTopic(c){
  const companies = collectCompanies(c);
  if(companies.length>3) return 'Multi-Vendor Vision Updates';
  if(companies.length>1) return companies.join('/') + ' Vision Updates';
  if(companies.length===1) return companies[0] + ' Vision Update';
  return trimTemplate(c.items[0].title) || 'Vision News';
}

function buildKeyPoints(c){
  const set = new Set();
  c.items.forEach(it=>{
    set.add(trimTemplate(it.title));
  });
  const arr = [...set].slice(0,5);
  if(arr.length<3 && c.items.length>3) arr.push('多条相似新闻表明该方向集中发声');
  return arr;
}

function deriveTags(c){
  const t = new Set();
  collectCompanies(c).forEach(x=>t.add(x));
  c.items[0].tags?.forEach(x=> t.add(x));
  return [...t].slice(0,8);
}

function collectCompanies(c){
  const companies=[];
  c.items.forEach(it=>{
    const m = it.title.match(/^(Google|NVIDIA|Intel|AWS|Apple|PyTorch|GitHub|OpenCV|Ultralytics|TensorFlow)\b/i);
    if(m){
      const n = m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();
      if(!companies.includes(n)) companies.push(n);
    }
  });
  return companies;
}

function trimTemplate(title=''){
  return title
    .replace(/ announces breakthrough in (?:computer )?vision technology/i,' Vision Update')
    .replace(/ +/g,' ')
    .trim();
}
