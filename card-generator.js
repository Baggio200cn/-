// Card generator script (depends on news-utils.js)
const lang = getLang();

document.addEventListener('DOMContentLoaded', async () => {
  const selectEl = document.getElementById('newsSelect');
  const noteEl = document.getElementById('extraNote');
  const statusEl = document.getElementById('cardStatus');
  const containerEl = document.getElementById('generatedCards');

  // 文本本地化
  document.getElementById('pageTitle').textContent = I18N[lang].cardTitle;
  document.getElementById('labelSelect').textContent = I18N[lang].selectNews;
  document.getElementById('labelNote').textContent = I18N[lang].extraNote;
  noteEl.placeholder = I18N[lang].placeholderNote;

  try {
    await NewsUtils.loadAll();
    populateSelect();
    // 如果 URL 带 id 参数，自动选中
    const params = new URLSearchParams(location.search);
    const preId = params.get('id');
    if (preId) {
      selectEl.value = preId;
    }
  } catch (e) {
    statusEl.style.color = '#b91c1c';
    statusEl.textContent = '加载失败: ' + e.message;
  }

  document.getElementById('genCardBtn').addEventListener('click', () => {
    const id = selectEl.value;
    if (!id) {
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = I18N[lang].needSelect;
      return;
    }
    statusEl.textContent = '';
    const item = NewsUtils.findById(id);
    if (!item) {
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = '未找到该条目';
      return;
    }
    const note = noteEl.value.trim();
    const card = buildCard(item, note);
    containerEl.innerHTML = '';
    containerEl.appendChild(card);
    // 未来可添加导出 PNG 功能
  });

  function populateSelect() {
    selectEl.innerHTML = `<option value="">${I18N[lang].selectNews}</option>`;
    const all = NewsUtils.loadAll() || [];
    // loadAll() 返回 Promise，这里用缓存
    const arr = (NewsUtils._cache) ? NewsUtils._cache : [];
    arr.forEach(item => {
      const title = NewsUtils.getDisplayField(item,'title',lang);
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = title.slice(0,120);
      selectEl.appendChild(opt);
    });
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
