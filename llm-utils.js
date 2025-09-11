// LLM utilities for enhancing clusters with AI-generated content
// Supports configurable API endpoints and batch processing

const LLMUtils = (() => {
  const DEFAULT_CONFIG = {
    apiBase: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    batchSize: 4
  };
  
  const CONFIG_KEY = 'mv-llm-config';
  
  // Load LLM configuration from localStorage
  function getConfig() {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[llm] Failed to load config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }
  
  // Save LLM configuration to localStorage
  function saveConfig(config) {
    try {
      const toSave = {
        apiBase: config.apiBase || DEFAULT_CONFIG.apiBase,
        apiKey: config.apiKey || '',
        model: config.model || DEFAULT_CONFIG.model,
        batchSize: parseInt(config.batchSize) || DEFAULT_CONFIG.batchSize
      };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(toSave));
      console.log('[llm] Config saved');
      return true;
    } catch (e) {
      console.error('[llm] Failed to save config:', e);
      return false;
    }
  }
  
  // Check if LLM is properly configured
  function isConfigured() {
    const config = getConfig();
    return !!(config.apiKey && config.apiBase);
  }
  
  // Generate enhanced topic and summary for a cluster
  async function enhanceCluster(cluster, lang = 'zh') {
    if (!isConfigured()) {
      throw new Error(lang === 'zh' ? 'LLM未配置' : 'LLM not configured');
    }
    
    const config = getConfig();
    
    // Prepare content for LLM
    const items = cluster.items.map(item => ({
      title: NewsUtils.getDisplayField(item, 'title', lang),
      summary: NewsUtils.getDisplayField(item, 'summary', lang),
      source: item.source
    }));
    
    const prompt = lang === 'zh' 
      ? createChinesePrompt(items)
      : createEnglishPrompt(items);
    
    try {
      const response = await callLLMAPI(config, prompt);
      
      if (response && response.topic && response.summary) {
        return {
          topic: response.topic,
          summary: response.summary,
          enhanced: true,
          enhancedAt: new Date().toISOString()
        };
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('[llm] Enhancement failed:', error);
      throw error;
    }
  }
  
  // Create Chinese prompt for cluster enhancement
  function createChinesePrompt(items) {
    const itemsText = items.map((item, idx) => 
      `${idx + 1}. 来源：${item.source}\n   标题：${item.title}\n   摘要：${item.summary}`
    ).join('\n\n');
    
    return {
      role: 'user',
      content: `请分析以下相关新闻项目，生成一个统一的主题和摘要：

${itemsText}

请以JSON格式回复，包含：
- topic: 一个简洁的主题标题（不超过50字）
- summary: 一个综合摘要（不超过200字），概括所有相关报道的要点

确保回复是有效的JSON格式。`
    };
  }
  
  // Create English prompt for cluster enhancement
  function createEnglishPrompt(items) {
    const itemsText = items.map((item, idx) => 
      `${idx + 1}. Source: ${item.source}\n   Title: ${item.title}\n   Summary: ${item.summary}`
    ).join('\n\n');
    
    return {
      role: 'user',
      content: `Please analyze the following related news items and generate a unified topic and summary:

${itemsText}

Please respond in JSON format with:
- topic: A concise topic title (max 50 characters)
- summary: A comprehensive summary (max 200 characters) that captures the key points from all related reports

Ensure the response is valid JSON format.`
    };
  }
  
  // Call LLM API
  async function callLLMAPI(config, prompt) {
    const url = `${config.apiBase}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [prompt],
        max_tokens: 500,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid API response structure');
    }
    
    const content = data.choices[0].message.content.trim();
    
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn('[llm] Failed to parse JSON response:', content);
      throw new Error('Invalid JSON response from LLM');
    }
  }
  
  // Batch enhance clusters
  async function batchEnhanceClusters(clusters, lang = 'zh', onProgress = null) {
    if (!isConfigured()) {
      throw new Error(lang === 'zh' ? 'LLM未配置' : 'LLM not configured');
    }
    
    const config = getConfig();
    const batchSize = config.batchSize || 4;
    const total = clusters.filter(c => !c.enhanced).length;
    let processed = 0;
    
    console.log(`[llm] Starting batch enhancement of ${total} clusters`);
    
    for (let i = 0; i < clusters.length; i += batchSize) {
      const batch = clusters.slice(i, i + batchSize)
        .filter(cluster => !cluster.enhanced);
      
      if (batch.length === 0) continue;
      
      // Process batch in parallel
      const promises = batch.map(async (cluster) => {
        try {
          const enhancement = await enhanceCluster(cluster, lang);
          cluster.llmData = enhancement;
          cluster.enhanced = true;
          processed++;
          
          if (onProgress) {
            onProgress(processed, total);
          }
        } catch (error) {
          console.error(`[llm] Failed to enhance cluster ${cluster.id}:`, error);
          // Continue with other clusters
        }
      });
      
      await Promise.all(promises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < clusters.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[llm] Batch enhancement completed: ${processed}/${total}`);
    return processed;
  }
  
  // Get masked API key for display
  function getMaskedApiKey() {
    const config = getConfig();
    if (!config.apiKey) return '';
    
    const key = config.apiKey;
    if (key.length <= 8) return '*'.repeat(key.length);
    
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  }
  
  return {
    getConfig,
    saveConfig,
    isConfigured,
    enhanceCluster,
    batchEnhanceClusters,
    getMaskedApiKey,
    DEFAULT_CONFIG
  };
})();