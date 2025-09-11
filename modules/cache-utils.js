/**
 * Cache Utilities Module
 * Handles localStorage caching with versioning and expiration
 */

const CLUSTER_CACHE_VERSION = 'CLUSTER_CACHE_V1';
const LLM_CONFIG_VERSION = 'LLM_CONFIG_V1';
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class CacheUtils {
  constructor() {
    this.prefix = 'mv-daily-';
  }

  /**
   * Get cache key with prefix and version
   * @param {string} key - Base key name
   * @param {string} version - Cache version
   * @returns {string} Full cache key
   */
  getCacheKey(key, version) {
    return `${this.prefix}${key}-${version}`;
  }

  /**
   * Store data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl = DEFAULT_CACHE_TTL) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to store in cache:', error);
    }
  }

  /**
   * Get data from cache if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (!parsed || typeof parsed !== 'object') return null;

      // Check if expired
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        this.remove(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to get from cache:', error);
      this.remove(key);
      return null;
    }
  }

  /**
   * Remove item from cache
   * @param {string} key - Cache key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from cache:', error);
    }
  }

  /**
   * Store cluster data in cache
   * @param {Array} clusters - Cluster data
   * @param {number} newsHash - Hash of source news data for invalidation
   */
  setClusters(clusters, newsHash) {
    const key = this.getCacheKey('clusters', CLUSTER_CACHE_VERSION);
    this.set(key, { clusters, newsHash });
  }

  /**
   * Get cached clusters if news hash matches
   * @param {number} newsHash - Hash of current news data
   * @returns {Array|null} Cached clusters or null
   */
  getClusters(newsHash) {
    const key = this.getCacheKey('clusters', CLUSTER_CACHE_VERSION);
    const cached = this.get(key);
    
    if (cached && cached.newsHash === newsHash) {
      return cached.clusters;
    }
    
    return null;
  }

  /**
   * Store LLM configuration
   * @param {Object} config - LLM configuration
   */
  setLLMConfig(config) {
    const key = this.getCacheKey('llm-config', LLM_CONFIG_VERSION);
    // No TTL for user configuration
    this.set(key, config, Infinity);
  }

  /**
   * Get LLM configuration
   * @returns {Object|null} LLM configuration
   */
  getLLMConfig() {
    const key = this.getCacheKey('llm-config', LLM_CONFIG_VERSION);
    return this.get(key);
  }

  /**
   * Store selected cluster ID
   * @param {string} clusterId - Selected cluster ID
   */
  setSelectedCluster(clusterId) {
    try {
      localStorage.setItem('selectedCluster', clusterId);
    } catch (error) {
      console.warn('Failed to store selected cluster:', error);
    }
  }

  /**
   * Get selected cluster ID
   * @returns {string|null} Selected cluster ID
   */
  getSelectedCluster() {
    try {
      return localStorage.getItem('selectedCluster');
    } catch (error) {
      console.warn('Failed to get selected cluster:', error);
      return null;
    }
  }

  /**
   * Clear all cache for a specific version
   * @param {string} version - Cache version to clear
   */
  clearVersion(version) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix) && key.includes(version)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache version:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const stats = {
      totalItems: 0,
      totalSize: 0,
      items: []
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          const size = new Blob([value]).size;
          stats.totalItems++;
          stats.totalSize += size;
          stats.items.push({ key, size });
        }
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return stats;
  }

  /**
   * Calculate simple hash for data
   * @param {any} data - Data to hash
   * @returns {number} Simple hash
   */
  static hash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

// Export singleton instance
export const cacheUtils = new CacheUtils();