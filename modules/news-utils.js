// VER: utils-2025-09-11
// 精简工具函数：无多余未使用导出

export function formatDate(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export function shorten(text, max = 160) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function origin(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

export function toHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 可选聚合对象（如果没有使用，可删除下面这段）
// export const NewsUtils = { formatDate, shorten, origin, toHTML };