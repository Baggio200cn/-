#!/usr/bin/env node
import fs from 'node:fs';

const path = new URL('../data/news.json', import.meta.url);
const raw = fs.readFileSync(path, 'utf-8');

let ok = true;
let data;
try {
  data = JSON.parse(raw);
} catch(e){
  console.error('❌ news.json 解析失败:', e.message);
  process.exit(1);
}

if(!Array.isArray(data)){
  console.error('❌ news.json 必须是数组');
  process.exit(1);
}

data.forEach((item, idx)=>{
  const idOk = !!(item.id || item.title);
  const titleOk = !!item.title;
  const summaryOk = !!(item.summary || item.description);
  const urlOk = !!item.url;
  const dateOk = !!(item.date || item.publishedAt);

  if(!idOk || !titleOk || !summaryOk || !urlOk || !dateOk) {
    ok = false;
    console.error(`Row ${idx}: 缺失字段 =>`, {
      id: idOk, title: titleOk, summary: summaryOk, url: urlOk, date: dateOk
    });
  }
});

if(ok){
  console.log(`✅ validate-news: ${data.length} items valid.`);
  process.exit(0);
} else {
  console.error('❌ validate-news: 存在不合法条目');
  process.exit(2);
}
