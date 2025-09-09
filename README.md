
# 机器视觉每日资讯

这是机器视觉每日资讯网站的代码仓库，每日09:00(北京时间)更新机器视觉领域的最新资讯。

## 功能特性

- 📰 **新闻卡片展示**: 结构化的新闻内容，包含核心观点、技术要点、应用场景等
- 🎨 **Prompt生成器**: 自动生成手帐风学习卡片的完整Prompt模板
- 🖼️ **PNG导出功能**: 支持将新闻卡片导出为1080x1080的PNG图片
- 🏷️ **水印系统**: 自动在卡片和导出图片中添加品牌水印
- 📱 **响应式设计**: 适配各种设备和屏幕尺寸

## 添加公司Logo

### 放置Logo文件
将您的公司Logo保存为 `assets/company-logo.png` 文件。系统将按以下优先级自动检测和使用Logo：

1. `assets/company-logo.png` (您的自定义Logo - PNG格式)
2. `assets/company-logo.svg` (SVG版本，如果有的话)
3. `assets/logo-placeholder.svg` (默认占位符)

### Logo规格要求
- **推荐尺寸**: 宽度100-150px，高度按比例缩放
- **显示尺寸**: 在页面头部自动缩放至28-32px高度
- **格式支持**: PNG（推荐用于图片Logo）、SVG（推荐用于矢量Logo）
- **背景要求**: 建议使用透明背景，确保在白色和浅色背景下清晰可见

### Logo显示位置
- **页面头部**: 显示在网站标题左侧
- **卡片水印**: 在每个新闻卡片右下角显示小型水印
- **导出图片**: 包含在下载的PNG图片中

## 网站结构

```
├── index.html              # 主页 - 新闻卡片展示
├── prompt.html             # Prompt生成器页面
├── assets/                 # 资源文件目录
│   ├── company-logo.png    # 您的公司Logo（需要您添加）
│   ├── logo-placeholder.svg # 默认占位符Logo
│   └── README.md           # Logo使用说明
├── data/                   # 数据文件目录
│   └── news.json           # 新闻数据
├── prompts/                # Prompt模板目录
│   └── handbook-note-prompt.md # 手帐风学习卡片模板
└── README.md               # 项目说明文档
```

## 使用说明

### 查看新闻
访问 `index.html` 查看最新的机器视觉资讯，每条新闻以卡片形式展示，包含：
- 标题和发布信息
- 核心观点、技术要点
- 应用场景、行业影响
- 学习要点总结

### 生成学习卡片Prompt
1. 点击新闻卡片上的"生成Prompt"按钮
2. 或访问 `prompt.html` 手动选择新闻
3. 系统自动生成适合AI图像生成工具的完整Prompt
4. 复制Prompt到ChatGPT、Midjourney等工具中使用

### 导出PNG图片
点击新闻卡片上的"下载PNG"按钮，将当前卡片导出为1080x1080像素的PNG图片，包含水印信息。

## 更新计划

- ⏰ **更新时间**: 每日09:00(北京时间)
- 🌐 **多语言**: 暂不支持翻译功能
- 📊 **数据来源**: 机器视觉领域权威资讯

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **图片处理**: html2canvas (PNG导出)
- **样式**: 现代CSS Grid和Flexbox布局
- **兼容性**: 支持现代浏览器

访问网站: [https://yourusername.github.io](https://yourusername.github.io)
