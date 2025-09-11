import { loadRawItems } from './modules/data-loader.js';
import { clusterItems, groupByCompany } from './modules/cluster-engine.js';
import { generateHeuristicsForClusters } from './modules/topic-extract.js';
import { renderClusters, updateStats } from './modules/card-renderer.js';
import { hashItems, getCached, saveCache, clearCache } from './modules/cache-utils.js';

console.log('[app.js] start');

const els = {
  thresholdInput: document.getElementById('thresholdInput'),
  thresholdValue: document.getElementById('thresholdValue'),
  titleMergeInput: document.getElementById('titleMergeInput'),
  btnRecluster: document.getElementById('btnRecluster'),
  btnClearCache: document.getElementById('btnClearCache'),
  btnGroupCompany: document.getElementById('btnGroupCompany'),
  btnLLMPanel: document.getElementById('btnLLMPanel'),
  btnLegacy: document.getElementById('btnLegacy'),
  btnSaveLLM: document.getElementById('btnSaveLLM'),
  btnEnhanceLLM: document.getElementById('btnEnhanceLLM'),
  llmPanel: document.getElementById('llmPanel'),
  llmBase: document.getElementById('llmBase'),
  llmKey: document.getElementById('llmKey'),
  llmModel: document.getElementById('llmModel'),
  llmBatch: document.getElementById('llmBatch'),
  llmProgress: document.getElementById('llmProgress'),
  clusters: document.getElementById('clusters'),
  stats: document.getElementById('stats')
};

let rawItems = [];
let clusters = [];
let newsHash = '';

bootstrap().catch(e=>{
  console.error('[bootstrap] fatal', e);
  showMessage('初始化失败: '+ (e.message||e));
});

async function bootstrap(){
  showMessage('加载数据...');
  rawItems = await loadRawItems();
  newsHash = hashItems(rawItems);
  const params = currentParams();
  const cache = getCached(newsHash, params);
  if(cache){
    clusters = cache.clusters;
  } else {
    clusters = clusterItems(rawItems, params);
    generateHeuristicsForClusters(clusters);
    saveCache(newsHash, { ...params, clusters });
  }
  render();
  bindEvents();
  updateAllStats();
  showMessage('完成');
  setTimeout(clearMessage, 800);
  console.log('[bootstrap] done raw=', rawItems.length, 'clusters=', clusters.length);
}

function currentParams(){
  return {
    threshold: parseFloat(els.thresholdInput.value),
    titleMerge: !!els.titleMergeInput.checked
  };
}

function render(){
  renderClusters(clusters);
  window.__CLUSTERS__ = clusters;
  window.__CLUSTER_DIAG__ = () => ({
    raw: rawItems.length,
    clusters: clusters.length,
    sampleTopic: clusters[0]?.topic
  });
}

function updateAllStats(){
  updateStats({
    raw: rawItems.length,
    clusters: clusters.length,
    llm: clusters.filter(c=>c._llmEnhanced).length
  });
}

async function recluster(){
  const params = currentParams();
  showMessage('重新聚类中...');
  clusters = clusterItems(rawItems, params);
  generateHeuristicsForClusters(clusters);
  saveCache(newsHash, { ...params, clusters });
  render();
  updateAllStats();
  clearMessageDelayed();
}

function bindEvents(){
  els.thresholdInput.addEventListener('input', ()=>{
    els.thresholdValue.textContent = '('+parseFloat(els.thresholdInput.value).toFixed(2)+')';
  });

  els.btnRecluster.addEventListener('click', ()=>recluster());

  els.btnClearCache.addEventListener('click', ()=>{
    clearCache();
    showMessage('缓存已清，重新聚类...');
    recluster();
  });

  els.btnGroupCompany.addEventListener('click', ()=>{
    showMessage('按公司聚合...');
    groupByCompany(clusters);
    generateHeuristicsForClusters(clusters);
    saveCache(newsHash, { ...currentParams(), clusters });
    render();
    updateAllStats();
    clearMessageDelayed();
  });

  els.btnLLMPanel.addEventListener('click', ()=>{
    els.llmPanel.classList.toggle('visible');
  });

  els.btnLegacy.addEventListener('click', ()=> location.href='./legacy-index.html');
}

function showMessage(msg){
  let el = document.getElementById('globalMsg');
  if(!el){
    el = document.createElement('div');
    el.id='globalMsg';
    el.style.position='fixed';
    el.style.top='10px';
    el.style.left='50%';
    el.style.transform='translateX(-50%)';
    el.style.background='#1456c3';
    el.style.color='#fff';
    el.style.padding='6px 16px';
    el.style.borderRadius='20px';
    el.style.fontSize='12px';
    el.style.zIndex='9999';
    document.body.appendChild(el);
  }
  el.textContent = msg;
}
function clearMessage(){ const el=document.getElementById('globalMsg'); if(el) el.remove(); }
function clearMessageDelayed(){ setTimeout(clearMessage, 800); }
