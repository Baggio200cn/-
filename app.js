// 入口脚本：聚类页面主逻辑

// ==== Imports（集中放在最顶部） ====
import { I18N, NewsUtils, getLang, toggleLang } from './news-utils.js';
import { loadRawItems } from './modules/data-loader.js';
import { getCachedClusters, saveClusterCache, clearClusterCache } from './modules/cache-utils.js';
import { clusterItems } from './modules/cluster-engine.js';
import { renderClusters, attachCardActions, updateStats } from './modules/card-renderer.js';
import { runLLMEnhancement, loadLLMConfig, saveLLMConfig } from './modules/llm-topic.js';

// ==== DOM 引用 ====
const els = {
  threshold: document.getElementById('thresholdInput'),
  thVal: document.getElementById('thVal'),
  titleMerge: document.getElementById('titleMergeChk'),
  recluster: document.getElementById('reclusterBtn'),
  clearCache: document.getElementById('clearCacheBtn'),
  container: document.getElementById('clusters'),
  statsRaw: document.getElementById('statRaw'),
  statsClusters: document.getElementById('statClusters'),
  statsEnhanced: document.getElementById('statEnhanced'),
  toggleLLM: document.getElementById('toggleLLMBtn'),
  llmPanel: document.getElementById('llmPanel'),
  llmBase: document.getElementById('llmBase'),
  llmKey: document.getElementById('llmKey'),
  llmModel: document.getElementById('llmModel'),
  llmBatch: document.getElementById('llmBatch'),
  saveLLM: document.getElementById('saveLLMBtn'),
  runLLM: document.getElementById('runLLMEnhanceBtn'),
  llmProgress: document.getElementById('llmProgress'),
  llmError: document.getElementById('llmError'),
  legacyBtn: document.getElementById('legacyBtn'),
  langBtn: document.querySelector('[data-role="lang-switch"]')
};

let rawItems = [];
let clusters = [];

// ==== 参数获取 ====
const currentParams = () => ({
  threshold: parseFloat(els.threshold.value),
  titleMerge: els.titleMerge.checked
});

// ==== 诊断暴露 ====
function exposeDiagnostics() {
  window.__CLUSTERS__ = clusters;
  window.__CLUSTER_DIAG__ = () => {
    const c = currentParams();
    return {
      rawCount: rawItems.length,
      clusterCount: clusters.length,
      enhanced: clusters.filter(cl => cl._llmEnhanced).length,
      threshold: c.threshold,
      titleMerge: c.titleMerge
    };
  };
}

// ==== 初始化加载 ====
async function initialLoad() {
  rawItems = await loadRawItems();
  const params = currentParams();
  const cached = getCachedClusters(params.threshold, params.titleMerge);
  if (cached) {
    clusters = cached;
  } else {
    clusters = clusterItems(rawItems, params);
    saveClusterCache(params.threshold, params.titleMerge, clusters);
  }
  render();
}

// ==== 渲染 ====
function render() {
  renderClusters(els.container, clusters);
  attachCardActions(clusters);
  updateStats(rawItems, clusters, els.statsRaw, els.statsClusters, els.statsEnhanced);
  exposeDiagnostics();
}

// ==== 重新聚类 ====
function recluster(force = false) {
  const params = currentParams();
  if (force) clearClusterCache();
  const cached = getCachedClusters(params.threshold, params.titleMerge);
  if (cached && !force) {
    clusters = cached;
  } else {
    clusters = clusterItems(rawItems, params);
    saveClusterCache(params.threshold, params.titleMerge, clusters);
  }
  render();
}

// ==== 事件绑定 ====

// 阈值滑块
els.threshold.addEventListener('input', () => {
  els.thVal.textContent = els.threshold.value;
});

// 聚类按钮
els.recluster.addEventListener('click', () => recluster(true));

// 清缓存
els.clearCache.addEventListener('click', () => {
  clearClusterCache();
  recluster(true);
});

// LLM 面板开关
els.toggleLLM.addEventListener('click', () => {
  els.llmPanel.classList.toggle('visible');
});

// 旧版跳转
els.legacyBtn.addEventListener('click', () => {
  window.location.href = 'legacy-index.html';
});

// 语言切换（如果按钮存在）
if (els.langBtn) {
  els.langBtn.addEventListener('click', () => {
    const newLang = toggleLang();
    els.langBtn.textContent = I18N[newLang].switchLabel || newLang.toUpperCase();
    // 如果界面里有依赖语言的文案，可在此调用 render() 或专门的刷新函数
    render();
  });
}

// ==== LLM 配置 ====
const cfg = loadLLMConfig();
if (cfg) {
  els.llmBase.value = cfg.apiBase || '';
  els.llmKey.value = cfg.apiKey || '';
  els.llmModel.value = cfg.model || '';
  els.llmBatch.value = cfg.batchSize || 4;
}

els.saveLLM.addEventListener('click', () => {
  saveLLMConfig({
    apiBase: els.llmBase.value.trim(),
    apiKey: els.llmKey.value.trim(),
    model: els.llmModel.value.trim(),
    batchSize: parseInt(els.llmBatch.value, 10) || 4
  });
  els.llmProgress.textContent = '配置已保存';
});

els.runLLM.addEventListener('click', async () => {
  const config = loadLLMConfig();
  els.llmError.textContent = '';
  els.llmProgress.textContent = '开始增强...';
  await runLLMEnhancement(clusters, config, (info) => {
    els.llmProgress.textContent = `已处理 ${info.done}/${info.total}`;
    render();
  }).catch(e => {
    console.error(e);
    els.llmError.textContent = '增强过程中出现错误（详见控制台）。';
  }).finally(() => {
    render();
  });
});

// ==== 启动 ====
initialLoad();
