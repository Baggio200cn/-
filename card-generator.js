// Card generator script (depends on news-utils.js) - v6.1
const lang = getLang();

// Debug instrumentation - Global state for DevTools inspection
window.__CARD_STATE__ = {
  lang: lang,
  initialized: false,
  newsLoaded: false,
  selectedId: null,
  cardGenerated: false,
  lastError: null,
  stats: {
    newsCount: 0,
    generationCount: 0,
    errorCount: 0
  }
};

// Debug helper object for DevTools
window.cardGenDebug = {
  state: () => window.__CARD_STATE__,
  options: () => ({
    lang: window.__CARD_STATE__.lang,
    version: 'v6.1',
    dependencies: ['news-utils.js']
  }),
  diag: () => ({
    initialized: window.__CARD_STATE__.initialized,
    newsLoaded: window.__CARD_STATE__.newsLoaded,
    newsCount: window.__CARD_STATE__.stats.newsCount,
    generationCount: window.__CARD_STATE__.stats.generationCount,
    errorCount: window.__CARD_STATE__.stats.errorCount,
    selectedId: window.__CARD_STATE__.selectedId,
    lastError: window.__CARD_STATE__.lastError,
    cacheKeys: NewsUtils._cache ? Object.keys(NewsUtils._cache) : [],
    timestamp: new Date().toISOString()
  })
};

console.log('[card-gen] Initializing card generator v6.1, lang:', lang);

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[card-gen] DOM content loaded, initializing elements');
  const selectEl = document.getElementById('newsSelect');
  const noteEl = document.getElementById('extraNote');
  const statusEl = document.getElementById('cardStatus');
  const containerEl = document.getElementById('generatedCards');

  // Update state
  window.__CARD_STATE__.initialized = true;

  console.log('[card-gen] Setting up internationalization');
  // 文本本地化
  document.getElementById('pageTitle').textContent = I18N[lang].cardTitle;
  document.getElementById('labelSelect').textContent = I18N[lang].selectNews;
  document.getElementById('labelNote').textContent = I18N[lang].extraNote;
  noteEl.placeholder = I18N[lang].placeholderNote;

  try {
    console.log('[card-gen] Loading news data...');
    await NewsUtils.loadAll();
    window.__CARD_STATE__.newsLoaded = true;
    console.log('[card-gen] News data loaded successfully');
    populateSelect();
    // 如果 URL 带 id 参数，自动选中
    const params = new URLSearchParams(location.search);
    const preId = params.get('id');
    if (preId) {
      console.log('[card-gen] Auto-selecting news item from URL:', preId);
      selectEl.value = preId;
      window.__CARD_STATE__.selectedId = preId;
    }
  } catch (e) {
    console.error('[card-gen] Failed to load news data:', e);
    window.__CARD_STATE__.lastError = e.message;
    window.__CARD_STATE__.stats.errorCount++;
    statusEl.style.color = '#b91c1c';
    statusEl.textContent = '加载失败: ' + e.message;
  }

  document.getElementById('genCardBtn').addEventListener('click', () => {
    console.log('[card-gen] Generate card button clicked');
    const id = selectEl.value;
    if (!id) {
      console.warn('[card-gen] No news item selected');
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = I18N[lang].needSelect;
      return;
    }
    console.log('[card-gen] Generating card for item ID:', id);
    window.__CARD_STATE__.selectedId = id;
    statusEl.textContent = '';
    const item = NewsUtils.findById(id);
    if (!item) {
      console.error('[card-gen] News item not found:', id);
      window.__CARD_STATE__.lastError = `News item not found: ${id}`;
      window.__CARD_STATE__.stats.errorCount++;
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = '未找到该条目';
      return;
    }
    const note = noteEl.value.trim();
    console.log('[card-gen] Building card with note length:', note.length);
    const card = buildCard(item, note);
    containerEl.innerHTML = '';
    containerEl.appendChild(card);
    window.__CARD_STATE__.cardGenerated = true;
    window.__CARD_STATE__.stats.generationCount++;
    console.log('[card-gen] Card generated successfully');
    // 未来可添加导出 PNG 功能
  });

  function populateSelect() {
    console.log('[card-gen] Populating select dropdown');
    selectEl.innerHTML = `<option value="">${I18N[lang].selectNews}</option>`;
    const all = NewsUtils.loadAll() || [];
    // loadAll() 返回 Promise，这里用缓存
    const arr = (NewsUtils._cache) ? NewsUtils._cache : [];
    console.log('[card-gen] Found cached news items:', arr.length);
    window.__CARD_STATE__.stats.newsCount = arr.length;
    arr.forEach(item => {
      const title = NewsUtils.getDisplayField(item,'title',lang);
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = title.slice(0,120);
      selectEl.appendChild(opt);
    });
    console.log('[card-gen] Select dropdown populated with', arr.length, 'items');
  }

  function buildCard(item, extra) {
    const div = document.createElement('div');
    div.className = 'study-card';
    const title = NewsUtils.getDisplayField(item,'title',lang);
    const summary = NewsUtils.getDisplayField(item,'summary',lang);
    const tags = NewsUtils.getDisplayTags(item,lang);
    div.innerHTML = `
      <div class="card-head">
        <div class="card-logo-zone">
          <span class="card-source">${escapeHtml(item.source)}</span>
          <span class="card-date">${formatDate(item.date)}</span>
        </div>
        <h2 class="card-title">${escapeHtml(title)}</h2>
      </div>
      <div class="card-body">
        <p class="card-summary">${escapeHtml(summary)}</p>
        ${tags.length ? `<div class="card-tags">${tags.slice(0,8).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>`:''}
        ${extra ? `<div class="card-extra">${escapeHtml(extra)}</div>`:''}
      </div>
      <div class="card-footer">
        <span>机器视觉每日 • v${NewsUtils.getVersion()}</span>
      </div>
    `;
    return div;
  }

  function escapeHtml(str=''){return str.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function formatDate(s){ try{const d=new Date(s);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}catch{return s;} }
});
