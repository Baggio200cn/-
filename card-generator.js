// 用于“卡片生成”页面的入口脚本（多语言 + 本地缓存 + 多条生成）

import { I18N, getLang } from './modules/i18n.js';
import { NewsUtils } from './modules/news-utils.js';

// ==== 常量 / 存储键 ====
const LS_KEY_RAW = 'cardGen:rawInput';

// ==== DOM 获取（在 DOMContentLoaded 之后也可再次校验） ====
const els = {
  textarea: document.querySelector('#raw'),
  generateBtn: document.querySelector('#generate'),
  output: document.querySelector('#output'),
  stats: document.querySelector('#stats'),
  langBtn: document.querySelector('[data-role="lang-switch"]') // 可能不存在
};

// ==== 工具函数 ====

// 读输入文本（保证返回字符串）
function readInput() {
  return (els.textarea && els.textarea.value) ? els.textarea.value : '';
}

// 将原始输入解析为条目数组：
// 规则：
// 1. 先按换行切分
// 2. 去掉每行首尾空白
// 3. 连续空行视为分隔，剔除空白
// 4. 行内若包含 ' | ' 可简单按分隔做主内容 + 备注
function parseRaw(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return lines.map(line => {
    let note = '';
    let main = line;
    const pipeIdx = line.indexOf(' | ');
    if (pipeIdx >= 0) {
      main = line.slice(0, pipeIdx).trim();
      note = line.slice(pipeIdx + 3).trim();
    }

    // 简单 URL 检测
    const urlMatch = main.match(/https?:\/\/[^\s)]+/);
    let url = '';
    if (urlMatch) {
      url = urlMatch[0];
    }

    return {
      raw: line,
      text: main,
      note,
      url,
      origin: url ? NewsUtils.origin(url) : ''
    };
  });
}

// 根据单条条目和语言构建渲染 HTML
function buildCardHTML(item, lang) {
  const safeText = NewsUtils.toHTML(NewsUtils.shorten(item.text, 160));
  const safeNote = item.note ? `<div class="note">${NewsUtils.toHTML(NewsUtils.shorten(item.note, 120))}</div>` : '';
  const origin = item.origin ? `<span class="origin">${item.origin}</span>` : '';
  const langLabel = I18N[lang]?.languageName || lang.toUpperCase();

  return `
    <div class="card">
      <div class="card-body">
        <p class="card-text">${safeText}</p>
        ${safeNote}
      </div>
      <div class="card-meta">
        ${origin}
        <span class="lang-tag">${langLabel}</span>
      </div>
    </div>
  `;
}

// 更新统计信息
function updateStats(items) {
  if (!els.stats) return;
  const lang = getLang();
  els.stats.textContent = items.length
    ? `共 ${items.length} 条 | Lang: ${I18N[lang]?.languageName || lang}`
    : '暂无内容';
}

// 渲染主流程
function renderCards() {
  if (!els.output) return;
  const lang = getLang();
  const raw = readInput();

  if (!raw.trim()) {
    els.output.innerHTML = '<p class="placeholder">请在左侧输入内容（支持多行），或粘贴文本。</p>';
    updateStats([]);
    return;
  }

  const items = parseRaw(raw);
  const html = items.map(it => buildCardHTML(it, lang)).join('\n');
  els.output.innerHTML = html;
  updateStats(items);
}

// 生成按钮回调（暴露给外部 / 测试）
export function generateCards() {
  // 保存输入
  if (els.textarea) {
    localStorage.setItem(LS_KEY_RAW, els.textarea.value);
  }
  renderCards();
}

// 语言变化时刷新卡片（不重建数据，只换显示标签 & 再调用 render 以更新语言名）
function handleLangChange() {
  renderCards();
}

// 防抖：在输入停止 500ms 后自动刷新
function setupAutoGenerate() {
  if (!els.textarea) return;
  let timer = null;
  els.textarea.addEventListener('input', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      generateCards();
    }, 500);
  });
}

// 恢复本地缓存输入
function restoreInput() {
  if (!els.textarea) return;
  const saved = localStorage.getItem(LS_KEY_RAW);
  if (saved) {
    els.textarea.value = saved;
  }
}

// ==== 初始化 ====
document.addEventListener('DOMContentLoaded', () => {
  restoreInput();
  // 初次渲染（可能展示 placeholder 或缓存内容）
  renderCards();

  if (els.generateBtn) {
    els.generateBtn.addEventListener('click', () => {
      generateCards();
    });
  }

  setupAutoGenerate();

  // 监听语言切换自定义事件
  document.addEventListener('lang:change', handleLangChange);
});

// （可选）如果希望在控制台调试
// window.__cardGen = { parseRaw, generateCards };
