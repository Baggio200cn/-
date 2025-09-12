// bilingual.js
// 负责：为聚类补全中英字段 + 初始图片 Prompt（不依赖 LLM）
// 依赖：prompt-template.js 的 generateStudyCardPrompt

import { generateStudyCardPrompt } from './prompt-template.js';

const WORD_MAP = {
  'Multi-Vendor': '多厂商',
  'Vision': '视觉',
  'Updates': '更新',
  'Update': '更新',
  'AI': 'AI',
  'GPU': 'GPU',
  'Model': '模型',
  'Models': '模型',
  'Toolkit': '工具包',
  'Optimization': '优化',
  'Execution': '执行',
  'Lazy': '延迟',
  'Transformer': 'Transformer'
};

export function translateTopic(topicEn){
  if(!topicEn) return '';
  return topicEn.split(/\s+/).map(w=> WORD_MAP[w] || w).join(' ');
}

export function translateKeyPoint(en){
  if(!en) return '';
  return en
    .replace(/Vision Update$/,'视觉更新')
    .replace(/Vision Updates$/,'视觉更新')
    .replace(/Update$/,'更新')
    .replace(/Updates$/,'更新')
    .replace(/Breakthrough/i,'突破');
}

export function buildChineseSummary(cluster){
  const companies = collectCompanies(cluster);
  if(companies.length){
    return `包含 ${cluster.items.length} 条相关新闻，涉及：${companies.join(' / ')}。`;
  }
  return `包含 ${cluster.items.length} 条相关新闻。`;
}

function collectCompanies(c){
  const out = new Set();
  c.items.forEach(it=>{
    const m = it.title.match(/^(Google|NVIDIA|Intel|AWS|Apple|PyTorch|GitHub|OpenCV|Ultralytics|TensorFlow)\b/i);
    if(m) out.add(capitalize(m[1]));
  });
  return [...out];
}
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); }

/**
 * 确保 cluster 有双语字段 + 初始 prompt
 * - 不覆盖用户已手动编辑的 promptFinal
 */
export function ensureBilingualAndPrompt(c){
  if(!c.topicEn) c.topicEn = c.topic || '';
  if(!c.topicZh) c.topicZh = translateTopic(c.topicEn);

  if(!c.summaryEn) c.summaryEn = c.summary || '';
  if(!c.summaryZh) c.summaryZh = buildChineseSummary(c);

  if(!c.keyPointsEn) c.keyPointsEn = c.keyPoints || [];
  if(!c.keyPointsZh || !c.keyPointsZh.length){
    c.keyPointsZh = c.keyPointsEn.map(k=> translateKeyPoint(k));
  }

  if(!c.promptDraft){
    const { prompt } = generateStudyCardPrompt(c, { stylePreset:'vintage-journal', mode:'single' });
    c.promptDraft = prompt;
    if(!c.promptFinal) c.promptFinal = prompt;
    c.promptStatus = 'draft';
  }
}
