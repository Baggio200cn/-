
# 机器视觉每日资讯

一个基于卡片式设计的机器视觉新闻网站，提供每日资讯浏览、PNG导出和手帐风提示词生成功能。支持自动化RSS抓取和HTML解析。

访问网站: **https://baggio200cn.github.io/-/**

## 功能特性

### 📰 自动化新闻抓取 (Phase B)
- **RSS源支持**: arXiv cs.CV, NVIDIA Blog, Meta AI Blog, Google AI Blog, OpenAI Blog
- **HTML解析**: Fine Lens, Vision Lab Hub (可配置CSS选择器)
- **智能过滤**: 保留最近14天内资讯，按时间排序取最新10条
- **容错机制**: 单个来源失败不影响整体抓取，仅记录警告
- **自动化工作流**: 每日UTC 01:00自动运行，支持手动触发

### 🎨 增强卡片设计
- **纸质纹理**: CSS渐变生成的淡雅纸张背景
- **4px顶部色条**: 渐变色彩条增强视觉层次
- **12px圆角**: 现代化的卡片边角设计
- **混合标签风格**: 前1-2个标签为实心样式，其余为轮廓样式
- **悬停动效**: 平滑的3D悬浮效果

### 🏷️ 智能标识系统
- **自动检测**: company-logo.png → company-logo.svg → logo-placeholder.svg
- **回退机制**: 确保始终有合适的标识显示
- **统一品牌**: 网站头部和卡片水印一致展示

### 📥 高质量PNG导出
- **1080x1080分辨率**: 适合社交媒体分享的标准尺寸
- **2倍像素比**: 确保在高分辨率屏幕上清晰显示
- **完整水印**: 导出图片保留品牌标识和水印信息
- **UI优化**: 导出时自动隐藏操作按钮，保持纯净效果

### ✍️ 智能提示词生成器
- **深度链接**: 从新闻卡片直接跳转并预选对应内容
- **模板变量**: 支持 {{title}} {{source}} {{date}} {{summary}} {{tags}} 替换
- **一键复制**: 带有用户反馈的剪贴板复制功能
- **手帐风格**: 完整的中文手帐学习卡片设计指南

## 项目结构

```
├── index.html              # 主页 - 新闻卡片展示
├── prompt.html             # 提示词生成器页面
├── app.js                  # 主页逻辑 (Phase B 新增)
├── styles/
│   └── base.css           # 统一样式系统 (Phase B 新增)
├── assets/                 # 资源文件夹
│   ├── company-logo.png    # 公司标识（优先级最高）
│   ├── company-logo.svg    # SVG格式标识（备用）
│   └── logo-placeholder.svg # 占位符标识（最终回退）
├── data/
│   ├── news.json          # 新闻数据文件
│   └── sources.json       # 数据源配置 (Phase B 新增)
├── scripts/
│   └── update-news.mjs    # 自动抓取脚本 (Phase B 新增)
├── prompts/
│   └── handbook-note-prompt.md # 手帐风提示词模板
├── .github/workflows/
│   ├── pages.yml          # GitHub Pages 部署
│   └── update-news.yml    # 自动新闻更新 (Phase B 新增)
└── README.md
```

## 自动抓取配置

### 数据源配置 (sources.json)

系统支持RSS和HTML两种抓取方式，通过 `data/sources.json` 进行配置：

```json
{
  "sources": [
    {
      "id": "arxiv-cs-cv",
      "name": "arXiv cs.CV", 
      "type": "rss",
      "url": "http://export.arxiv.org/rss/cs.CV",
      "enabled": true,
      "category": "research"
    },
    {
      "id": "fine-lens",
      "name": "Fine Lens",
      "type": "html",
      "url": "https://finelens.com/",
      "enabled": true,
      "category": "news",
      "selectors": {
        "container": ".post-card, .post",
        "title": "h2 a, .post-title a",
        "link": "h2 a, .post-title a",
        "date": "time, .post-date", 
        "excerpt": ".excerpt, .post-excerpt"
      }
    }
  ],
  "settings": {
    "maxItems": 10,
    "daysToKeep": 14,
    "sortBy": "date",
    "sortOrder": "desc"
  }
}
```

### 默认启用的来源
- ✅ **arXiv cs.CV**: 计算机视觉领域最新论文
- ✅ **NVIDIA Blog**: NVIDIA官方技术博客 
- ✅ **Meta AI Blog**: Meta人工智能研究博客
- ✅ **Google AI Blog**: Google AI官方博客
- ✅ **OpenAI Blog**: OpenAI官方博客
- ✅ **Fine Lens**: 机器视觉行业资讯 (HTML解析)
- ✅ **Vision Lab Hub**: 视觉技术实验室资讯 (HTML解析)

### 默认禁用的来源 (可手动启用)
- ❌ **Financial Times Tech**: 需要订阅访问
- ❌ **Accio**: 需要验证可用性
- ❌ **PapersWithCode Vision**: API限制

**启用方法**: 编辑 `data/sources.json`，将对应来源的 `"enabled"` 字段设为 `true`

## 工作流说明

### 自动更新工作流

系统配置了GitHub Actions自动化工作流 (`.github/workflows/update-news.yml`):

- **定时运行**: 每日UTC 01:00自动执行
- **手动触发**: 支持在GitHub Actions页面手动运行
- **智能提交**: 仅在检测到内容变化时才提交更新
- **依赖管理**: 动态安装rss-parser和jsdom，不污染仓库

### 工作流执行逻辑

1. **依赖安装**: `npm install rss-parser jsdom`
2. **数据抓取**: 运行 `scripts/update-news.mjs`
3. **变更检测**: 检查 `data/news.json` 是否有更新
4. **自动提交**: 如有变更则提交到仓库主分支
5. **部署触发**: 自动触发GitHub Pages重新部署

### 手动运行脚本

本地开发时可手动运行更新脚本：

```bash
# 安装依赖
npm install rss-parser jsdom

# 运行更新脚本
node scripts/update-news.mjs

# 脚本退出码
# 0: 成功更新 (有变化)
# 1: 执行出错
# 2: 成功运行 (无变化)
```

## 安装和使用

### 1. 品牌标识设置

将您的公司标识放置在以下位置（建议尺寸：适合32px高度）：

```bash
# 推荐：PNG格式
assets/company-logo.png

# 或者：SVG格式  
assets/company-logo.svg
```

如果没有提供公司标识，系统会自动使用内置的占位符图标。

### 2. 新闻数据配置

编辑 `data/news.json` 文件，添加您的新闻内容：

```json
{
  "id": 1,
  "title": "新闻标题",
  "url": "https://example.com/news-url",
  "source": "新闻来源",
  "date": "2024-01-15T08:30:00Z",
  "summary": "2-4句话的新闻摘要，控制在400-420字符...",
  "tags": ["标签1", "标签2", "标签3"],
  "zh": null
}
```

### 3. 自定义数据源

要添加新的RSS或HTML数据源，编辑 `data/sources.json`：

```json
{
  "id": "custom-source",
  "name": "自定义来源",
  "type": "rss", // 或 "html"
  "url": "https://example.com/feed.xml",
  "enabled": true,
  "category": "custom",
  // HTML类型需要额外配置选择器
  "selectors": {
    "container": ".article-item",
    "title": ".title a",
    "link": ".title a", 
    "date": ".publish-date",
    "excerpt": ".summary"
  }
}
```

### 4. 本地开发

由于使用了fetch API，需要通过HTTP服务器运行：

```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx serve .

# 或使用PHP
php -S localhost:8000
```

然后访问 `http://localhost:8000`

## 故障排查

### 抓取问题诊断

如果自动抓取没有获取到内容：

1. **检查工作流日志**: 在GitHub Actions页面查看详细执行日志
2. **验证源URL**: 确保RSS源或HTML页面可正常访问
3. **调试CSS选择器**: 对于HTML源，检查选择器是否匹配页面结构
4. **网络问题**: 某些源可能有访问限制或需要特殊headers

### 常见问题

**Q: 为什么某些来源没有抓取到内容？**
A: 检查 `sources.json` 中对应来源的 `enabled` 字段，确保设为 `true`。部分来源可能需要特殊配置或存在访问限制。

**Q: HTML解析返回0条结果怎么办？**
A: 检查网站结构是否发生变化，更新 `selectors` 中的CSS选择器。可以在浏览器开发者工具中验证选择器的正确性。

**Q: 工作流运行但没有提交更新？**
A: 这是正常现象，表示抓取到的内容与现有数据相同。系统只在检测到实际变化时才会提交更新。

## 水印与品牌

每个新闻卡片都会在右下角显示水印，包含：
- 品牌标识（16px高度，带有模糊背景效果）
- "机器视觉" 文字标识
- 半透明白色背景和边框
- 导出PNG时水印会完整保留

## 提示词生成器

### 模板定制

编辑 `prompts/handbook-note-prompt.md` 文件来自定义提示词模板：

- 支持变量替换：`{{title}}`, `{{source}}`, `{{date}}`, `{{summary}}`, `{{tags}}`, `{{customNotes}}`
- 包含详细的使用说明和AI引擎参数建议
- 适用于ChatGPT、Claude、文心一言等主流AI模型

### 深度链接使用

从新闻卡片跳转到提示词生成器：
```html
<a href="prompt.html?id=123">生成提示词</a>
```

系统会自动预选对应的新闻项目，提升用户体验。

## 技术栈

- **前端框架**: 纯HTML/CSS/JavaScript
- **样式系统**: 现代CSS Grid和Flexbox布局，CSS变量
- **图片导出**: html-to-image库 (CDN加载)
- **字体**: 系统默认字体栈，优化中文显示
- **数据抓取**: rss-parser + jsdom (Node.js)
- **自动化**: GitHub Actions工作流
- **数据格式**: JSON格式，符合REST API规范

## 浏览器兼容性

- Chrome 60+
- Firefox 55+  
- Safari 12+
- Edge 79+

## 部署

### GitHub Pages

本项目自动部署到GitHub Pages，通过GitHub Actions处理：

1. 推送代码到main分支
2. 自动触发部署工作流
3. 网站可通过 https://baggio200cn.github.io/-/ 访问

### 自定义部署

由于是静态网站，可以部署到任何支持静态托管的平台：

- Netlify
- Vercel  
- Firebase Hosting
- AWS S3
- 阿里云OSS

## 免责声明

### 版权声明

本网站仅聚合和展示来自公开RSS源和网站的**标题和官方短摘要**，不抓取全文内容。所有新闻内容的版权归原始发布网站和作者所有。

### 内容来源

- **RSS源**: 直接使用各网站提供的公开RSS feeds
- **HTML解析**: 仅解析公开页面的列表信息，不跟踪详情页
- **摘要策略**: 使用官方提供的短摘要或首段内容，控制在400-420字符
- **无AI生成**: 不使用LLM对原始内容进行再加工或生成

### 使用条款

1. 本服务仅供学习和研究目的使用
2. 用户应遵守各原始网站的版权和使用条款
3. 如需引用具体内容，请访问原始文章页面
4. 如有版权问题，请联系我们及时处理

### 联系方式

如果您是内容原始发布者，对本站的内容聚合有任何疑问或要求删除，请通过GitHub Issues联系我们，我们会及时处理。

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
