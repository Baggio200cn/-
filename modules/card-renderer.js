export function renderClusters(container, clusters) {
  container.innerHTML = clusters.map(c => {
    const badge = c._llmEnhanced ? '<span class="llm-badge">LLM</span>' : '';
    const srcList = c.sources.slice(0,6).map(s=>`<li><a href="${s.url}" target="_blank">${escapeHtml(s.title)}</a></li>`).join('');
    const more = c.sources.length>6 ? `<li>... 共 ${c.sources.length} 条</li>` : '';
    const tags = (c.tags||[]).map(t=>`<span class="tag-badge">${escapeHtml(t)}</span>`).join('');
    return `
      <div class="cluster-card" data-id="${c.id}">
        <h3>${escapeHtml(c.topic||'未命名')}${badge}</h3>
        <div style="font-size:12px;color:#666;">${escapeHtml(c.summary||'')}</div>
        <div style="font-size:11px;">${tags}</div>
        <ul class="sources">${srcList}${more}</ul>
        <div class="actions">
          <button data-action="openSource">源链接</button>
          <button data-action="genCard">生成学习卡片</button>
        </div>
      </div>
    `;
  }).join('');
}

export function attachCardActions(clusters) {
  document.querySelectorAll('.cluster-card button[data-action]').forEach(btn=>{
    btn.onclick = () => {
      const action = btn.getAttribute('data-action');
      const card = btn.closest('.cluster-card');
      const id = card.getAttribute('data-id');
      const cluster = clusters.find(c=>c.id===id);
      if (!cluster) return;
      if (action === 'openSource') {
        const first = cluster.sources[0];
        if (first && first.url) window.open(first.url,'_blank');
      } else if (action === 'genCard') {
        localStorage.setItem('selectedCluster', JSON.stringify(cluster));
        window.location.href = `card-generator.html?cluster=${cluster.id}`;
      }
    };
  });
}

export function updateStats(rawItems, clusters, rawEl, cluEl, llmEl) {
  rawEl.textContent = `Raw: ${rawItems.length}`;
  cluEl.textContent = `Clusters: ${clusters.length}`;
  llmEl.textContent = `LLM: ${clusters.filter(c=>c._llmEnhanced).length}`;
}

function escapeHtml(s='') {
  return s.replace(/[&<>"]/g, ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
  })[ch]);
}
