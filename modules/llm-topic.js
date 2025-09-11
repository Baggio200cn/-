/**
 * LLM Topic Enhancement Module
 * Handles LLM API calls for enhancing cluster topics and summaries
 */

import { cacheUtils } from './cache-utils.js';

export class LLMTopicEnhancer {
  constructor() {
    this.config = this.loadConfig();
    this.isProcessing = false;
    this.processingQueue = [];
  }

  /**
   * Load LLM configuration from cache
   * @returns {Object} LLM configuration
   */
  loadConfig() {
    const defaultConfig = {
      apiBase: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      batchSize: 3,
      timeout: 30000
    };

    const cached = cacheUtils.getLLMConfig();
    return { ...defaultConfig, ...cached };
  }

  /**
   * Save LLM configuration to cache
   * @param {Object} config - Configuration to save
   */
  saveConfig(config) {
    this.config = { ...this.config, ...config };
    cacheUtils.setLLMConfig(this.config);
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.saveConfig(newConfig);
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Validate LLM configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];

    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      errors.push('API Key is required');
    }

    if (!this.config.apiBase || this.config.apiBase.trim() === '') {
      errors.push('API Base URL is required');
    }

    if (!this.config.model || this.config.model.trim() === '') {
      errors.push('Model name is required');
    }

    if (this.config.batchSize < 1 || this.config.batchSize > 10) {
      errors.push('Batch size must be between 1 and 10');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enhance clusters with LLM
   * @param {Array} clusters - Clusters to enhance
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<Array>} Enhanced clusters
   */
  async enhanceClusters(clusters, progressCallback = null) {
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new Error(`Invalid LLM configuration: ${validation.errors.join(', ')}`);
    }

    if (this.isProcessing) {
      throw new Error('LLM enhancement already in progress');
    }

    this.isProcessing = true;
    const enhancedClusters = [...clusters];

    try {
      // Process clusters in batches
      const batches = this.createBatches(clusters, this.config.batchSize);
      let completed = 0;

      for (const batch of batches) {
        const batchPromises = batch.map(cluster =>
          this.enhanceCluster(cluster).catch(error => {
            console.error(`Error enhancing cluster ${cluster.id}:`, error);
            cluster._llmError = error.message;
            return cluster;
          })
        );

        const batchResults = await Promise.all(batchPromises);

        // Update results in main array
        batchResults.forEach(result => {
          const index = enhancedClusters.findIndex(c => c.id === result.id);
          if (index !== -1) {
            enhancedClusters[index] = result;
          }
        });

        completed += batch.length;
        if (progressCallback) {
          progressCallback({
            completed,
            total: clusters.length,
            percentage: Math.round((completed / clusters.length) * 100)
          });
        }

        // Small delay between batches to avoid rate limiting
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(1000);
        }
      }

    } finally {
      this.isProcessing = false;
    }

    return enhancedClusters;
  }

  /**
   * Enhance a single cluster
   * @param {Object} cluster - Cluster to enhance
   * @returns {Promise<Object>} Enhanced cluster
   */
  async enhanceCluster(cluster) {
    try {
      const prompt = this.createEnhancementPrompt(cluster);
      const response = await this.callLLMAPI(prompt);
      const enhancement = this.parseEnhancementResponse(response);

      // Apply enhancement to cluster
      const enhanced = { ...cluster };
      if (enhancement.topic) enhanced.topic = enhancement.topic;
      if (enhancement.summary) enhanced.summary = enhancement.summary;
      if (enhancement.keyPoints) enhanced.keyPoints = enhancement.keyPoints;

      enhanced._enhanced = true;
      enhanced._llmError = null;

      return enhanced;

    } catch (error) {
      console.error(`Failed to enhance cluster ${cluster.id}:`, error);

      const errorCluster = { ...cluster };
      errorCluster._llmError = error.message;
      errorCluster._enhanced = false;

      return errorCluster;
    }
  }

  /**
   * Create enhancement prompt for a cluster
   * @param {Object} cluster - Cluster to create prompt for
   * @returns {string} Enhancement prompt
   */
  createEnhancementPrompt(cluster) {
    const items = cluster.items.slice(0, 5); // Limit to first 5 items to avoid token limits

    const newsContext = items.map((item, index) =>
      `${index + 1}. "${item.title}" from ${item.source}\nSummary: ${item.summary}\nTags: ${(item.tags || []).join(', ')}`
    ).join('\n\n');

    return `You are analyzing a cluster of related machine vision and AI news articles. Please provide an enhanced analysis in JSON format.

News Articles in Cluster:
${newsContext}

Current Cluster Info:
- Topic: ${cluster.topic}
- Summary: ${cluster.summary}
- Sources: ${cluster.sources.join(', ')}
- Tags: ${cluster.tags.join(', ')}

Please respond with a JSON object containing:
{
  "topic": "Enhanced topic title (max 60 characters)",
  "summary": "Enhanced summary paragraph (max 200 characters)",
  "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3"]
}

Focus on:
1. Creating a clear, engaging topic title
2. Writing a concise summary that captures the main themes
3. Identifying 3-5 key insights or trends from the articles

Respond only with valid JSON, no additional text.`;
  }

  /**
   * Call LLM API with prompt
   * @param {string} prompt - Prompt to send
   * @returns {Promise<string>} LLM response
   */
  async callLLMAPI(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LLM API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from LLM API');
      }

      return data.choices[0].message.content;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('LLM API request timed out');
      }

      throw error;
    }
  }

  /**
   * Parse LLM enhancement response
   * @param {string} response - Raw LLM response
   * @returns {Object} Parsed enhancement data
   */
  parseEnhancementResponse(response) {
    try {
      // Clean up response (remove markdown code blocks if present)
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(cleanResponse);

      // Validate required fields
      const enhancement = {};

      if (typeof parsed.topic === 'string' && parsed.topic.trim()) {
        enhancement.topic = parsed.topic.trim().slice(0, 60);
      }

      if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
        enhancement.summary = parsed.summary.trim().slice(0, 200);
      }

      if (Array.isArray(parsed.keyPoints)) {
        enhancement.keyPoints = parsed.keyPoints
          .filter(point => typeof point === 'string' && point.trim())
          .map(point => point.trim())
          .slice(0, 5);
      }

      return enhancement;

    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      throw new Error('Failed to parse LLM enhancement response');
    }
  }

  /**
   * Create batches from clusters array
   * @param {Array} clusters - Clusters to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array} Array of batches
   */
  createBatches(clusters, batchSize) {
    const batches = [];
    for (let i = 0; i < clusters.length; i += batchSize) {
      batches.push(clusters.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Simple delay utility
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test LLM configuration
   * @returns {Promise<Object>} Test result
   */
  async testConfiguration() {
    const validation = this.validateConfig();
    if (!validation.valid) {
      return {
        success: false,
        error: `Configuration invalid: ${validation.errors.join(', ')}`
      };
    }

    try {
      const testPrompt = 'Respond with exactly this JSON: {"test": "success", "message": "Configuration is working"}';
      const response = await this.callLLMAPI(testPrompt);

      // Try to parse response
      const parsed = JSON.parse(response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

      if (parsed.test === 'success') {
        return {
          success: true,
          message: 'LLM configuration is working correctly'
        };
      } else {
        return {
          success: false,
          error: 'LLM returned unexpected response'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Test failed: ${error.message}`
      };
    }
  }

  /**
   * Get processing status
   * @returns {boolean} Whether enhancement is in progress
   */
  isEnhancing() {
    return this.isProcessing;
  }

  /**
   * Cancel ongoing enhancement (if possible)
   */
  cancelEnhancement() {
    this.isProcessing = false;
    // Note: Individual requests cannot be cancelled once started
  }
}

// Export singleton instance
export const llmTopicEnhancer = new LLMTopicEnhancer();
