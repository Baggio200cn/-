// Clustering utilities for news items
// Provides similarity-based clustering with configurable threshold and title-based merging

const ClusteringUtils = (() => {
  const VERSION = 'v1.0';
  
  // Calculate text similarity using Jaccard similarity on word sets
  function calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const normalize = (text) => text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
    
    const words1 = new Set(normalize(text1));
    const words2 = new Set(normalize(text2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  // Calculate combined similarity score for title and summary
  function calculateItemSimilarity(item1, item2, lang = 'zh') {
    const title1 = NewsUtils.getDisplayField(item1, 'title', lang);
    const title2 = NewsUtils.getDisplayField(item2, 'title', lang);
    const summary1 = NewsUtils.getDisplayField(item1, 'summary', lang);
    const summary2 = NewsUtils.getDisplayField(item2, 'summary', lang);
    
    const titleSim = calculateSimilarity(title1, title2);
    const summarySim = calculateSimilarity(summary1, summary2);
    
    // Weight title similarity higher (0.6) than summary similarity (0.4)
    return titleSim * 0.6 + summarySim * 0.4;
  }
  
  // Check if titles are very similar (for second-pass merge)
  function areTitlesSimilar(item1, item2, lang = 'zh', threshold = 0.7) {
    const title1 = NewsUtils.getDisplayField(item1, 'title', lang);
    const title2 = NewsUtils.getDisplayField(item2, 'title', lang);
    return calculateSimilarity(title1, title2) >= threshold;
  }
  
  // Cluster news items using similarity threshold
  function clusterNews(newsItems, similarityThreshold = 0.88, enableTitleMerge = false, lang = 'zh') {
    if (!Array.isArray(newsItems) || newsItems.length === 0) {
      return [];
    }
    
    const clusters = [];
    const used = new Set();
    
    console.log(`[clustering] Starting clustering with threshold ${similarityThreshold}, titleMerge: ${enableTitleMerge}`);
    
    for (let i = 0; i < newsItems.length; i++) {
      if (used.has(i)) continue;
      
      const cluster = {
        id: `cluster-${Date.now()}-${i}`,
        items: [newsItems[i]],
        similarity: 1.0,
        enhanced: false,
        llmData: null,
        createdAt: new Date().toISOString()
      };
      
      used.add(i);
      
      // Find similar items
      for (let j = i + 1; j < newsItems.length; j++) {
        if (used.has(j)) continue;
        
        const similarity = calculateItemSimilarity(newsItems[i], newsItems[j], lang);
        
        if (similarity >= similarityThreshold) {
          cluster.items.push(newsItems[j]);
          cluster.similarity = Math.min(cluster.similarity, similarity);
          used.add(j);
        }
      }
      
      clusters.push(cluster);
    }
    
    // Second pass: merge clusters with very similar titles if enabled
    if (enableTitleMerge && clusters.length > 1) {
      console.log('[clustering] Performing second-pass title merge');
      const finalClusters = [];
      const clusterUsed = new Set();
      
      for (let i = 0; i < clusters.length; i++) {
        if (clusterUsed.has(i)) continue;
        
        const mainCluster = clusters[i];
        clusterUsed.add(i);
        
        // Look for clusters to merge based on title similarity
        for (let j = i + 1; j < clusters.length; j++) {
          if (clusterUsed.has(j)) continue;
          
          const otherCluster = clusters[j];
          
          // Check if any items in the clusters have similar titles
          let shouldMerge = false;
          for (const item1 of mainCluster.items) {
            for (const item2 of otherCluster.items) {
              if (areTitlesSimilar(item1, item2, lang, 0.75)) {
                shouldMerge = true;
                break;
              }
            }
            if (shouldMerge) break;
          }
          
          if (shouldMerge) {
            mainCluster.items.push(...otherCluster.items);
            mainCluster.similarity = Math.min(mainCluster.similarity, otherCluster.similarity);
            clusterUsed.add(j);
          }
        }
        
        finalClusters.push(mainCluster);
      }
      
      console.log(`[clustering] Title merge reduced clusters from ${clusters.length} to ${finalClusters.length}`);
      return finalClusters;
    }
    
    console.log(`[clustering] Created ${clusters.length} clusters from ${newsItems.length} items`);
    return clusters;
  }
  
  // Generate cluster topic (fallback to first item title)
  function generateClusterTopic(cluster, lang = 'zh') {
    if (!cluster || !cluster.items || cluster.items.length === 0) {
      return lang === 'zh' ? '未知主题' : 'Unknown Topic';
    }
    
    // For now, use the first item's title as topic
    // TODO: Implement LLM-based topic generation
    return NewsUtils.getDisplayField(cluster.items[0], 'title', lang);
  }
  
  // Generate cluster summary
  function generateClusterSummary(cluster, lang = 'zh') {
    if (!cluster || !cluster.items || cluster.items.length === 0) {
      return '';
    }
    
    if (cluster.items.length === 1) {
      return NewsUtils.getDisplayField(cluster.items[0], 'summary', lang);
    }
    
    // For multiple items, create a basic summary
    const sources = [...new Set(cluster.items.map(item => item.source))];
    const sourceList = sources.slice(0, 3).join(', ');
    const remaining = sources.length > 3 ? ` +${sources.length - 3}` : '';
    
    if (lang === 'zh') {
      return `${sourceList}${remaining} 等多个来源报道了相关进展，涉及机器视觉和AI处理能力的重要突破。`;
    } else {
      return `Multiple sources including ${sourceList}${remaining} reported related developments in machine vision and AI processing capabilities.`;
    }
  }
  
  // Get cluster tags (union of all item tags)
  function getClusterTags(cluster, lang = 'zh') {
    if (!cluster || !cluster.items) return [];
    
    const allTags = new Set();
    cluster.items.forEach(item => {
      const tags = NewsUtils.getDisplayTags(item, lang);
      tags.forEach(tag => allTags.add(tag));
    });
    
    return Array.from(allTags).slice(0, 8); // Limit to 8 tags
  }
  
  // Cache management
  const CACHE_KEY = 'mv-clusters-cache';
  const CACHE_VERSION_KEY = 'mv-clusters-version';
  
  function getCachedClusters() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const version = localStorage.getItem(CACHE_VERSION_KEY);
      
      if (cached && version === VERSION) {
        const data = JSON.parse(cached);
        console.log('[clustering] Loaded cached clusters:', data.clusters.length);
        return data;
      }
    } catch (e) {
      console.warn('[clustering] Failed to load cache:', e);
    }
    return null;
  }
  
  function setCachedClusters(clusters, settings, rawCount) {
    try {
      const data = {
        clusters,
        settings,
        rawCount,
        timestamp: new Date().toISOString(),
        version: VERSION
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_VERSION_KEY, VERSION);
      console.log('[clustering] Cached clusters:', clusters.length);
    } catch (e) {
      console.warn('[clustering] Failed to cache clusters:', e);
    }
  }
  
  function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
    console.log('[clustering] Cache cleared');
  }
  
  return {
    VERSION,
    calculateSimilarity,
    calculateItemSimilarity,
    clusterNews,
    generateClusterTopic,
    generateClusterSummary,
    getClusterTags,
    getCachedClusters,
    setCachedClusters,
    clearCache
  };
})();

// Global variables for debugging
window.__CLUSTERS__ = [];
window.__CLUSTER_DIAG__ = {
  version: ClusteringUtils.VERSION,
  lastRun: null,
  settings: null,
  performance: null
};