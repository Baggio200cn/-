// 工具与国际化（统一导出）
// 确保其它文件 import { I18N, NewsUtils, getLang, toggleLang } from './news-utils.js';

export const I18N = {
  zh: {
    languageName: '中文',
    switchLabel: 'EN'
    // TODO: 继续补充你的中文文案键值
  },
  en: {
    languageName: 'English',
    switchLabel: '中文'
    // TODO: 继续补充你的英文文案键值
  }
};

const LANG_KEY = 'lang';

export function getLang() {
  return localStorage.getItem(LANG_KEY) || 'zh';
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.setAttribute('data-lang', lang);
  document.dispatchEvent(new CustomEvent('lang:change', { detail: { lang } }));
}

export function toggleLang() {
  const next = getLang() === 'en' ? 'zh' : 'en';
  setLang(next);
  return next;
}

export const NewsUtils = {
  formatDate(ts) {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  },
  shorten(text, max = 160) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  },
  origin(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  },
  toHTML(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  // TODO: 把你之前在旧文件里的其它工具函数复制进来
};

// 如需在浏览器调试台直接用，可解开下面：
// window.NewsUtils = NewsUtils; window.I18N = I18N;
