export async function loadRawItems() {
  const resp = await fetch('./data/news.json', { cache: 'no-store' });
  if (!resp.ok) {
    console.warn('无法加载 news.json，返回空列表');
    return [];
  }
  const list = await resp.json();
  return list.map((it, idx) => ({
    id: it.id || String(idx),
    title: it.title || it.name || '',
    summary: it.summary || it.description || '',
    url: it.url || it.link || '#',
    date: it.publishedAt || it.date || '',
    tags: Array.isArray(it.tags) ? it.tags : [],
    lang: detectLang(it.title || it.summary)
  }));
}

function detectLang(text='') {
  return /[\u4e00-\u9fff]/.test(text) ? 'zh' : 'en';
}// TODO: implement data-loader
