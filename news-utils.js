// Shared utilities for news loading / lookup / i18n
const BUILD_VERSION = 'v4';

const NewsUtils = (() => {
  let _cache = null;
  async function loadAll(force = false) {
    if (_cache && !force) return _cache;
    const url = 'data/news.json?v=' + Date.now();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('news.json root is not array');
    _cache = data;
    return data;
  }
  function findById(id) {
    if (!_cache) return null;
    return _cache.find(it => String(it.id) === String(id));
  }
  function getDisplayField(item, field, lang) {
    if (!item) return '';
    // 支持两种结构：
    // 结构1：嵌套 zh: { title, summary, tags }
    // 结构2：平铺 titleZh / summaryZh / tagsZh
    if (lang === 'zh') {
      if (item.zh && item.zh[field] != null) return item.zh[field];
      const flatKey = field.charAt(0).toUpperCase() + field.slice(1) + 'Zh';
      if (item[flatKey] != null) return item[flatKey];
    }
    return item[field] ?? '';
  }
  function getDisplayTags(item, lang) {
    if (!item) return [];
    if (lang === 'zh') {
      if (item.zh && Array.isArray(item.zh.tags)) return item.zh.tags;
      if (Array.isArray(item.tagsZh)) return item.tagsZh;
    }
    return item.tags || [];
  }
  return { loadAll, findById, getDisplayField, getDisplayTags, getVersion: () => BUILD_VERSION };
})();

// Simple i18n for UI static words
const I18N = {
  zh: {
    sourceLink: '源链接',
    genCard: '生成卡片',
    total: (f, a) => `共 ${f} 条（总计 ${a} 条）`,
    cardTitle: '手帐风学习卡生成器',
    selectNews: '选择新闻项',
    extraNote: '补充说明（可选）',
    placeholderNote: '添加任何自定义说明或学习要点…',
    needSelect: '请先选择一条新闻，再点击“生成学习卡”',
    back: '返回',
    loading: '加载数据中…',
    failed: '加载数据失败'
  },
  en: {
    sourceLink: 'Source',
    genCard: 'Card',
    total: (f, a) => `${f} items (total ${a})`,
    cardTitle: 'Notebook Style Card Generator',
    selectNews: 'Select News',
    extraNote: 'Extra Note (optional)',
    placeholderNote: 'Add any custom note or learning points…',
    needSelect: 'Select one news item first then click "Generate Card"',
    back: 'Back',
    loading: 'Loading…',
    failed: 'Failed to load'
  }
};

function getLang() {
  return localStorage.getItem('mv.lang') || 'zh';
}
function toggleLang() {
  const cur = getLang();
  const next = cur === 'zh' ? 'en' : 'zh';
  localStorage.setItem('mv.lang', next);
  // 简单策略：整页刷新
  location.reload();
}
