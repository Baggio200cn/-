import { escapeHTML } from './news-utils.js';
import { groupByCompany } from './cluster-engine.js';
import { generateHeuristicsForClusters } from './topic-extract.js';
import { saveCache } from './cache-utils.js';

const container = document.getElementById('clusters');

export function renderClusters(clusters){
  container.innerHTML = '';
  clusters.forEach(c=>{
    const topic = c.topic || '(未命名主题)';
    const badges = (c.tags||[]).slice(0,10).map(t=>`<span class="badge">${escapeHTML(t)}</span>`).join('');
    const status = c._llmEnhanced ? '<span class="badge llm">LLM</span>' : (c._llmError ? '<span class="badge err">ERR</span>' : '');
    const keyLine = (c.keyPoints||[]).slice(0,2).map(k=>escapeHTML(k)).join(' / ');

    const li = c.items.slice(0,25).map(it=>`<li>${escapeHTML(it.title)}</li>`).join('');

    const div = document.createElement('div');
    div.className='cluster-card';
    div.dataset.id=c.id;
    div.innerHTML = `
      <h3>${escapeHTML(topic)} ${status}</h3>
      <div class="cluster-meta">${c.items.length} sources · ID: ${c.id}</div>
      <div style="font-size:13px;line-height:1.45;min-height:40px;">${escapeHTML(c.summary||'')}</div>
      <div style="margin:6px 0 4px;">${badges}</div>
      <div style="font-size:12px;color:#596574;">${keyLine}</div>
      <ul class="sources">${li}</ul>
      <div class="card-actions">
        <button class="secondary btn-source">源链接</button>
        <button class="btn-generate">生成学习卡片</button>
      </div>
    `;
    container.appendChild(div);
  });
  attachGenerateButtons();
}

export function attachGenerateButtons(){
  container.querySelectorAll('.cluster-card').forEach(card=>{
    const id = card.dataset.id;
    const cluster = window.__CLUSTERS__.find(c=>c.id===id);
    const btnGen = card.querySelector('.btn-generate');
    const btnSrc = card.querySelector('.btn-source');

    btnGen.onclick = ()=>{
      localStorage.setItem('selectedCluster', id);
      location.href = './card-generator.html?cluster='+encodeURIComponent(id);
    };
    btnSrc.onclick = ()=>{
      if(cluster?.items[0]?.url){
        window.open(cluster.items[0].url,'_blank','noopener');
      }
    };
  });
}

export function updateStats({ raw, clusters, llm }){
  const el = document.getElementById('stats');
  if(el) el.textContent = `Raw: ${raw} Clusters: ${clusters} LLM: ${llm}`;
}

// 供主页“按公司再聚合”按钮使用
export function companyAggregateAction(clusters, newsHash, params){
  groupByCompany(clusters);
  generateHeuristicsForClusters(clusters);
  saveCache(newsHash, { ...params, clusters });
  renderClusters(clusters);
  window.__CLUSTERS__ = clusters;
}
