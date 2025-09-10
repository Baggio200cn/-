// Data loader module - Load original data/news.json
const BUILD_VERSION = 'v4';

class DataLoader {
  constructor() {
    this._cache = null;
  }

  async loadAll(force = false) {
    if (this._cache && !force) {
      return this._cache;
    }

    const url = 'data/news.json?v=' + Date.now();
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error('HTTP ' + resp.status);
    }

    const data = await resp.json();
    if (!Array.isArray(data)) {
      throw new Error('news.json root is not array');
    }

    this._cache = data;
    return data;
  }

  findById(id) {
    if (!this._cache) {
      return null;
    }
    return this._cache.find(it => String(it.id) === String(id));
  }

  getDisplayField(item, field, lang = 'zh') {
    if (!item) {
      return '';
    }

    // Support both nested zh: { title, summary, tags } and flat titleZh/summaryZh structure
    if (lang === 'zh') {
      if (item.zh && item.zh[field] !== null) {
        return item.zh[field];
      }
      const flatKey = field.charAt(0).toUpperCase() + field.slice(1) + 'Zh';
      if (item[flatKey] !== null) {
        return item[flatKey];
      }
    }
    return item[field] ?? '';
  }

  getDisplayTags(item, lang = 'zh') {
    if (!item) {
      return [];
    }

    if (lang === 'zh') {
      if (item.zh && Array.isArray(item.zh.tags)) {
        return item.zh.tags;
      }
      if (Array.isArray(item.tagsZh)) {
        return item.tagsZh;
      }
    }
    return item.tags || [];
  }

  getVersion() {
    return BUILD_VERSION;
  }
}

export default new DataLoader();
