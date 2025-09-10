/**
 * Main application logic for index.html
 * Handles news loading, rendering, logo detection, and PNG export
 */

// Global variables
let newsData = [];
let logoSrc = '';

/**
 * Logo auto-detection function with enhanced fallback logic
 */
async function detectLogo() {
    const logoElement = document.getElementById('siteLogo');
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
                logoSrc = logoPath;
                console.log(`Logo detected: ${logoPath}`);
                return logoPath;
            }
        } catch (error) {
            console.log(`Logo ${logoPath} not found, trying next...`);
        }
    }
    
    // Fallback: hide logo if none found
    logoElement.style.display = 'none';
    logoSrc = '';
    console.log('No logo found, hiding logo element');
    return null;
}

/**
 * Load news data from JSON file
 */
async function loadNews() {
    try {
        const response = await fetch('data/news.json');
        if (!response.ok) throw new Error('Failed to load news data');
        newsData = await response.json();
        
        if (!Array.isArray(newsData)) {
            throw new Error('Invalid news data format');
        }
        
        console.log(`Loaded ${newsData.length} news items`);
        renderNews(newsData);
    } catch (error) {
        document.getElementById('newsContainer').innerHTML = 
            '<div class="error">加载新闻数据失败，请稍后重试。</div>';
        console.error('Error loading news:', error);
    }
}

/**
 * Apply mixed tag styling (first 1-2 tags solid, rest outline)
 */
function applyTagStyling(tagsContainer) {
    const tags = tagsContainer.querySelectorAll('.tag');
    
    tags.forEach((tag, index) => {
        // First 1-2 tags get solid style, rest get outline
        if (index < 2) {
            tag.classList.add('solid');
            tag.classList.remove('outline');
        } else {
            tag.classList.add('outline');
            tag.classList.remove('solid');
        }
    });
}

/**
 * Render news cards in the grid
 */
function renderNews(newsData) {
    const container = document.getElementById('newsContainer');
    
    if (!newsData || newsData.length === 0) {
        container.innerHTML = '<div class="error">暂无新闻数据</div>';
        return;
    }
    
    const newsGrid = document.createElement('div');
    newsGrid.className = 'news-grid';
    
    newsData.forEach(news => {
        const card = createNewsCard(news);
        newsGrid.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(newsGrid);
    
    // Apply tag styling to all cards
    newsGrid.querySelectorAll('.news-tags').forEach(applyTagStyling);
}

/**
 * Create individual news card element
 */
function createNewsCard(news) {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.id = `news-card-${news.id}`;
    
    const date = new Date(news.date).toLocaleDateString('zh-CN');
    
    // Ensure tags is an array
    const tags = Array.isArray(news.tags) ? news.tags : [];
    
    card.innerHTML = `
        <div class="news-title">${escapeHtml(news.title || '')}</div>
        <div class="news-meta">
            <span class="news-source">${escapeHtml(news.source || '')}</span>
            <span class="news-date">${date}</span>
        </div>
        <div class="news-summary">${escapeHtml(news.summary || '')}</div>
        <div class="news-tags">
            ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="card-actions">
            <button class="btn btn-primary" onclick="exportCardAsPNG(${news.id})">下载PNG</button>
            <a href="prompt.html?id=${news.id}" class="btn btn-secondary">生成提示词</a>
        </div>
        <div class="watermark">
            ${logoSrc ? `<img src="${logoSrc}" alt="Logo">` : ''}
            <span>机器视觉</span>
        </div>
    `;
    
    return card;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Export card as PNG with enhanced settings
 */
async function exportCardAsPNG(newsId) {
    try {
        const cardElement = document.getElementById(`news-card-${newsId}`);
        if (!cardElement) {
            alert('未找到卡片');
            return;
        }
        
        // Clone the card to modify for export
        const exportCard = cardElement.cloneNode(true);
        exportCard.classList.add('export-card');
        
        // Remove action buttons from the clone
        const actionsElement = exportCard.querySelector('.card-actions');
        if (actionsElement) {
            actionsElement.remove();
        }
        
        // Temporarily add to DOM for rendering
        exportCard.style.position = 'absolute';
        exportCard.style.left = '-9999px';
        exportCard.style.top = '-9999px';
        document.body.appendChild(exportCard);
        
        // Create PNG with high quality settings
        const dataUrl = await htmlToImage.toPng(exportCard, {
            cacheBust: true,
            pixelRatio: 2,
            width: 1080,
            height: 1080,
            backgroundColor: 'white',
            style: {
                transform: 'scale(2)',
                transformOrigin: 'top left',
                width: '540px',
                height: '540px'
            }
        });
        
        // Clean up
        document.body.removeChild(exportCard);
        
        // Create download link
        const link = document.createElement('a');
        const newsItem = newsData.find(item => item.id == newsId);
        const title = newsItem ? newsItem.title : 'news';
        link.download = `${title.substring(0, 30).replace(/[^\w\s-]/g, '_')}_机器视觉新闻.png`;
        link.href = dataUrl;
        link.click();
        
        console.log('PNG export successful');
        
    } catch (error) {
        console.error('PNG export failed:', error);
        alert('导出失败，请重试');
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('Initializing application...');
        
        // Show loading state
        document.getElementById('newsContainer').innerHTML = 
            '<div class="loading">加载中...</div>';
        
        // Detect logo first
        await detectLogo();
        
        // Load and render news
        await loadNews();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Application initialization failed:', error);
        document.getElementById('newsContainer').innerHTML = 
            '<div class="error">应用初始化失败，请刷新页面重试。</div>';
    }
}

/**
 * Wait for DOM to be ready, then initialize
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Make functions globally available for onclick handlers
window.exportCardAsPNG = exportCardAsPNG;