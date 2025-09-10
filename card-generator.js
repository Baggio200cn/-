/* 学习卡片生成器增强版
 * 功能：
 *  - 读取 data/news.json 或指定归档
 *  - 翻译（英文 -> 中文），LibreTranslate 作为演示，可替换
 *  - 语言切换缓存
 *  - 手帐风样式 DOM 构建
 *  - Logo 缓存刷新 (BUILD_VERSION & sessionStorage force)
 */

const BUILD_VERSION = 'v4';
// 可替换为你的翻译服务地址（需返回 { translatedText }）
const TRANSLATE_ENDPOINT = 'https://libretranslate.de/translate';
const LOGO_CANDIDATES = [
  'assets/company-logo.svg',
  'assets/company-logo.png',
  'assets/logo-placeholder.svg'
];
// 是否使用“离线假翻译”（调试时设 true，可避免接口限制）
const USE_OFFLINE_FAKE_TRANSLATION = false;

const state = {
  allItems: [],
  selected: null,
  translations: {},       // { id: { titleZh, summaryZh, tagsZh } }
  currentLang: 'original', // 'original' | 'zh'
  hasGenerated: false
};

const els = {
  select: document.getElementById('newsSelect'),
  preview: document.getElementById('selectedPreview'),
  extraNotes: document.getElementById('extraNotes'),
  generateBtn: document.getElementById('generateBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  regenBtn: document.getElementById('regenBtn'),
  resetBtn: document.getElementById('resetBtn'),
  translateBtn: document.getElementById('translateBtn'),
  toggleLangBtn: document.getElementById('toggleLangBtn'),
  forceReloadLogoBtn: document.getElementById('forceReloadLogoBtn'),
  cardContainer: document.getElementById('cardContainer'),
  statusLine: document.getElementById('statusLine')
};

// ---------------- 数据加载 ----------------
async function loadData() {
  const params = new URLSearchParams(location.search);
  const targetId = params.get('id');
  const date = params.get('date');

  let url = 'data/news.json';
  if (date) url = `data/archive/${date}.json`;

  try {
    const resp = await fetch(url + `?v=${Date.now()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.allItems = data;
    populateSelect(targetId);
  } catch (e) {
    els.statusLine.textContent = `加载数据失败: ${e.message}`;
  }
}

function populateSelect(targetId) {
  els.select.innerHTML = '';
  state.allItems.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.title.slice(0, 140);
    els.select.appendChild(opt);
  });

  if (targetId) {
    els.select.value = targetId;
    state.selected = state.allItems.find(i => i.id === targetId) || null;
  } else {
    state.selected = state.allItems[0] || null;
  }
  renderSelectedPreview();
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return dateStr;
  }
}

function renderSelectedPreview() {
  if (!state.selected) {
    els.preview.innerHTML = '<div style="color:#64748b;">暂无数据</div>';
    return;
  }
  const it = state.selected;
  const html = `
    <div class="mini-card">
      <div class="mini-card-title">${escapeHtml(it.title)}</div>
      <div class="mini-meta">来源: <strong>${escapeHtml(it.source)}</strong> | 日期: ${formatDate(it.date)}</div>
      <div class="mini-summary"><strong>摘要:</strong> ${escapeHtml(it.summary || '')}</div>
      <div class="mini-tags"><strong>标签:</strong> ${(it.tags || []).join(', ')}</div>
    </div>
  `;
  els.preview.innerHTML = html;
}

// ---------------- 事件绑定 ----------------
els.select.addEventListener('change', () => {
  state.selected = state.allItems.find(i => i.id === els.select.value) || null;
  state.currentLang = 'original';
  updateLangButtons();
  renderSelectedPreview();
  if (state.hasGenerated) renderCard();
});

els.generateBtn.addEventListener('click', () => {
  if (!state.selected) return;
  state.hasGenerated = true;
  renderCard();
  els.downloadBtn.disabled = false;
  els.regenBtn.disabled = false;
});

els.regenBtn.addEventListener('click', () => {
  if (!state.selected) return;
  renderCard();
});

els.resetBtn.addEventListener('click', () => {
  state.selected = null;
  els.select.value = '';
  els.preview.innerHTML = '';
  els.extraNotes.value = '';
  state.currentLang = 'original';
  state.hasGenerated = false;
  els.cardContainer.innerHTML = '';
  els.downloadBtn.disabled = true;
  els.regenBtn.disabled = true;
  els.translateBtn.disabled = false;
  updateLangButtons();
});

els.forceReloadLogoBtn.addEventListener('click', () => {
  sessionStorage.setItem('logoForceVersion', 'force-' + Date.now());
  location.reload();
});

els.downloadBtn.addEventListener('click', async () => {
  const node = els.cardContainer.querySelector('.learning-card');
  if (!node) return;
  const { toPng } = await import('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/es2015/index.js');
  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    const a = document.createElement('a');
    a.download = `learning-card-${state.selected.id}.png`;
    a.href = dataUrl;
    a.click();
  } catch (e) {
    els.statusLine.textContent = '导出失败: ' + e.message;
  }
});

els.translateBtn.addEventListener('click', async () => {
  if (!state.selected) return;
  els.translateBtn.disabled = true;
  els.statusLine.textContent = '翻译中…（演示接口，可能有延迟或限流）';
  try {
    await translateSelected();
    state.currentLang = 'zh';
    els.statusLine.textContent = '翻译完成';
    updateLangButtons();
    if (state.hasGenerated) renderCard();
  } catch (e) {
    els.translateBtn.disabled = false;
    els.statusLine.textContent = '翻译失败：' + e.message;
  }
});

els.toggleLangBtn.addEventListener('click', () => {
  state.currentLang = state.currentLang === 'zh' ? 'original' : 'zh';
  updateLangButtons();
  if (state.hasGenerated) renderCard();
});

function updateLangButtons() {
  const tr = state.translations[state.selected?.id];
  if (!state.selected) {
    els.translateBtn.disabled = true;
    els.toggleLangBtn.disabled = true;
    return;
  }
  const alreadyZh = containsChinese(state.selected.title + state.selected.summary);
  if (alreadyZh) {
    els.translateBtn.disabled = true;
    els.toggleLangBtn.disabled = true;
    els.statusLine.textContent = '此条目已为中文';
    return;
  }
  if (tr) {
    els.translateBtn.disabled = true;
    els.toggleLangBtn.disabled = false;
  } else {
    els.translateBtn.disabled = false;
    els.toggleLangBtn.disabled = true;
  }
  els.toggleLangBtn.textContent = state.currentLang === 'zh' ? '切换英文' : '切换中文';
}

function containsChinese(str = '') {
  return /[\u4e00-\u9fa5]/.test(str);
}

// ---------------- 翻译逻辑 ----------------
async function translateSelected() {
  const item = state.selected;
  if (!item) return;
  if (state.translations[item.id]) return; // 已翻译缓存

  if (USE_OFFLINE_FAKE_TRANSLATION) {
    // 简单假翻译：在英文后加（中文示意）。
    state.translations[item.id] = {
      titleZh: item.title + '（示例翻译）',
      summaryZh: (item.summary || '') + '（示例翻译内容，仅调试用）',
      tagsZh: (item.tags || []).map(t => t + '-中')
    };
    return;
  }

  async function translateText(text) {
    const resp = await fetch(TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'zh',
        format: 'text'
      })
    });
    if (!resp.ok) throw new Error('翻译接口 HTTP ' + resp.status);
    const data = await resp.json();
    if (!data.translatedText) throw new Error('响应格式错误');
    return data.translatedText;
  }

  const titleZh = await translateText(item.title.slice(0, 500));
  const summaryZh = await translateText((item.summary || '').slice(0, 3000));

  let tagsZh = [];
  if (item.tags && item.tags.length) {
    const merged = item.tags.join(', ');
    const translated = await translateText(merged);
    tagsZh = translated.split(/[,，]\s*/).filter(Boolean);
  }

  state.translations[item.id] = { titleZh, summaryZh, tagsZh };
}

// ---------------- 卡片渲染 ----------------
function renderCard() {
  const item = state.selected;
  if (!item) return;
  const notes = els.extraNotes.value.trim();
  const tr = state.translations[item.id];
  const usingZh = (state.currentLang === 'zh' && tr);
  const title = usingZh ? tr.titleZh : item.title;
  const summary = usingZh ? tr.summaryZh : item.summary;
  const tags = usingZh ? (tr.tagsZh.length ? tr.tagsZh : item.tags) : item.tags;

  const tagHtml = (tags || []).map((t, i) => {
    const cls = i < 2 ? 'tag-solid' : 'tag-outline';
    return `<span class="${cls}">${escapeHtml(t)}</span>`;
  }).join('');

  const notesBlock = notes ? `
    <div class="section">
      <div class="section-title">学习笔记</div>
      <div class="notes-text">${escapeHtml(notes)}</div>
    </div>` : '';

  els.cardContainer.innerHTML = `
    <div class="learning-card" data-lang="${usingZh ? 'zh' : 'en'}">
      <div class="card-inner">
        <div class="card-header">
          <div class="card-logo">
            <img id="cardLogoImg" alt="logo" />
          </div>
            <div class="card-meta">
              <h1 class="card-title">${escapeHtml(title)}</h1>
              <div class="card-source-row">
                <span class="card-source">${escapeHtml(item.source)}</span>
                <span class="card-date">${formatDate(item.date)}</span>
              </div>
            </div>
        </div>

        <div class="divider"></div>

        <div class="section">
          <div class="section-title">内容摘要</div>
          <div class="summary-text">${escapeHtml(summary || '')}</div>
        </div>

        <div class="section">
          <div class="section-title">相关标签</div>
          <div class="tags-row">${tagHtml || '<span class="tag-empty">无</span>'}</div>
        </div>

        ${notesBlock}

        <div class="footer-bar">
          <div class="footer-brand">
            <img class="footer-logo" id="footerLogoImg" alt="logo" />
            <span>机器视觉 • 学习卡片</span>
          </div>
          <div class="footer-watermark">Generated • ${new Date().toLocaleDateString('zh-CN')}</div>
        </div>
      </div>
    </div>
  `;

  // 加载 logo
  loadLogoVersioned(document.getElementById('cardLogoImg'));
  loadLogoVersioned(document.getElementById('footerLogoImg'));
}

// ---------------- Logo 加载 ----------------
async function loadLogoVersioned(imgEl) {
  const force = sessionStorage.getItem('logoForceVersion');
  const versionToken = force || BUILD_VERSION;
  for (const p of LOGO_CANDIDATES) {
    try {
      const resp = await fetch(`${p}?v=${versionToken}`, { cache: 'reload' });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        imgEl.src = url;
        return;
      }
    } catch { /* ignore */ }
  }
  imgEl.alt = 'NO-LOGO';
}

// ---------------- 工具 ----------------
function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 初始化
loadData();
updateLangButtons();
