// Card renderer - Render aggregated cards and handle interactions
class CardRenderer {
  constructor(containerSelector = '#newsGrid') {
    this.container = document.querySelector(containerSelector);
    this.lang = this.getLang();
    this.collapsedSources = new Set(); // Track which cluster sources are collapsed
  }

  getLang() {
    return localStorage.getItem('mv.lang') || 'zh';
  }

  // Render all clusters
  renderClusters(clusters) {
    if (!this.container) {
      return;
    }

    this.container.innerHTML = '';

    clusters.forEach(cluster => {
      const cardElement = this.createClusterCard(cluster);
      this.container.appendChild(cardElement);
    });
  }

  // Create a single cluster card
  createClusterCard(cluster) {
    const div = document.createElement('div');
    div.className = 'news-cluster';
    div.dataset.clusterId = cluster.id;

    const topic = cluster.topic || this.getDefaultTopic(cluster);
    const summary = cluster.summary || this.getDefaultSummary(cluster);
    const keyPoints = cluster.keyPoints || this.getDefaultKeyPoints(cluster);
    const sources = this.getSourcesList(cluster);
    const tags = this.getClusterTags(cluster);

    // Enhanced label for LLM-generated content
    const enhancedLabel = cluster.enhanced ?
      `<span class="enhanced-label">${this.lang === 'zh' ? '(LLM增强)' : '(LLM Enhanced)'}</span>` : '';

    const sourceCount = cluster.items.length;
    const mainDate = this.formatDate(cluster.mainItem.date);

    div.innerHTML = `
      <div class="cluster-header">
        <h3 class="cluster-topic">
          ${this.escapeHtml(topic)}
          ${enhancedLabel}
        </h3>
        <div class="cluster-meta">
          ${this.escapeHtml(sources[0])}${sourceCount > 1 ? ` ${this.lang === 'zh' ? '等' : '+'} ${sourceCount}` : ''} · ${mainDate}
        </div>
      </div>
      
      <div class="cluster-summary">
        ${this.escapeHtml(summary)}
      </div>
      
      ${keyPoints.length > 0 ? `
      <div class="cluster-key-points">
        <strong>${this.lang === 'zh' ? '关键要点：' : 'Key Points:'}</strong>
        <ul>
          ${keyPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      <div class="cluster-tags">
        ${tags.slice(0, 6).map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
      </div>
      
      <div class="cluster-actions">
        <button class="secondary toggle-sources" data-cluster-id="${cluster.id}">
          ${this.lang === 'zh' ? '查看来源' : 'View Sources'} (${sourceCount})
        </button>
        <button class="primary generate-card" data-cluster-id="${cluster.id}">
          ${this.lang === 'zh' ? '生成学习卡片' : 'Generate Study Card'}
        </button>
      </div>
      
      <div class="cluster-sources collapsed" id="sources-${cluster.id}">
        <h4>${this.lang === 'zh' ? '相关来源：' : 'Related Sources:'}</h4>
        <div class="sources-list">
          ${cluster.items.map(item => this.renderSourceItem(item)).join('')}
        </div>
      </div>
    `;

    // Add event listeners
    this.addCardEventListeners(div, cluster);

    return div;
  }

  // Render individual source item within cluster
  renderSourceItem(item) {
    const title = this.getItemTitle(item);
    const summary = this.getItemSummary(item);
    const date = this.formatDate(item.date);

    return `
      <div class="source-item">
        <div class="source-header">
          <h5>${this.escapeHtml(title)}</h5>
          <span class="source-meta">${this.escapeHtml(item.source)} · ${date}</span>
        </div>
        <div class="source-summary">${this.escapeHtml(summary).slice(0, 150)}${summary.length > 150 ? '…' : ''}</div>
        <a href="${item.url || '#'}" target="_blank" rel="noopener" class="source-link">
          ${this.lang === 'zh' ? '原文链接' : 'Source Link'}
        </a>
      </div>
    `;
  }

  // Add event listeners to card
  addCardEventListeners(cardElement, cluster) {
    // Toggle sources visibility
    const toggleBtn = cardElement.querySelector('.toggle-sources');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleSources(cluster.id);
      });
    }

    // Generate study card
    const generateBtn = cardElement.querySelector('.generate-card');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.generateStudyCard(cluster);
      });
    }
  }

  // Toggle sources visibility
  toggleSources(clusterId) {
    const sourcesEl = document.getElementById(`sources-${clusterId}`);
    const toggleBtn = document.querySelector(`[data-cluster-id="${clusterId}"].toggle-sources`);

    if (sourcesEl && toggleBtn) {
      const isCollapsed = sourcesEl.classList.contains('collapsed');

      if (isCollapsed) {
        sourcesEl.classList.remove('collapsed');
        toggleBtn.textContent = this.lang === 'zh' ? '隐藏来源' : 'Hide Sources';
        this.collapsedSources.delete(clusterId);
      } else {
        sourcesEl.classList.add('collapsed');
        const sourceCount = sourcesEl.querySelectorAll('.source-item').length;
        toggleBtn.textContent = `${this.lang === 'zh' ? '查看来源' : 'View Sources'} (${sourceCount})`;
        this.collapsedSources.add(clusterId);
      }
    }
  }

  // Generate study card from cluster
  generateStudyCard(cluster) {
    // Store cluster data in localStorage for the card generator
    localStorage.setItem('selectedCluster', JSON.stringify(cluster));

    // Navigate to card generator
    window.location.href = 'card-generator.html';
  }

  // Update cluster with enhanced content (from LLM)
  updateClusterEnhancement(clusterId, enhancedData) {
    const cardElement = document.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (!cardElement) {
      return;
    }

    // Update topic
    if (enhancedData.topic) {
      const topicEl = cardElement.querySelector('.cluster-topic');
      if (topicEl) {
        topicEl.innerHTML = `
          ${this.escapeHtml(enhancedData.topic)}
          <span class="enhanced-label">${this.lang === 'zh' ? '(LLM增强)' : '(LLM Enhanced)'}</span>
        `;
        // Add fade-in effect
        topicEl.style.opacity = '0.5';
        setTimeout(() => {
          topicEl.style.transition = 'opacity 0.5s ease-in';
          topicEl.style.opacity = '1';
        }, 100);
      }
    }

    // Update summary
    if (enhancedData.summary) {
      const summaryEl = cardElement.querySelector('.cluster-summary');
      if (summaryEl) {
        summaryEl.textContent = enhancedData.summary;
        summaryEl.style.opacity = '0.5';
        setTimeout(() => {
          summaryEl.style.transition = 'opacity 0.5s ease-in';
          summaryEl.style.opacity = '1';
        }, 200);
      }
    }

    // Update key points
    if (enhancedData.keyPoints && enhancedData.keyPoints.length > 0) {
      const keyPointsEl = cardElement.querySelector('.cluster-key-points');
      if (keyPointsEl) {
        keyPointsEl.innerHTML = `
          <strong>${this.lang === 'zh' ? '关键要点：' : 'Key Points:'}</strong>
          <ul>
            ${enhancedData.keyPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
          </ul>
        `;
        keyPointsEl.style.opacity = '0.5';
        setTimeout(() => {
          keyPointsEl.style.transition = 'opacity 0.5s ease-in';
          keyPointsEl.style.opacity = '1';
        }, 300);
      }
    }
  }

  // Show LLM processing status
  showProcessingStatus(clusterId, message) {
    const cardElement = document.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (!cardElement) {
      return;
    }

    // Add or update processing indicator
    let statusEl = cardElement.querySelector('.llm-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'llm-status';
      const actionsEl = cardElement.querySelector('.cluster-actions');
      if (actionsEl) {
        actionsEl.appendChild(statusEl);
      }
    }

    statusEl.innerHTML = `
      <span class="processing-indicator">
        ⟳ ${this.escapeHtml(message)}
      </span>
    `;
  }

  // Hide LLM processing status
  hideProcessingStatus(clusterId) {
    const cardElement = document.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (!cardElement) {
      return;
    }

    const statusEl = cardElement.querySelector('.llm-status');
    if (statusEl) {
      statusEl.remove();
    }
  }

  // Helper methods
  getDefaultTopic(cluster) {
    const sources = this.getSourcesList(cluster);
    const count = cluster.items.length;

    if (count === 1) {
      return this.getItemTitle(cluster.mainItem);
    } else if (sources.length === 1) {
      return this.lang === 'zh'
        ? `${sources[0]}技术动态`
        : `${sources[0]} Technology Updates`;
    } else {
      return this.lang === 'zh'
        ? `${sources[0]}等${count}家公司技术动态`
        : `${sources[0]} and ${count - 1} others: Technology Updates`;
    }
  }

  getDefaultSummary(cluster) {
    if (cluster.items.length === 1) {
      return this.getItemSummary(cluster.mainItem).slice(0, 200);
    }

    const sources = this.getSourcesList(cluster);
    const count = cluster.items.length;

    return this.lang === 'zh'
      ? `${sources.slice(0, 2).join('、')}等${count}家公司在相关技术领域发布了更新动态。`
      : `${sources.slice(0, 2).join(', ')} and ${count - 2} other companies announced technology updates.`;
  }

  getDefaultKeyPoints(cluster) {
    const sources = this.getSourcesList(cluster);
    const count = cluster.items.length;

    if (count === 1) {
      return []; // No key points for single items
    }

    return [
      this.lang === 'zh'
        ? `涉及${count}家公司：${sources.slice(0, 3).join('、')}${sources.length > 3 ? '等' : ''}`
        : `Involves ${count} companies: ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ' and others' : ''}`,
      this.lang === 'zh'
        ? '主要领域：机器视觉与人工智能'
        : 'Main areas: Computer Vision and AI'
    ];
  }

  getSourcesList(cluster) {
    return [...new Set(cluster.items.map(item => item.source))];
  }

  getClusterTags(cluster) {
    const allTags = [];
    cluster.items.forEach(item => {
      const tags = this.getItemTags(item);
      allTags.push(...tags);
    });

    // Count tag frequency and return most common ones
    const tagCounts = {};
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 8);
  }

  getItemTitle(item) {
    if (this.lang === 'zh') {
      if (item.zh && item.zh.title) {
        return item.zh.title;
      }
      if (item.titleZh) {
        return item.titleZh;
      }
    }
    return item.title || '';
  }

  getItemSummary(item) {
    if (this.lang === 'zh') {
      if (item.zh && item.zh.summary) {
        return item.zh.summary;
      }
      if (item.summaryZh) {
        return item.summaryZh;
      }
    }
    return item.summary || '';
  }

  getItemTags(item) {
    if (this.lang === 'zh') {
      if (item.zh && Array.isArray(item.zh.tags)) {
        return item.zh.tags;
      }
      if (Array.isArray(item.tagsZh)) {
        return item.tagsZh;
      }
    }
    return item.tags || [];
  }

  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return dateStr;
    }
  }

  escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;'
    }[c]));
  }
}

export default CardRenderer;
