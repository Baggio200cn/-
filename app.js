const BUILD_VERSION = 'v4';
const LOGO_CANDIDATES = [
  'assets/seerboldor标识高清版.png',  // 高清 PNG（如果要改名，修改这里）
  'assets/company-logo.svg',
  'assets/company-logo.png',
  'assets/logo-placeholder.svg'
];

const state = { all: [], filtered: [] };

async function loadLogo() {
  const img = document.getElementById('siteLogo');
  for (const p of LOGO_CANDIDATES) {
    try {
      const r = await fetch(p + '?v=' + BUILD_VERSION, { cache: 'reload' });
      if (r.ok) {
        img.src = URL.createObjectURL(await r.blob());
        return;
      }
    } catch (e) {
      console.warn('Logo fetch error', p, e);
    }
  }
  img.alt = 'NO-LOGO';
}

async function loadData() {
  const infoEl = document.getElementById('newsCount');
  try {
    const url = 'data/news.json?v=' + Date.now();
    console.log('[data] fetch', url);
    const resp = await fetch(url);
    console.log('[data] status', resp.status);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    console.log('[data] length', text.length);
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error('JSON 解析失败: ' + e.message + ' | 前120字: ' + text.slice(0,120));
    }
    if (!Array.isArray(json)) throw new Error('JSON 根不是数组');
    state.all = json;
    state.filtered = json.slice();
    render();
  } catch (e) {
    console.error('加载失败', e);
    infoEl.style.color = '#b91c1c';
    infoEl.textContent = '加载数据失败: ' + e.message;
  }
}

function applyFilter() {
  const tagStr = document.getElementById('tagInput').value.trim();
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const tags = tagStr ? tagStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
  state.filtered = state.all.filter(item => {
    if (tags.length) {
      const its = (item.tags || []).map(t => t.toLowerCase());
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
      <div class="tag-row">
        ${(item.tags||[]).slice(0,5).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}
      </div>
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
  return str.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function formatDate(s) {
  try {
    const d = new Date(s);
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
  } catch {
    return s;
  }
}

document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);
document.getElementById('resetFilterBtn').addEventListener('click', resetFilter);

loadLogo();
loadData();
