/**
 * Data Loader Module
 * Handles loading and validating news data from JSON files
 */

export class DataLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Load news data from the main news.json file
   * @returns {Promise<Array>} Array of news items
   */
  async loadNews() {
    try {
      const response = await fetch('/data/news.json?' + Date.now());
      if (!response.ok) {
        throw new Error(`Failed to load news data: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid news data format: expected array');
      }

      return this.validateNewsItems(data);
    } catch (error) {
      console.error('Error loading news data:', error);
      throw error;
    }
  }

  /**
   * Load archived news data for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of news items
   */
  async loadArchiveNews(date) {
    try {
      const response = await fetch(`/data/archive/${date}.json?` + Date.now());
      if (!response.ok) {
        throw new Error(`Failed to load archive data for ${date}: ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid archive data format: expected array');
      }

      return this.validateNewsItems(data);
    } catch (error) {
      console.error(`Error loading archive data for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Validate and normalize news items
   * @param {Array} items - Raw news items
   * @returns {Array} Validated news items
   */
  validateNewsItems(items) {
    return items.filter(item => {
      if (!item || typeof item !== 'object') {
        console.warn('Invalid news item: not an object', item);
        return false;
      }

      const required = ['id', 'title', 'url', 'source', 'date', 'summary'];
      for (const field of required) {
        if (!item[field]) {
          console.warn(`Invalid news item: missing ${field}`, item);
          return false;
        }
      }

      // Normalize tags
      if (!Array.isArray(item.tags)) {
        item.tags = [];
      }

      // Ensure date is properly formatted
      try {
        item.date = new Date(item.date).toISOString();
      } catch (e) {
        console.warn('Invalid date format in news item:', item);
        return false;
      }

      return true;
    });
  }

  /**
   * Get available archive dates
   * @returns {Promise<Array>} Array of available dates
   */
  async getArchiveDates() {
    try {
      const response = await fetch('/data/archive/index.json?' + Date.now());
      if (!response.ok) {
        return [];
      }
      
      const index = await response.json();
      return index.dates || [];
    } catch (error) {
      console.error('Error loading archive index:', error);
      return [];
    }
  }

  /**
   * Clear internal cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const dataLoader = new DataLoader();