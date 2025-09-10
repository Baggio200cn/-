// LLM integration - API wrapper with localStorage caching and throttling
class LLMTopicEnhancer {
  constructor() {
    this.apiKey = null;
    this.cachePrefix = 'llm_cache_';
    this.rateLimitDelay = 2000; // 2 seconds between requests
    this.lastRequestTime = 0;
    this.maxRetries = 2;

    // Banned words that should not appear in LLM outputs
    this.bannedWords = [
      'significant advances', 'significant', 'breakthrough', 'groundbreaking', 'huge leap',
      '显著进展', '重大突破', '巨大飞跃', '重要进步', '显著提升'
    ];
  }

  // Set API key (stored locally, not sent to server)
  setApiKey(key) {
    this.apiKey = key;
    if (key) {
      localStorage.setItem('llm_api_key', key);
    } else {
      localStorage.removeItem('llm_api_key');
    }
  }

  // Get API key from localStorage
  getApiKey() {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('llm_api_key');
    }
    return this.apiKey;
  }

  // Check if LLM enhancement is available
  isAvailable() {
    return !!this.getApiKey();
  }

  // Generate cache key for a cluster
  getCacheKey(cluster, lang) {
    const items = cluster.items || [];
    const ids = items.map(item => item.id).sort().join(',');
    return `${this.cachePrefix}${lang}_${ids}`;
  }

  // Get cached result
  getCachedResult(cluster, lang) {
    const key = this.getCacheKey(cluster, lang);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if cache is not too old (24 hours)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
    return null;
  }

  // Cache result
  setCachedResult(cluster, lang, result) {
    const key = this.getCacheKey(cluster, lang);
    const cacheData = {
      data: result,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch {
      console.warn('Failed to cache LLM result:', 'storage error');
    }
  }

  // Rate limiting
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  // Prepare input data for LLM
  prepareInputData(cluster, lang) {
    const items = cluster.items || [];
    const titles = items.map(item => this.getItemTitle(item, lang));
    const snippets = items.map(item => this.getItemSummary(item, lang));

    return {
      titles: titles,
      snippets: snippets,
      language: lang,
      count: items.length,
      sources: [...new Set(items.map(item => item.source))]
    };
  }

  // Create LLM prompt
  createPrompt(inputData, lang) {
    const systemPrompt = lang === 'zh'
      ? '你是资讯聚类总结助手。禁止使用以下夸张词：显著进展, 重大突破, significant advances, groundbreaking, huge leap。输出必须是严格的JSON格式。'
      : 'You are a news clustering assistant. Avoid these words: significant advances, groundbreaking, huge leap, breakthrough. Output must be strict JSON format.';

    const userPrompt = lang === 'zh'
      ? `请为以下${inputData.count}条相关新闻生成聚合总结：

标题：${inputData.titles.join('; ')}

摘要：${inputData.snippets.join('; ')}

请输出JSON格式：
{
  "topic_cn": "简洁的中文主题（不超过20字）",
  "summary_cn": "聚合摘要（不超过200字，避免模板化词语）",
  "key_points": ["要点1", "要点2", "要点3"]
}

失败时返回：{"error": "reason"}`
      : `Please generate aggregated summary for these ${inputData.count} related news items:

Titles: ${inputData.titles.join('; ')}

Summaries: ${inputData.snippets.join('; ')}

Output JSON format:
{
  "topic_en": "Concise English topic (under 100 chars)",
  "summary_en": "Aggregated summary (under 300 chars, avoid template phrases)",
  "key_points": ["Point 1", "Point 2", "Point 3"]
}

On failure return: {"error": "reason"}`;

    return { systemPrompt, userPrompt };
  }

  // Call LLM API (OpenAI-compatible)
  async callLLM(inputData, lang) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('No API key available');
    }

    const { systemPrompt, userPrompt } = this.createPrompt(inputData, lang);

    await this.waitForRateLimit();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    return this.parseResponse(content, lang);
  }

  // Parse LLM response
  parseResponse(content, lang) {
    try {
      const parsed = JSON.parse(content.trim());

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      // Validate required fields
      const topicKey = lang === 'zh' ? 'topic_cn' : 'topic_en';
      const summaryKey = lang === 'zh' ? 'summary_cn' : 'summary_en';

      if (!parsed[topicKey] || !parsed[summaryKey]) {
        throw new Error('Missing required fields in response');
      }

      // Clean output of banned words
      const cleanedResult = {
        topic: this.cleanText(parsed[topicKey]),
        summary: this.cleanText(parsed[summaryKey]),
        keyPoints: (parsed.key_points || []).map(point => this.cleanText(point)).slice(0, 3)
      };

      return cleanedResult;
    } catch (e) {
      throw new Error(`Failed to parse response: ${e.message}`);
    }
  }

  // Clean text of banned words
  cleanText(text) {
    if (!text) {
      return '';
    }

    let cleaned = text;
    this.bannedWords.forEach(banned => {
      const regex = new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleaned = cleaned.replace(regex, '');
    });

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  // Main enhancement method
  async enhanceCluster(cluster, lang = 'zh') {
    // Check cache first
    const cached = this.getCachedResult(cluster, lang);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    if (!this.isAvailable()) {
      throw new Error('LLM enhancement not available - no API key');
    }

    const inputData = this.prepareInputData(cluster, lang);

    // Retry logic
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.callLLM(inputData, lang);

        // Cache successful result
        this.setCachedResult(cluster, lang, result);

        return { ...result, fromCache: false };
      } catch (error) {
        lastError = error;
        console.warn(`LLM enhancement attempt ${attempt + 1} failed:`, error.message);

        if (attempt < this.maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  // Helper methods
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

  // Clear all cached results
  clearCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.cachePrefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Get cache statistics
  getCacheStats() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));

    let totalSize = 0;
    let validEntries = 0;
    const now = Date.now();

    cacheKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
        try {
          const parsed = JSON.parse(value);
          if (parsed.timestamp && now - parsed.timestamp < 24 * 60 * 60 * 1000) {
            validEntries++;
          }
        } catch {
          // Invalid entry
        }
      }
    });

    return {
      totalEntries: cacheKeys.length,
      validEntries,
      totalSizeBytes: totalSize,
      averageSizeBytes: cacheKeys.length > 0 ? Math.round(totalSize / cacheKeys.length) : 0
    };
  }
}

export default LLMTopicEnhancer;
