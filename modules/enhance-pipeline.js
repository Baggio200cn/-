import { LLMService } from './llm-service.js';
import { ensureBilingualAndPrompt } from './bilingual.js';
import { generateStudyCardPrompt } from './prompt-template.js';
import {
  ENHANCEMENT_SCHEMA,
  buildSchemaReturnSection,
  validateEnhancementJson,
  listSchemaHumanReadable
} from './enhance-schema.js';

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

  const promises = clusters.map(cluster=>{
    return svc.enqueue(async ()=>{
      if(cluster.translationStatus === 'llm') {
        done++; onProgress?.(done,total, cluster.id, 'skip'); return cluster;
      }

      ensureBilingualAndPrompt(cluster);

      const userPrompt = buildUserPrompt(cluster);
      const systemPrompt =
        'You are a bilingual technical summarizer & prompt engineer. Output ONLY valid JSON. ' +
        'Schema fields:\n'+listSchemaHumanReadable();

      let rawJson;
      try {
        rawJson = await svc.chatJSON({
          system: systemPrompt,
            user: userPrompt,
          temperature
        });
      } catch(e){
        cluster._llmError = e.message;
        done++; onProgress?.(done,total, cluster.id, 'error', e.message);
        return cluster;
      }

      const { normalizedJson, warnings } = validateEnhancementJson(rawJson);
      if(warnings.length){
        cluster._schemaWarnings = warnings;
      }

      applyEnhancement(cluster, normalizedJson);
      cluster.translationStatus = 'llm';
      cluster._llmEnhanced = true;
      cluster._llmJsonRaw = rawJson;

      done++; onProgress?.(done,total, cluster.id, warnings.length?'warn':'ok');
      return cluster;
    });
  });

  await Promise.all(promises);
  return clusters;
}

function buildUserPrompt(cluster){
  const returnSection = buildSchemaReturnSection();

  const articles = cluster.items.slice(0,8).map((it,i)=> `${i+1}. ${it.title}`).join('\n');

  return `
Topic (EN): ${cluster.topicEn || cluster.topic || ''}
Current Chinese Topic: ${cluster.topicZh || ''}
English Summary: ${cluster.summaryEn || ''}
Chinese Summary (heuristic): ${cluster.summaryZh || ''}
English Key Points (original): ${(cluster.keyPointsEn||[]).join(' | ')}
Chinese Key Points (heuristic): ${(cluster.keyPointsZh||[]).join(' | ')}

Articles:
${articles}

TASK:
1. Refine Chinese topic -> topicZh (简洁自然 ≤12字)
2. Improved concise Chinese summary -> summaryZh (≤60汉字)
3. Refine English key points (max 4) -> keyPointsEnRefined
4. Provide aligned Chinese key points -> keyPointsZh
5. Improve the English image prompt (clarity, keep constraints) -> promptImproved
6. Optional suggestions -> notes

Return JSON ONLY with keys exactly like:
${returnSection}

No commentary, no extra keys, no markdown fences.
`;
}

function applyEnhancement(cluster, json){
  // 映射标准化后的字段
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
    const { prompt } = generateStudyCardPrompt(cluster, { stylePreset: cluster._lastStylePreset || 'vintage-journal' });
    cluster.promptDraft = cluster.promptDraft || prompt;
  }
  if(json.notes) cluster._llmNotes = json.notes;
}
