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
  // 阈值滑块
  els.thresholdInput.addEventListener('input', ()=>{
    els.thresholdValue.textContent = '(' + parseFloat(els.thresholdInput.value).toFixed(2) + ')';
  });

  // 重新聚类
  els.btnRecluster.addEventListener('click', async ()=>{
    await recluster();
  });

  // 清空缓存并重算
  els.btnClearCache.addEventListener('click', ()=>{
    clearCache();
    clusters = [];
    updateAllStats();
    recluster();
  });

  // LLM 面板显示/隐藏
  els.btnLLMPanel.addEventListener('click', ()=>{
    els.llmPanel.classList.toggle('visible');
  });

  // 其它原有按钮
  els.btnLegacy.addEventListener('click', ()=> location.href='./legacy-index.html');
  els.btnSaveLLM.addEventListener('click', saveLLMConfig);
  els.btnEnhanceLLM.addEventListener('click', enhanceAll);

  // 新增：按公司再聚合
  els.btnGroupCompany.addEventListener('click', ()=>{
    const params = {
      threshold: parseFloat(els.thresholdInput.value),
      titleMerge: !!els.titleMergeInput.checked
    };
    import('./modules/card-renderer.js').then(m=>{
      m.companyAggregateAction(clusters, newsHash, params);
      updateAllStats();
    }).catch(err=>{
      console.error('[companyAggregateAction] failed', err);
    });
  });
}
