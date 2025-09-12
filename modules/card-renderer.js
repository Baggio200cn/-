import { escapeHTML } from './news-utils.js';
import { ensureBilingualAndPrompt } from './bilingual.js';
import { generateStudyCardPrompt } from './prompt-template.js';
import { generateClusterImage } from './image-service.js';

const container = document.getElementById('clusters');

export function renderClusters(clusters){
  container.innerHTML = '';
  clusters.forEach(c=>{
    ensureBilingualAndPrompt(c);
    const div = document.createElement('div');
    div.className='cluster-card';
    const keyLine = (c.keyPointsZh||[]).slice(0,2).join(' / ');
    const llmBadge = c.translationStatus==='llm' ? '<span class="badge llm">LLM</span>' : '';
    const imgBadge = c.imageUrl ? '<span class="badge" style="background:#ffd7a1;">IMG</span>' : '';
    div.innerHTML = `
      <h3 style="margin:0 0 2px;">${escapeHTML(c.topicEn||'(No Topic)')} ${llmBadge} ${imgBadge}</h3>
      <div style="font-size:12px;color:#56606b;margin:0 0 4px;">${escapeHTML(c.topicZh||'')}</div>
      <div class="cluster-meta">${c.items.length} sources · ID: ${c.id}</div>
      <div style="font-size:12px;color:#333;line-height:1.4;">${escapeHTML(c.summaryZh || '')}</div>
      <div style="font-size:12px;color:#68707c;margin:4px 0;">${escapeHTML(keyLine)}</div>
      <div style="margin:4px 0 8px;">${(c.tags||[]).slice(0,8).map(t=>`<span class="badge">${escapeHTML(t)}</span>`).join('')}</div>
      <ul class="sources">${c.items.slice(0,6).map(it=>`<li>${escapeHTML(it.title)}</li>`).join('')}</ul>
      <div class="card-actions">
        <button class="btn-markdown">学习卡片</button>
        <button class="btn-image secondary">图片卡片</button>
        <button class="btn-llm secondary">${c.translationStatus==='llm' ? '再次增强' : 'LLM增强'}</button>
        ${c.imageUrl ? `<button class="btn-open-img secondary">查看图片</button>` : ''}
      </div>
    `;
    div.querySelector('.btn-markdown').onclick = ()=>{
      localStorage.setItem('selectedCluster', c.id);
      location.href='./card-generator.html?cluster='+encodeURIComponent(c.id);
    };
    div.querySelector('.btn-image').onclick = ()=> openPromptModal(c);
    div.querySelector('.btn-llm').onclick = ()=> {
      window.__PER_CLUSTER_ENHANCE__?.(c);
    };
    if(c.imageUrl){
      div.querySelector('.btn-open-img').onclick = ()=>{
        window.open(c.imageUrl, '_blank','noopener');
      };
    }
    container.appendChild(div);
  });
  mountPromptModalOnce();
}

export function updateStats({raw,clusters, llm}){
  const el=document.getElementById('stats');
  if(el) el.textContent = `Raw: ${raw} Clusters: ${clusters} LLM: ${llm}`;
}

/* ---------- Prompt Modal (带图片生成) ---------- */
let modalMounted = false;

function mountPromptModalOnce(){
  if(modalMounted) return;
  modalMounted = true;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="promptModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center;">
      <div style="width:720px;max-width:92%;background:#fff;border-radius:14px;padding:20px 24px 26px;box-shadow:0 6px 28px rgba(0,0,0,.25);max-height:92vh;overflow:auto;">
        <h3 style="margin:0 0 6px;font-size:18px;">图片学习卡片生成</h3>
        <div id="pmTitle" style="font-size:13px;color:#555;margin-bottom:6px;"></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <label style="font-size:12px;">Style
            <select id="pmStyle" style="margin-left:4px;">
              <option value="vintage-journal">Vintage</option>
              <option value="clean">Clean</option>
              <option value="tech-blue">Tech Blue</option>
              <option value="dark-neon">Dark Neon</option>
              <option value="paper-note">Paper Note</option>
            </select>
          </label>
          <span id="pmStatus" style="font-size:12px;color:#555;"></span>
        </div>
        <textarea id="pmPrompt" style="width:100%;height:230px;margin:10px 0 8px;font-size:13px;font-family:monospace;border:1px solid #c8d0d8;border-radius:6px;padding:8px;"></textarea>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;">
          <button id="pmGenerate">生成图片</button>
          <button id="pmSave" class="secondary">保存草稿</button>
          <button id="pmReset" class="secondary">重置模板</button>
          <button id="pmClose" class="secondary">关闭</button>
        </div>
        <div id="pmPreviewWrap" style="margin-top:16px;display:none;">
          <div style="font-size:12px;color:#444;margin-bottom:4px;">预览：</div>
          <img id="pmPreview" src="" style="max-width:100%;border:1px solid #dde2e8;border-radius:8px;"/>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const modal = document.getElementById('promptModal');
  const promptArea = document.getElementById('pmPrompt');
  const styleSel = document.getElementById('pmStyle');
  const statusEl = document.getElementById('pmStatus');

  document.getElementById('pmClose').onclick = ()=> modal.style.display='none';

  document.getElementById('pmGenerate').onclick = async ()=>{
    const cluster = modal._cluster;
    if(!cluster) return;
    cluster.promptFinal = promptArea.value;
    cluster.promptStatus = 'edited';
    persistCluster(cluster);
    statusEl.textContent = '生成中...';
    try {
      const cfg = loadImageCfg();
      const imageUrl = await generateClusterImage(cluster, cfg, {
        onStatus:(st)=> statusEl.textContent = '状态: '+st
      });
      document.getElementById('pmPreview').src = imageUrl;
      document.getElementById('pmPreviewWrap').style.display='block';
      statusEl.textContent = '完成';
      persistCluster(cluster);
      // 重新渲染主列表显示 IMG 徽标
      window.__RERENDER__?.();
    } catch(e){
      statusEl.textContent = '失败: '+e.message;
    }
  };

  document.getElementById('pmSave').onclick = ()=>{
    const cluster = modal._cluster;
    if(!cluster) return;
    cluster.promptFinal = promptArea.value;
    cluster.promptStatus = 'edited';
    persistCluster(cluster);
    statusEl.textContent = '草稿已保存';
    setTimeout(()=> statusEl.textContent='', 1200);
  };

  document.getElementById('pmReset').onclick = ()=>{
    const cluster = modal._cluster;
    if(!cluster) return;
    if(cluster.promptStatus==='edited' && !confirm('覆盖已编辑内容，继续？')) return;
    const stylePreset = mapSelectValueToStyle(styleSel.value);
    const { prompt } = generateStudyCardPrompt(cluster, { stylePreset });
    cluster.promptDraft = prompt;
    cluster.promptFinal = prompt;
    cluster.promptStatus='draft';
    cluster._lastStylePreset = stylePreset;
    promptArea.value = prompt;
    persistCluster(cluster);
    statusEl.textContent = '已重置';
    setTimeout(()=> statusEl.textContent='', 1000);
  };

  styleSel.onchange = ()=>{
    const cluster = modal._cluster;
    if(!cluster) return;
    if(cluster.promptStatus==='edited'){
      if(!confirm('已手动修改，切换风格将覆盖，继续？')){
        styleSel.value = cluster._lastStylePreset || 'vintage-journal';
        return;
      }
    }
    const stylePreset = mapSelectValueToStyle(styleSel.value);
    const { prompt } = generateStudyCardPrompt(cluster, { stylePreset });
    cluster.promptDraft = prompt;
    cluster.promptFinal = prompt;
    cluster.promptStatus='draft';
    cluster._lastStylePreset = stylePreset;
    promptArea.value = prompt;
    persistCluster(cluster);
    statusEl.textContent = '风格已应用';
  };
}

function openPromptModal(cluster){
  const modal = document.getElementById('promptModal');
  modal._cluster = cluster;
  const promptArea = document.getElementById('pmPrompt');
  document.getElementById('pmTitle').textContent = `${cluster.topicEn} / ${cluster.topicZh}`;
  const initial = cluster.promptFinal || cluster.promptDraft;
  promptArea.value = initial;
  document.getElementById('pmStyle').value = cluster._lastStylePreset || 'vintage-journal';
  document.getElementById('pmPreviewWrap').style.display = cluster.imageUrl ? 'block':'none';
  if(cluster.imageUrl){
    document.getElementById('pmPreview').src = cluster.imageUrl;
  }
  document.getElementById('pmStatus').textContent='';
  modal.style.display='flex';
}

function mapSelectValueToStyle(v){
  switch(v){
    case 'clean': return 'clean';
    case 'tech-blue': return 'tech-blue';
    case 'dark-neon': return 'dark-neon';
    case 'paper-note': return 'paper-note';
    default: return 'vintage-journal';
  }
}

function persistCluster(cluster){
  try {
    const raw = localStorage.getItem('CLUSTER_CACHE_V1');
    if(!raw) return;
    const obj = JSON.parse(raw);
    const idx = obj.clusters.findIndex(c=>c.id===cluster.id);
    if(idx>=0){
      obj.clusters[idx] = cluster;
      localStorage.setItem('CLUSTER_CACHE_V1', JSON.stringify(obj));
    }
  } catch(e){
    console.warn('[persistCluster] fail', e);
  }
}

function loadImageCfg(){
  const raw = localStorage.getItem('LLM_CFG');
  let cfg = {};
  if(raw){
    try { cfg = JSON.parse(raw); } catch {}
  }
  const img = localStorage.getItem('IMG_CFG');
  if(img){
    try { cfg.img = JSON.parse(img); } catch {}
  }
  return {
    imageProvider: cfg.img?.provider || 'openai-images',
    imageBaseURL: cfg.img?.baseURL || cfg.base || 'https://api.openai.com/v1',
    imageApiKey: cfg.img?.apiKey || cfg.key,
    imageModel: cfg.img?.model || 'gpt-image-1',
    size: cfg.img?.size || '1024x1280'
  };
}

// 外部可重新渲染
window.__RERENDER__ = ()=> {
  if(window.__CLUSTERS__) renderClusters(window.__CLUSTERS__);
};
