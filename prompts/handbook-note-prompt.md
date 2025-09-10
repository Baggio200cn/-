<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>学习卡片生成器 | 机器视觉每日资讯</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="stylesheet" href="styles/base.css?v=v4">
  <meta name="color-scheme" content="light only">
  <style>
    body { background:#f5f7fa; }
    .layout {
      display:flex; flex-wrap:wrap; gap:24px; padding:24px;
      max-width:1400px; margin:0 auto;
    }
    .panel {
      background:#ffffff; border-radius:16px;
      padding:20px 24px 28px;
      box-shadow:0 4px 14px -4px rgba(0,0,0,0.08),0 2px 6px -2px rgba(0,0,0,0.06);
      flex:1 1 460px; min-width:420px;
    }
    .panel h2 {
      margin:0 0 12px; font-size:18px; letter-spacing:.5px;
      font-weight:600; color:#0f2244; display:flex; align-items:center; gap:8px;
    }
    label.top-label {
      font-size:13px; font-weight:600; color:#334155; display:block; margin-top:8px;
    }
    select, textarea {
      width:100%; font-size:14px; border:1px solid #cbd5e1;
      border-radius:8px; padding:10px 12px; background:#fff; font-family:inherit;
    }
    textarea { min-height:120px; resize:vertical; }
    .btn-row { margin-top:16px; display:flex; gap:12px; flex-wrap:wrap; }
    button {
      cursor:pointer; border:none; border-radius:8px;
      font-size:14px; padding:10px 18px; font-weight:600;
      letter-spacing:.5px; display:inline-flex; align-items:center; gap:6px;
      background:#0d3c78; color:#fff; transition:background .25s;
    }
    button.secondary { background:#e2e8f0; color:#334155; }
    button.warning { background:#b45309; }
    button:hover { background:#154d95; }
    button.secondary:hover { background:#cbd5e1; }
    button:disabled { opacity:.5; cursor:not-allowed; }
    .selected-preview { margin-top:10px; }
    .card-preview-wrapper { width:100%; overflow:auto; }
    .status-line { margin-top:10px; font-size:12px; color:#475569; min-height:16px; }
  </style>
</head>
<body>
  <div class="layout">
    <div class="panel">
      <h2>选择新闻项目</h2>
      <label for="newsSelect" class="top-label">选择新闻:</label>
      <select id="newsSelect"></select>
      <div id="selectedPreview" class="selected-preview"></div>

      <label for="extraNotes" class="top-label" style="margin-top:16px;">补充说明（可选）:</label>
      <textarea id="extraNotes" placeholder="添加任何自定义说明或学习要点…"></textarea>

      <div class="btn-row">
        <button id="generateBtn">生成学习卡片</button>
        <button class="secondary" id="resetBtn">重置</button>
        <button class="secondary" id="translateBtn" title="首次点击会请求在线翻译接口">翻译为中文</button>
        <button class="secondary" id="toggleLangBtn" disabled>切换英文</button>
        <button class="secondary" id="backBtn" type="button" onclick="window.location='index.html'">返回首页</button>
        <button class="warning" id="forceReloadLogoBtn" title="若 Logo 缓存未刷新可点此">刷新 Logo</button>
      </div>
      <div class="status-line" id="statusLine"></div>
    </div>

    <div class="panel" style="max-width:560px;">
      <h2>生成的学习卡片</h2>
      <div class="card-preview-wrapper">
        <div id="cardContainer"></div>
      </div>
      <div class="btn-row" style="margin-top:20px;">
        <button id="downloadBtn" disabled>下载PNG</button>
        <button class="secondary" id="regenBtn" disabled>重新生成</button>
      </div>
    </div>
  </div>

  <script src="card-generator.js?v=v4"></script>
</body>
</html>
