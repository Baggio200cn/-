import { escapeHTML } from './news-utils.js';

const container = document.getElementById('clusters');

export function renderClusters(clusters){
  container.innerHTML = '';
  clusters.forEach(c=>{
    const div=document.createElement('div');
    div.className='cluster-card';
    const keyLine = (c.keyPoints||[]).slice(0,2).join(' / ');
    const list = c.items.slice(0,25).map(it=> `<li>${escapeHTML(it.title)}</li>`).join('');
    div.innerHTML = `
      <h3>${escapeHTML(c.topic||'(未命名)')}</h3>
      <div class="cluster-meta">${c.items.length} sources · ID: ${c.id}</div>
      <div style="font-size:12px;color:#555;min-height:32px;">${escapeHTML(c.summary||'')}</div>
      <div style="font-size:12px;color:#68707c;margin:4px 0;">${escapeHTML(keyLine)}</div>
      <div style="margin:4px 0 6px;">${(c.tags||[]).map(t=>`<span class="badge">${escapeHTML(t)}</span>`).join('')}</div>
      <ul class="sources">${list}</ul>
      <div class="card-actions">
        <button class="btn-generate">生成学习卡片</button>
      </div>
    `;
    div.querySelector('.btn-generate').onclick=()=>{
      localStorage.setItem('selectedCluster', c.id);
      location.href='./card-generator.html?cluster='+encodeURIComponent(c.id);
    };
    container.appendChild(div);
  });
}

export function updateStats({raw,clusters, llm}){
  const el=document.getElementById('stats');
  if(el) el.textContent = `Raw: ${raw} Clusters: ${clusters} LLM: ${llm}`;
}
