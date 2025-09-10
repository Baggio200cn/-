// News clustering engine with configurable thresholds and title-based second pass
import { topicExtractor } from './topic-extract.js';
import { cacheUtils } from './cache-utils.js';

export class ClusterEngine {
  constructor() {
    this.defaultThreshold = 0.8;
    this.titleMergeEnabled = true;
    this.titleSimilarityThreshold = 0.7;
  }

  async clusterNews(newsItems, options = {}) {
    const {
      threshold = this.defaultThreshold,
      enableTitleMerge = this.titleMergeEnabled,
      lang = 'zh',
      useCache = true
    } = options;

    // Generate cache key based on options and data
    const cacheKey = this.generateCacheKey(newsItems, options);
    
    if (useCache) {
      const cached = cacheUtils.get(cacheKey);
      if (cached) {
        console.log('Using cached clustering result');
        return cached;
      }
    }

    console.log(`Clustering ${newsItems.length} news items with threshold ${threshold}`);
    
    // Extract topic signatures for all items
    const signatures = newsItems.map(item => ({
      item,
      signature: topicExtractor.extractTopicSignature(item, lang)
    }));

    // Initial clustering based on content similarity
    const clusters = this.performInitialClustering(signatures, threshold);
    
    // Second pass: merge clusters with similar titles if enabled
    let finalClusters = clusters;
    if (enableTitleMerge) {
      finalClusters = this.performTitleMerging(clusters, lang);
    }

    // Generate cluster metadata
    const result = this.generateClusterMetadata(finalClusters, lang);
    
    // Cache the result
    if (useCache) {
      cacheUtils.set(cacheKey, result, 30 * 60 * 1000); // 30 minutes TTL
    }

    console.log(`Clustering complete: ${result.length} clusters from ${newsItems.length} items`);
    return result;
  }

  generateCacheKey(newsItems, options) {
    const itemIds = newsItems.map(item => item.id).sort().join(',');
    const optionsHash = JSON.stringify(options);
    return `clusters-${btoa(itemIds + optionsHash).slice(0, 16)}`;
  }

  performInitialClustering(signatures, threshold) {
    const clusters = [];
    const assigned = new Set();

    signatures.forEach((current, index) => {
      if (assigned.has(index)) return;

      const cluster = [current];
      assigned.add(index);

      // Find similar items
      signatures.forEach((candidate, candidateIndex) => {
        if (assigned.has(candidateIndex)) return;

        const similarity = topicExtractor.calculateSimilarity(
          current.signature,
          candidate.signature
        );

        if (similarity >= threshold) {
          cluster.push(candidate);
          assigned.add(candidateIndex);
        }
      });

      clusters.push(cluster);
    });

    return clusters;
  }

  performTitleMerging(clusters, lang) {
    const merged = [];
    const usedClusters = new Set();

    clusters.forEach((cluster, index) => {
      if (usedClusters.has(index)) return;

      let currentCluster = [...cluster];
      usedClusters.add(index);

      // Look for clusters with similar titles to merge
      clusters.forEach((otherCluster, otherIndex) => {
        if (usedClusters.has(otherIndex)) return;

        const titleSimilarity = this.calculateTitleSimilarity(
          currentCluster,
          otherCluster,
          lang
        );

        if (titleSimilarity >= this.titleSimilarityThreshold) {
          currentCluster.push(...otherCluster);
          usedClusters.add(otherIndex);
        }
      });

      merged.push(currentCluster);
    });

    return merged;
  }

  calculateTitleSimilarity(cluster1, cluster2, lang) {
    // Get representative titles from each cluster
    const titles1 = cluster1.map(item => this.getTitle(item.item, lang));
    const titles2 = cluster2.map(item => this.getTitle(item.item, lang));

    let maxSimilarity = 0;

    titles1.forEach(title1 => {
      titles2.forEach(title2 => {
        const similarity = this.calculateTextSimilarity(title1, title2);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      });
    });

    return maxSimilarity;
  }

  getTitle(item, lang) {
    if (lang === 'zh' && item.zh?.title) {
      return item.zh.title;
    }
    return item.title || '';
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    // Normalize texts
    const normalized1 = text1.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    const normalized2 = text2.toLowerCase().replace(/[^\w\s]/g, ' ').trim();

    if (normalized1 === normalized2) return 1.0;

    // Split into words
    const words1 = new Set(normalized1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(normalized2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  generateClusterMetadata(clusters, lang) {
    return clusters.map((cluster, index) => {
      const items = cluster.map(c => c.item);
      
      // Sort items by date (newest first)
      items.sort((a, b) => new Date(b.date) - new Date(a.date));

      const topic = topicExtractor.generateClusterTopic(items, lang);
      
      // Calculate cluster statistics
      const sources = [...new Set(items.map(item => item.source))];
      const dateRange = this.calculateDateRange(items);
      
      return {
        id: `cluster-${index}`,
        topic,
        items,
        count: items.length,
        sources: sources.sort(),
        dateRange,
        enhanced: false, // Will be set by LLM enhancement
        enhancedTopic: null,
        enhancedSummary: null
      };
    }).sort((a, b) => b.count - a.count); // Sort by cluster size
  }

  calculateDateRange(items) {
    const dates = items.map(item => new Date(item.date)).filter(d => !isNaN(d));
    if (dates.length === 0) return null;

    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));
    
    return {
      earliest: earliest.toISOString(),
      latest: latest.toISOString(),
      span: Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) // days
    };
  }

  clearCache() {
    // Clear all cluster-related cache entries
    const stats = cacheUtils.getStats();
    stats.keys.forEach(key => {
      if (key.startsWith('clusters-')) {
        cacheUtils.remove(key);
      }
    });
  }

  getClusteringStats(clusters) {
    const totalItems = clusters.reduce((sum, cluster) => sum + cluster.count, 0);
    const avgClusterSize = totalItems / clusters.length;
    const singletons = clusters.filter(c => c.count === 1).length;
    
    return {
      totalClusters: clusters.length,
      totalItems,
      avgClusterSize: Math.round(avgClusterSize * 100) / 100,
      singletons,
      largestCluster: Math.max(...clusters.map(c => c.count)),
      sources: [...new Set(clusters.flatMap(c => c.sources))].length
    };
  }
}

// Singleton instance
export const clusterEngine = new ClusterEngine();