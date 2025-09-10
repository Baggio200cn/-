
# 机器视觉每日资讯

一个基于卡片式设计的机器视觉新闻网站，提供自动化新闻聚合、PNG导出和手帐风提示词生成功能。

访问网站: **https://baggio200cn.github.io/-/**

## 🚀 功能特性

### 📰 自动化新闻聚合
- **多源支持**: 同时支持RSS和HTML源的新闻抓取
- **智能去重**: 基于URL和标题的重复内容过滤
- **定时更新**: 每日UTC 01:00自动抓取最新资讯
- **质量控制**: 智能摘要清理和长度优化
- **时间窗口**: 默认14天内的新闻，可环境变量调整

### 🎨 现代化UI设计
- **主题变量**: 基于CSS变量的统一设计系统
- **纸质纹理**: 温暖的手帐风背景效果
- **响应式布局**: 完美适配桌面和移动设备
- **无障碍支持**: 符合WCAG标准的语义化HTML
- **平滑动画**: 优雅的悬停和交互效果

### 📥 高质量PNG导出
- **固定尺寸**: 标准1080x1080像素输出
- **高分辨率**: 2倍像素比，确保清晰度
- **包含水印**: 自动添加品牌标识和文字水印
- **顶部装饰**: 4px品牌色顶部条带
- **智能命名**: 基于新闻标题的文件名生成

### 🔗 深度链接集成
- **无缝跳转**: 从首页卡片直接跳转到提示词生成器
- **预选支持**: URL参数 `?id=` 自动选择对应新闻
- **平滑体验**: 智能滚动和状态保持

### ✍️ 手帐风提示词生成器
- **完整模板**: 专业的手帐风学习卡片Prompt模板
- **变量替换**: 自动替换新闻标题、来源、日期、摘要、标签
- **自定义扩展**: 支持用户添加补充说明
- **一键复制**: 便捷的剪贴板操作
- **AI引擎优化**: 针对主流AI工具的参数建议

### 🤖 自动抓取工作流
- **GitHub Actions**: 基于GitHub Actions的自动化部署
- **智能检测**: 仅在内容变化时提交更新
- **错误处理**: 优雅的错误处理和日志记录
- **手动触发**: 支持workflow_dispatch手动执行
- **最小依赖**: 仅使用必要的npm包

## 📁 项目结构

```
├── index.html              # 主页 - 新闻卡片展示
├── prompt.html             # 提示词生成器页面
├── app.js                  # 主应用逻辑
├── styles/
│   └── base.css           # 统一样式表和主题变量
├── assets/                 # 资源文件夹
│   ├── company-logo.png    # 公司标识（优先级最高）
│   ├── company-logo.svg    # SVG格式标识（备用）
│   └── logo-placeholder.svg # 占位符标识（最终回退）
├── data/
│   ├── news.json          # 新闻数据文件
│   └── sources.json       # 新闻源配置文件
├── scripts/
│   └── update-news.mjs    # 新闻更新脚本
├── prompts/
│   └── handbook-note-prompt.md # 手帐风提示词模板
├── .github/workflows/
│   └── update-news.yml    # 自动更新工作流
└── README.md              # 项目说明文档
```

## ⚙️ 自动抓取工作流

### 工作流配置
- **调度**: 每日UTC 01:00自动执行
- **手动触发**: 支持GitHub界面手动执行
- **环境**: Ubuntu最新版本，Node.js 20
- **依赖**: 仅安装rss-parser和jsdom

### 执行流程
1. 检出代码库
2. 设置Node.js环境
3. 安装必要依赖
4. 执行新闻更新脚本
5. 检测数据变化
6. 自动提交和推送（如有变化）

### 错误处理
- 单个源失败不影响其他源
- 网络超时自动重试
- 详细的控制台日志输出
- 优雅降级和错误恢复

## 📊 sources.json 配置文档

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `label` | string | ✅ | 显示名称 |
| `type` | string | ✅ | 源类型：`rss` 或 `html` |
| `url` | string | ✅ | 源URL地址 |
| `enabled` | boolean | ✅ | 是否启用 |
| `maxPerRun` | number | ✅ | 每次抓取最大条数 |
| `tags` | array | ✅ | 默认标签列表 |
| `selectors` | object | - | HTML源的选择器配置 |

### HTML选择器配置
```json
{
  "selectors": {
    "item": ".news-item",      // 新闻项容器选择器
    "title": ".title, h2, h3", // 标题选择器
    "link": "a",               // 链接选择器
    "date": ".date, .time",    // 日期选择器
    "summary": ".summary, p"   // 摘要选择器
  }
}
```

### 示例配置
```json
{
  "id": "arxiv-cs-cv",
  "label": "arXiv Computer Vision",
  "type": "rss",
  "url": "http://export.arxiv.org/rss/cs.CV",
  "enabled": true,
  "maxPerRun": 3,
  "tags": ["学术论文", "计算机视觉", "arXiv"]
}
```

## 🔧 启用/禁用新闻源

### 修改sources.json
1. 打开 `data/sources.json` 文件
2. 找到要修改的新闻源
3. 修改 `enabled` 字段为 `true`（启用）或 `false`（禁用）
4. 提交更改

### 当前源状态
**已启用的源**:
- arXiv Computer Vision (RSS)
- NVIDIA Developer Blog (RSS)
- Meta AI Blog (RSS)
- Google AI Blog (RSS)
- OpenAI Blog (RSS)
- Fine Lens 精镜 (HTML)
- Vision Lab Hub (HTML)

**已禁用的源**:
- Financial Times Technology (RSS)
- Accio Tech News (HTML)
- Papers with Code Computer Vision (HTML)

## 🚀 手动运行指南

### 本地运行新闻更新脚本
```bash
# 安装依赖
npm install rss-parser jsdom

# 运行更新脚本
node scripts/update-news.mjs

# 设置环境变量（可选）
WINDOW_DAYS=14 MAX_ITEMS=10 node scripts/update-news.mjs
```

### 环境变量说明
- `WINDOW_DAYS`: 抓取时间窗口（默认14天）
- `MAX_ITEMS`: 最大保留条数（默认10条）

### 手动触发GitHub工作流
1. 访问项目的GitHub页面
2. 点击 "Actions" 选项卡
3. 选择 "Update News" 工作流
4. 点击 "Run workflow" 按钮

## 🎯 Logo & 水印系统

### 自动检测逻辑
系统按以下优先级自动检测logo：
1. `assets/company-logo.png` (最高优先级)
2. `assets/company-logo.svg` (SVG备用)
3. `assets/logo-placeholder.svg` (默认占位符)

### 替换公司Logo
1. 将您的logo文件命名为 `company-logo.png` 或 `company-logo.svg`
2. 放置到 `assets/` 目录
3. 系统将自动使用您的logo

### 水印位置
- **网站显示**: 卡片右下角
- **PNG导出**: 包含在导出图片中
- **样式**: 半透明，包含logo和"机器视觉"文字

## ⚠️ 法律声明

本项目仅聚合公开可用的新闻标题和简短摘要，遵循以下原则：

### 内容来源
- 所有内容来自公开的RSS源和网站
- 仅抓取标题、摘要等基本信息
- 不存储完整文章内容
- 保留原始来源链接

### 版权说明
- 尊重原创内容版权
- 提供原文链接便于访问
- 如有版权问题请联系删除
- 仅供学习和研究使用

### 数据使用
- 数据更新频率适中，不对源站造成负担
- 使用合理的User-Agent标识
- 遵循robots.txt和服务条款
- 不进行商业用途使用

## 🔧 故障排除

### 问题：HTML源返回0条新闻
**可能原因**: 网站结构变化，选择器失效
**解决方案**:
1. 检查目标网站的HTML结构
2. 更新 `sources.json` 中的选择器配置
3. 测试选择器是否正确匹配元素

### 问题：PNG导出失败
**可能原因**: html-to-image库加载失败或浏览器兼容性
**解决方案**:
1. 检查网络连接和CDN可用性
2. 尝试刷新页面重新加载库
3. 使用现代浏览器（Chrome、Firefox、Safari）

### 问题：深度链接不工作
**可能原因**: URL参数格式错误或新闻ID不存在
**解决方案**:
1. 检查URL格式：`prompt.html?id=a1b2c3d4e5`
2. 确认新闻ID在news.json中存在
3. 检查浏览器控制台错误信息

### 问题：自动更新工作流失败
**可能原因**: 网络问题、依赖安装失败或权限问题
**解决方案**:
1. 查看GitHub Actions日志
2. 检查网络连接和源站可用性
3. 验证GitHub仓库权限设置

## 🚀 未来功能规划

### 短期目标
- [ ] 支持更多新闻源类型
- [ ] 增加新闻分类和过滤功能
- [ ] 优化移动端体验
- [ ] 添加暗色主题模式

### 中期目标
- [ ] 集成AI摘要生成
- [ ] 支持多语言界面
- [ ] 添加用户个性化设置
- [ ] 新闻内容全文检索

### 长期目标
- [ ] 构建知识图谱关联
- [ ] 智能推荐系统
- [ ] 社区评论和讨论功能
- [ ] 专业分析报告生成

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发环境设置
```bash
# 克隆仓库
git clone https://github.com/Baggio200cn/-
cd -

# 安装依赖（用于脚本开发）
npm install rss-parser jsdom

# 本地开发服务器
python -m http.server 8000
# 或使用Node.js
npx serve .
```

### 提交规范
- 使用清晰的提交信息
- 确保代码风格一致
- 添加必要的注释和文档
- 测试新功能的兼容性

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📧 联系方式

- GitHub: [@Baggio200cn](https://github.com/Baggio200cn)
- 项目主页: [机器视觉每日资讯](https://baggio200cn.github.io/-/)

---

*最后更新: 2024年01月*
└── README.md
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
  "summary": "2-4句话的新闻摘要...",
  "tags": ["标签1", "标签2", "标签3"],
  "zh": null
}
```

### 3. 本地开发

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

## 水印功能

每个新闻卡片都会在右下角显示水印，包含：
- 品牌标识（16px高度）
- "机器视觉" 文字标识
- 半透明白色背景和边框
- 导出PNG时水印会完整保留

## 提示词生成器

### 模板定制

编辑 `prompts/handbook-note-prompt.md` 文件来自定义提示词模板：

- 支持变量替换：`{title}`, `{source}`, `{date}`, `{summary}`, `{tags}`, `{customNotes}`
- 包含详细的使用说明和AI引擎参数建议
- 适用于ChatGPT、Claude、文心一言等主流AI模型

### 深度链接使用

从新闻卡片跳转到提示词生成器：
```html
<a href="prompt.html?id=123">生成提示词</a>
```

## 技术栈

- **前端框架**: 纯HTML/CSS/JavaScript
- **样式**: 现代CSS Grid和Flexbox布局
- **图片导出**: html-to-image库
- **字体**: 系统默认字体栈
- **图标**: SVG格式
- **数据**: JSON格式

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

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
