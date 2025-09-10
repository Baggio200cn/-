# 机器视觉每日资讯（精简版 Phase C）

## 功能概述
- 90 天滚动窗口聚合（`WINDOW_DAYS`，默认 90）
- 国际来源白名单过滤（排除非白名单来源）
- 多标签 AND 筛选 + URL 深链
- 内容变更才生成归档快照（保留 `ARCHIVE_MAX = 60`）
- 学习卡片生成器（`prompt.html`）→ 直接生成“手帐风”卡片并导出 PNG
- Logo 版本缓存刷新（`BUILD_VERSION` 查询参数）
- 纯静态前端 + 轻量脚本，易维护

## 环境变量
| 变量 | 默认 | 说明 |
|------|------|------|
| `WINDOW_DAYS` | 90 | 资讯显示时间窗口（天） |
| `ARCHIVE_MAX` | 60 | 归档快照最大保留数量 |

## 来源白名单（示例清单）
```
NVIDIA, NVIDIA Blog, NVIDIA Developer, OpenCV, OpenCV Team, PyTorch,
Meta AI, Apple, Apple ML, Intel, AMD, Google AI, Hugging Face,
GitHub Release, Ultralytics, TensorFlow, AWS ML, Microsoft AI
```
修改：在 `scripts/update-news.mjs` 中调整 `allowedSources` 集合。

## 更新脚本运行
```bash
node scripts/update-news.mjs
# 或自定义窗口：
WINDOW_DAYS=30 node scripts/update-news.mjs
```

退出码含义：
- `0`：`news.json` 发生变化并已写入，同时生成/更新归档
- `2`：无数据变化（未写入，未生成快照）
- `1`：执行出错

## 数据与归档结构
```
data/
  news.json                  # 当前窗口（≤ WINDOW_DAYS）全部条目
  archive/
    index.json               # 归档索引（按日期逆序 + 每日条目数）
    YYYY-MM-DD.json          # 当天生成的完整窗口快照
```
仅在内容（序列化 JSON）改变时才创建当天快照；超过 `ARCHIVE_MAX` 会删除最旧的多余文件。

## 标签筛选与深链
- 首页多标签 AND：  
  `index.html?tags=AI芯片,H200`
- 归档指定日期 + 标签：  
  `archive.html?date=2025-09-10&tags=AI芯片,H200`
- 学习卡片加载指定条目（当前或归档）：  
  - 当前数据：`prompt.html?id=<新闻ID>`  
  - 指定归档：`prompt.html?id=<新闻ID>&date=2025-09-10`

## 学习卡片生成器（prompt.html）
流程：
1. 选择资讯条目（支持从归档加载）
2. 填写可选“补充笔记”
3. 右侧实时预览“手帐风”卡片
4. 一键导出 PNG（固定宽度 1080px，2x 像素比）

卡片内容结构：
- 标题（大字）
- 来源 + 日期
- 摘要
- 标签（前 2 实心，其余描边）
- 补充笔记（存在时显示单独块）
- 底部右下角水印（Logo + “机器视觉”）

## Logo 缓存刷新
相关 JS 中统一：
```js
const BUILD_VERSION = 'v3';
```
当替换 Logo 文件后，递增版本号即可强制客户端重新拉取（通过 `?v=v3`）。

Logo 回退顺序：
1. `assets/company-logo.svg`
2. `assets/company-logo.png`
3. `assets/logo-placeholder.svg`

## 主要文件说明
| 文件 | 作用 |
|------|------|
| `scripts/update-news.mjs` | 聚合 + 窗口过滤 + 白名单 + 快照归档 |
| `scripts/sources-aggregate.mjs` | （需实现）统一抓取各来源返回数组 |
| `index.html` / `app.js` | 首页 + 标签过滤 + 卡片导出 |
| `archive.html` / `archive.js` | 归档浏览 + 日期切换 + 标签过滤 |
| `prompt.html` / `card-generator.js` | 学习卡片生成与导出 |
| `styles/base.css` | 统一样式（卡片 / 标签 / 布局） |
| `assets/logo-placeholder.svg` | 占位 Logo |
| `README.md` | 文档说明 |

## 数据模型（示例）
```jsonc
{
  "id": "unique-id",
  "title": "标题",
  "source": "OpenCV",
  "date": "2025-09-10T08:30:00Z",
  "summary": "简要摘要……",
  "tags": ["AI", "Vision"],
  "url": "https://example.com/post"
}
```

## 可选增强方向
- 关键词搜索 / 前端模糊匹配
- 自动摘要 / LLM 要点抽取
- 批量导出学习卡片
- Service Worker 离线缓存

## 常见问题（FAQ）
1. 看不到新 Logo？  
   提高 `BUILD_VERSION`，并清除浏览器缓存或使用匿名窗口。
2. 为什么今天没有新增快照？  
   内容序列化后与前一版本完全一致 → 退出码 2 → 不生成快照。
3. 标签过滤为空？  
   确认 URL 中 `tags=` 参数是否正确 & 是否存在大小写差异。

## License
MIT

---
如需英文版 README 或想添加“贡献指南”，欢迎再提。
