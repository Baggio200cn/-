/**
 * Common utilities for Machine Vision Daily News
 * Shared functions for card rendering, filtering, and URL management
 */

// Global utilities object
window.NewsUtils = (function() {
    
    /**
     * Extract unique tags from news data and count frequencies
     */
    function extractTags(newsData) {
        const tagCounts = {};
        
        newsData.forEach(news => {
            if (news.tags && Array.isArray(news.tags)) {
                news.tags.forEach(tag => {
                    const cleanTag = tag.trim();
                    if (cleanTag) {
                        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                    }
                });
            }
        });
        
        // Sort by frequency (descending), then alphabetically
        return Object.entries(tagCounts)
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count desc
                return a[0].localeCompare(b[0], 'zh-CN'); // Then alphabetically
            })
            .map(([tag, count]) => ({ tag, count }));
    }
    
    /**
     * Apply tag filter to news data
     */
    function applyTagFilter(newsData, selectedTags) {
        if (!selectedTags || selectedTags.length === 0) {
            return newsData;
        }
        
        return newsData.filter(news => {
            if (!news.tags || !Array.isArray(news.tags)) return false;
            
            // AND logic: news must contain ALL selected tags
            return selectedTags.every(selectedTag => 
                news.tags.some(newsTag => newsTag.trim() === selectedTag)
            );
        });
    }
    
    /**
     * Get selected tags from URL parameters
     */
    function getSelectedTagsFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const tagsParam = urlParams.get('tags');
        
        if (!tagsParam) return [];
        
        return tagsParam.split(',')
            .map(tag => decodeURIComponent(tag.trim()))
            .filter(tag => tag.length > 0);
    }
    
    /**
     * Update URL with selected tags
     */
    function updateURLWithTags(selectedTags, additionalParams = {}) {
        const url = new URL(window.location);
        
        // Clear existing tags parameter
        url.searchParams.delete('tags');
        
        // Add tags if any selected
        if (selectedTags && selectedTags.length > 0) {
            const tagsParam = selectedTags.map(tag => encodeURIComponent(tag)).join(',');
            url.searchParams.set('tags', tagsParam);
        }
        
        // Add any additional parameters
        Object.entries(additionalParams).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        
        // Update browser history without reload
        window.history.replaceState({}, '', url);
    }
    
    /**
     * Create news card HTML element
     */
    function createNewsCard(news, logoSrc, options = {}) {
        const { 
            showArchiveBadge = false, 
            archiveDate = null,
            cardIdPrefix = 'news-card'
        } = options;
        
        const card = document.createElement('div');
        card.className = 'news-card';
        card.id = `${cardIdPrefix}-${news.id}`;
        
        const date = new Date(news.date).toLocaleDateString('zh-CN');
        
        // Archive badge HTML
        const archiveBadgeHTML = showArchiveBadge && archiveDate ? 
            `<div class="archive-mode-badge">归档模式 ${archiveDate}</div>` : '';
        
        // Generate prompt link with archive support
        const promptLink = showArchiveBadge && archiveDate ?
            `prompt.html?id=${news.id}&date=${archiveDate}` :
            `prompt.html?id=${news.id}`;
        
        card.innerHTML = `
            ${archiveBadgeHTML}
            <div class="news-title">${news.title}</div>
            <div class="news-meta">
                <span class="news-source">${news.source}</span>
                <span class="news-date">${date}</span>
            </div>
            <div class="news-summary">${news.summary}</div>
            <div class="news-tags">
                ${news.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="card-actions">
                <button class="btn btn-primary" onclick="NewsUtils.exportCardAsPNG('${cardIdPrefix}-${news.id}')">下载PNG</button>
                <a href="${promptLink}" class="btn btn-secondary">生成提示词</a>
            </div>
            <div class="watermark">
                ${logoSrc ? `<img src="${logoSrc}" alt="Logo">` : ''}
                <span>机器视觉</span>
            </div>
        `;
        
        return card;
    }
    
    /**
     * Render news cards in container
     */
    function renderNewsCards(container, newsData, logoSrc, options = {}) {
        // Clear container
        container.innerHTML = '';
        
        if (!newsData || newsData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>未匹配到资讯</h3>
                    <p>调整筛选标签试试，或者查看其他日期的归档。</p>
                </div>
            `;
            return;
        }
        
        // Create grid container
        const newsGrid = document.createElement('div');
        newsGrid.className = 'news-grid';
        
        // Add cards
        newsData.forEach(news => {
            const card = createNewsCard(news, logoSrc, options);
            newsGrid.appendChild(card);
        });
        
        container.appendChild(newsGrid);
    }
    
    /**
     * Create tag filter bar
     */
    function createTagFilterBar(newsData, selectedTags = [], onTagChange = null) {
        const tags = extractTags(newsData);
        
        const filterBar = document.createElement('div');
        filterBar.className = 'tag-filter-bar';
        filterBar.setAttribute('role', 'toolbar');
        filterBar.setAttribute('aria-label', '标签筛选');
        
        // Label
        const label = document.createElement('span');
        label.className = 'tag-filter-label';
        label.textContent = '筛选标签:';
        filterBar.appendChild(label);
        
        // "All" button
        const allButton = document.createElement('button');
        allButton.className = 'tag-filter';
        allButton.textContent = '全部';
        allButton.setAttribute('role', 'button');
        allButton.setAttribute('aria-pressed', selectedTags.length === 0 ? 'true' : 'false');
        allButton.setAttribute('data-tag', '');
        
        if (selectedTags.length === 0) {
            allButton.classList.add('active');
        }
        
        allButton.addEventListener('click', () => {
            const newSelectedTags = [];
            updateTagFilterUI(filterBar, newSelectedTags);
            if (onTagChange) onTagChange(newSelectedTags);
        });
        
        filterBar.appendChild(allButton);
        
        // Individual tag buttons
        tags.forEach(({ tag, count }) => {
            const button = document.createElement('button');
            button.className = 'tag-filter';
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            button.setAttribute('data-tag', tag);
            
            const isSelected = selectedTags.includes(tag);
            button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            
            if (isSelected) {
                button.classList.add('active');
            }
            
            button.innerHTML = `
                ${tag}
                <span class="tag-count">${count}</span>
            `;
            
            button.addEventListener('click', () => {
                let newSelectedTags = [...selectedTags];
                
                if (newSelectedTags.includes(tag)) {
                    // Remove tag
                    newSelectedTags = newSelectedTags.filter(t => t !== tag);
                } else {
                    // Add tag
                    newSelectedTags.push(tag);
                }
                
                updateTagFilterUI(filterBar, newSelectedTags);
                if (onTagChange) onTagChange(newSelectedTags);
            });
            
            // Keyboard support
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
            
            filterBar.appendChild(button);
        });
        
        // Clear filters button (if any tags selected)
        if (selectedTags.length > 0) {
            const clearButton = document.createElement('button');
            clearButton.className = 'clear-filters-btn';
            clearButton.textContent = '清除筛选';
            clearButton.addEventListener('click', () => {
                const newSelectedTags = [];
                updateTagFilterUI(filterBar, newSelectedTags);
                if (onTagChange) onTagChange(newSelectedTags);
            });
            
            filterBar.appendChild(clearButton);
        }
        
        return filterBar;
    }
    
    /**
     * Update tag filter UI state
     */
    function updateTagFilterUI(filterBar, selectedTags) {
        const buttons = filterBar.querySelectorAll('.tag-filter');
        
        buttons.forEach(button => {
            const tag = button.getAttribute('data-tag');
            const isSelected = tag === '' ? selectedTags.length === 0 : selectedTags.includes(tag);
            
            button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            button.classList.toggle('active', isSelected);
        });
        
        // Update clear button
        const clearButton = filterBar.querySelector('.clear-filters-btn');
        if (clearButton) {
            clearButton.remove();
        }
        
        if (selectedTags.length > 0) {
            const newClearButton = document.createElement('button');
            newClearButton.className = 'clear-filters-btn';
            newClearButton.textContent = '清除筛选';
            newClearButton.addEventListener('click', () => {
                updateTagFilterUI(filterBar, []);
                const onTagChange = filterBar._onTagChange;
                if (onTagChange) onTagChange([]);
            });
            
            filterBar.appendChild(newClearButton);
        }
    }
    
    /**
     * Logo auto-detection function
     */
    async function detectLogo() {
        const logoElement = document.getElementById('siteLogo');
        if (!logoElement) return null;
        
        const candidates = [
            'assets/company-logo.png',
            'assets/company-logo.svg',
            'assets/logo-placeholder.svg'
        ];
        
        for (const logoPath of candidates) {
            try {
                const response = await fetch(logoPath, { method: 'HEAD' });
                if (response.ok) {
                    logoElement.src = logoPath;
                    logoElement.crossOrigin = 'anonymous';
                    return logoPath;
                }
            } catch (error) {
                console.log(`Logo ${logoPath} not found, trying next...`);
            }
        }
        
        // Fallback: hide logo if none found
        logoElement.style.display = 'none';
        return null;
    }
    
    /**
     * Export card as PNG
     */
    async function exportCardAsPNG(cardId) {
        if (typeof htmlToImage === 'undefined') {
            alert('PNG导出功能需要html-to-image库');
            return;
        }
        
        try {
            const cardElement = document.getElementById(cardId);
            if (!cardElement) {
                alert('未找到卡片');
                return;
            }
            
            // Create PNG with high quality
            const dataUrl = await htmlToImage.toPng(cardElement, {
                cacheBust: true,
                pixelRatio: 2,
                width: 1080,
                height: 1080,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left',
                    width: '540px',
                    height: '540px'
                }
            });
            
            // Create download link
            const link = document.createElement('a');
            const title = cardElement.querySelector('.news-title').textContent;
            link.download = `${title.substring(0, 30)}_机器视觉新闻.png`;
            link.href = dataUrl;
            link.click();
            
        } catch (error) {
            console.error('PNG export failed:', error);
            alert('导出失败，请重试');
        }
    }
    
    /**
     * Load data with error handling
     */
    async function loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to load ${url}:`, error);
            throw error;
        }
    }
    
    /**
     * Format date for display
     */
    function formatDate(dateString, options = {}) {
        const { 
            locale = 'zh-CN',
            includeTime = false
        } = options;
        
        const date = new Date(dateString);
        
        if (includeTime) {
            return date.toLocaleString(locale);
        } else {
            return date.toLocaleDateString(locale);
        }
    }
    
    // Public API
    return {
        extractTags,
        applyTagFilter,
        getSelectedTagsFromURL,
        updateURLWithTags,
        createNewsCard,
        renderNewsCards,
        createTagFilterBar,
        updateTagFilterUI,
        detectLogo,
        exportCardAsPNG,
        loadJSON,
        formatDate
    };
})();

// Make functions globally available for backward compatibility
window.exportCardAsPNG = NewsUtils.exportCardAsPNG;