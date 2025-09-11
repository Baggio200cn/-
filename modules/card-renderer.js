/**
 * Card Renderer Module
 * Renders cluster cards and individual news cards
 */

export class CardRenderer {
  constructor() {
    this.container = null;
  }

  /**
   * Initialize the card renderer with a container element
   * @param {HTMLElement} container - Container element for cards
   */
  init(container) {
    this.container = container;
  }

  /**
   * Render all clusters as cards
   * @param {Array} clusters - Array of cluster objects
   * @param {Object} options - Rendering options
   */
  renderClusters(clusters, options = {}) {
    if (!this.container) {
      console.error('Card renderer not initialized with container');
      return;
    }

    this.container.innerHTML = '';

    if (!clusters || clusters.length === 0) {
      this.renderEmptyState();
      return;
    }

    clusters.forEach(cluster => {
      const cardElement = this.createClusterCard(cluster, options);
      this.container.appendChild(cardElement);
    });

    // Add click handlers for cluster selection
    this.addClusterClickHandlers();
  }

  /**
   * Create a single cluster card element
   * @param {Object} cluster - Cluster object
   * @param {Object} options - Rendering options
   * @returns {HTMLElement} Card element
   */
  createClusterCard(cluster, options = {}) {
    const card = document.createElement('div');
    card.className = 'cluster-card';
    card.dataset.clusterId = cluster.id;

    // Add LLM enhancement status class
    if (cluster._enhanced) {
      card.classList.add('enhanced');
    }
    if (cluster._llmError) {
      card.classList.add('llm-error');
    }

    card.innerHTML = `
      <div class="cluster-header">
        <h3 class="cluster-title">${this.escapeHtml(cluster.topic)}</h3>
        <div class="cluster-meta">
          <span class="item-count">${cluster.items.length} items</span>
          <span class="source-count">${cluster.sources.length} sources</span>
          ${cluster._enhanced ? '<span class="enhanced-badge">✨ Enhanced</span>' : ''}
          ${cluster._llmError ? '<span class="error-badge">⚠️ Error</span>' : ''}
        </div>
      </div>
      
      <div class="cluster-summary">
        <p>${this.escapeHtml(cluster.summary)}</p>
      </div>
      
      ${cluster.keyPoints.length > 0 ? `
        <div class="cluster-keypoints">
          <h4>Key Points:</h4>
          <ul>
            ${cluster.keyPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="cluster-tags">
        ${cluster.tags.slice(0, 5).map(tag => 
          `<span class="tag">${this.escapeHtml(tag)}</span>`
        ).join('')}
        ${cluster.tags.length > 5 ? `<span class="tag-more">+${cluster.tags.length - 5} more</span>` : ''}
      </div>
      
      <div class="cluster-sources">
        <strong>Sources:</strong> ${cluster.sources.map(source => this.escapeHtml(source)).join(', ')}
      </div>
      
      <div class="cluster-preview">
        ${this.renderPreviewItems(cluster.items.slice(0, 2))}
        ${cluster.items.length > 2 ? `<div class="preview-more">+${cluster.items.length - 2} more items</div>` : ''}
      </div>
      
      <div class="cluster-actions">
        <button class="btn-select-cluster" data-cluster-id="${cluster.id}">
          Select for Learning Card
        </button>
        <button class="btn-expand-cluster" data-cluster-id="${cluster.id}">
          View All Items
        </button>
      </div>
    `;

    return card;
  }

  /**
   * Render preview items within a cluster card
   * @param {Array} items - News items to preview
   * @returns {string} HTML string for preview items
   */
  renderPreviewItems(items) {
    return items.map(item => `
      <div class="preview-item">
        <h5 class="preview-title">
          <a href="${item.url}" target="_blank" rel="noopener">
            ${this.escapeHtml(item.title)}
          </a>
        </h5>
        <div class="preview-meta">
          <span class="preview-source">${this.escapeHtml(item.source)}</span>
          <span class="preview-date">${this.formatDate(item.date)}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render detailed view of all items in a cluster
   * @param {Object} cluster - Cluster object
   * @param {HTMLElement} container - Container for detailed view
   */
  renderClusterDetails(cluster, container) {
    container.innerHTML = `
      <div class="cluster-details">
        <div class="cluster-details-header">
          <h2>${this.escapeHtml(cluster.topic)}</h2>
          <button class="btn-close-details">✕</button>
        </div>
        
        <div class="cluster-details-summary">
          <p>${this.escapeHtml(cluster.summary)}</p>
          ${cluster.keyPoints.length > 0 ? `
            <div class="details-keypoints">
              <h4>Key Points:</h4>
              <ul>
                ${cluster.keyPoints.map(point => `<li>${this.escapeHtml(point)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
        
        <div class="cluster-details-items">
          <h3>All Items (${cluster.items.length})</h3>
          <div class="news-grid">
            ${cluster.items.map(item => this.renderNewsCard(item)).join('')}
          </div>
        </div>
      </div>
    `;

    // Add close handler
    const closeBtn = container.querySelector('.btn-close-details');
    closeBtn.addEventListener('click', () => {
      container.innerHTML = '';
      container.style.display = 'none';
    });
  }

  /**
   * Render a single news card
   * @param {Object} newsItem - News item object
   * @returns {string} HTML string for news card
   */
  renderNewsCard(newsItem) {
    return `
      <div class="news-card" data-id="${newsItem.id}">
        <div class="news-header">
          <h4 class="news-title">
            <a href="${newsItem.url}" target="_blank" rel="noopener">
              ${this.escapeHtml(newsItem.title)}
            </a>
          </h4>
          <div class="news-meta">
            <span class="news-source">${this.escapeHtml(newsItem.source)}</span>
            <span class="news-date">${this.formatDate(newsItem.date)}</span>
          </div>
        </div>
        
        <div class="news-summary">
          <p>${this.escapeHtml(newsItem.summary)}</p>
        </div>
        
        ${newsItem.tags && newsItem.tags.length > 0 ? `
          <div class="news-tags">
            ${newsItem.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render empty state when no clusters are available
   */
  renderEmptyState() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No Clusters Available</h3>
        <p>No news items found or clustering is in progress. Please try refreshing the page.</p>
      </div>
    `;
  }

  /**
   * Render loading state
   */
  renderLoadingState() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <h3>Clustering News Items...</h3>
        <p>Analyzing and grouping related news articles.</p>
      </div>
    `;
  }

  /**
   * Render error state
   * @param {string} message - Error message
   */
  renderErrorState(message = 'An error occurred while loading clusters.') {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Clusters</h3>
        <p>${this.escapeHtml(message)}</p>
        <button class="btn-retry" onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  /**
   * Add click handlers for cluster interactions
   */
  addClusterClickHandlers() {
    if (!this.container) return;

    // Handle cluster selection
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-select-cluster')) {
        const clusterId = e.target.dataset.clusterId;
        this.selectCluster(clusterId);
      }
      
      if (e.target.classList.contains('btn-expand-cluster')) {
        const clusterId = e.target.dataset.clusterId;
        this.expandCluster(clusterId);
      }
    });

    // Handle card clicks (for general selection)
    this.container.addEventListener('click', (e) => {
      const card = e.target.closest('.cluster-card');
      if (card && !e.target.closest('.cluster-actions')) {
        const clusterId = card.dataset.clusterId;
        this.highlightCluster(clusterId);
      }
    });
  }

  /**
   * Select a cluster for learning card generation
   * @param {string} clusterId - ID of the cluster to select
   */
  selectCluster(clusterId) {
    // Store in localStorage for card generator
    localStorage.setItem('selectedCluster', clusterId);
    
    // Visual feedback
    this.container.querySelectorAll('.cluster-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    const selectedCard = this.container.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }
    
    // Dispatch custom event
    const event = new CustomEvent('clusterSelected', {
      detail: { clusterId }
    });
    document.dispatchEvent(event);
    
    // Show notification
    this.showNotification(`Cluster selected for learning card generation`, 'success');
  }

  /**
   * Expand cluster to show all items
   * @param {string} clusterId - ID of the cluster to expand
   */
  expandCluster(clusterId) {
    // Dispatch custom event for expansion
    const event = new CustomEvent('clusterExpand', {
      detail: { clusterId }
    });
    document.dispatchEvent(event);
  }

  /**
   * Highlight a cluster card
   * @param {string} clusterId - ID of the cluster to highlight
   */
  highlightCluster(clusterId) {
    this.container.querySelectorAll('.cluster-card').forEach(card => {
      card.classList.remove('highlighted');
    });
    
    const card = this.container.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (card) {
      card.classList.add('highlighted');
    }
  }

  /**
   * Show notification message
   * @param {string} message - Message to show
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  /**
   * Escape HTML characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update cluster card with LLM enhancement results
   * @param {string} clusterId - Cluster ID
   * @param {Object} enhancement - Enhancement data
   */
  updateClusterWithEnhancement(clusterId, enhancement) {
    const card = this.container.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (!card) return;

    // Update visual state
    card.classList.add('enhanced');
    card.classList.remove('llm-error');

    // Update content if enhancement contains new data
    if (enhancement.topic) {
      const titleElement = card.querySelector('.cluster-title');
      if (titleElement) {
        titleElement.textContent = enhancement.topic;
      }
    }

    if (enhancement.summary) {
      const summaryElement = card.querySelector('.cluster-summary p');
      if (summaryElement) {
        summaryElement.textContent = enhancement.summary;
      }
    }

    if (enhancement.keyPoints && enhancement.keyPoints.length > 0) {
      const keypointsContainer = card.querySelector('.cluster-keypoints');
      if (keypointsContainer) {
        const list = keypointsContainer.querySelector('ul');
        list.innerHTML = enhancement.keyPoints
          .map(point => `<li>${this.escapeHtml(point)}</li>`)
          .join('');
      }
    }

    // Add enhanced badge if not present
    const metaElement = card.querySelector('.cluster-meta');
    if (metaElement && !metaElement.querySelector('.enhanced-badge')) {
      const badge = document.createElement('span');
      badge.className = 'enhanced-badge';
      badge.textContent = '✨ Enhanced';
      metaElement.appendChild(badge);
    }
  }

  /**
   * Update cluster card with LLM error
   * @param {string} clusterId - Cluster ID
   * @param {string} error - Error message
   */
  updateClusterWithError(clusterId, error) {
    const card = this.container.querySelector(`[data-cluster-id="${clusterId}"]`);
    if (!card) return;

    // Update visual state
    card.classList.add('llm-error');
    card.classList.remove('enhanced');

    // Add error badge if not present
    const metaElement = card.querySelector('.cluster-meta');
    if (metaElement && !metaElement.querySelector('.error-badge')) {
      const badge = document.createElement('span');
      badge.className = 'error-badge';
      badge.textContent = '⚠️ Error';
      badge.title = error;
      metaElement.appendChild(badge);
    }
  }
}

// Export singleton instance
export const cardRenderer = new CardRenderer();