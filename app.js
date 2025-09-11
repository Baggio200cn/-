// 页面主入口 (index.html) - 作为 ES Module 入口加载
import { I18N, getLang, toggleLang } from './modules/i18n.js';
import { NewsUtils } from './modules/news-utils.js';

// ========== Initialization ==========

function initLangUI() {
  const langSwitch = document.querySelector('[data-role="lang-switch"]');
  if (langSwitch) {
    langSwitch.textContent = I18N[getLang()].switchLabel;
    langSwitch.addEventListener('click', () => {
      const newLang = toggleLang();
      langSwitch.textContent = I18N[newLang].switchLabel;
      // TODO: 如果需要刷新列表或重新渲染文本，在这里调用渲染函数
    });
  }
}

function initNews() {
  // TODO: 你原本在这里使用 NewsUtils / I18N / fetch 数据等逻辑
  // 例如：
  // const listEl = document.querySelector('#news-list');
  // renderNews(listEl, window.__NEWS_DATA__ || []);
}

// ========== Example Rendering (placeholder) ==========
/*
function renderNews(container, items) {
  container.innerHTML = items.map(item => {
    return `
      <article class="news-item">
        <h3>${NewsUtils.toHTML(item.title || '')}</h3>
        <p>${NewsUtils.shorten(item.summary || item.description || '')}</p>
        <a href="${item.url}" target="_blank" rel="noopener">Source: ${NewsUtils.origin(item.url)}</a>
      </article>
    `;
  }).join('');
}
*/

// ========== Boot ==========
document.addEventListener('DOMContentLoaded', () => {
  initLangUI();
  initNews();
});
