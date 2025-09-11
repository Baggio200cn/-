import { loadRawItems } from './modules/data-loader.js';
import { clusterItems } from './modules/cluster-engine.js';
import { generateHeuristicsForClusters } from './modules/topic-extract.js';
import { getCached, saveCache, clearCache, hashItems } from './modules/cache-utils.js';
import { runLLMEnhancement } from './modules/llm-topic.js';
import { renderClusters, updateStats, attachGenerateButtons } from './modules/card-renderer.js';
import { initI18nToggle } from './modules/i18n.js';

const els = {
  thresholdInput: document.getElementById('thresholdInput'),
  thresholdValue: document.getElementById('thresholdValue'),
  titleMergeInput: document.getElementById('titleMergeInput'),
  btnRecluster: document.getElementById('btnRecluster'),
  btnClearCache: document.getElementById('btnClearCache'),
  btnLLMPanel: document.getElementById('btnLLMPanel'),
  btnLegacy: document.getElementById('btnLegacy'),
  llmPanel: document.getElementById('llmPanel'),
  btnSaveLLM: document.getElementById('btnSaveLLM'),
  btnEnhanceLLM: document.getElementById('btnEnhanceLLM'),
  llmBase: document.getElementById('llmBase'),
  llmKey: document.getElementById('llmKey'),
  llmModel: document.getElementById('llmModel'),
  llmBatch: document.getElementById('llmBatch'),
  llmProgress: document.getElementById('llmProgress'),
  stats: document.getElementById('stats'),
  btnLang: document.getElementById('btnLang'),
  clustersContainer: document.getElementById('clusters')
};

let rawItems = [];
let clusters = [];
let newsHash = '';

const STORAGE_LLM_CFG = 'LLM_CONFIG_V1';

initI18nToggle(els.btnLang);
showMessage('正在加载数据...');

bootstrap().catch(e => {
  console.error('[bootstrap] fatal', e);
  showMessage('加载失败：' + (e?.message || e));
});

async function bootstrap(){
  rawItems = await loadRawItems();
  newsHash = hashItems(rawItems);

  const threshold = parseFloat(els.thresholdInput.value);
  const titleMerge = !!els.titleMergeInput.checked;
  const cache = getCached(newsHash, { threshold, titleMerge });

  if(cache){
    clusters = cache.clusters;
  } else {
    clusters = clusterItems(rawItems, { threshold, titleMerge });
    generateHeuristicsForClusters(clusters);
    saveCache(newsHash, { threshold, titleMerge, clusters });
  }

  render();
  updateAllStats();
  bindEvents();
  loadLLMConfig();
  clearMessage();
}

function bindEvents(){
  els.thresholdInput.addEventListener('input', ()=>{
    els.thresholdValue.textContent = '(' + parseFloat(els.thresholdInput.value).toFixed(2) + ')';
  });

  els.btnRecluster.addEventListener('click', async ()=>{
    await recluster();
  });

  els.btnClearCache.addEventListener('click', ()=>{
    clearCache();
    clusters = [];
    updateAllStats();
    recluster();
  });

  els.btnLLMPanel.addEventListener('click', ()=>{
    els.llmPanel.classList.toggle('visible');
  });

  els.btnLegacy.addEventListener('click', ()=> location.href = './legacy-index.html');
  els.btnSaveLLM.addEventListener('click', saveLLMConfig);
  els.btnEnhanceLLM.addEventListener('click', enhanceAll);
}

async function recluster(){
  try {
    showMessage('正在重新聚类...');
    const threshold = parseFloat(els.thresholdInput.value);
    const titleMerge = !!els.titleMergeInput.checked;
    clusters = clusterItems(rawItems, { threshold, titleMerge });
    generateHeuristicsForClusters(clusters);
    saveCache(newsHash, { threshold, titleMerge, clusters });
    render();
    updateAllStats();
  } catch(e){
    console.error('[recluster] error', e);
    showMessage('聚类失败：' + (e.message||e));
  } finally {
    setTimeout(clearMessage, 600);
  }
}

function render(){
  renderClusters(clusters);
  attachGenerateButtons();
  window.__CLUSTERS__ = clusters;
  window.__CLUSTER_DIAG__ = ()=>({
    rawCount: rawItems.length,
    clusterCount: clusters.length,
    enhanced: clusters.filter(c=>c._llmEnhanced).length,
    threshold: parseFloat(els.thresholdInput.value),
    titleMerge: !!els.titleMergeInput.checked
  });
}

function updateAllStats(){
  updateStats({
    raw: rawItems.length,
    clusters: clusters.length,
    llm: clusters.filter(c=>c._llmEnhanced).length
  });
}

function saveLLMConfig(){
  const cfg = {
    apiBase: els.llmBase.value.trim(),
    apiKey: els.llmKey.value.trim(),
    model: els.llmModel.value.trim(),
    batchSize: Math.max(1, Math.min(10, parseInt(els.llmBatch.value || '4', 10)))
  };
  localStorage.setItem(STORAGE_LLM_CFG, JSON.stringify(cfg));
  els.llmProgress.textContent = '配置已保存';
  setTimeout(()=> els.llmProgress.textContent = '', 1500);
}

function loadLLMConfig(){
  try {
    const raw = localStorage.getItem(STORAGE_LLM_CFG);
    if(!raw) return;
    const cfg = JSON.parse(raw);
    els.llmBase.value = cfg.apiBase || '';
    els.llmKey.value = cfg.apiKey || '';
    els.llmModel.value = cfg.model || '';
    els.llmBatch.value = cfg.batchSize || 4;
  } catch(e){
    console.warn('[loadLLMConfig] parse fail', e);
  }
}

async function enhanceAll(){
  const rawCfg = localStorage.getItem(STORAGE_LLM_CFG);
  if(!rawCfg){ alert('请先保存 LLM 配置'); return; }
  const cfg = JSON.parse(rawCfg);
  els.btnEnhanceLLM.disabled = true;
  els.llmProgress.textContent = '开始增强...';

  await runLLMEnhancement(clusters, cfg, (done,total)=>{
    els.llmProgress.textContent = `已处理 ${done}/${total}`;
    updateAllStats();
    render();
  });

  saveCache(newsHash, {
    threshold: parseFloat(els.thresholdInput.value),
    titleMerge: !!els.titleMergeInput.checked,
    clusters
  });
  els.btnEnhanceLLM.disabled = false;
  els.llmProgress.textContent = '完成';
  setTimeout(()=>{ els.llmProgress.textContent = ''; }, 2000);
}

function showMessage(msg){
  let el = document.getElementById('globalMsg');
  if(!el){
    el = document.createElement('div');
    el.id = 'globalMsg';
    el.style.position='fixed';
    el.style.top='10px';
    el.style.left='50%';
    el.style.transform='translateX(-50%)';
    el.style.background='#1456c3';
    el.style.color='#fff';
    el.style.padding='6px 14px';
    el.style.borderRadius='20px';
    el.style.fontSize='12px';
    el.style.zIndex='9999';
    document.body.appendChild(el);
  }
  el.textContent = msg;
}

function clearMessage(){
  const el = document.getElementById('globalMsg');
  if(el) el.remove();
}
