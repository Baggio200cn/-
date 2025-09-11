// 入口脚本：从原 index.html 内联 <script type="module"> 中迁移
// 如果未来继续拆分，可在 modules 目录新增文件并在此 import

import { loadRawItems } from './modules/data-loader.js';
import { getCachedClusters, saveClusterCache, clearClusterCache } from './modules/cache-utils.js';
import { clusterItems } from './modules/cluster-engine.js';
import { renderClusters, attachCardActions, updateStats } from './modules/card-renderer.js';
import { runLLMEnhancement, loadLLMConfig, saveLLMConfig } from './modules/llm-topic.js';

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
  legacyBtn: document.getElementById('legacyBtn')
};

let rawItems = [];
let clusters = [];

const currentParams = () => ({
  threshold: parseFloat(els.threshold.value),
  titleMerge: els.titleMerge.checked
});

function exposeDiagnostics() {
  window.__CLUSTERS__ = clusters;
  window.__CLUSTER_DIAG__ = () => {
    const c = currentParams();
    return {
      rawCount: rawItems.length,
      clusterCount: clusters.length,
      enhanced: clusters.filter(c => c._llmEnhanced).length,
      threshold: c.threshold,
      titleMerge: c.titleMerge
    };
  };
}

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

function render() {
  renderClusters(els.container, clusters);
  attachCardActions(clusters);
  updateStats(rawItems, clusters, els.statsRaw, els.statsClusters, els.statsEnhanced);
  exposeDiagnostics();
}

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

// UI Events
els.threshold.addEventListener('input', () => {
  els.thVal.textContent = els.threshold.value;
});

els.recluster.addEventListener('click', () => recluster(true));

els.clearCache.addEventListener('click', () => {
  clearClusterCache();
  recluster(true);
});

els.toggleLLM.addEventListener('click', () => {
  els.llmPanel.classList.toggle('visible');
});

els.legacyBtn.addEventListener('click', () => {
  window.location.href = 'legacy-index.html';
});

// LLM Config
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

initialLoad();
