// 国际化与语言切换逻辑模块

// 可根据需要扩展键值
export const I18N = {
  en: {
    languageName: 'English',
    switchLabel: '中文',
    // TODO: add other keys used in UI
  },
  zh: {
    languageName: '中文',
    switchLabel: 'EN',
    // TODO: add other keys used in UI
  }
};

const LANG_KEY = 'lang';

export function getLang() {
  return localStorage.getItem(LANG_KEY) || 'en';
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.setAttribute('data-lang', lang);
  // 若你的页面需要即时刷新文案，可以触发事件
  document.dispatchEvent(new CustomEvent('lang:change', { detail: { lang } }));
}

export function toggleLang() {
  const next = getLang() === 'en' ? 'zh' : 'en';
  setLang(next);
  return next;
}
