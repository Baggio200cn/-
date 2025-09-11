/**
 * Topic Extraction Module
 * Extracts topics and keywords from news articles
 */

export class TopicExtractor {
  constructor() {
    // Common stop words to filter out
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 
      'below', 'between', 'among', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'be', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do',
      'does', 'did', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
      'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all',
      'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'said', 'says', 'say',
      'new', 'now', 'use', 'used', 'using', 'also', 'just', 'like', 'get', 'go', 'come',
      'one', 'two', 'first', 'last', 'good', 'great', 'big', 'small', 'long', 'short'
    ]);

    // Technology-specific keywords that are important
    this.techKeywords = new Set([
      'ai', 'artificial', 'intelligence', 'machine', 'learning', 'deep', 'neural', 'network',
      'vision', 'computer', 'opencv', 'pytorch', 'tensorflow', 'nvidia', 'cuda', 'gpu',
      'algorithm', 'model', 'training', 'inference', 'detection', 'recognition', 'classification',
      'segmentation', 'object', 'image', 'video', 'camera', 'sensor', 'edge', 'cloud',
      'automation', 'robotics', 'autonomous', 'self-driving', 'surveillance', 'medical',
      'healthcare', 'industry', 'manufacturing', 'quality', 'inspection', 'real-time'
    ]);
  }

  /**
   * Extract topics from a single news item
   * @param {Object} newsItem - News article object
   * @returns {Object} Extracted topics and metadata
   */
  extractFromItem(newsItem) {
    const text = `${newsItem.title} ${newsItem.summary}`.toLowerCase();
    const tags = newsItem.tags || [];
    
    return {
      keywords: this.extractKeywords(text),
      tags: tags.map(tag => tag.toLowerCase()),
      techTerms: this.extractTechTerms(text),
      sentiment: this.extractSentiment(text),
      companies: this.extractCompanies(text),
      source: newsItem.source
    };
  }

  /**
   * Extract keywords from text
   * @param {string} text - Input text
   * @returns {Array} Array of keywords with scores
   */
  extractKeywords(text) {
    // Simple tokenization and filtering
    const words = text
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.stopWords.has(word) &&
        !/^\d+$/.test(word)
      );

    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Convert to array and sort by frequency
    return Object.entries(frequency)
      .map(([word, count]) => ({
        word,
        score: count + (this.techKeywords.has(word) ? 2 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Extract technology-specific terms
   * @param {string} text - Input text
   * @returns {Array} Array of technology terms found
   */
  extractTechTerms(text) {
    const words = text.split(/\s+/);
    const found = new Set();

    words.forEach(word => {
      const clean = word.replace(/[^\w]/g, '').toLowerCase();
      if (this.techKeywords.has(clean)) {
        found.add(clean);
      }
    });

    return Array.from(found);
  }

  /**
   * Extract basic sentiment indicators
   * @param {string} text - Input text
   * @returns {string} Sentiment category
   */
  extractSentiment(text) {
    const positive = ['breakthrough', 'advanced', 'innovative', 'improved', 'enhanced', 'successful', 'progress', 'achievement'];
    const negative = ['problem', 'issue', 'challenge', 'failure', 'concern', 'risk', 'threat'];
    
    const positiveCount = positive.filter(word => text.includes(word)).length;
    const negativeCount = negative.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract company/organization names
   * @param {string} text - Input text
   * @returns {Array} Array of detected companies
   */
  extractCompanies(text) {
    const companies = [
      'nvidia', 'intel', 'amd', 'google', 'microsoft', 'amazon', 'meta', 'facebook',
      'apple', 'tesla', 'openai', 'anthropic', 'openCV', 'pytorch', 'tensorflow',
      'hugging face', 'ultralytics', 'aws', 'azure', 'gcp'
    ];

    return companies.filter(company => 
      text.toLowerCase().includes(company.toLowerCase())
    );
  }

  /**
   * Generate topic clusters from multiple news items
   * @param {Array} newsItems - Array of news items
   * @returns {Object} Topic analysis results
   */
  analyzeTopics(newsItems) {
    const allTopics = newsItems.map(item => this.extractFromItem(item));
    
    // Aggregate keywords
    const keywordFreq = {};
    const tagFreq = {};
    const techTermFreq = {};
    const companyFreq = {};
    
    allTopics.forEach(topics => {
      topics.keywords.forEach(({ word, score }) => {
        keywordFreq[word] = (keywordFreq[word] || 0) + score;
      });
      
      topics.tags.forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
      
      topics.techTerms.forEach(term => {
        techTermFreq[term] = (techTermFreq[term] || 0) + 1;
      });
      
      topics.companies.forEach(company => {
        companyFreq[company] = (companyFreq[company] || 0) + 1;
      });
    });

    return {
      topKeywords: this.sortAndLimit(keywordFreq, 20),
      topTags: this.sortAndLimit(tagFreq, 15),
      topTechTerms: this.sortAndLimit(techTermFreq, 15),
      topCompanies: this.sortAndLimit(companyFreq, 10),
      sentimentDistribution: this.calculateSentimentDistribution(allTopics)
    };
  }

  /**
   * Sort frequency object and limit results
   * @param {Object} freq - Frequency object
   * @param {number} limit - Maximum items to return
   * @returns {Array} Sorted and limited array
   */
  sortAndLimit(freq, limit) {
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item, count]) => ({ item, count }));
  }

  /**
   * Calculate sentiment distribution
   * @param {Array} topics - Array of topic objects
   * @returns {Object} Sentiment distribution
   */
  calculateSentimentDistribution(topics) {
    const distribution = { positive: 0, negative: 0, neutral: 0 };
    topics.forEach(topic => {
      distribution[topic.sentiment]++;
    });
    return distribution;
  }

  /**
   * Calculate similarity between two news items based on topics
   * @param {Object} item1 - First news item
   * @param {Object} item2 - Second news item
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(item1, item2) {
    const topics1 = this.extractFromItem(item1);
    const topics2 = this.extractFromItem(item2);
    
    // Compare keywords
    const keywords1 = new Set(topics1.keywords.map(k => k.word));
    const keywords2 = new Set(topics2.keywords.map(k => k.word));
    const keywordIntersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const keywordUnion = new Set([...keywords1, ...keywords2]);
    const keywordSimilarity = keywordIntersection.size / keywordUnion.size;
    
    // Compare tags
    const tags1 = new Set(topics1.tags);
    const tags2 = new Set(topics2.tags);
    const tagIntersection = new Set([...tags1].filter(x => tags2.has(x)));
    const tagUnion = new Set([...tags1, ...tags2]);
    const tagSimilarity = tagUnion.size > 0 ? tagIntersection.size / tagUnion.size : 0;
    
    // Compare tech terms
    const tech1 = new Set(topics1.techTerms);
    const tech2 = new Set(topics2.techTerms);
    const techIntersection = new Set([...tech1].filter(x => tech2.has(x)));
    const techUnion = new Set([...tech1, ...tech2]);
    const techSimilarity = techUnion.size > 0 ? techIntersection.size / techUnion.size : 0;
    
    // Weighted average
    return (keywordSimilarity * 0.5 + tagSimilarity * 0.3 + techSimilarity * 0.2);
  }
}

// Export singleton instance
export const topicExtractor = new TopicExtractor();