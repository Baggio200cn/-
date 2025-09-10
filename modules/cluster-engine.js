// Cluster engine - Frontend clustering using Jaccard similarity
class ClusterEngine {
  constructor(similarityThreshold = 0.88) {
    this.threshold = similarityThreshold;
  }

  // Normalize text for comparison - remove common words and standardize
  normalizeText(text) {
    if (!text) {
      return '';
    }

    // Convert to lowercase and remove punctuation
    const normalized = text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove common words that appear in templates
    const stopWords = [
      'has', 'announced', 'significant', 'advances', 'machine', 'vision', 'ai', 'processing', 'capabilities',
      'new', 'developments', 'promise', 'enhance', 'real-time', 'improve', 'accuracy', 'various', 'computer', 'applications',
      '宣布', '取得', '突破', '显著', '进展', '机器视觉', '人工智能', '处理', '能力', '新', '成果', '有望', '增强', '实时', '提升', '准确率', '多种', '计算机', '应用', '场景'
    ];

    const words = normalized.split(/\s+/);
    const filteredWords = words.filter(word =>
      word.length > 1 && !stopWords.includes(word)
    );

    return filteredWords.join(' ');
  }

  // Calculate Jaccard similarity between two texts
  jaccardSimilarity(text1, text2) {
    if (!text1 || !text2) {
      return 0;
    }

    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Check if two news items should be clustered together
  shouldCluster(item1, item2, lang = 'zh') {
    // Get summaries for comparison
    const summary1 = this.getItemSummary(item1, lang);
    const summary2 = this.getItemSummary(item2, lang);

    // Normalize summaries
    const norm1 = this.normalizeText(summary1);
    const norm2 = this.normalizeText(summary2);

    // Calculate similarity
    const similarity = this.jaccardSimilarity(norm1, norm2);

    return similarity >= this.threshold;
  }

  getItemSummary(item, lang) {
    if (lang === 'zh') {
      if (item.zh && item.zh.summary) {
        return item.zh.summary;
      }
      if (item.summaryZh) {
        return item.summaryZh;
      }
    }
    return item.summary || '';
  }

  getItemTitle(item, lang) {
    if (lang === 'zh') {
      if (item.zh && item.zh.title) {
        return item.zh.title;
      }
      if (item.titleZh) {
        return item.titleZh;
      }
    }
    return item.title || '';
  }

  // Main clustering algorithm
  clusterNews(newsItems, lang = 'zh') {
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < newsItems.length; i++) {
      if (processed.has(i)) {
        continue;
      }

      const cluster = {
        id: 'cluster_' + Date.now() + '_' + i,
        items: [newsItems[i]],
        mainItem: newsItems[i], // Most recent item
        created: Date.now(),
        enhanced: false
      };

      processed.add(i);

      // Find similar items to cluster with
      for (let j = i + 1; j < newsItems.length; j++) {
        if (processed.has(j)) {
          continue;
        }

        if (this.shouldCluster(newsItems[i], newsItems[j], lang)) {
          cluster.items.push(newsItems[j]);
          processed.add(j);

          // Update main item to the most recent one
          if (new Date(newsItems[j].date) > new Date(cluster.mainItem.date)) {
            cluster.mainItem = newsItems[j];
          }
        }
      }

      clusters.push(cluster);
    }

    // Sort clusters by date of main item (newest first)
    clusters.sort((a, b) => new Date(b.mainItem.date) - new Date(a.mainItem.date));

    return clusters;
  }

  // Get debug information about clustering
  getDiagnostics(originalCount, clusters) {
    const clusterSizes = clusters.map(c => c.items.length);
    const totalClustered = clusterSizes.reduce((sum, size) => sum + size, 0);
    const singleItemClusters = clusterSizes.filter(size => size === 1).length;
    const multiItemClusters = clusterSizes.filter(size => size > 1).length;

    return {
      originalCount,
      clusterCount: clusters.length,
      totalClustered,
      reductionPercent: Math.round((1 - clusters.length / originalCount) * 100),
      singleItemClusters,
      multiItemClusters,
      averageClusterSize: totalClustered / clusters.length,
      maxClusterSize: Math.max(...clusterSizes),
      threshold: this.threshold,
      timestamp: new Date().toISOString()
    };
  }
}

export default ClusterEngine;
