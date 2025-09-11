// Heuristic topic, summary, keyPoints, tags extraction (fallback when no LLM)

const BANNED_WORDS = [
  "显著进展", "重大突破", "significant advances", "groundbreaking", "huge leap"
];

const STOP_WORDS = [
  // English
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "up", "about", "into", "through", "during", "before", "after", "above", "below",
  "as", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "must", "can",
  // Chinese
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "个", "上", "也", "为",
  "出", "来", "时", "以", "用", "和", "与", "或", "但", "这", "那", "些", "中", "下", "而"
];

export function buildTopicAndSummary(cluster) {
  if (!cluster.sources || cluster.sources.length === 0) return;

  const allTexts = cluster.sources.map(s => `${s.title} ${s.summary}`).join(' ');
  const tokens = tokenize(allTexts);
  const frequentTokens = getFrequentTokens(tokens);
  
  // Build topic (max 18 chars for Chinese, 30 for English)
  cluster.topic = buildTopic(frequentTokens, cluster.sources);
  
  // Build summary (40-60 chars)
  cluster.summary = buildSummary(cluster.sources, frequentTokens);
  
  // Build key points (up to 5)
  cluster.keyPoints = buildKeyPoints(cluster.sources);
  
  // Ensure HTML escaping
  cluster.topic = escapeHtml(cluster.topic);
  cluster.summary = escapeHtml(cluster.summary);
  cluster.keyPoints = cluster.keyPoints.map(point => escapeHtml(point));
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/gi, ' ')
    .split(/\s+/)
    .filter(token => 
      token.length >= 2 && 
      !STOP_WORDS.includes(token) &&
      !BANNED_WORDS.some(banned => token.includes(banned.toLowerCase()))
    );
}

function getFrequentTokens(tokens) {
  const freq = {};
  tokens.forEach(token => {
    freq[token] = (freq[token] || 0) + 1;
  });
  
  return Object.entries(freq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([token]) => token);
}

function buildTopic(frequentTokens, sources) {
  // Try to use most frequent meaningful token + source context
  const sourceNames = [...new Set(sources.map(s => s.source || ''))].filter(Boolean);
  const mainSource = sourceNames.length === 1 ? sourceNames[0] : '';
  const mainToken = frequentTokens.find(token => 
    !['technology', 'computer', 'vision', 'ai', 'announces', 'breakthrough'].includes(token)
  ) || frequentTokens[0] || 'News';
  
  let topic = mainSource ? `${mainSource} ${mainToken}` : mainToken;
  
  // Ensure proper length limits
  const isChinese = /[\u4e00-\u9fff]/.test(topic);
  const maxLen = isChinese ? 18 : 30;
  
  if (topic.length > maxLen) {
    topic = topic.substring(0, maxLen - 2) + '...';
  }
  
  return topic;
}

function buildSummary(sources, frequentTokens) {
  const uniqueSources = [...new Set(sources.map(s => s.source))].filter(Boolean);
  const count = sources.length;
  const sourceText = uniqueSources.length <= 3 ? 
    uniqueSources.join(', ') : 
    `${uniqueSources.slice(0, 2).join(', ')} 等 ${uniqueSources.length} 家`;
  
  const mainTopic = frequentTokens.slice(0, 3).join(' ');
  
  let summary = `${sourceText} 发布了 ${count} 条关于 ${mainTopic} 的资讯`;
  
  // Ensure length is 40-60 chars
  if (summary.length > 60) {
    summary = summary.substring(0, 57) + '...';
  } else if (summary.length < 40) {
    summary += '，涵盖最新技术进展';
  }
  
  return summary;
}

function buildKeyPoints(sources) {
  const points = [];
  
  // Extract first sentence or meaningful part from each unique source
  const seen = new Set();
  for (const source of sources) {
    if (points.length >= 5) break;
    
    const key = `${source.source}-${source.title.substring(0, 20)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    const summary = source.summary || '';
    const firstSentence = summary.split(/[.。！!？?]/, 1)[0];
    
    if (firstSentence && firstSentence.length > 10) {
      let point = firstSentence.trim();
      if (point.length > 80) {
        point = point.substring(0, 77) + '...';
      }
      points.push(point);
    }
  }
  
  // Fallback if no good points found
  if (points.length === 0) {
    points.push(`${sources.length} 条相关资讯涵盖机器视觉技术进展`);
  }
  
  return points;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
