/**
 * Data Loader
 * -----------
 * Loads ./data/news.json and normalizes each item to a common shape:
 * { id, title, summary, url, date, tags, raw }
 *
 * Diagnostics:
 *   window.__NEWS_LOAD__ = {
 *     count, sample, lastError, fetchedAt
 *   }
 */

import { normalizeItem } from './news-utils.js';

let _cache = null;
let _pending = null;

const NEWS_PATH = './data/news.json';  // Adjust here if you relocate the file

export async function loadRawItems(force = false) {
  if (_cache && !force) {
    return _cache;
  }
  if (_pending) return _pending;

  _pending = (async () => {
    let data;
    let error = null;
    try {
      const res = await fetch(NEWS_PATH + cacheBustParam(), { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} when fetching ${NEWS_PATH}`);
      }
      data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('news.json must export an array');
      }
    } catch (e) {
      error = e;
      console.error('[data-loader] Failed to load news.json:', e);
      data = [];
    }

    _cache = data.map((d, i) => normalizeItem(d, i));

    // Diagnostics
    window.__NEWS_LOAD__ = {
      count: _cache.length,
      sample: _cache.slice(0, 3),
      lastError: error ? String(error.message || error) : null,
      fetchedAt: new Date().toISOString()
    };

    _pending = null;
    return _cache;
  })();

  return _pending;
}

/**
 * Optional: force refresh (ignore in-memory cache)
 */
export async function reloadRawItems() {
  _cache = null;
  return loadRawItems(true);
}

function cacheBustParam() {
  // 防止 GitHub Pages CDN 过度缓存，可视情况关掉
  return '?v=' + new Date().getTime();
}
