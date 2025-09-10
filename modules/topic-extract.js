// Topic extraction utilities for news clustering
export class TopicExtractor {
  constructor() {
    this.stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'among', 'within', 'without', 'against', 'upon', 'across',
      'a', 'an', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'cannot', 'it', 'its',
      'they', 'them', 'their', 'he', 'him', 'his', 'she', 'her', 'we', 'us', 'our',
      'you', 'your', 'i', 'me', 'my', 'mine', 'new', 'technology', 'announces',
      'announcement', 'today', 'now', 'latest', 'recent', 'recently'
    ]);
    
    this.techKeywords = new Set([
      'ai', 'artificial intelligence', 'machine learning', 'deep learning',
      'computer vision', 'neural network', 'opencv', 'pytorch', 'tensorflow',
      'cuda', 'gpu', 'nvidia', 'intel', 'amd', 'apple', 'meta', 'google',
      'microsoft', 'aws', 'cloud', 'edge computing', 'iot', 'robotics',
      'autonomous', 'self-driving', 'lidar', 'sensor', 'camera', 'imaging',
      'detection', 'recognition', 'classification', 'segmentation', 'tracking',
      'algorithm', 'model', 'framework', 'platform', 'sdk', 'api', 'hardware',
      'software', 'chip', 'processor', 'accelerator', 'inference', 'training'
    ]);
  }

  extractKeywords(text, maxKeywords = 10) {
    if (!text) return [];
    
    // Clean and normalize text
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract words and phrases
    const words = cleanText.split(' ').filter(word => 
      word.length > 2 && !this.stopWords.has(word)
    );
    
    // Count word frequencies
    const wordFreq = new Map();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Boost technical keywords
    wordFreq.forEach((count, word) => {
      if (this.techKeywords.has(word)) {
        wordFreq.set(word, count * 2);
      }
    });
    
    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  extractTopicSignature(newsItem, lang = 'zh') {
    const title = newsItem.title || '';
    const summary = newsItem.summary || '';
    const tags = Array.isArray(newsItem.tags) ? newsItem.tags : [];
    
    // Get localized content if available
    let localTitle = title;
    let localSummary = summary;
    let localTags = tags;
    
    if (lang === 'zh' && newsItem.zh) {
      localTitle = newsItem.zh.title || title;
      localSummary = newsItem.zh.summary || summary;
      localTags = newsItem.zh.tags || tags;
    }
    
    // Combine all text content
    const combinedText = [localTitle, localSummary].join(' ');
    
    // Extract keywords from text
    const textKeywords = this.extractKeywords(combinedText, 8);
    
    // Normalize tags to lowercase
    const normalizedTags = localTags.map(tag => tag.toLowerCase());
    
    // Combine and deduplicate
    const allKeywords = [...new Set([...textKeywords, ...normalizedTags])];
    
    return {
      keywords: allKeywords.slice(0, 10),
      source: newsItem.source || 'unknown',
      tags: normalizedTags,
      textLength: combinedText.length
    };
  }

  calculateSimilarity(signature1, signature2) {
    const keywords1 = new Set(signature1.keywords);
    const keywords2 = new Set(signature2.keywords);
    
    // Calculate keyword overlap
    const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
    const union = new Set([...keywords1, ...keywords2]);
    
    const keywordSimilarity = union.size > 0 ? intersection.size / union.size : 0;
    
    // Source bonus - same source gets small boost
    const sourceSimilarity = signature1.source === signature2.source ? 0.1 : 0;
    
    // Tag overlap bonus
    const tags1 = new Set(signature1.tags);
    const tags2 = new Set(signature2.tags);
    const tagIntersection = new Set([...tags1].filter(t => tags2.has(t)));
    const tagSimilarity = (tags1.size + tags2.size > 0) ? 
      (tagIntersection.size * 2) / (tags1.size + tags2.size) * 0.3 : 0;
    
    return Math.min(1.0, keywordSimilarity + sourceSimilarity + tagSimilarity);
  }

  generateClusterTopic(newsItems, lang = 'zh') {
    if (!newsItems || newsItems.length === 0) return 'Empty Cluster';
    
    if (newsItems.length === 1) {
      const item = newsItems[0];
      return lang === 'zh' && item.zh?.title ? item.zh.title : item.title || 'Untitled';
    }
    
    // Collect all keywords and tags from cluster items
    const allKeywords = [];
    const allTags = [];
    const sources = new Set();
    
    newsItems.forEach(item => {
      const signature = this.extractTopicSignature(item, lang);
      allKeywords.push(...signature.keywords);
      allTags.push(...signature.tags);
      sources.add(signature.source);
    });
    
    // Find most common keywords
    const keywordFreq = new Map();
    allKeywords.forEach(keyword => {
      keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
    });
    
    const topKeywords = Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([keyword]) => keyword);
    
    // Generate topic title
    if (sources.size === 1) {
      const source = Array.from(sources)[0];
      return `${source} - ${topKeywords.slice(0, 2).join(', ')}`;
    } else {
      return topKeywords.slice(0, 3).join(' & ') || 'Mixed Topics';
    }
  }
}

// Singleton instance
export const topicExtractor = new TopicExtractor();