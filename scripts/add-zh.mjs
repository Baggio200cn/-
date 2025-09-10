#!/usr/bin/env node
/**
 * add-zh.mjs
 * 为 data/news.json 中没有 zh 字段的条目自动生成一个 zh 对象。
 * 运行: node scripts/add-zh.mjs
 * 可选参数:
 *   --force  对已有 zh 的条目重新生成（谨慎）
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '..', 'data', 'news.json');
const FORCE = process.argv.includes('--force');

function loadJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('[ERROR] 读取或解析 JSON 失败:', e.message);
    process.exit(1);
  }
}

const WORD_MAP = new Map([
  ['Microsoft AI', '微软 AI'],
  ['GitHub Release', 'GitHub Release'],
  ['NVIDIA', '英伟达'],
  ['Apple', '苹果'],
  ['PyTorch', 'PyTorch'],
  ['Google AI', '谷歌 AI'],
  ['AWS ML', 'AWS ML'],
  ['OpenCV', 'OpenCV'],
  ['OpenAI', 'OpenAI'],

  ['AI', '人工智能'],
  ['Machine Vision', '机器视觉'],
  ['Technology', '技术'],
  ['Microsoft', '微软'],
  ['GitHub', 'GitHub'],
  ['NVIDIA', '英伟达'],
  ['Apple', '苹果'],
  ['PyTorch', 'PyTorch'],
  ['Google', '谷歌'],
  ['AWS', 'AWS'],
  ['OpenCV', 'OpenCV'],
  ['OpenAI', 'OpenAI'],

  ['announces breakthrough', '宣布取得突破']
]);

function translateTags(tags = []) {
  return tags.map(t => WORD_MAP.get(t) || t);
}

function translate(raw = '') {
  if (!raw) return raw;
  let r = raw;
  for (const [en, zh] of WORD_MAP.entries()) {
    const re = new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    r = r.replace(re, zh);
  }
  r = r
    .replace(/announces breakthrough in computer vision technology/gi, '宣布在计算机视觉技术上取得突破')
    .replace(/has announced significant advances in machine vision and AI processing capabilities/gi, '宣布在机器视觉与 AI 处理能力方面取得显著进展')
    .replace(/The new developments promise to enhance real-time processing and improve accuracy in various computer vision applications\./gi,
      '这些新成果有望增强实时处理并提升多种计算机视觉场景的准确率。')
    .replace(/significant advances/gi, '显著进展')
    .replace(/breakthrough/gi, '突破');
  return r;
}

function buildZhObject(item) {
  return {
    title: translate(item.title),
    summary: translate(item.summary),
    tags: translateTags(item.tags || [])
  };
}

function main() {
  const data = loadJSON(jsonPath);
  if (!Array.isArray(data)) {
    console.error('[ERROR] news.json 根元素不是数组');
    process.exit(1);
  }

  let added = 0;
  let rewrote = 0;

  data.forEach(it => {
    if (it.zh && !FORCE) return;
    if (it.zh && FORCE) {
      it.zh = buildZhObject(it);
      rewrote++;
    } else if (!it.zh) {
      it.zh = buildZhObject(it);
      added++;
    }
  });

  writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Done. 新增 zh: ${added} 条${FORCE ? `; 重写 zh: ${rewrote} 条` : ''}`);
  console.log(`文件已保存: ${jsonPath}`);
  if (!added && !rewrote) console.log('提示: 没有需要处理的条目。');
}

main();