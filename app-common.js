const BUILD_VERSION = 'v4';
const LOGO_CANDIDATES = [
  'assets/company-logo.svg',
  'assets/company-logo.png',
  'assets/logo-placeholder.svg'
];

const state = {
  all: [],
  filtered: []
};

async function loadLogo() {
  const img = document.getElementById('siteLogo');
  for (const p of LOGO_CANDIDATES) {
    try {
      const r = await fetch(p + '?v=' + BUILD_VERSION, { cache: 'reload' });
      if (r.ok) { img.src = URL.createObjectURL(await r.blob()); return; }
    } catch {}
  }
  img.alt = 'NO-LOGO';
}

async function loadData() {
  try {
    const resp = await fetch('data/news.json?v=' + Date.now());
    if (!resp.ok) throw new Error(resp.status);
    state.all = await resp.json();
    state.filtered = state.all.slice();
    render();
  } catch (e) {
    document.getElementById('newsCount').textContent = '加载失败: ' + e.message;
  }
}

function applyFilter() {
  const tagStr = document.getElementById('tagInput').value.trim();
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  let tags = tagStr ? tagStr.split(/[,，]/).map(s=>s.trim()).filter(Boolean) : [];
  state.filtered = state.all.filter(item => {
    // 标签 AND
    if (tags.length) {
      const its = (item.tags || []).map(t=>t.toLowerCase());
      if (!tags.every(t => its.includes(t.toLowerCase()))) return false;
    }
    if (search) {
      const combo = (item.title + ' ' + (item.summary || '')).toLowerCase();
      if (!combo.includes(search)) return false;
    }
    return true;
  });
  render();
}

function resetFilter() {
  document.getElementById('tagInput').value = '';
  document.getElementById('searchInput').value = '';
  state.filtered = state.all.slice();
  render();
}

function render() {
  const grid = document.getElementById('newsGrid');
  grid.innerHTML = '';
  state.filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'news-item';
    div.innerHTML = `
      <h3>${escapeHtml(item.title)}</h3>
      <div class="meta">${escapeHtml(item.source)} · ${formatDate(item.date)}</div>
      <div class="summary">${escapeHtml(item.summary || '').slice(0,220)}${(item.summary||'').length>220?'…':''}</div>
      <div class="tag-row">${(item.tags||[]).slice(0,5).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="actions">
        <a href="${item.url || '#'}" target="_blank" rel="noopener">源链接</a>
        <button class="secondary" onclick="openCard('${item.id}')">生成卡片</button>
      </div>
    `;
    grid.appendChild(div);
  });
  document.getElementById('newsCount').textContent =
    `共 ${state.filtered.length} 条（总计 ${state.all.length} 条）`;
}

function openCard(id) {
  window.location = `prompt.html?id=${encodeURIComponent(id)}`;
}

function escapeHtml(str='') {
  return str.replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function formatDate(s) {
  try { const d=new Date(s); return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`; }
  catch { return s; }
}

document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
document.getElementById('resetFilterBtn').addEventListener('click', resetFilter);

loadLogo();
loadData();
