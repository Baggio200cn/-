/**
 * Cluster Engine Module
 * Implements clustering algorithms for news articles
 */

import { topicExtractor } from './topic-extract.js';

export class ClusterEngine {
  constructor() {
    this.clusters = [];
    this.diagnostics = {
      processTime: 0,
      clusterCount: 0,
      itemCount: 0,
      algorithm: 'similarity-based'
    };
  }

  /**
   * Cluster news items using similarity-based algorithm
   * @param {Array} newsItems - Array of news items to cluster
   * @param {Object} options - Clustering options
   * @returns {Array} Array of clusters
   */
  clusterNews(newsItems, options = {}) {
    const startTime = Date.now();

    const config = {
      minClusterSize: options.minClusterSize || 2,
      maxClusters: options.maxClusters || 10,
      similarityThreshold: options.similarityThreshold || 0.3,
      ...options
    };

    // Initialize clusters array
    this.clusters = [];

    // Handle empty input
    if (!newsItems || newsItems.length === 0) {
      this.updateDiagnostics(startTime, 0, 0);
      return this.clusters;
    }

    try {
      // Create similarity matrix
      const similarities = this.calculateSimilarityMatrix(newsItems);

      // Perform clustering
      this.performClustering(newsItems, similarities, config);

      // Post-process clusters
      this.postProcessClusters(config);

      // Generate cluster metadata
      this.generateClusterMetadata();

    } catch (error) {
      console.error('Error during clustering:', error);
      // Create single cluster with all items as fallback
      this.createFallbackCluster(newsItems);
    }

    this.updateDiagnostics(startTime, this.clusters.length, newsItems.length);
    return this.clusters;
  }

  /**
   * Calculate similarity matrix for all news items
   * @param {Array} newsItems - News items
   * @returns {Array} 2D similarity matrix
   */
  calculateSimilarityMatrix(newsItems) {
    const matrix = [];

    for (let i = 0; i < newsItems.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < newsItems.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else if (j < i) {
          matrix[i][j] = matrix[j][i]; // Use symmetry
        } else {
          matrix[i][j] = topicExtractor.calculateSimilarity(newsItems[i], newsItems[j]);
        }
      }
    }

    return matrix;
  }

  /**
   * Perform clustering using similarity-based algorithm
   * @param {Array} newsItems - News items
   * @param {Array} similarities - Similarity matrix
   * @param {Object} config - Configuration options
   */
  performClustering(newsItems, similarities, config) {
    const assigned = new Array(newsItems.length).fill(false);
    let clusterId = 0;

    for (let i = 0; i < newsItems.length; i++) {
      if (assigned[i]) continue;

      // Start new cluster
      const cluster = {
        id: `cluster-${clusterId++}`,
        items: [newsItems[i]],
        indices: [i],
        centroid: null,
        topic: '',
        summary: '',
        keyPoints: [],
        sources: new Set([newsItems[i].source]),
        tags: new Set(newsItems[i].tags || []),
        _llmError: null,
        _enhanced: false
      };

      assigned[i] = true;

      // Find similar items
      for (let j = i + 1; j < newsItems.length; j++) {
        if (assigned[j]) continue;

        if (similarities[i][j] >= config.similarityThreshold) {
          cluster.items.push(newsItems[j]);
          cluster.indices.push(j);
          cluster.sources.add(newsItems[j].source);
          (newsItems[j].tags || []).forEach(tag => cluster.tags.add(tag));
          assigned[j] = true;
        }
      }

      // Only add cluster if it meets minimum size requirement
      if (cluster.items.length >= config.minClusterSize) {
        this.clusters.push(cluster);
      } else {
        // Mark items as unassigned again for potential inclusion in other clusters
        cluster.indices.forEach(idx => { assigned[idx] = false; });
      }

      // Stop if we've reached max clusters
      if (this.clusters.length >= config.maxClusters) {
        break;
      }
    }

    // Create "Other" cluster for remaining unassigned items
    const unassigned = newsItems.filter((_, index) => !assigned[index]);
    if (unassigned.length > 0) {
      const otherCluster = {
        id: 'cluster-other',
        items: unassigned,
        indices: unassigned.map((_, i) => newsItems.indexOf(unassigned[i])),
        centroid: null,
        topic: 'Other News',
        summary: 'Miscellaneous news items that don\'t fit into major clusters',
        keyPoints: [],
        sources: new Set(unassigned.map(item => item.source)),
        tags: new Set(unassigned.flatMap(item => item.tags || [])),
        _llmError: null,
        _enhanced: false
      };
      this.clusters.push(otherCluster);
    }
  }

  /**
   * Post-process clusters (merge small ones, refine boundaries)
   * @param {Object} config - Configuration options
   */
  postProcessClusters(config) {
    // Sort clusters by size (largest first)
    this.clusters.sort((a, b) => b.items.length - a.items.length);

    // Merge very small clusters with similar larger ones
    const toMerge = [];
    for (let i = 0; i < this.clusters.length; i++) {
      if (this.clusters[i].items.length < config.minClusterSize) {
        // Find most similar larger cluster
        let bestMatch = -1;
        let bestSimilarity = 0;

        for (let j = 0; j < i; j++) {
          if (this.clusters[j].items.length >= config.minClusterSize) {
            const similarity = this.calculateClusterSimilarity(this.clusters[i], this.clusters[j]);
            if (similarity > bestSimilarity && similarity > 0.2) {
              bestSimilarity = similarity;
              bestMatch = j;
            }
          }
        }

        if (bestMatch !== -1) {
          toMerge.push({ from: i, to: bestMatch });
        }
      }
    }

    // Perform merges (in reverse order to maintain indices)
    toMerge.reverse().forEach(({ from, to }) => {
      this.mergeClusters(to, from);
    });
  }

  /**
   * Calculate similarity between two clusters
   * @param {Object} cluster1 - First cluster
   * @param {Object} cluster2 - Second cluster
   * @returns {number} Similarity score
   */
  calculateClusterSimilarity(cluster1, cluster2) {
    // Compare tags
    const tags1 = cluster1.tags;
    const tags2 = cluster2.tags;
    const tagIntersection = new Set([...tags1].filter(x => tags2.has(x)));
    const tagUnion = new Set([...tags1, ...tags2]);
    const tagSimilarity = tagUnion.size > 0 ? tagIntersection.size / tagUnion.size : 0;

    // Compare sources
    const sources1 = cluster1.sources;
    const sources2 = cluster2.sources;
    const sourceIntersection = new Set([...sources1].filter(x => sources2.has(x)));
    const sourceUnion = new Set([...sources1, ...sources2]);
    const sourceSimilarity = sourceUnion.size > 0 ? sourceIntersection.size / sourceUnion.size : 0;

    return (tagSimilarity * 0.7 + sourceSimilarity * 0.3);
  }

  /**
   * Merge two clusters
   * @param {number} targetIndex - Index of target cluster
   * @param {number} sourceIndex - Index of source cluster to merge
   */
  mergeClusters(targetIndex, sourceIndex) {
    const target = this.clusters[targetIndex];
    const source = this.clusters[sourceIndex];

    // Merge items and indices
    target.items.push(...source.items);
    target.indices.push(...source.indices);

    // Merge sources and tags
    source.sources.forEach(s => target.sources.add(s));
    source.tags.forEach(t => target.tags.add(t));

    // Remove source cluster
    this.clusters.splice(sourceIndex, 1);
  }

  /**
   * Generate metadata for each cluster
   */
  generateClusterMetadata() {
    this.clusters.forEach(cluster => {
      // Generate basic topic from most common tags/keywords
      cluster.topic = this.generateClusterTopic(cluster);

      // Generate basic summary
      cluster.summary = this.generateClusterSummary(cluster);

      // Extract key points
      cluster.keyPoints = this.generateKeyPoints(cluster);

      // Convert sets to arrays for JSON serialization
      cluster.sources = Array.from(cluster.sources);
      cluster.tags = Array.from(cluster.tags);
    });
  }

  /**
   * Generate topic name for a cluster
   * @param {Object} cluster - Cluster object
   * @returns {string} Generated topic name
   */
  generateClusterTopic(cluster) {
    // Use most common tags and sources
    const tagCounts = {};
    cluster.items.forEach(item => {
      (item.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([tag]) => tag);

    if (topTags.length > 0) {
      return topTags.join(' & ');
    }

    // Fallback to source names
    const uniqueSources = Array.from(cluster.sources);
    if (uniqueSources.length === 1) {
      return `${uniqueSources[0]} News`;
    }

    return `Technology News (${cluster.items.length} items)`;
  }

  /**
   * Generate summary for a cluster
   * @param {Object} cluster - Cluster object
   * @returns {string} Generated summary
   */
  generateClusterSummary(cluster) {
    const itemCount = cluster.items.length;
    const sourceCount = cluster.sources.length;
    const topics = Array.from(cluster.tags).slice(0, 3).join(', ');

    return `A collection of ${itemCount} related news items from ${sourceCount} source${sourceCount !== 1 ? 's' : ''} covering topics like ${topics}.`;
  }

  /**
   * Generate key points for a cluster
   * @param {Object} cluster - Cluster object
   * @returns {Array} Array of key points
   */
  generateKeyPoints(cluster) {
    const points = [];

    // Add source diversity point
    if (cluster.sources.length > 1) {
      points.push(`Coverage from ${cluster.sources.length} different sources`);
    }

    // Add tag-based points
    const topTags = Array.from(cluster.tags).slice(0, 3);
    if (topTags.length > 0) {
      points.push(`Related to ${topTags.join(', ')}`);
    }

    // Add temporal info
    const dates = cluster.items.map(item => new Date(item.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const daySpan = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    if (daySpan > 1) {
      points.push(`Spans ${daySpan} days of coverage`);
    } else {
      points.push('Recent developments');
    }

    return points;
  }

  /**
   * Create fallback cluster for error cases
   * @param {Array} newsItems - All news items
   */
  createFallbackCluster(newsItems) {
    this.clusters = [{
      id: 'cluster-all',
      items: newsItems,
      indices: newsItems.map((_, i) => i),
      centroid: null,
      topic: 'All News',
      summary: 'All available news items',
      keyPoints: [`${newsItems.length} total items`],
      sources: Array.from(new Set(newsItems.map(item => item.source))),
      tags: Array.from(new Set(newsItems.flatMap(item => item.tags || []))),
      _llmError: null,
      _enhanced: false
    }];
  }

  /**
   * Update diagnostics information
   * @param {number} startTime - Start timestamp
   * @param {number} clusterCount - Number of clusters created
   * @param {number} itemCount - Number of items processed
   */
  updateDiagnostics(startTime, clusterCount, itemCount) {
    this.diagnostics = {
      processTime: Date.now() - startTime,
      clusterCount,
      itemCount,
      algorithm: 'similarity-based',
      lastRun: new Date().toISOString()
    };
  }

  /**
   * Get clustering diagnostics
   * @returns {Object} Diagnostics information
   */
  getDiagnostics() {
    return { ...this.diagnostics };
  }

  /**
   * Get all clusters
   * @returns {Array} Current clusters
   */
  getClusters() {
    return this.clusters;
  }

  /**
   * Get cluster by ID
   * @param {string} clusterId - Cluster ID
   * @returns {Object|null} Cluster object or null
   */
  getClusterById(clusterId) {
    return this.clusters.find(cluster => cluster.id === clusterId) || null;
  }
}

// Export singleton instance
export const clusterEngine = new ClusterEngine();
