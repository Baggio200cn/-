/**
 * news-utils.js
 * Helper functions: normalizeItem, escapeHTML, domainOf, hashing utilities.
 */

export function normalizeItem(raw, idx){
  const title = raw.title || raw.name || `Untitled-${idx}`;
  const summary = raw.summary || raw.description || '';
  const url = raw.url || raw.link || '#';
  const date = raw.date || raw.publishedAt || '';
  const id = raw.id || `n${idx}`;
  const tags = Array.isArray(raw.tags) ? raw.tags.slice(0,12) : [];
  return { id, title, summary, url, date, tags, raw };
}

export function escapeHTML(str=''){
  return String(str).replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

export function escapeHTMLAttr(str=''){
  return escapeHTML(str).replace(/"/g,'&quot;');
}

export function domainOf(url=''){
  try {
    return new URL(url).hostname.replace(/^www\./,'');
  } catch(e){
    return '';
  }
}

export function toWords(text){
  return (text||'').toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g,' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function hashString(str){
  // djb2
  let h = 5381;
  for(let i=0;i<str.length;i++){
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}
