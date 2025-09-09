
# 机器视觉每日资讯

一个基于卡片式设计的机器视觉新闻网站，提供每日资讯浏览、PNG导出和手帐风提示词生成功能。

访问网站: **https://baggio200cn.github.io/-/**

## 功能特性

### 📰 卡片式新闻浏览
- 响应式卡片网格布局
- 每个卡片包含标题、来源、日期、摘要和标签
- 卡片底部右侧带有品牌水印
- 悬停效果和平滑动画

### 🎨 品牌标识自动检测
- 智能检测公司品牌标识：`assets/company-logo.png` → `assets/company-logo.svg` → `assets/logo-placeholder.svg`
- 自动回退机制，确保始终有合适的标识显示
- 统一的品牌展示：网站头部和卡片水印

### 📥 PNG导出功能
- 一键将新闻卡片导出为1080x1080高质量PNG图片
- 使用html-to-image库，确保水印包含在导出图片中
- 自动生成基于新闻标题的文件名
- 支持高分辨率导出（2x像素比）

### 🔗 深度链接集成
- 从首页卡片直接跳转到提示词生成器并预选对应新闻
- URL参数支持：`prompt.html?id=123`
- 无缝的用户体验流程

### ✍️ 手帐风提示词生成器
- 基于选定新闻生成完整的手帐风学习卡片提示词
- 支持自定义补充说明
- 一键复制生成的提示词
- 包含详细的使用说明和AI引擎参数建议

## 项目结构

```
├── index.html              # 主页 - 新闻卡片展示
├── prompt.html             # 提示词生成器页面
├── assets/                 # 资源文件夹
│   ├── company-logo.png    # 公司标识（优先级最高）
│   ├── company-logo.svg    # SVG格式标识（备用）
│   └── logo-placeholder.svg # 占位符标识（最终回退）
├── data/
│   └── news.json          # 新闻数据文件
├── prompts/
│   └── handbook-note-prompt.md # 手帐风提示词模板
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
