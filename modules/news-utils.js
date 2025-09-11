// 新闻相关工具函数集合

export const NewsUtils = {
  formatDate(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  },

  shorten(text, max = 160) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  },

  // 示例：提取域名
  origin(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  },

  // 示例：安全插入 HTML（非常基础；更复杂需 DOMPurify）
  toHTML(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  // TODO: 添加你已有的其它工具函数
};
