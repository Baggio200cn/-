import { LLMService } from './llm-service.js';
import { ensureBilingualAndPrompt } from './bilingual.js';
import { generateStudyCardPrompt } from './prompt-template.js';

export async function enhanceClusters(clusters, options){
  const {
    provider='openai',
    baseURL,
    apiKey,
    model,
    temperature=0.3,
    maxConcurrent=2,
    onProgress
  } = options;

  const svc = new LLMService({
    provider, baseURL, apiKey, model, maxConcurrent
  });

  let done = 0;
  const total = clusters.length;

  // 顺序 / 并发控制通过 svc.enqueue
  const promises = clusters.map(cluster=>{
    return svc.enqueue(async ()=>{
      if(cluster.translationStatus === 'llm') {
        done++; onProgress?.(done,total, cluster.id, 'skip'); return cluster;
      }

      ensureBilingualAndPrompt(cluster); // 确保初始字段

      const userPrompt = buildUserPrompt(cluster);
      const systemPrompt = 'You are a bilingual technical summarizer and prompt engineer. Output ONLY strict JSON as requested.';

      let json;
      try {
        json = await svc.chatJSON({
          system: systemPrompt,
          user: userPrompt,
          temperature
        });
      } catch(e){
        cluster._llmError = e.message;
        done++; onProgress?.(done,total, cluster.id, 'error', e.message);
        return cluster;
      }

      applyEnhancement(cluster, json);
      cluster.translationStatus = 'llm';
      cluster._llmEnhanced = true;

      done++; onProgress?.(done,total, cluster.id, 'ok');
      return cluster;
    });
  });

  await Promise.all(promises);
  return clusters;
}

function buildUserPrompt(cluster){
  const lines = [];
  lines.push(`Topic (EN): ${cluster.topicEn || cluster.topic || ''}`);
  lines.push(`Current Chinese Topic: ${cluster.topicZh || ''}`);
  lines.push(`English Summary: ${cluster.summaryEn || ''}`);
  lines.push(`Chinese Summary (heuristic): ${cluster.summaryZh || ''}`);
  lines.push(`English Key Points (original): ${(cluster.keyPointsEn||[]).join(' | ')}`);
  lines.push(`Chinese Key Points (heuristic): ${(cluster.keyPointsZh||[]).join(' | ')}`);
  lines.push('Articles:');
  cluster.items.slice(0,8).forEach((it,i)=>{
    lines.push(`${i+1}. ${it.title}`);
  });

  lines.push(`
TASK:
1. Refine Chinese topic (自然简洁) -> topicZh
2. Concise improved Chinese summary (<=60汉字) -> summaryZh
3. Refine up to 4 English key points -> keyPointsEnRefined
4. Provide aligned Chinese key points -> keyPointsZh
5. Improve English image prompt (clarity, keep constraints) -> promptImproved
6. Optional insights -> notes

Return JSON keys exactly:
{
 "topicZh": "",
 "summaryZh": "",
 "keyPointsEnRefined": [],
 "keyPointsZh": [],
 "promptImproved": "",
 "notes": ""
}
NO commentary.`);

  return lines.join('\n');
}

function applyEnhancement(cluster, json){
  if(json.topicZh) cluster.topicZh = json.topicZh;
  if(json.summaryZh) cluster.summaryZh = json.summaryZh;
  if(Array.isArray(json.keyPointsEnRefined) && json.keyPointsEnRefined.length){
    cluster.keyPointsEn = json.keyPointsEnRefined;
  }
  if(Array.isArray(json.keyPointsZh) && json.keyPointsZh.length){
    cluster.keyPointsZh = json.keyPointsZh;
  }
  if(json.promptImproved){
    cluster.promptDraft = json.promptImproved;
    if(!cluster.promptFinal || cluster.promptStatus !== 'edited'){
      cluster.promptFinal = json.promptImproved;
    }
  } else {
    // Fallback：重新用模板生成
    const { prompt } = generateStudyCardPrompt(cluster, { stylePreset: cluster._lastStylePreset || 'vintage-journal' });
    cluster.promptDraft = cluster.promptDraft || prompt;
  }
  cluster._llmJsonRaw = json;
}
