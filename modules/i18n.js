// 国际化模块
export const I18N = {
  zh: {
    languageName: '中文',
    switchLabel: 'EN'
  },
  en: {
    languageName: 'English',
    switchLabel: '中文'
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