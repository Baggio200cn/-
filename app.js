// 首页脚本（依赖 news-utils.js 已加载）
const LOGO_CANDIDATES = [
  'assets/seerboldor标识高清版.png',
  'assets/company-logo.svg',
  'assets/company-logo.png',
  'assets/logo-placeholder.svg'
];

const state = { all: [], filtered: [] };
const lang = getLang();

async function loadLogo() {
  const img = document.getElementById('siteLogo');
  if (!img) return;
  for (const p of LOGO_CANDIDATES) {
    try {
      const r = await fetch(p + '?v=' + NewsUtils.getVersion(), { cache: 'reload' });
      if (r.ok) { img.src = URL.createObjectURL(await r.blob()); return; }
    } catch {}
  }
  img.alt = 'NO-LOGO';
}

async function loadData() {
  const infoEl = document.getElementById('newsCount');
  try {
    infoEl.textContent = I18N[lang].loading;
    const data = await NewsUtils.loadAll(true);
    state.all = data;
    state.filtered = data.slice();
    render();
  } catch (e) {
    console.error(e);
    infoEl.style.color = '#b91c1c';
    infoEl.textContent = I18N[lang].failed + ': ' + e.message;
  }
}

function applyFilter() {
  const tagInput = document.getElementById('tagInput');
  const searchInput = document.getElementById('searchInput');
  if (!tagInput || !searchInput) return;
  const tagStr = tagInput.value.trim();
  const search = searchInput.value.trim().toLowerCase();
  const tags = tagStr ? tagStr.split(/[,，]/).map(s=>s.trim()).filter(Boolean) : [];
  state.filtered = state.all.filter(item => {
    if (tags.length) {
      const its = NewsUtils.getDisplayTags(item, lang).map(t=>t.toLowerCase());
      if (!tags.every(t => its.includes(t.toLowerCase()))) return false;
    }
    if (search) {
      const combo = (NewsUtils.getDisplayField(item,'title',lang) + ' ' +
        NewsUtils.getDisplayField(item,'summary',lang)).toLowerCase();
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

function render() {
  const grid = document.getElementById('newsGrid');
  const infoEl = document.getElementById('newsCount');
  if (!grid) return;
  grid.innerHTML = '';
  state.filtered.forEach(item => {
    const title = NewsUtils.getDisplayField(item,'title',lang);
    const summary = NewsUtils.getDisplayField(item,'summary',lang);
    const tags = NewsUtils.getDisplayTags(item,lang);
    const div = document.createElement('div');
    div.className = 'news-item';
    div.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <div class="meta">${escapeHtml(item.source)} · ${formatDate(item.date)}</div>
      <div class="summary">${escapeHtml(summary || '').slice(0,240)}${(summary||'').length>240?'…':''}</div>
      <div class="tag-row">
        ${tags.slice(0,6).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}
      </div>
      <div class="actions">
        <a class="primary" href="${item.url || '#'}" target="_blank" rel="noopener">${I18N[lang].sourceLink}</a>
        <button class="secondary" data-id="${item.id}" onclick="openCard('${item.id}')">${I18N[lang].genCard}</button>
      </div>
    `;
    grid.appendChild(div);
  });
  if (infoEl) infoEl.textContent = I18N[lang].total(state.filtered.length, state.all.length);
}

function openCard(id) {
  window.location = `prompt.html?id=${encodeURIComponent(id)}`;
}

// Helpers
function escapeHtml(str='') {
  return str.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatDate(s){
  try { const d=new Date(s); return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`; }
  catch { return s; }
}

// Safe event binding
document.addEventListener('DOMContentLoaded', () => {
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) langBtn.addEventListener('click', toggleLang);
  const applyBtn = document.getElementById('applyFilterBtn');
  if (applyBtn) applyBtn.addEventListener('click', applyFilter);
  const resetBtn = document.getElementById('resetFilterBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetFilter);
  loadLogo();
  loadData();
});
