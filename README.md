
# 机器视觉每日资讯

一个基于卡片式设计的机器视觉新闻网站，提供每日资讯浏览、标签筛选、PNG导出和手帐风学习卡片生成功能。

访问网站: **https://baggio200cn.github.io/-/**

## 🚀 Features Overview

| 功能 | 描述 |
|------|------|
| 聚类 (Clustering) | 基于 Jaccard Token 相似度的前端聚合，阈值可调，支持标题二次合并 |
| LLM 增强 | 可选批处理增强主题 / 摘要 / 关键点，失败不影响其他集群 |
| 学习卡片 | 按集群汇总多来源生成学习卡片，可复制 |
| 缓存 | localStorage 版本化缓存，参数或数据改变自动失效 |
| i18n | 基础语言切换 (zh / en) 占位 |
| Legacy 模式 | 保留旧平铺列表以便回退 |

## ⚙️ Quick Start

```bash
git clone https://github.com/Baggio200cn/mv-daily.git
cd mv-daily
npm install
npm run check          # lint + 数据校验
# 启动本地静态服务任选：npx serve . 或 VS Code Live Server
```

打开 `index.html` 看到聚类界面；`legacy-index.html` 为旧版本。

## 🔍 Clustering Parameters

| 阈值 | 集群数 (示例) | 说明 |
|------|---------------|------|
| 0.88 (默认) | 13 | 18 原始条目 → 13 集群 (~28% 减少) |
| 0.75 | 5 | 更激进的合并，演示上限 |

标题二次合并 (Title Merge) 针对代表标题相似度 > 0.92 的集群进行合并，减少残留微差异。

## 🤖 LLM Enhancement

在工具栏点击 “LLM 设置”：
- API Base
- API Key (仅存 localStorage，不上传)
- Model
- Batch Size (默认 4)

点击 “批量增强” 后显示进度：`已处理 X/Y`。失败的集群保留启发式摘要并标记错误。

## 🗃️ Caching

Key: `CLUSTER_CACHE_V1`

```json
{
  "hash": "<news_hash>",
  "params": { "threshold": 0.88, "titleMerge": true },
  "timestamp": 1736640000000,
  "clusters": [ ... ]
}
```

升级算法或结构时：将常量改为 `CLUSTER_CACHE_V2` 以强制失效。

## 🛠 Diagnostics

浏览器控制台：
```js
window.__CLUSTERS__           // 当前集群数组
window.__CLUSTER_DIAG__()     // { rawCount, clusterCount, enhanced, threshold, titleMerge }
```

## 🧪 Manual Test Checklist

(与 PR 描述一致，可勾选)

## 🧭 Roadmap

- 语义向量相似度 (embeddings)
- Web Worker 异步聚类
- 更细粒度增量更新
- 自动化测试 (Jest + Playwright)
- 多语言内容与翻译模型
## Clustering & LLM Enhancement (Unified Baseline)

| Metric | Value (示例) |
|--------|--------------|
| Raw Items | 18 |
| Clusters @ 0.88 | 13 |
| Clusters @ 0.75 | 5 |

使用 `window.__CLUSTER_DIAG__()` 进行调试。缓存键：`CLUSTER_CACHE_V1`；修改算法 / 结构时升级版本号。

### 手动测试
(与 PR 描述 Test Matrix 一致)。
本次最小可工作聚类基线：
- 新增/覆盖 index.html, app.js, card-generator.html, modules/* 与 data/news.json
- 功能：加载 -> 聚类 -> 主题/要点 -> 学习卡
