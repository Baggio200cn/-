const LANG_KEY = 'langPreference';

const DICT = {
  zh: {
    '相似度阈值': '相似度阈值',
    '重新聚类': '重新聚类',
    '清空缓存': '清空缓存',
    'LLM 设置面板': 'LLM 设置面板',
    'Legacy': '旧版',
  },
  en: {
    '相似度阈值': 'Similarity',
    '重新聚类': 'Recluster',
    '清空缓存': 'Clear Cache',
    'LLM 设置面板': 'LLM Panel',
    'Legacy': 'Legacy'
  }
};

let current = localStorage.getItem(LANG_KEY) || 'zh';

export function t(key){
  return DICT[current]?.[key] || key;
}

export function toggleLang(){
  current = (current === 'zh') ? 'en' : 'zh';
  localStorage.setItem(LANG_KEY, current);
  return current;
}

export function getLang(){ return current; }

export function initI18nToggle(btn){
  if(!btn) return;
  btn.textContent = current === 'zh' ? '中文/EN' : 'EN/中文';
  btn.addEventListener('click', ()=>{
    toggleLang();
    btn.textContent = current === 'zh' ? '中文/EN' : 'EN/中文';
  });
}
