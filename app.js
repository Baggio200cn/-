// 机器视觉每日资讯 - 主应用逻辑

class NewsApp {
  constructor() {
    this.newsData = [];
    this.logoUrl = null;
    this.init();
  }

  async init() {
    await this.detectLogo();
    await this.loadNews();
    this.renderNews();
    this.setupEventListeners();
  }

  // 自动检测logo
  async detectLogo() {
    const logoOptions = [
      'assets/company-logo.png',
      'assets/company-logo.svg', 
      'assets/logo-placeholder.svg'
    ];

    for (const logoPath of logoOptions) {
      try {
        const response = await fetch(logoPath, { method: 'HEAD' });
        if (response.ok) {
          this.logoUrl = logoPath;
          console.log(`使用logo: ${logoPath}`);
          break;
        }
      } catch (error) {
        console.warn(`无法加载logo: ${logoPath}`);
      }
    }

    // 更新页面中的logo
    if (this.logoUrl) {
      const logoElements = document.querySelectorAll('.logo');
      logoElements.forEach(logo => {
        logo.src = this.logoUrl;
        logo.alt = '网站标识';
      });
    }
  }

  // 加载新闻数据
  async loadNews() {
    try {
      const response = await fetch('data/news.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      this.newsData = await response.json();
      console.log(`加载了 ${this.newsData.length} 条新闻`);
    } catch (error) {
      console.error('加载新闻数据失败:', error);
      this.showError('无法加载新闻数据，请稍后重试');
    }
  }

  // 渲染新闻卡片
  renderNews() {
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) {
      console.error('未找到新闻网格容器');
      return;
    }

    if (this.newsData.length === 0) {
      newsGrid.innerHTML = '<div class="error">暂无新闻数据</div>';
      return;
    }

    newsGrid.innerHTML = this.newsData.map((news, index) => 
      this.createNewsCard(news, index)
    ).join('');
  }

  // 创建新闻卡片HTML
  createNewsCard(news, index) {
    const formattedDate = this.formatDate(news.date);
    const tags = news.tags || [];
    const tagsHtml = this.createTagsHtml(tags);

    return `
      <article class="card news-card" data-news-id="${news.id}">
        <div class="card-body">
          <h3 class="news-title">${this.escapeHtml(news.title)}</h3>
          
          <div class="news-meta">
            <span class="news-source">${this.escapeHtml(news.source)}</span>
            <span class="news-date">${formattedDate}</span>
          </div>
          
          <p class="news-summary">${this.escapeHtml(news.summary)}</p>
          
          <div class="news-tags">
            ${tagsHtml}
          </div>
        </div>
        
        <div class="card-footer news-actions">
          <button class="btn btn-secondary btn-small download-png" 
                  data-news-id="${news.id}"
                  data-tooltip="导出为PNG图片">
            📥 下载PNG
          </button>
          <a href="prompt.html?id=${news.id}" 
             class="btn btn-primary btn-small"
             data-tooltip="生成手帐风提示词">
            ✍️ 生成提示词
          </a>
        </div>
        
        <div class="watermark">
          ${this.logoUrl ? `<img src="${this.logoUrl}" alt="Logo">` : ''}
          <span>机器视觉</span>
        </div>
      </article>
    `;
  }

  // 创建标签HTML
  createTagsHtml(tags) {
    return tags.map((tag, index) => {
      const className = index < 2 ? 'tag solid' : 'tag outline';
      return `<span class="${className}">${this.escapeHtml(tag)}</span>`;
    }).join('');
  }

  // 格式化日期
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return '今天';
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (error) {
      return '未知日期';
    }
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 设置事件监听器
  setupEventListeners() {
    // PNG下载事件
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('download-png')) {
        e.preventDefault();
        const newsId = e.target.dataset.newsId;
        this.downloadPNG(newsId);
      }
    });

    // 窗口大小变化时重新检测logo
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.detectLogo();
      }, 300);
    });
  }

  // PNG导出功能
  async downloadPNG(newsId) {
    const newsItem = this.newsData.find(item => item.id === newsId);
    if (!newsItem) {
      console.error('未找到新闻项:', newsId);
      return;
    }

    try {
      // 动态导入html-to-image库
      const { toPng } = await import('https://cdn.skypack.dev/html-to-image');
      
      // 找到对应的卡片元素
      const cardElement = document.querySelector(`[data-news-id="${newsId}"]`);
      if (!cardElement) {
        throw new Error('未找到卡片元素');
      }

      // 克隆卡片用于导出
      const clonedCard = this.createExportCard(newsItem);
      
      // 创建临时容器
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '-9999px';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '1080px';
      tempContainer.style.height = '1080px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '40px';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.innerHTML = clonedCard;
      
      document.body.appendChild(tempContainer);

      try {
        // 生成PNG
        const dataUrl = await toPng(tempContainer, {
          width: 1080,
          height: 1080,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });

        // 下载文件
        const link = document.createElement('a');
        link.download = `${this.sanitizeFilename(newsItem.title)}.png`;
        link.href = dataUrl;
        link.click();

        console.log('PNG导出成功');
      } finally {
        // 清理临时元素
        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error('PNG导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  }

  // 创建用于导出的卡片
  createExportCard(news) {
    const formattedDate = this.formatDate(news.date);
    const tags = news.tags || [];
    const tagsHtml = this.createTagsHtml(tags);

    return `
      <div class="card news-card" style="
        width: 100%;
        height: 100%;
        border-radius: 12px;
        border-top: 4px solid var(--primary, #4f46e5);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        background: white;
        display: flex;
        flex-direction: column;
        position: relative;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      ">
        <div style="
          flex: 1;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        ">
          <h3 style="
            font-size: 2rem;
            font-weight: 600;
            line-height: 1.4;
            margin: 0;
            color: #1f2937;
          ">${this.escapeHtml(news.title)}</h3>
          
          <div style="
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 1.2rem;
            color: #6b7280;
          ">
            <span style="font-weight: 500;">${this.escapeHtml(news.source)}</span>
            <span>${formattedDate}</span>
          </div>
          
          <p style="
            font-size: 1.1rem;
            line-height: 1.6;
            color: #6b7280;
            flex: 1;
            margin: 0;
          ">${this.escapeHtml(news.summary)}</p>
          
          <div style="
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: auto;
          ">
            ${tags.map((tag, index) => `
              <span style="
                display: inline-flex;
                align-items: center;
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
                font-weight: 500;
                border-radius: 8px;
                ${index < 2 ? 
                  `background: ${index === 0 ? '#4f46e5' : '#06b6d4'}; color: white;` : 
                  'background: transparent; color: #6b7280; border: 1px solid #e5e4e2;'
                }
              ">${this.escapeHtml(tag)}</span>
            `).join('')}
          </div>
        </div>
        
        <div style="
          position: absolute;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          color: #9ca3af;
          opacity: 0.6;
        ">
          ${this.logoUrl ? `<img src="${this.logoUrl}" alt="Logo" style="width: 24px; height: 24px; opacity: 0.7;">` : ''}
          <span>机器视觉</span>
        </div>
      </div>
    `;
  }

  // 文件名清理
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  // 显示错误信息
  showError(message) {
    const newsGrid = document.getElementById('news-grid');
    if (newsGrid) {
      newsGrid.innerHTML = `<div class="error">${message}</div>`;
    }
  }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  console.log('初始化机器视觉新闻应用');
  new NewsApp();
});

// 导出给其他模块使用
window.NewsApp = NewsApp;