// Cache management utilities with versioning support
export class CacheUtils {
  constructor() {
    this.version = 'v1.0';
    this.keyPrefix = 'mv-cache-';
  }

  getKey(key) {
    return `${this.keyPrefix}${key}-${this.version}`;
  }

  set(key, data, ttl = null) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl: ttl ? Date.now() + ttl : null,
        version: this.version
      };
      
      localStorage.setItem(this.getKey(key), JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.warn('Failed to set cache:', error);
      return false;
    }
  }

  get(key) {
    try {
      const cached = localStorage.getItem(this.getKey(key));
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Check version compatibility
      if (cacheData.version !== this.version) {
        this.remove(key);
        return null;
      }

      // Check TTL expiration
      if (cacheData.ttl && Date.now() > cacheData.ttl) {
        this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to get cache:', error);
      this.remove(key);
      return null;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.warn('Failed to remove cache:', error);
      return false;
    }
  }

  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.keyPrefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.warn('Failed to clear cache:', error);
      return false;
    }
  }

  getStats() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.keyPrefix));
      let totalSize = 0;
      
      cacheKeys.forEach(key => {
        totalSize += localStorage.getItem(key).length;
      });

      return {
        count: cacheKeys.length,
        size: totalSize,
        keys: cacheKeys.map(key => key.replace(this.keyPrefix, '').replace(`-${this.version}`, ''))
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { count: 0, size: 0, keys: [] };
    }
  }
}

// Singleton instance
export const cacheUtils = new CacheUtils();