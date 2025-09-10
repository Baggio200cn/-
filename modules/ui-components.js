// UI Components - API key input and LLM enhancement controls
class UIComponents {
  constructor() {
    this.lang = this.getLang();
    this.apiKeyVisible = false;
  }

  getLang() {
    return localStorage.getItem('mv.lang') || 'zh';
  }

  // Create API key input UI
  createApiKeyInput() {
    const div = document.createElement('div');
    div.className = 'llm-controls';
    div.innerHTML = `
      <div class="llm-toggle">
        <button id="toggleLLMBtn" class="secondary small">
          ${this.lang === 'zh' ? 'LLM增强' : 'LLM Enhancement'}
        </button>
        <span class="llm-status-indicator" id="llmStatus">
          ${this.lang === 'zh' ? '未启用' : 'Disabled'}
        </span>
      </div>
      
      <div class="llm-input-panel collapsed" id="llmInputPanel">
        <div class="input-group">
          <label for="apiKeyInput">
            ${this.lang === 'zh' ? 'OpenAI API Key:' : 'OpenAI API Key:'}
          </label>
          <input 
            type="password" 
            id="apiKeyInput" 
            placeholder="${this.lang === 'zh' ? '输入您的API Key (仅本地存储)' : 'Enter your API Key (stored locally only)'}"
          />
          <button id="saveApiKeyBtn" class="primary small">
            ${this.lang === 'zh' ? '保存' : 'Save'}
          </button>
          <button id="clearApiKeyBtn" class="secondary small">
            ${this.lang === 'zh' ? '清除' : 'Clear'}
          </button>
        </div>
        
        <div class="llm-help">
          <small>
            ${this.lang === 'zh'
    ? 'API Key仅存储在您的浏览器中，不会上传到服务器。启用后将自动增强聚合内容的主题和摘要。'
    : 'API Key is only stored in your browser and never uploaded to servers. When enabled, it will automatically enhance cluster topics and summaries.'
}
          </small>
        </div>
        
        <div class="llm-stats" id="llmStats" style="display: none;">
          <div class="stats-row">
            <span>${this.lang === 'zh' ? '缓存条目:' : 'Cached entries:'}</span>
            <span id="cacheCount">0</span>
          </div>
          <div class="stats-row">
            <span>${this.lang === 'zh' ? '增强状态:' : 'Enhancement status:'}</span>
            <span id="enhancementStatus">${this.lang === 'zh' ? '就绪' : 'Ready'}</span>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this.addApiKeyEventListeners(div);

    return div;
  }

  // Add event listeners for API key controls
  addApiKeyEventListeners(container) {
    const toggleBtn = container.querySelector('#toggleLLMBtn');
    const apiKeyInput = container.querySelector('#apiKeyInput');
    const saveBtn = container.querySelector('#saveApiKeyBtn');
    const clearBtn = container.querySelector('#clearApiKeyBtn');

    // Toggle input panel
    toggleBtn?.addEventListener('click', () => {
      this.toggleApiKeyPanel();
    });

    // Save API key
    saveBtn?.addEventListener('click', () => {
      const key = apiKeyInput?.value.trim();
      if (key) {
        this.saveApiKey(key);
        apiKeyInput.value = '';
      }
    });

    // Clear API key
    clearBtn?.addEventListener('click', () => {
      this.clearApiKey();
    });

    // Enter key to save
    apiKeyInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveBtn?.click();
      }
    });

    // Update initial state
    this.updateApiKeyStatus();
  }

  // Toggle API key input panel
  toggleApiKeyPanel() {
    const panel = document.getElementById('llmInputPanel');
    if (!panel) {
      return;
    }

    const isCollapsed = panel.classList.contains('collapsed');

    if (isCollapsed) {
      panel.classList.remove('collapsed');
      this.apiKeyVisible = true;
    } else {
      panel.classList.add('collapsed');
      this.apiKeyVisible = false;
    }
  }

  // Save API key
  saveApiKey(key) {
    localStorage.setItem('llm_api_key', key);
    this.updateApiKeyStatus();

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('llmApiKeyChanged', {
      detail: { apiKey: key, enabled: true }
    }));

    this.showMessage(
      this.lang === 'zh' ? 'API Key已保存，LLM增强已启用' : 'API Key saved, LLM enhancement enabled',
      'success'
    );
  }

  // Clear API key
  clearApiKey() {
    localStorage.removeItem('llm_api_key');
    this.updateApiKeyStatus();

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('llmApiKeyChanged', {
      detail: { apiKey: null, enabled: false }
    }));

    this.showMessage(
      this.lang === 'zh' ? 'API Key已清除，LLM增强已禁用' : 'API Key cleared, LLM enhancement disabled',
      'info'
    );
  }

  // Update API key status display
  updateApiKeyStatus() {
    const statusEl = document.getElementById('llmStatus');
    const statsEl = document.getElementById('llmStats');

    const hasApiKey = !!localStorage.getItem('llm_api_key');

    if (statusEl) {
      if (hasApiKey) {
        statusEl.textContent = this.lang === 'zh' ? '已启用' : 'Enabled';
        statusEl.className = 'llm-status-indicator enabled';
      } else {
        statusEl.textContent = this.lang === 'zh' ? '未启用' : 'Disabled';
        statusEl.className = 'llm-status-indicator disabled';
      }
    }

    if (statsEl) {
      statsEl.style.display = hasApiKey ? 'block' : 'none';
      if (hasApiKey) {
        this.updateCacheStats();
      }
    }
  }

  // Update cache statistics
  updateCacheStats() {
    const cacheCountEl = document.getElementById('cacheCount');
    const enhancementStatusEl = document.getElementById('enhancementStatus');

    if (cacheCountEl) {
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('llm_cache_'));
      cacheCountEl.textContent = cacheKeys.length.toString();
    }

    if (enhancementStatusEl) {
      enhancementStatusEl.textContent = this.lang === 'zh' ? '就绪' : 'Ready';
    }
  }

  // Show temporary message
  showMessage(text, type = 'info') {
    // Remove existing message
    const existing = document.querySelector('.temp-message');
    if (existing) {
      existing.remove();
    }

    const message = document.createElement('div');
    message.className = `temp-message ${type}`;
    message.textContent = text;
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;

    document.body.appendChild(message);

    // Fade in
    setTimeout(() => {
      message.style.opacity = '1';
    }, 100);

    // Auto remove after 3 seconds
    setTimeout(() => {
      message.style.opacity = '0';
      setTimeout(() => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 300);
    }, 3000);
  }

  // Create enhancement progress indicator
  createProgressIndicator() {
    const div = document.createElement('div');
    div.className = 'enhancement-progress';
    div.id = 'enhancementProgress';
    div.style.display = 'none';

    div.innerHTML = `
      <div class="progress-content">
        <span class="progress-text">
          ${this.lang === 'zh' ? 'LLM处理中...' : 'LLM processing...'}
        </span>
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <span class="progress-count" id="progressCount">0/0</span>
      </div>
    `;

    return div;
  }

  // Show enhancement progress
  showProgress(current, total) {
    const progressEl = document.getElementById('enhancementProgress');
    const fillEl = document.getElementById('progressFill');
    const countEl = document.getElementById('progressCount');

    if (progressEl) {
      progressEl.style.display = 'block';
    }

    if (fillEl && total > 0) {
      const percentage = (current / total) * 100;
      fillEl.style.width = `${percentage}%`;
    }

    if (countEl) {
      countEl.textContent = `${current}/${total}`;
    }
  }

  // Hide enhancement progress
  hideProgress() {
    const progressEl = document.getElementById('enhancementProgress');
    if (progressEl) {
      progressEl.style.display = 'none';
    }
  }

  // Create clustering statistics display
  createClusterStats() {
    const div = document.createElement('div');
    div.className = 'cluster-stats';
    div.id = 'clusterStats';

    div.innerHTML = `
      <div class="stats-content">
        <span class="stats-label">
          ${this.lang === 'zh' ? '聚合统计:' : 'Clustering Stats:'}
        </span>
        <span class="stats-reduction" id="reductionStats">-</span>
        <button class="secondary small" id="showStatsBtn">
          ${this.lang === 'zh' ? '详情' : 'Details'}
        </button>
      </div>
      
      <div class="stats-details collapsed" id="statsDetails">
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">${this.lang === 'zh' ? '原始条数:' : 'Original:'}</span>
            <span class="stat-value" id="originalCount">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">${this.lang === 'zh' ? '聚合后:' : 'Clustered:'}</span>
            <span class="stat-value" id="clusteredCount">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">${this.lang === 'zh' ? '减少比例:' : 'Reduction:'}</span>
            <span class="stat-value" id="reductionPercent">0%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">${this.lang === 'zh' ? '多项聚合:' : 'Multi-item:'}</span>
            <span class="stat-value" id="multiItemCount">0</span>
          </div>
        </div>
      </div>
    `;

    // Add toggle functionality
    const showStatsBtn = div.querySelector('#showStatsBtn');
    const statsDetails = div.querySelector('#statsDetails');

    showStatsBtn?.addEventListener('click', () => {
      const isCollapsed = statsDetails?.classList.contains('collapsed');
      if (isCollapsed) {
        statsDetails?.classList.remove('collapsed');
        showStatsBtn.textContent = this.lang === 'zh' ? '隐藏' : 'Hide';
      } else {
        statsDetails?.classList.add('collapsed');
        showStatsBtn.textContent = this.lang === 'zh' ? '详情' : 'Details';
      }
    });

    return div;
  }

  // Update clustering statistics
  updateClusterStats(diagnostics) {
    const reductionStatsEl = document.getElementById('reductionStats');
    const originalCountEl = document.getElementById('originalCount');
    const clusteredCountEl = document.getElementById('clusteredCount');
    const reductionPercentEl = document.getElementById('reductionPercent');
    const multiItemCountEl = document.getElementById('multiItemCount');

    if (reductionStatsEl) {
      reductionStatsEl.textContent = `${diagnostics.originalCount} → ${diagnostics.clusterCount} (-${diagnostics.reductionPercent}%)`;
    }

    if (originalCountEl) {
      originalCountEl.textContent = diagnostics.originalCount.toString();
    }
    if (clusteredCountEl) {
      clusteredCountEl.textContent = diagnostics.clusterCount.toString();
    }
    if (reductionPercentEl) {
      reductionPercentEl.textContent = `${diagnostics.reductionPercent}%`;
    }
    if (multiItemCountEl) {
      multiItemCountEl.textContent = diagnostics.multiItemClusters.toString();
    }
  }
}

export default UIComponents;
