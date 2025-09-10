// LLM integration for topic enhancement and summary generation
export class LLMTopicEnhancer {
  constructor() {
    this.settings = this.loadSettings();
    this.isProcessing = false;
    this.batchSize = 3;
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('llm-settings');
      return saved ? JSON.parse(saved) : this.getDefaultSettings();
    } catch {
      return this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      apiBaseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      batchSize: 3,
      enabled: false
    };
  }

  saveSettings(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      localStorage.setItem('llm-settings', JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
      return false;
    }
  }

  isConfigured() {
    return this.settings.apiKey && this.settings.apiBaseUrl && this.settings.enabled;
  }

  async enhanceClusters(clusters, onProgress = null) {
    if (!this.isConfigured()) {
      throw new Error('LLM not configured. Please check API settings.');
    }

    if (this.isProcessing) {
      throw new Error('Enhancement already in progress');
    }

    this.isProcessing = true;
    const enhancedClusters = [...clusters];
    const totalClusters = clusters.length;
    let processed = 0;

    try {
      // Process clusters in batches
      for (let i = 0; i < clusters.length; i += this.settings.batchSize) {
        const batch = clusters.slice(i, i + this.settings.batchSize);
        
        await Promise.all(batch.map(async (cluster, batchIndex) => {
          const clusterIndex = i + batchIndex;
          try {
            const enhanced = await this.enhanceCluster(cluster);
            enhancedClusters[clusterIndex] = enhanced;
            
            processed++;
            if (onProgress) {
              onProgress({
                processed,
                total: totalClusters,
                percentage: Math.round((processed / totalClusters) * 100),
                currentCluster: enhanced.topic
              });
            }
          } catch (error) {
            console.error(`Failed to enhance cluster ${clusterIndex}:`, error);
            // Keep original cluster if enhancement fails
            if (onProgress) {
              onProgress({
                processed: processed + 1,
                total: totalClusters,
                percentage: Math.round(((processed + 1) / totalClusters) * 100),
                error: error.message
              });
            }
            processed++;
          }
        }));

        // Small delay between batches to avoid rate limiting
        if (i + this.settings.batchSize < clusters.length) {
          await this.delay(1000);
        }
      }

      return enhancedClusters;
    } finally {
      this.isProcessing = false;
    }
  }

  async enhanceCluster(cluster) {
    const prompt = this.buildEnhancementPrompt(cluster);
    
    try {
      const response = await this.callLLM(prompt);
      const enhancement = this.parseEnhancementResponse(response);
      
      return {
        ...cluster,
        enhanced: true,
        enhancedTopic: enhancement.topic || cluster.topic,
        enhancedSummary: enhancement.summary,
        enhancementTimestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('LLM enhancement failed for cluster:', cluster.id, error);
      throw error;
    }
  }

  buildEnhancementPrompt(cluster) {
    const items = cluster.items.slice(0, 5); // Limit to first 5 items to manage prompt length
    
    const newsItems = items.map((item, index) => {
      return `${index + 1}. ${item.title}
Source: ${item.source}
Summary: ${item.summary || 'No summary'}
Tags: ${(item.tags || []).join(', ')}`;
    }).join('\n\n');

    return `Analyze this cluster of ${cluster.count} machine vision/AI news articles and provide:
1. An improved, concise topic title (max 60 characters)
2. A 2-3 sentence summary highlighting key themes and significance

News Articles:
${newsItems}

Current topic: "${cluster.topic}"

Please respond in JSON format:
{
  "topic": "improved topic title",
  "summary": "comprehensive summary of the cluster themes"
}`;
  }

  async callLLM(prompt) {
    const response = await fetch(`${this.settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI/ML news analyst. Provide concise, accurate analysis of technology news clusters. Always respond in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  parseEnhancementResponse(response) {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);
      return {
        topic: parsed.topic || null,
        summary: parsed.summary || null
      };
    } catch {
      // If JSON parsing fails, try to extract from text
      const topicMatch = response.match(/topic['":\s]*['"]([^'"]+)['"]/i);
      const summaryMatch = response.match(/summary['":\s]*['"]([^'"]+)['"]/i);
      
      return {
        topic: topicMatch ? topicMatch[1] : null,
        summary: summaryMatch ? summaryMatch[1] : null
      };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Settings panel management
  createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'llm-settings-panel';
    panel.className = 'settings-panel';
    panel.style.display = 'none';

    panel.innerHTML = `
      <div class="settings-content">
        <div class="settings-header">
          <h3>LLM Enhancement Settings</h3>
          <button class="close-btn" onclick="LLMTopicEnhancer.closePanel()">&times;</button>
        </div>
        
        <div class="settings-form">
          <div class="form-group">
            <label for="llm-api-url">API Base URL:</label>
            <input type="url" id="llm-api-url" value="${this.settings.apiBaseUrl}" placeholder="https://api.openai.com/v1">
          </div>
          
          <div class="form-group">
            <label for="llm-api-key">API Key:</label>
            <input type="password" id="llm-api-key" value="${this.settings.apiKey}" placeholder="Enter your API key">
          </div>
          
          <div class="form-group">
            <label for="llm-model">Model:</label>
            <select id="llm-model">
              <option value="gpt-3.5-turbo" ${this.settings.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
              <option value="gpt-4" ${this.settings.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
              <option value="claude-3-sonnet" ${this.settings.model === 'claude-3-sonnet' ? 'selected' : ''}>Claude 3 Sonnet</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="llm-batch-size">Batch Size:</label>
            <input type="number" id="llm-batch-size" value="${this.settings.batchSize}" min="1" max="10">
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="llm-enabled" ${this.settings.enabled ? 'checked' : ''}>
              Enable LLM Enhancement
            </label>
          </div>
        </div>
        
        <div class="settings-actions">
          <button class="primary" onclick="LLMTopicEnhancer.saveSettings()">Save Settings</button>
          <button class="secondary" onclick="LLMTopicEnhancer.testConnection()">Test Connection</button>
        </div>
        
        <div id="llm-status" class="status-message"></div>
      </div>
    `;

    return panel;
  }

  static showPanel() {
    const panel = document.getElementById('llm-settings-panel');
    if (panel) {
      panel.style.display = 'flex';
    }
  }

  static closePanel() {
    const panel = document.getElementById('llm-settings-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  static saveSettings() {
    const enhancer = window.llmEnhancer || new LLMTopicEnhancer();
    
    const settings = {
      apiBaseUrl: document.getElementById('llm-api-url').value,
      apiKey: document.getElementById('llm-api-key').value,
      model: document.getElementById('llm-model').value,
      batchSize: parseInt(document.getElementById('llm-batch-size').value),
      enabled: document.getElementById('llm-enabled').checked
    };

    if (enhancer.saveSettings(settings)) {
      LLMTopicEnhancer.showStatus('Settings saved successfully', 'success');
    } else {
      LLMTopicEnhancer.showStatus('Failed to save settings', 'error');
    }
  }

  static async testConnection() {
    const enhancer = window.llmEnhancer || new LLMTopicEnhancer();
    LLMTopicEnhancer.showStatus('Testing connection...', 'info');
    
    try {
      // Save current settings first
      LLMTopicEnhancer.saveSettings();
      
      if (!enhancer.isConfigured()) {
        throw new Error('Please configure API settings first');
      }

      // Test with a simple prompt
      await enhancer.callLLM('Test connection. Respond with {"status": "ok"}');
      LLMTopicEnhancer.showStatus('Connection successful!', 'success');
    } catch (error) {
      LLMTopicEnhancer.showStatus(`Connection failed: ${error.message}`, 'error');
    }
  }

  static showStatus(message, type = 'info') {
    const status = document.getElementById('llm-status');
    if (status) {
      status.textContent = message;
      status.className = `status-message ${type}`;
      
      if (type === 'success' || type === 'error') {
        setTimeout(() => {
          status.textContent = '';
          status.className = 'status-message';
        }, 3000);
      }
    }
  }
}

// Singleton instance
export const llmEnhancer = new LLMTopicEnhancer();

// Make available globally for onclick handlers
window.LLMTopicEnhancer = LLMTopicEnhancer;
window.llmEnhancer = llmEnhancer;