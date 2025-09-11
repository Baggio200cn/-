export function normalizeItem(raw, idx){
  return {
    id: raw.id || 'n'+idx,
    title: raw.title || ('Untitled-'+idx),
    summary: raw.summary || '',
    url: raw.url || '#',
    date: raw.date || '',
    tags: Array.isArray(raw.tags)? raw.tags.slice(0,10) : [],
    source: raw.source || '',
    raw
  };
}
export function escapeHTML(str=''){
  return String(str).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
export function toWords(text){
  return (text||'').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,' ')
    .split(/\s+/).filter(Boolean);
}
