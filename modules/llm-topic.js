/**
 * LLM Enhancement:
 * - Batch sequential calls respecting batchSize
 * - Each cluster payload: titles + snippets
 * - Expects OpenAI chat completion style
 * - Graceful fallback: cluster._llmError if fails
 */
export async function runLLMEnhancement(clusters, cfg, onProgress){
  const todo = clusters.filter(c=>!c._llmEnhanced && !c._llmError);
  const total = todo.length;
  let done = 0;
  const batchSize = cfg.batchSize || 4;

  for(let i=0;i<todo.length;i += batchSize){
    const slice = todo.slice(i, i+batchSize);
    await Promise.all(slice.map(c=> enhanceOne(c, cfg).catch(()=>{})));
    done += slice.length;
    onProgress(done, total);
  }
}

async function enhanceOne(cluster, cfg){
  if(!cfg.apiKey || !cfg.apiBase || !cfg.model){
    cluster._llmError = 'missing-config';
    return;
  }
  const titles = cluster.items.map(it=>it.title);
  const snippets = cluster.items.map(it=>it.summary||'').slice(0,12);

  const systemPrompt = "你是资讯聚类总结助手。禁止使用以下夸张词：显著进展, 重大突破, significant advances, groundbreaking, huge leap。输出 JSON。";
  const userPayload = {
    titles,
    snippets,
    language: "zh",
    instructions: "为这些聚类新闻生成简洁 topic(<=16字)、40-60字客观摘要、关键要点数组(3-5项)、tags(3-6个)。"
  };

  try {
    const res = await fetch(`${cfg.apiBase.replace(/\/$/,'')}/chat/completions`, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role:'system', content: systemPrompt },
            { role:'user', content: JSON.stringify(userPayload)}
        ],
        temperature: 0.3
      })
    });

    if(!res.ok){
      cluster._llmError = 'http-'+res.status;
      return;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const json = safeParseJSON(content);
    if(!json || json.error){
      cluster._llmError = 'parse-error';
      return;
    }
    cluster.topic = json.topic_cn || json.topic || cluster.topic;
    cluster.summary = json.summary_cn || json.summary || cluster.summary;
    cluster.keyPoints = json.key_points_cn || json.keyPoints || cluster.keyPoints;
    cluster.tags = json.tags || cluster.tags;
    cluster._llmEnhanced = true;
  } catch(e){
    cluster._llmError = 'exception';
  }
}

function safeParseJSON(str){
  try {
    return JSON.parse(str.trim());
  } catch {
    // 尝试提取花括号
    const m = str.match(/\{[\s\S]*\}/);
    if(m){
      try { return JSON.parse(m[0]); } catch {}
    }
    return null;
  }
}
