#!/usr/bin/env node
import fs from 'fs';
const p = new URL('../data/news.json', import.meta.url);
if (!fs.existsSync(p)) {
  console.log('data/news.json 不存在，跳过校验');
  process.exit(0);
}
const raw = JSON.parse(fs.readFileSync(p,'utf-8'));
let ok = true;
raw.forEach((it,i)=>{
  const idOk = !!(it.id || it.title);
  const sumOk = !!(it.summary || it.description);
  const urlOk = !!it.url;
  if (!idOk || !sumOk || !urlOk) {
    ok = false;
    console.error(`第 ${i} 条缺字段 id/title:${idOk} summary/description:${sumOk} url:${urlOk}`);
  }
});
if (!ok) {
  console.error('news.json 校验失败');
  process.exit(1);
} else {
  console.log('news.json 校验通过，条目：', raw.length);
}
