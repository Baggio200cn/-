// Card rendering utilities for clustered news display
export class CardRenderer {
  constructor() {
    this.animationDuration = 300;
    this.fadeClass = 'cluster-updating';
  }

  renderClusterCard(cluster, lang = 'zh', options = {}) {
    const {
      showStats = true,
      maxItems = 5
    } = options;

    const card = document.createElement('div');
    card.className = 'cluster-card';
    card.dataset.clusterId = cluster.id;

    // Add enhanced badge if cluster has LLM enhancement
    const enhancedBadge = cluster.enhanced ? 
      '<span class="llm-badge" title="Enhanced by LLM">✨ AI</span>' : '';

    // Get display items (limit for initial view)
    const displayItems = cluster.items.slice(0, maxItems);
    const hasMore = cluster.items.length > maxItems;

    card.innerHTML = `
      <div class="cluster-header">
        <h3 class="cluster-title">
          ${this.escapeHtml(cluster.enhancedTopic || cluster.topic)}
          ${enhancedBadge}
        </h3>
        ${showStats ? this.renderClusterStats(cluster) : ''}
      </div>
      
      ${cluster.enhancedSummary ? `
        <div class="cluster-summary">
          ${this.escapeHtml(cluster.enhancedSummary)}
        </div>
      ` : ''}
      
      <div class="cluster-items">
        ${displayItems.map(item => this.renderNewsItem(item, lang)).join('')}
        ${hasMore ? `
          <div class="expand-toggle">
            <button class="expand-btn" onclick="this.closest('.cluster-card').classList.toggle('expanded')">
              <span class="expand-text">Show ${cluster.items.length - maxItems} more items</span>
              <span class="collapse-text">Show less</span>
            </button>
          </div>
        ` : ''}
      </div>
      
      ${hasMore ? `
        <div class="cluster-items-hidden">
          ${cluster.items.slice(maxItems).map(item => this.renderNewsItem(item, lang)).join('')}
        </div>
      ` : ''}
      
      <div class="cluster-actions">
        <button class="secondary" onclick="CardRenderer.exportCluster('${cluster.id}')">Export PNG</button>
        <button class="secondary" onclick="CardRenderer.generateCards('${cluster.id}')">Generate Cards</button>
      </div>
    `;

    return card;
  }

  renderClusterStats(cluster) {
    const sourcesList = cluster.sources.length > 3 ? 
      cluster.sources.slice(0, 3).join(', ') + ` +${cluster.sources.length - 3}` :
      cluster.sources.join(', ');

    return `
      <div class="cluster-stats">
        <span class="item-count">${cluster.count} items</span>
        <span class="source-list">${sourcesList}</span>
        ${cluster.dateRange ? `
          <span class="date-range">${cluster.dateRange.span} days</span>
        ` : ''}
      </div>
    `;
  }

  renderNewsItem(item, lang = 'zh') {
    // Use existing NewsUtils pattern for display fields
    const title = this.getDisplayField(item, 'title', lang);
    const summary = this.getDisplayField(item, 'summary', lang);
    const tags = this.getDisplayTags(item, lang);

    return `
      <div class="news-item" data-id="${item.id}">
        <h4 class="item-title">${this.escapeHtml(title)}</h4>
        <div class="item-meta">${this.escapeHtml(item.source)} · ${this.formatDate(item.date)}</div>
        <div class="item-summary">${this.truncateText(this.escapeHtml(summary), 200)}</div>
        <div class="item-tags">
          ${tags.slice(0, 4).map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="item-actions">
          <a href="${item.url || '#'}" target="_blank" rel="noopener" class="source-link">Source</a>
          <button class="card-btn" onclick="CardRenderer.openCardGenerator('${item.id}')">Card</button>
        </div>
      </div>
    `;
  }

  renderClustersGrid(clusters, containerId, lang = 'zh') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    // Add fade effect during update
    container.classList.add(this.fadeClass);

    setTimeout(() => {
      container.innerHTML = '';
      
      if (clusters.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No clusters found. Try adjusting the threshold or clearing the cache.</p>
          </div>
        `;
      } else {
        clusters.forEach(cluster => {
          const card = this.renderClusterCard(cluster, lang);
          container.appendChild(card);
        });
      }

      // Remove fade effect
      container.classList.remove(this.fadeClass);
    }, this.animationDuration / 2);
  }

  // Utility methods matching existing NewsUtils pattern
  getDisplayField(item, field, lang = 'zh') {
    if (!item) return '';
    
    if (lang === 'zh') {
      if (item.zh && item.zh[field] != null) return item.zh[field];
      const flatKey = field.charAt(0).toUpperCase() + field.slice(1) + 'Zh';
      if (item[flatKey] != null) return item[flatKey];
    }
    
    return item[field] ?? '';
  }

  getDisplayTags(item, lang = 'zh') {
    if (!item) return [];
    
    if (lang === 'zh') {
      if (item.zh && Array.isArray(item.zh.tags)) return item.zh.tags;
      if (Array.isArray(item.tagsZh)) return item.tagsZh;
    }
    
    return item.tags || [];
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

  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return dateStr;
    }
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
  }

  // Static methods for global access
  static exportCluster(clusterId) {
    window.dispatchEvent(new CustomEvent('cluster-export', { detail: { clusterId } }));
  }

  static generateCards(clusterId) {
    window.dispatchEvent(new CustomEvent('cluster-cards', { detail: { clusterId } }));
  }

  static openCardGenerator(itemId) {
    window.location.href = `card-generator.html?id=${encodeURIComponent(itemId)}`;
  }

  // Animation utilities
  fadeUpdate(element, updateFn) {
    element.classList.add(this.fadeClass);
    
    setTimeout(() => {
      updateFn();
      element.classList.remove(this.fadeClass);
    }, this.animationDuration / 2);
  }

  highlightCluster(clusterId, duration = 2000) {
    const cluster = document.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (cluster) {
      cluster.classList.add('highlighted');
      setTimeout(() => {
        cluster.classList.remove('highlighted');
      }, duration);
    }
  }
}

// Singleton instance  
export const cardRenderer = new CardRenderer();

// Make static methods globally available
window.CardRenderer = CardRenderer;