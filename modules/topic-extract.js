// Topic extraction - Heuristic topic/summary/key points extraction (fallback when no LLM)
class TopicExtractor {
  constructor() {
    // Banned template words that should be avoided
    this.bannedWords = [
      'significant advances', 'significant', 'breakthrough', 'groundbreaking', 'huge leap',
      '显著进展', '重大突破', '巨大飞跃', '重要进步', '显著提升'
    ];
  }

  // Extract topic from cluster items
  extractTopic(cluster, lang = 'zh') {
    const items = cluster.items || [];
    if (items.length === 0) {
      return lang === 'zh' ? '新闻事件' : 'News Event';
    }

    // Extract common terms from titles
    const titles = items.map(item => this.getItemTitle(item, lang));
    const commonTerms = this.findCommonTerms(titles, lang);

    // Extract source/company names
    const sources = [...new Set(items.map(item => item.source))];
    const mainSource = sources.length === 1 ? sources[0] : null;

    // Generate topic based on common terms and source
    let topic = '';
    if (commonTerms.length > 0) {
      const mainTerm = commonTerms[0];
      if (mainSource && items.length > 1) {
        topic = lang === 'zh'
          ? `${mainSource}等${items.length}家公司${mainTerm}动态`
          : `${mainSource} and ${items.length - 1} others: ${mainTerm}`;
      } else if (mainSource) {
        topic = lang === 'zh'
          ? `${mainSource}${mainTerm}更新`
          : `${mainSource} ${mainTerm} Update`;
      } else {
        topic = mainTerm;
      }
    } else if (mainSource) {
      topic = lang === 'zh'
        ? `${mainSource}技术动态`
        : `${mainSource} Technology Updates`;
    } else {
      topic = lang === 'zh' ? '技术动态' : 'Technology Updates';
    }

    return this.cleanText(topic);
  }

  // Extract summary from cluster items
  extractSummary(cluster, lang = 'zh') {
    const items = cluster.items || [];
    if (items.length === 0) {
      return '';
    }

    const sources = [...new Set(items.map(item => item.source))];
    const dates = items.map(item => new Date(item.date));
    const latestDate = new Date(Math.max(...dates));
    const earliestDate = new Date(Math.min(...dates));

    // Get main content themes
    const summaries = items.map(item => this.getItemSummary(item, lang));
    const themes = this.extractThemes(summaries, lang);

    let summary = '';
    if (items.length === 1) {
      // Single item - use original summary but clean it
      summary = this.cleanText(summaries[0]);
    } else {
      // Multiple items - create aggregated summary
      const dateRange = this.formatDateRange(earliestDate, latestDate, lang);
      const sourceList = sources.length <= 3 ? sources.join(lang === 'zh' ? '、' : ', ') :
        `${sources.slice(0, 2).join(lang === 'zh' ? '、' : ', ')}${lang === 'zh' ? '等' : ' and others'}`;

      if (lang === 'zh') {
        summary = `${dateRange}期间，${sourceList}等${sources.length}家${this.getIndustryTerm(themes, lang)}在${themes.join('、')}等领域发布了相关动态。这些更新涵盖了技术改进、产品发布等多个方面。`;
      } else {
        summary = `During ${dateRange}, ${sourceList} and ${sources.length} ${this.getIndustryTerm(themes, lang)} companies announced updates in ${themes.join(', ')} and related areas. These updates cover technical improvements, product releases, and other developments.`;
      }
    }

    return this.cleanText(summary).slice(0, 300);
  }

  // Extract key points from cluster items
  extractKeyPoints(cluster, lang = 'zh') {
    const items = cluster.items || [];
    const keyPoints = [];

    // Point 1: Source and scope
    const sources = [...new Set(items.map(item => item.source))];
    if (sources.length === 1) {
      keyPoints.push(lang === 'zh'
        ? `来源：${sources[0]}`
        : `Source: ${sources[0]}`);
    } else {
      keyPoints.push(lang === 'zh'
        ? `涉及${sources.length}家公司：${sources.slice(0, 3).join('、')}${sources.length > 3 ? '等' : ''}`
        : `Involves ${sources.length} companies: ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ' and others' : ''}`);
    }

    // Point 2: Time range
    const dates = items.map(item => new Date(item.date));
    const latestDate = new Date(Math.max(...dates));
    const earliestDate = new Date(Math.min(...dates));

    if (items.length > 1) {
      keyPoints.push(lang === 'zh'
        ? `时间跨度：${this.formatDateRange(earliestDate, latestDate)}`
        : `Time span: ${this.formatDateRange(earliestDate, latestDate)}`);
    }

    // Point 3: Main themes
    const summaries = items.map(item => this.getItemSummary(item, lang));
    const themes = this.extractThemes(summaries, lang);
    if (themes.length > 0) {
      keyPoints.push(lang === 'zh'
        ? `主要领域：${themes.slice(0, 3).join('、')}`
        : `Main areas: ${themes.slice(0, 3).join(', ')}`);
    }

    return keyPoints.slice(0, 3);
  }

  // Helper methods
  getItemTitle(item, lang) {
    if (lang === 'zh') {
      if (item.zh && item.zh.title) {
        return item.zh.title;
      }
      if (item.titleZh) {
        return item.titleZh;
      }
    }
    return item.title || '';
  }

  getItemSummary(item, lang) {
    if (lang === 'zh') {
      if (item.zh && item.zh.summary) {
        return item.zh.summary;
      }
      if (item.summaryZh) {
        return item.summaryZh;
      }
    }
    return item.summary || '';
  }

  findCommonTerms(texts, lang) {
    const allWords = [];
    texts.forEach(text => {
      const words = text.toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1);
      allWords.push(...words);
    });

    const wordCounts = {};
    allWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Find words that appear in multiple texts
    const commonWords = Object.entries(wordCounts)
      .filter(([, count]) => count > 1 && count >= Math.min(2, texts.length))
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);

    // Extract meaningful terms
    const meaningfulTerms = commonWords.filter(term => {
      const meaningfulKeywords = lang === 'zh'
        ? ['技术', '视觉', '智能', '算法', '模型', '系统', '平台', '框架', '工具', '产品']
        : ['vision', 'ai', 'technology', 'algorithm', 'model', 'system', 'platform', 'framework', 'tool', 'product'];

      return meaningfulKeywords.some(keyword => term.includes(keyword));
    });

    return meaningfulTerms.slice(0, 2);
  }

  extractThemes(summaries, lang) {
    const themes = new Set();

    const themeKeywords = lang === 'zh' ? {
      '机器视觉': ['视觉', '图像', '识别', '检测', '分析'],
      '人工智能': ['智能', 'ai', '算法', '模型', '学习'],
      '深度学习': ['深度', '神经', '网络', '训练'],
      '计算机视觉': ['计算机', '视觉', '图像', '处理'],
      '技术创新': ['技术', '创新', '研发', '开发']
    } : {
      'Computer Vision': ['vision', 'image', 'recognition', 'detection', 'analysis'],
      'Artificial Intelligence': ['ai', 'artificial', 'intelligence', 'algorithm', 'model'],
      'Deep Learning': ['deep', 'learning', 'neural', 'network', 'training'],
      'Technology': ['technology', 'tech', 'innovation', 'development'],
      'Machine Learning': ['machine', 'learning', 'ml', 'model']
    };

    summaries.forEach(summary => {
      const lowerSummary = summary.toLowerCase();
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => lowerSummary.includes(keyword))) {
          themes.add(theme);
        }
      });
    });

    return Array.from(themes).slice(0, 3);
  }

  formatDateRange(start, end) {
    const formatDate = (date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    if (start.getTime() === end.getTime()) {
      return formatDate(start);
    } else {
      return `${formatDate(start)}-${formatDate(end)}`;
    }
  }

  getIndustryTerm(themes, lang = 'zh') {
    if (themes.some(t => t.includes(lang === 'zh' ? '视觉' : 'vision'))) {
      return lang === 'zh' ? '机器视觉' : 'computer vision';
    }
    if (themes.some(t => t.includes(lang === 'zh' ? '智能' : 'ai'))) {
      return lang === 'zh' ? '人工智能' : 'AI';
    }
    return lang === 'zh' ? '技术' : 'technology';
  }

  cleanText(text) {
    if (!text) {
      return '';
    }

    let cleaned = text;

    // Remove banned phrases
    this.bannedWords.forEach(banned => {
      const regex = new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleaned = cleaned.replace(regex, '');
    });

    // Clean up extra whitespace and punctuation
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/[.。]+\s*$/, '')
      .trim();

    return cleaned;
  }
}

export default TopicExtractor;
