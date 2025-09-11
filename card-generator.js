// 用于“卡片生成”页面的入口
import { I18N, getLang } from './modules/i18n.js';
import { NewsUtils } from './modules/news-utils.js';

// TODO: 替换下面的骨架逻辑为你真实的实现

function readInput() {
  const textarea = document.querySelector('#raw');
  return (textarea && textarea.value) || '';
}

function generateCard() {
  const raw = readInput();
  const shortened = NewsUtils.shorten(raw, 120);
  const lang = getLang();

  const output = document.querySelector('#output');
  if (output) {
    output.innerHTML = `
      <div class="card">
        <p>${NewsUtils.toHTML(shortened)}</p>
        <small>${I18N[lang].languageName}</small>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('#generate');
  if (btn) btn.addEventListener('click', generateCard);
});
