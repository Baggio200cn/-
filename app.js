// ...保留你之前顶部 import...
import { enhanceClusters } from './modules/enhance-pipeline.js';
import { ensureBilingualAndPrompt } from './modules/bilingual.js';
import { renderClusters, updateStats } from './modules/card-renderer.js';
import { clusterItems, groupByCompany } from './modules/cluster-engine.js';
import { generateHeuristicsForClusters } from './modules/topic-extract.js';
import { loadRawItems } from './modules/data-loader.js';
import { hashItems, getCached, saveCache, clearCache } from './modules/cache-utils.js';

console.log('[app.js] start integrated-llm');

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
  llmProgress: document.getElementById('llmProgress')
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
    clusters.forEach(c=> ensureBilingualAndPrompt(c));
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
  window.__PER_CLUSTER_ENHANCE__ = perClusterEnhance;
  window.__CLUSTER_DIAG__ = () => ({
    raw: rawItems.length,
    clusters: clusters.length,
    sampleTopic: clusters[0]?.topicEn
  });
}

function updateAllStats(){
  updateStats({
    raw: rawItems.length,
    clusters: clusters.length,
    llm: clusters.filter(c=>c.translationStatus==='llm').length
  });
}

async function recluster(){
  const params = currentParams();
  showMessage('重新聚类...');
  clusters = clusterItems(rawItems, params);
  generateHeuristicsForClusters(clusters);
  clusters.forEach(c=> ensureBilingualAndPrompt(c));
  saveCache(newsHash, { ...params, clusters });
  render();
  updateAllStats();
  clearMessageDelayed();
}

function bindEvents(){
  els.thresholdInput.addEventListener('input', ()=>{
    els.thresholdValue.textContent = '('+parseFloat(els.thresholdInput.value).toFixed(2)+')';
  });
  els.btnRecluster.addEventListener('click', ()=> recluster());
  els.btnClearCache.addEventListener('click', ()=>{
    clearCache(); showMessage('缓存已清');
    recluster();
  });
  els.btnGroupCompany.addEventListener('click', ()=>{
    showMessage('按公司聚合...');
    groupByCompany(clusters);
    generateHeuristicsForClusters(clusters);
    clusters.forEach(ensureBilingualAndPrompt);
    saveCache(newsHash, { ...currentParams(), clusters });
    render();
    updateAllStats();
    clearMessageDelayed();
  });
  els.btnLLMPanel.addEventListener('click', ()=> els.llmPanel.classList.toggle('visible'));
  els.btnLegacy.addEventListener('click', ()=> location.href='./legacy-index.html');
  els.btnSaveLLM.addEventListener('click', saveLLMConfig);
  els.btnEnhanceLLM.addEventListener('click', batchEnhance);
  loadLLMConfig();
}

function saveLLMConfig(){
  const cfg = {
    base: els.llmBase.value.trim(),
    key: els.llmKey.value.trim(),
    model: els.llmModel.value.trim(),
    batch: parseInt(els.llmBatch.value,10)||4,
    provider: 'openai'
  };
  localStorage.setItem('LLM_CFG', JSON.stringify(cfg));
  showMessage('LLM 配置已保存');
  clearMessageDelayed();
}
function loadLLMConfig(){
  const raw = localStorage.getItem('LLM_CFG');
  if(!raw) return;
  try{
    const cfg = JSON.parse(raw);
    els.llmBase.value = cfg.base||'';
    els.llmKey.value = cfg.key||'';
    els.llmModel.value = cfg.model||'';
    els.llmBatch.value = cfg.batch||4;
  }catch{}
}

async function batchEnhance(){
  const cfg = readLLM();
  if(!cfg.key){
    alert('请先配置 LLM Key');
    return;
  }
  showMessage('LLM 批量增强启动');
  els.llmProgress.textContent = '0 / '+clusters.length;
  try{
    await enhanceClusters(clusters, {
      provider: cfg.provider,
      baseURL: cfg.base,
      apiKey: cfg.key,
      model: cfg.model,
      maxConcurrent: Math.min(3, cfg.batch||2),
      onProgress:(done,total,id,status,err)=>{
        els.llmProgress.textContent = `${done} / ${total} (${id} ${status}${err?':'+err:''})`;
        if(done===total){
          showMessage('LLM 增强完成');
          setTimeout(clearMessage, 1500);
        }
      }
    });
    saveCache(newsHash, { ...currentParams(), clusters });
    render();
    updateAllStats();
  } catch(e){
    console.error(e);
    showMessage('LLM 失败:'+e.message);
  }
}

async function perClusterEnhance(cluster){
  const cfg = readLLM();
  if(!cfg.key){
    alert('请先配置 LLM Key');
    return;
  }
  showMessage('增强 '+cluster.id+'...');
  try {
    await enhanceClusters([cluster], {
      provider: cfg.provider,
      baseURL: cfg.base,
      apiKey: cfg.key,
      model: cfg.model,
      maxConcurrent:1,
      onProgress:()=>{}
    });
    saveCache(newsHash, { ...currentParams(), clusters });
    render();
    updateAllStats();
    showMessage(cluster.id+' 完成');
    clearMessageDelayed();
  } catch(e){
    showMessage('失败:'+e.message);
  }
}

function readLLM(){
  const raw = localStorage.getItem('LLM_CFG');
  if(!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
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
function clearMessageDelayed(){ setTimeout(clearMessage, 900); }
