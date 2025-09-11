// VER: legacy-news-list-2025-09-11-r2
// 功能：新闻列表展示 + 标签/关键词过滤 + 生成卡片跳转
// 依赖：modules/news-utils.js (提供 NewsUtils.toHTML/formatDate 等)
// 如果后续完全不用此“传统列表”页面，可移动到 legacy 目录或删除。

import { NewsUtils } from './modules/news-utils.js';

// ================== 配置常量 ==================
const BUILD_VERSION = 'v4';
const LOGO_CANDIDATES = [
  'assets/company-logo.svg',
  'assets/company-logo.png',
  'assets/logo-placeholder.svg'
];

// ================== 状态 ==================
const state = {
  all: [],        // 原始数据
  filtered: []    // 过滤结果
};

// ================== 工具函数 ==================
function escapeHtml(str = '') {
  // 复用 NewsUtils.toHTML 来进行安全转义
  try {
    if (NewsUtils && typeof NewsUtils.toHTML === 'function') {
      return NewsUtils.toHTML(String(str));
    }
  } catch {
    // ignore
  }
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDate(val) {
  // 优先使用 NewsUtils.formatDate（如果存在）
  if (NewsUtils && typeof NewsUtils.formatDate === 'function') {
    try { return NewsUtils.formatDate(val); } catch { /* ignore */ }
  }
  if (!val) return '';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return val;
  }
}

// ================== Logo 加载 ==================
async function loadLogo() {
  const img = document.getElementById('siteLogo');
  if (!img) return;
  for (const p of LOGO_CANDIDATES) {
    try {
      const r = await fetch(`${p}?v=${BUILD_VERSION}`, { cache: 'reload' });
      if (r.ok) {
        img.src = URL.createObjectURL(await r.blob());
        return;
      }
    } catch {
      // 忽略当前失败，继续下一个候选
    }
  }
  img.alt = 'NO-LOGO';
}

// ================== 数据加载 ==================
async function loadData() {
  try {
    const resp = await fetch('data/news.json?v=' + Date.now());
    if (!resp.ok) throw new Error(resp.status);
    state.all = await resp.json();
    state.filtered = state.all.slice();
    render();
  } catch (e) {
    const el = document.getElementById('newsCount');
    if (el) el.textContent = '加载失败: ' + e.message;
  }
}

// ================== 过滤逻辑 ==================
function applyFilter() {
  const tagInput = document.getElementById('tagInput');
  const searchInput = document.getElementById('searchInput');
  const tagStr = (tagInput?.value || '').trim();
  const search = (searchInput?.value || '').trim().toLowerCase();

  const tags = tagStr
    ? tagStr.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    : [];

  state.filtered = state.all.filter(item => {
    // 标签 AND
    if (tags.length) {
      const its = (item.tags || []).map(t => t.toLowerCase());
      if (!tags.every(t => its.includes(t.toLowerCase()))) return false;
    }
    // 关键词
    if (search) {
      const combo = `${item.title || ''} ${item.summary || ''}`.toLowerCase();
      if (!combo.includes(search)) return false;
    }
    return true;
  });

  render();
}

function resetFilter() {
  const tagInput = document.getElementById('tagInput');
  const searchInput = document.getElementById('searchInput');
  if (tagInput) tagInput.value = '';
  if (searchInput) searchInput.value = '';
  state.filtered = state.all.slice();
  render();
}

// ================== 渲染 ==================
function render() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  state.filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'news-item';

    const title = escapeHtml(item.title || '');
    const summaryRaw = item.summary || '';
    const summaryShort = summaryRaw.length > 220
      ? escapeHtml(summaryRaw.slice(0, 220)) + '…'
      : escapeHtml(summaryRaw);

    const tagsHtml = (item.tags || [])
      .slice(0, 5)
      .map(t => `<span class="tag">${escapeHtml(t)}</span>`)
      .join('');

    const dateStr = formatDate(item.date);
    const sourceStr = escapeHtml(item.source || '');

    // 生成卡片按钮使用 data-* + 事件委托
    div.innerHTML = `
      <h3>${title}</h3>
      <div class="meta">${sourceStr} · ${dateStr}</div>
      <div class="summary">${summaryShort}</div>
      <div class="tag-row">${tagsHtml}</div>
      <div class="actions">
        <a href="${item.url || '#'}" target="_blank" rel="noopener">源链接</a>
        <button class="secondary" data-action="open-card" data-id="${escapeHtml(item.id)}">生成卡片</button>
      </div>
    `;
    grid.appendChild(div);
  });

  const countEl = document.getElementById('newsCount');
  if (countEl) {
    countEl.textContent = `共 ${state.filtered.length} 条（总计 ${state.all.length} 条）`;
  }
}

// ================== 卡片跳转 ==================
function openCard(id) {
  if (!id) return;
  window.location.href = `prompt.html?id=${encodeURIComponent(id)}`;
}

// ================== 事件绑定 ==================
function bindEvents() {
  const applyBtn = document.getElementById('applyFilterBtn');
  const resetBtn = document.getElementById('resetFilterBtn');
  if (applyBtn) applyBtn.addEventListener('click', applyFilter);
  if (resetBtn) resetBtn.addEventListener('click', resetFilter);

  // 输入框回车直接过滤
  [document.getElementById('searchInput'), document.getElementById('tagInput')].forEach(inp => {
    if (inp) {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') applyFilter();
      });
    }
  });

  // 事件委托处理生成卡片
  const grid = document.getElementById('newsGrid');
  if (grid) {
    grid.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="open-card"]');
      if (btn) openCard(btn.getAttribute('data-id'));
    });
  }
}

// ================== 初始化 ==================
function init() {
  bindEvents();
  loadLogo();
  loadData();
}

// DOM Ready
document.addEventListener('DOMContentLoaded', init);

// 可选：调试暴露
window.__NEWS_LIST__ = state;