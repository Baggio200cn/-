import { escapeHTML } from './news-utils.js';

const container = document.getElementById('clusters');

export function renderClusters(clusters){
  container.innerHTML = '';
  clusters.forEach(c=>{
    const div = document.createElement('div');
    div.className = 'cluster-card';
    div.dataset.id = c.id;

    const badges = (c.tags||[]).slice(0,14)
      .map(t=>`<span class="badge">${escapeHTML(t)}</span>`).join('');

    const statusBadge = c._llmEnhanced
      ? '<span class="badge llm">LLM</span>'
      : (c._llmError ? '<span class="badge err">ERR</span>' : '');

    const keyPoints = (c.keyPoints||[]).slice(0,3).map(k=>escapeHTML(k)).join(' / ');

    div.innerHTML = `
      <h3>${escapeHTML(c.topic||'(未命名)')} ${statusBadge}</h3>
      <div class="cluster-meta">
        ${c.items.length} sources · ID: ${c.id}
      </div>
      <div style="font-size:13px;line-height:1.5;min-height:46px;">${escapeHTML(c.summary||'')}</div>
      <div style="margin:8px 0 4px;">${badges}</div>
      <div style="font-size:12px;color:#5a6572;margin-top:4px;">${keyPoints}</div>
      <ul class="sources">
        ${c.items.slice(0,30).map(it=>`<li title="${escapeHTML(it.title)}">${escapeHTML(it.title)}</li>`).join('')}
      </ul>
      <div class="card-actions">
        <button class="secondary btn-source">源链接</button>
        <button class="btn-generate">生成学习卡片</button>
      </div>
    `;
    container.appendChild(div);
  });
}

export function attachGenerateButtons(){
  container.querySelectorAll('.cluster-card').forEach(card=>{
    const id = card.dataset.id;
    const btn = card.querySelector('.btn-generate');
    const srcBtn = card.querySelector('.btn-source');
    btn.onclick = ()=>{
      localStorage.setItem('selectedCluster', id);
      location.href = './card-generator.html?cluster='+encodeURIComponent(id);
    };
    srcBtn.onclick = ()=>{
      const cluster = window.__CLUSTERS__.find(c=>c.id===id);
      if(!cluster) return;
      const first = cluster.items[0];
      if(first && first.url){
        window.open(first.url,'_blank','noopener');
      }
    };
  });
}

export function updateStats({ raw, clusters, llm }){
  const el = document.getElementById('stats');
  if(el){
    el.textContent = `Raw: ${raw}  Clusters: ${clusters}  LLM: ${llm}`;
  }
}
