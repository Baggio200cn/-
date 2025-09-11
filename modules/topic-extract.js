const CFG_KEY = 'LLM_CONFIG_V1';

export function loadLLMConfig() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)) || null; } catch { return null; }
}
export function saveLLMConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

export async function runLLMEnhancement(clusters, config, onProgress=()=>{}) {
  if (!config || !config.apiBase || !config.apiKey || !config.model) {
    throw new Error('缺少 LLM 配置');
  }
  const pending = clusters.filter(c=>!c._llmEnhanced);
  const total = pending.length;
  let done = 0;
  const batchSize = Math.max(1, config.batchSize||4);

  while (pending.length) {
    const batch = pending.splice(0, batchSize);
    await Promise.all(batch.map(c=>enhanceOne(c, config).catch(e=>{
      console.error('LLM enhance error', e);
      c._llmError = true;
    })));
    done += batch.length;
    onProgress({done, total});
  }
}

async function enhanceOne(cluster, cfg) {
  const content = buildPrompt(cluster);
  const resp = await fetch(cfg.apiBase.replace(/\/+$/,'') + '/v1/chat/completions', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+cfg.apiKey
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {role:'system', content:'You are an assistant that condenses multiple news articles into a concise topic, summary (<=120 Chinese chars if CN else <=500 English chars) and 4-6 bullet key points.'},
        {role:'user', content}
      ],
      temperature: 0.3
    })
  });
  if (!resp.ok) throw new Error('HTTP '+resp.status);
  const data = await resp.json();
  const txt = data.choices?.[0]?.message?.content || '';
  parseLLMOutput(cluster, txt);
  cluster._llmEnhanced = true;
}

function buildPrompt(cluster) {
  const lines = cluster.sources.map((s,i)=>`[${i+1}] Title: ${s.title}\nSummary:${s.summary}`).join('\n');
  return `以下是同一主题的多条资讯，请输出 JSON：{ "topic": "...", "summary":"...", "keyPoints":["..."] }。资讯：\n${lines}`;
}

function parseLLMOutput(cluster, text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;
    const obj = JSON.parse(jsonMatch[0]);
    if (obj.topic) cluster.topic = obj.topic;
    if (obj.summary) cluster.summary = obj.summary;
    if (Array.isArray(obj.keyPoints)) cluster.keyPoints = obj.keyPoints.slice(0,8);
  } catch (e) {
    console.warn('解析 LLM 输出失败', e);
  }
}
