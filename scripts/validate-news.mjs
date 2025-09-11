#!/usr/bin/env node
/**
 * 校验 data/news.json 的结构：
 * - 顶层必须是数组
 * - 每项需至少有 id 或 title
 * - 每项需至少有 summary 或 description
 * - 每项需有 url
 * 若 data/news.json 不存在：输出提示并退出码 0（不中断流水线）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsPath = path.join(__dirname, '..', 'data', 'news.json');

if (!fs.existsSync(newsPath)) {
  console.log('data/news.json 不存在，跳过校验（退出码 0）。');
  process.exit(0);
}

let raw;
try {
  raw = JSON.parse(fs.readFileSync(newsPath, 'utf-8'));
} catch (e) {
  console.error('解析 data/news.json 失败：', e.message);
  process.exit(1);
}

if (!Array.isArray(raw)) {
  console.error('data/news.json 顶层不是数组。');
  process.exit(1);
}

let ok = true;
raw.forEach((item, i) => {
  if (typeof item !== 'object' || item === null) {
    ok = false;
    console.error(`第 ${i} 条不是对象。`);
    return;
  }
  const idOk = !!(item.id || item.title);
  const sumOk = !!(item.summary || item.description);
  const urlOk = !!item.url;
  if (!idOk || !sumOk || !urlOk) {
    ok = false;
    console.error(`第 ${i} 条缺字段 -> id/title:${idOk} summary/description:${sumOk} url:${urlOk}`);
  }
});

if (!ok) {
  console.error('news.json 校验失败 ❌');
  process.exit(1);
} else {
  console.log(`news.json 校验通过 ✅ 条目数: ${raw.length}`);
}