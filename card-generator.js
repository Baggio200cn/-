// VER: modular-2025-09-11-cardgen
import { I18N, getLang } from './modules/i18n.js';
import { NewsUtils } from './modules/news-utils.js';

const els = {
  textarea: document.querySelector('#raw'),
  generateBtn: document.querySelector('#generate'),
  output: document.querySelector('#output'),
  stats: document.getElementById('stats')
};

function readInput() {
  return els.textarea ? els.textarea.value : '';
}

function parseLines(raw) {
  return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

function buildCardHTML(text, lang) {
  const safe = NewsUtils.toHTML(NewsUtils.shorten(text, 160));
  const langLabel = I18N[lang]?.languageName || lang.toUpperCase();
  return `<div class="card"><p>${safe}</p><small>${langLabel}</small></div>`;
}

function renderCards() {
  if (!els.output) return;
  const raw = readInput();
  if (!raw.trim()) {
    els.output.innerHTML = '<p class="placeholder">请输入内容</p>';
    if (els.stats) els.stats.textContent = '0 条';
    return;
  }
  const lang = getLang();
  const lines = parseLines(raw);
  els.output.innerHTML = lines.map(t => buildCardHTML(t, lang)).join('\n');
  if (els.stats) els.stats.textContent = `${lines.length} 条`;
}

function handleGenerate() {
  renderCards();
}

document.addEventListener('DOMContentLoaded', () => {
  if (els.generateBtn) {
    els.generateBtn.addEventListener('click', handleGenerate);
  }
  renderCards();
  document.addEventListener('lang:change', renderCards);
});