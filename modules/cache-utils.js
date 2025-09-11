const CACHE_KEY = 'CLUSTER_CACHE_V1';

export function getCachedClusters(threshold, titleMerge) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.threshold !== threshold || data.titleMerge !== titleMerge) return null;
    return data.clusters || null;
  } catch {
    return null;
  }
}

export function saveClusterCache(threshold, titleMerge, clusters) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    threshold, titleMerge, clusters, ts: Date.now()
  }));
}

export function clearClusterCache() {
  localStorage.removeItem(CACHE_KEY);
}
