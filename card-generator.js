// Enhanced Card generator script v5 (depends on news-utils.js and html2canvas)
const lang = getLang();

// Global state for card management
const state = {
  langMode: lang, // 'zh' or 'en'
  cards: [], // Array to store generated cards data
  cardCounter: 0
};

document.addEventListener('DOMContentLoaded', async () => {
  const selectEl = document.getElementById('newsSelect');
  const noteEl = document.getElementById('extraNote');
  const statusEl = document.getElementById('cardStatus');
  const containerEl = document.getElementById('generatedCards');
  const batchControlsEl = document.getElementById('batchControls');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // Text localization
  updateUIText();

  // Initialize language toggle integration
  initLanguageToggle();

  try {
    // Try loadAll(true) first, fallback to fetch with cache busting
    let data;
    try {
      data = await NewsUtils.loadAll(true);
    } catch (e) {
      const url = './data/news.json?v=' + Date.now();
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      data = await resp.json();
      if (!Array.isArray(data)) throw new Error('news.json root is not array');
      NewsUtils._cache = data; // Update cache
    }
    
    populateSelect();
    
    // If URL has id parameter, auto-select
    const params = new URLSearchParams(location.search);
    const preId = params.get('id');
    if (preId) {
      selectEl.value = preId;
    }
  } catch (e) {
    statusEl.style.color = '#b91c1c';
    statusEl.textContent = '加载失败: ' + e.message;
  }

  // Event listeners
  document.getElementById('genCardBtn').addEventListener('click', generateCard);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllCards);
  if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllCards);

  function updateUIText() {
    document.getElementById('pageTitle').textContent = I18N[state.langMode].cardTitle;
    document.getElementById('labelSelect').textContent = I18N[state.langMode].selectNews;
    document.getElementById('labelNote').textContent = I18N[state.langMode].extraNote;
    noteEl.placeholder = I18N[state.langMode].placeholderNote;
    
    // Update button text
    document.getElementById('genCardBtn').textContent = state.langMode === 'zh' ? '生成学习卡片' : 'Generate Card';
    if (clearAllBtn) clearAllBtn.textContent = state.langMode === 'zh' ? '清空所有卡片' : 'Clear All';
    if (downloadAllBtn) downloadAllBtn.textContent = state.langMode === 'zh' ? '批量下载' : 'Download All';
  }

  function initLanguageToggle() {
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
      // Remove existing event listeners and add our custom handler
      langBtn.removeEventListener('click', toggleLang);
      langBtn.addEventListener('click', () => {
        // Toggle language mode
        state.langMode = state.langMode === 'zh' ? 'en' : 'zh';
        localStorage.setItem('mv.lang', state.langMode);
        
        // Update UI text
        updateUIText();
        
        // Re-populate select to show titles in new language
        populateSelect();
        
        // Re-render all existing cards with new language order
        rerenderAllCards();
      });
    }
  }

  function populateSelect() {
    selectEl.innerHTML = `<option value="">${I18N[state.langMode].selectNews}</option>`;
    // Use cache if available
    const arr = (NewsUtils._cache) ? NewsUtils._cache : [];
    // Sort by date descending (newest first)
    const sortedArr = [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedArr.forEach(item => {
      const title = NewsUtils.getDisplayField(item, 'title', state.langMode);
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = trimText(title, 120);
      selectEl.appendChild(opt);
    });
  }

  function generateCard() {
    const id = selectEl.value;
    if (!id) {
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = I18N[state.langMode].needSelect;
      return;
    }
    
    statusEl.textContent = '';
    const item = NewsUtils.findById(id);
    if (!item) {
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = state.langMode === 'zh' ? '未找到该条目' : 'Item not found';
      return;
    }
    
    const note = noteEl.value.trim();
    const cardData = {
      id: ++state.cardCounter,
      newsItem: item,
      note: note
    };
    
    state.cards.push(cardData);
    const cardElement = buildCard(cardData);
    containerEl.appendChild(cardElement);
    
    // Show batch controls if we have cards
    if (state.cards.length > 0 && batchControlsEl) {
      batchControlsEl.style.display = 'flex';
    }
    
    // Show success message
    statusEl.style.color = '#059669';
    statusEl.textContent = state.langMode === 'zh' ? 
      `已生成第 ${state.cards.length} 张卡片` : 
      `Generated card ${state.cards.length}`;
  }

  function buildCard(cardData) {
    const { newsItem, note } = cardData;
    const div = document.createElement('div');
    div.className = 'study-card';
    div.dataset.cardId = cardData.id;

    // Get bilingual content
    const primaryTitle = NewsUtils.getDisplayField(newsItem, 'title', state.langMode);
    const secondaryTitle = NewsUtils.getDisplayField(newsItem, 'title', state.langMode === 'zh' ? 'en' : 'zh');
    const primarySummary = NewsUtils.getDisplayField(newsItem, 'summary', state.langMode);
    const secondarySummary = NewsUtils.getDisplayField(newsItem, 'summary', state.langMode === 'zh' ? 'en' : 'zh');
    const primaryTags = NewsUtils.getDisplayTags(newsItem, state.langMode);
    const secondaryTags = NewsUtils.getDisplayTags(newsItem, state.langMode === 'zh' ? 'en' : 'zh');

    // Combine and limit tags (max 5)
    const allTags = [...new Set([...primaryTags, ...secondaryTags])].slice(0, 5);

    div.innerHTML = `
      <div class="card-actions">
        <button class="download-btn" onclick="downloadCard(${cardData.id})">${state.langMode === 'zh' ? '下载' : 'Download'}</button>
        <button class="remove-btn" onclick="removeCard(${cardData.id})">${state.langMode === 'zh' ? '删除' : 'Remove'}</button>
      </div>
      <div class="card-head">
        <div class="card-logo-zone">
          <span class="card-source">${escapeHtml(newsItem.source)}</span>
          <span class="card-date">${formatDate(newsItem.date)}</span>
        </div>
        ${primaryTitle && secondaryTitle && primaryTitle !== secondaryTitle ? `
          <h2 class="card-primary">${escapeHtml(trimText(primaryTitle, 150))}</h2>
          <h3 class="card-secondary">${escapeHtml(trimText(secondaryTitle, 150))}</h3>
        ` : `
          <h2 class="card-title">${escapeHtml(trimText(primaryTitle || secondaryTitle, 150))}</h2>
        `}
      </div>
      <div class="card-body">
        ${primarySummary && secondarySummary && primarySummary !== secondarySummary ? `
          <p class="card-summary-primary">${escapeHtml(trimText(primarySummary, 300))}</p>
          <p class="card-summary-secondary">${escapeHtml(trimText(secondarySummary, 300))}</p>
        ` : `
          <p class="card-summary">${escapeHtml(trimText(primarySummary || secondarySummary, 300))}</p>
        `}
        ${allTags.length ? `<div class="card-tags">${allTags.map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>`:''}
        ${note ? `<div class="card-extra">NOTE: ${escapeHtml(note)}</div>`:''}
      </div>
      <div class="card-footer">
        <span>机器视觉每日 • v${NewsUtils.getVersion()}</span>
      </div>
      <div class="watermark">mv-daily.com</div>
    `;
    return div;
  }

  function rerenderAllCards() {
    // Clear container and rebuild all cards with current language settings
    containerEl.innerHTML = '';
    state.cards.forEach(cardData => {
      const cardElement = buildCard(cardData);
      containerEl.appendChild(cardElement);
    });
  }

  function clearAllCards() {
    if (state.cards.length === 0) return;
    
    if (confirm(state.langMode === 'zh' ? '确定要清空所有卡片吗？' : 'Are you sure to clear all cards?')) {
      state.cards = [];
      containerEl.innerHTML = '';
      if (batchControlsEl) batchControlsEl.style.display = 'none';
      statusEl.style.color = '#6b7280';
      statusEl.textContent = state.langMode === 'zh' ? '已清空所有卡片' : 'All cards cleared';
    }
  }

  async function downloadAllCards() {
    if (state.cards.length === 0) return;
    
    statusEl.style.color = '#0f4c81';
    statusEl.textContent = state.langMode === 'zh' ? 
      `开始批量下载 ${state.cards.length} 张卡片...` : 
      `Starting batch download of ${state.cards.length} cards...`;
    
    for (let i = 0; i < state.cards.length; i++) {
      const cardData = state.cards[i];
      const cardElement = document.querySelector(`[data-card-id="${cardData.id}"]`);
      if (cardElement) {
        try {
          await downloadCardElement(cardElement, `mv-card-${cardData.id}-${Date.now()}`);
          statusEl.textContent = state.langMode === 'zh' ? 
            `已下载 ${i + 1}/${state.cards.length} 张卡片` : 
            `Downloaded ${i + 1}/${state.cards.length} cards`;
          
          // Small delay between downloads
          if (i < state.cards.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error downloading card ${cardData.id}:`, error);
        }
      }
    }
    
    statusEl.style.color = '#059669';
    statusEl.textContent = state.langMode === 'zh' ? 
      `批量下载完成！共 ${state.cards.length} 张卡片` : 
      `Batch download completed! ${state.cards.length} cards`;
  }

  // Global functions for card actions (need to be accessible from onclick)
  window.downloadCard = async function(cardId) {
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardElement) {
      try {
        await downloadCardElement(cardElement, `mv-card-${cardId}-${Date.now()}`);
        statusEl.style.color = '#059669';
        statusEl.textContent = state.langMode === 'zh' ? '卡片下载成功' : 'Card downloaded successfully';
      } catch (error) {
        statusEl.style.color = '#b91c1c';
        statusEl.textContent = state.langMode === 'zh' ? '下载失败' : 'Download failed';
        console.error('Download error:', error);
      }
    }
  };

  window.removeCard = function(cardId) {
    if (confirm(state.langMode === 'zh' ? '确定要删除这张卡片吗？' : 'Are you sure to remove this card?')) {
      // Remove from state
      state.cards = state.cards.filter(card => card.id !== cardId);
      
      // Remove from DOM
      const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
      if (cardElement) {
        cardElement.remove();
      }
      
      // Hide batch controls if no cards left
      if (state.cards.length === 0 && batchControlsEl) {
        batchControlsEl.style.display = 'none';
      }
      
      statusEl.style.color = '#6b7280';
      statusEl.textContent = state.langMode === 'zh' ? '卡片已删除' : 'Card removed';
    }
  };

  async function downloadCardElement(element, filename) {
    if (!window.html2canvas) {
      throw new Error('html2canvas not loaded');
    }
    
    // Temporarily hide card actions for screenshot
    const actions = element.querySelector('.card-actions');
    if (actions) actions.style.display = 'none';
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // 2x resolution for crisp images
        backgroundColor: '#ffffff',
        allowTaint: true,
        useCORS: true,
        logging: false
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = filename + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      
    } finally {
      // Restore card actions
      if (actions) actions.style.display = 'flex';
    }
  }

  // Utility functions
  function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function formatDate(s) {
    try {
      const d = new Date(s);
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    } catch {
      return s;
    }
  }

  function trimText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
});
