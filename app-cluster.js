// Clustering-based homepage script
const LOGO_CANDIDATES = [
  'assets/seerboldor标识高清版.png',
  'assets/company-logo.svg',
  'assets/company-logo.png',
  'assets/logo-placeholder.svg'
];

const state = {
  rawData: [],
  clusters: [],
  settings: {
    threshold: 0.88,
    titleMerge: false
  }
};

const lang = getLang();

async function loadLogo() {
  const img = document.getElementById('siteLogo');
  if (!img) return;
  for (const p of LOGO_CANDIDATES) {
    try {
      const r = await fetch(p + '?v=' + NewsUtils.getVersion(), { cache: 'reload' });
      if (r.ok) { img.src = URL.createObjectURL(await r.blob()); return; }
    } catch {}
  }
  img.alt = 'NO-LOGO';
}

async function loadData() {
  const clusterCountEl = document.getElementById('clusterCount');
  const rawItemCountEl = document.getElementById('rawItemCount');
  
  try {
    console.log('[app] Loading news data...');
    const data = await NewsUtils.loadAll(true);
    state.rawData = data;
    
    if (rawItemCountEl) {
      rawItemCountEl.textContent = `原始条目: ${data.length}`;
    }
    
    console.log('[app] Loaded', data.length, 'news items');
    
    // Try to load cached clusters first
    const cached = ClusteringUtils.getCachedClusters();
    if (cached && 
        cached.settings && 
        cached.settings.threshold === state.settings.threshold &&
        cached.settings.titleMerge === state.settings.titleMerge &&
        cached.rawCount === data.length) {
      
      console.log('[app] Using cached clusters');
      state.clusters = cached.clusters;
      updateGlobalVariables();
      renderClusters();
      updateStats();
      return;
    }
    
    // Otherwise perform clustering
    await performClustering();
    
  } catch (e) {
    console.error('[app] Failed to load data:', e);
    if (clusterCountEl) {
      clusterCountEl.style.color = '#b91c1c';
      clusterCountEl.textContent = `加载失败: ${e.message}`;
    }
  }
}

async function performClustering() {
  console.log('[app] Performing clustering...');
  const start = performance.now();
  
  try {
    state.clusters = ClusteringUtils.clusterNews(
      state.rawData, 
      state.settings.threshold, 
      state.settings.titleMerge, 
      lang
    );
    
    const duration = performance.now() - start;
    console.log(`[app] Clustering completed in ${duration.toFixed(1)}ms`);
    
    // Cache the results
    ClusteringUtils.setCachedClusters(state.clusters, state.settings, state.rawData.length);
    
    // Update global variables
    updateGlobalVariables();
    
    // Render clusters
    renderClusters();
    updateStats();
    
  } catch (error) {
    console.error('[app] Clustering failed:', error);
    throw error;
  }
}

function updateGlobalVariables() {
  window.__CLUSTERS__ = state.clusters;
  window.__CLUSTER_DIAG__ = {
    version: ClusteringUtils.VERSION,
    lastRun: new Date().toISOString(),
    settings: { ...state.settings },
    performance: {
      clusterCount: state.clusters.length,
      rawItemCount: state.rawData.length,
      avgClusterSize: state.clusters.length > 0 ? 
        (state.rawData.length / state.clusters.length).toFixed(1) : 0
    }
  };
}

function renderClusters() {
  const grid = document.getElementById('clusterGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (state.clusters.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #64748b;">
        <p>没有找到聚类数据。请尝试调整相似度阈值或重新加载数据。</p>
      </div>
    `;
    return;
  }
  
  state.clusters.forEach((cluster, index) => {
    const card = createClusterCard(cluster, index);
    grid.appendChild(card);
  });
}

function createClusterCard(cluster, index) {
  const div = document.createElement('div');
  div.className = 'cluster-card';
  
  // Generate topic and summary
  let topic = cluster.enhanced && cluster.llmData && cluster.llmData.topic 
    ? cluster.llmData.topic 
    : ClusteringUtils.generateClusterTopic(cluster, lang);
  
  let summary = cluster.enhanced && cluster.llmData && cluster.llmData.summary
    ? cluster.llmData.summary
    : ClusteringUtils.generateClusterSummary(cluster, lang);
  
  const tags = ClusteringUtils.getClusterTags(cluster, lang);
  
  // Create sources list
  const sourcesHtml = cluster.items.map((item, idx) => {
    const title = NewsUtils.getDisplayField(item, 'title', lang);
    const truncatedTitle = title.length > 80 ? title.slice(0, 80) + '...' : title;
    return `
      <div class="cluster-source-item">
        ${idx + 1}. <a href="${item.url}" target="_blank" rel="noopener">${escapeHtml(item.source)}</a> - 
        ${escapeHtml(truncatedTitle)}
      </div>
    `;
  }).join('');
  
  div.innerHTML = `
    <div class="cluster-header">
      <h3 class="cluster-topic">${escapeHtml(topic)}</h3>
      <div>
        <span class="cluster-badge">${cluster.items.length} 项</span>
        ${cluster.enhanced ? '<span class="llm-badge">LLM</span>' : ''}
      </div>
    </div>
    
    <div class="cluster-summary">${escapeHtml(summary)}</div>
    
    ${tags.length > 0 ? `
      <div class="cluster-tags">
        ${tags.map(tag => `<span class="cluster-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    ` : ''}
    
    <div class="cluster-sources">
      <div class="cluster-sources-title">包含的新闻源 (${cluster.items.length})</div>
      <div class="cluster-source-list">${sourcesHtml}</div>
    </div>
    
    <div class="cluster-actions">
      <a href="${cluster.items[0].url}" target="_blank" rel="noopener" class="primary">源链接</a>
      <button class="secondary" onclick="generateCard('${cluster.id}')">生成学习卡片</button>
    </div>
  `;
  
  return div;
}

function generateCard(clusterId) {
  // Store cluster in localStorage for card generator
  const cluster = state.clusters.find(c => c.id === clusterId);
  if (cluster) {
    localStorage.setItem(`cluster-${clusterId}`, JSON.stringify(cluster));
    window.location = `card-generator.html?cluster=${encodeURIComponent(clusterId)}`;
  }
}

function updateStats() {
  const clusterCountEl = document.getElementById('clusterCount');
  const rawItemCountEl = document.getElementById('rawItemCount');
  const enhancedCountEl = document.getElementById('enhancedCount');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  
  if (clusterCountEl) {
    clusterCountEl.textContent = `聚类数: ${state.clusters.length}`;
  }
  
  if (rawItemCountEl) {
    rawItemCountEl.textContent = `原始条目: ${state.rawData.length}`;
  }
  
  if (enhancedCountEl) {
    const enhanced = state.clusters.filter(c => c.enhanced).length;
    enhancedCountEl.textContent = `LLM增强: ${enhanced}`;
  }
  
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = `最后更新: ${new Date().toLocaleTimeString()}`;
  }
}

function setupUI() {
  // Threshold control
  const thresholdSlider = document.getElementById('similarityThreshold');
  const thresholdValue = document.getElementById('thresholdValue');
  
  if (thresholdSlider && thresholdValue) {
    thresholdSlider.value = state.settings.threshold;
    thresholdValue.textContent = state.settings.threshold;
    
    thresholdSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      state.settings.threshold = value;
      thresholdValue.textContent = value.toFixed(2);
    });
  }
  
  // Title merge checkbox
  const titleMergeCheckbox = document.getElementById('enableTitleMerge');
  if (titleMergeCheckbox) {
    titleMergeCheckbox.checked = state.settings.titleMerge;
    titleMergeCheckbox.addEventListener('change', (e) => {
      state.settings.titleMerge = e.target.checked;
    });
  }
  
  // Action buttons
  const reclusterBtn = document.getElementById('reclusterBtn');
  if (reclusterBtn) {
    reclusterBtn.addEventListener('click', async () => {
      reclusterBtn.disabled = true;
      reclusterBtn.textContent = '聚类中...';
      
      try {
        await performClustering();
      } finally {
        reclusterBtn.disabled = false;
        reclusterBtn.textContent = '重新聚类';
      }
    });
  }
  
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      ClusteringUtils.clearCache();
      alert('缓存已清除');
    });
  }
  
  // LLM Panel
  const toggleLlmPanelBtn = document.getElementById('toggleLlmPanelBtn');
  const llmPanel = document.getElementById('llmPanel');
  
  if (toggleLlmPanelBtn && llmPanel) {
    toggleLlmPanelBtn.addEventListener('click', () => {
      llmPanel.classList.toggle('show');
      toggleLlmPanelBtn.textContent = llmPanel.classList.contains('show') ? 
        '隐藏 LLM 面板' : 'LLM 设置面板';
    });
  }
  
  setupLLMPanel();
}

function setupLLMPanel() {
  // Load existing config
  const config = LLMUtils.getConfig();
  
  const apiBaseInput = document.getElementById('llmApiBase');
  const apiKeyInput = document.getElementById('llmApiKey');
  const modelInput = document.getElementById('llmModel');
  const batchSizeInput = document.getElementById('llmBatchSize');
  
  if (apiBaseInput) apiBaseInput.value = config.apiBase;
  if (apiKeyInput) apiKeyInput.placeholder = LLMUtils.getMaskedApiKey() || 'sk-...';
  if (modelInput) modelInput.value = config.model;
  if (batchSizeInput) batchSizeInput.value = config.batchSize;
  
  // Save config button
  const saveLlmConfigBtn = document.getElementById('saveLlmConfigBtn');
  if (saveLlmConfigBtn) {
    saveLlmConfigBtn.addEventListener('click', () => {
      const newConfig = {
        apiBase: apiBaseInput?.value || config.apiBase,
        apiKey: apiKeyInput?.value || config.apiKey,
        model: modelInput?.value || config.model,
        batchSize: parseInt(batchSizeInput?.value) || config.batchSize
      };
      
      if (LLMUtils.saveConfig(newConfig)) {
        alert('LLM配置已保存');
        if (apiKeyInput) apiKeyInput.placeholder = LLMUtils.getMaskedApiKey();
        if (apiKeyInput) apiKeyInput.value = '';
      } else {
        alert('保存配置失败');
      }
    });
  }
  
  // Batch enhance button
  const batchEnhanceBtn = document.getElementById('batchEnhanceBtn');
  const llmProgress = document.getElementById('llmProgress');
  
  if (batchEnhanceBtn) {
    batchEnhanceBtn.addEventListener('click', async () => {
      if (!LLMUtils.isConfigured()) {
        alert('请先配置LLM设置');
        return;
      }
      
      const unenhanced = state.clusters.filter(c => !c.enhanced);
      if (unenhanced.length === 0) {
        alert('所有聚类都已经增强过了');
        return;
      }
      
      batchEnhanceBtn.disabled = true;
      batchEnhanceBtn.textContent = '增强中...';
      
      try {
        const processed = await LLMUtils.batchEnhanceClusters(
          state.clusters, 
          lang, 
          (current, total) => {
            if (llmProgress) {
              llmProgress.textContent = `进度: ${current}/${total}`;
            }
          }
        );
        
        // Update cache and re-render
        ClusteringUtils.setCachedClusters(state.clusters, state.settings, state.rawData.length);
        updateGlobalVariables();
        renderClusters();
        updateStats();
        
        alert(`批量增强完成，处理了 ${processed} 个聚类`);
        
      } catch (error) {
        console.error('[app] Batch enhancement failed:', error);
        alert(`批量增强失败: ${error.message}`);
      } finally {
        batchEnhanceBtn.disabled = false;
        batchEnhanceBtn.textContent = '批量增强未优化事件';
        if (llmProgress) llmProgress.textContent = '';
      }
    });
  }
}

// Helpers
function escapeHtml(str='') {
  return str.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('[app] Initializing clustering homepage');
  
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) langBtn.addEventListener('click', toggleLang);
  
  setupUI();
  loadLogo();
  loadData();
  
  console.log('[app] Clustering homepage initialized');
});