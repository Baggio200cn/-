// Data loading utilities for news aggregation
export class DataLoader {
  constructor() {
    this.cache = new Map();
    this.buildVersion = 'v4';
  }

  async loadNews(force = false) {
    const cacheKey = 'news-data';
    if (!force && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `data/news.json?v=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load news data`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid news data format: expected array');
      }

      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to load news data:', error);
      throw error;
    }
  }

  getDisplayField(item, field, lang = 'zh') {
    if (!item) return '';
    
    // Support nested zh structure and flat *Zh fields
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

  findById(data, id) {
    if (!Array.isArray(data)) return null;
    return data.find(item => String(item.id) === String(id));
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
export const dataLoader = new DataLoader();