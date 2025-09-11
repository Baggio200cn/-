
# 机器视觉每日资讯

一个基于卡片式设计的机器视觉新闻网站，提供每日资讯浏览、标签筛选、PNG导出和手帐风学习卡片生成功能。

访问网站: **https://baggio200cn.github.io/-/**

## 功能特性

### 📰 卡片式新闻浏览
- 响应式卡片网格布局
- 每个卡片包含标题、来源、日期、摘要和标签
- 卡片底部右侧带有品牌水印
- 悬停效果和平滑动画

### 🏷️ 标签筛选与深链
- 多选标签筛选支持（AND逻辑）
- URL深度链接：`index.html?tags=TagA,TagB`
- 归档页面同样支持标签筛选：`archive.html?date=YYYY-MM-DD&tags=TagA,TagB`
- 标签按钮具有无障碍支持（aria-pressed属性）

### 🌐 数据抓取窗口 (WINDOW_DAYS)
- 90天滚动窗口新闻聚合（可通过环境变量 `WINDOW_DAYS` 配置，默认90天）
- 不限制每日条目数量，保留完整窗口期内的所有资讯
- 智能去重机制基于ID或标题+日期组合

### 🔍 来源白名单 (International Sources)
- 仅聚合国际知名机器视觉相关来源，排除国内来源
- 白名单包括：NVIDIA, NVIDIA Blog, OpenCV, OpenCV Team, PyTorch, Meta AI, Apple, Apple ML, Intel, AMD, Google AI, Hugging Face, GitHub Release, Ultralytics, TensorFlow, AWS ML, Microsoft AI
- 自动过滤不在白名单中的新闻来源

### 🎨 品牌标识自动检测
- 智能检测公司品牌标识：`assets/company-logo.svg` → `assets/company-logo.png` → `assets/logo-placeholder.svg`
- 自动回退机制，确保始终有合适的标识显示
- 统一的品牌展示：网站头部和卡片水印

### 📊 Logo 缓存刷新 (BUILD_VERSION)
- 使用 `BUILD_VERSION = 'v3'` 常量进行缓存清除
- 所有JavaScript文件统一使用 `?v=v3` 参数避免缓存问题
- 确保logo更新时能及时显示新版本

### 📥 PNG导出功能
- 一键将新闻卡片导出为高质量PNG图片
- 使用html-to-image库，支持2x像素比高分辨率导出
- 自动生成基于新闻标题的文件名
- 导出图片包含完整水印信息

### 🃏 学习卡片生成器 (prompt.html)
### v4 更新内容
- 手帐风学习卡片样式（阴影 + 纸质纹理 + 标签前两枚实心其余描边）
- Logo 缓存刷新：统一 BUILD_VERSION=v4
- 卡片页面支持英文 -> 中文在线翻译（LibreTranslate 演示，可替换其他服务）
- 支持“切换英文/中文”语言切换
- 支持一键刷新 Logo 缓存按钮（若浏览器缓存未更新）

### 📚 归档机制与文件结构
- 仅在news.json内容变更时创建归档快照
- 快照包含当前窗口期的完整数据集
- 保留最新60个快照（可通过 `ARCHIVE_MAX` 环境变量覆盖）
- 自动清理超出保留期限的历史文件
- 文件结构：
  ```
  data/
  ├── news.json                 # 当前新闻数据
  └── archive/
      ├── index.json            # 归档索引（日期列表）
      ├── 2024-01-15.json       # 具体日期快照
      └── 2024-01-14.json       # 历史快照
  ```

### 🗂️ 归档浏览
- 按日期倒序列出可用的历史快照
- 每个快照显示包含的新闻条目数量
- 支持归档数据的标签筛选
- 深度链接支持：`archive.html?date=YYYY-MM-DD&tags=TagA`

## 项目结构

```
├── index.html                    # 主页 - 新闻卡片展示
├── archive.html                  # 历史归档页面
├── prompt.html                   # 学习卡片生成器页面
├── app-common.js                 # 共享工具函数库
├── assets/                       # 资源文件夹
│   ├── company-logo.svg          # SVG格式标识（优先）
│   ├── company-logo.png          # PNG格式标识（备用）
│   └── logo-placeholder.svg      # 占位符标识（最终回退）
├── data/
│   ├── news.json                 # 当前新闻数据（90天窗口）
│   └── archive/
│       ├── index.json            # 归档索引
│       └── YYYY-MM-DD.json       # 日期快照文件
├── scripts/
│   └── update-news.mjs           # 新闻更新脚本
├── styles/
│   └── base.css                  # 样式文件
└── README.md
```

## 环境变量配置

### WINDOW_DAYS
- **默认值**: 90
- **说明**: 新闻聚合的滚动窗口天数
- **示例**: `export WINDOW_DAYS=30` 设置为30天窗口

### ARCHIVE_MAX  
- **默认值**: 60
- **说明**: 保留的最大归档快照数量
- **示例**: `export ARCHIVE_MAX=100` 保留100个快照

## 安装和使用

### 1. 品牌标识设置

将您的公司标识放置在以下位置（建议尺寸：适合32px高度）：

```bash
# 推荐：SVG格式（优先级最高）
assets/company-logo.svg

# 或者：PNG格式（备用）  
assets/company-logo.png
```

如果没有提供公司标识，系统会自动使用内置的占位符图标。

### 2. 新闻数据更新

运行新闻更新脚本：

```bash
# 使用默认配置（90天窗口）
npm run update-news

# 使用自定义窗口期
WINDOW_DAYS=30 npm run update-news

# 使用自定义归档保留数量
ARCHIVE_MAX=100 npm run update-news
```

脚本退出代码：
- `0`: 有内容变更，已更新
- `2`: 无内容变更
- `其他`: 发生错误

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

## 标签筛选与深链

### 多选筛选（AND逻辑）
- 选择多个标签时，只显示包含**所有**选中标签的新闻
- 标签按钮支持键盘导航和屏幕阅读器
- 清除筛选按钮动态显示

### URL深度链接
在首页和归档页面均支持通过URL参数预设筛选条件：

```bash
# 首页标签筛选
index.html?tags=AI,NVIDIA

# 归档页面 - 指定日期和标签
archive.html?date=2024-01-15&tags=OpenCV,PyTorch
```

## 学习卡片生成器 (prompt.html)

### 功能特性
- 选择新闻项目（支持当前数据和历史归档）
- 添加自定义学习要点和补充说明
- 生成手帐风格的学习卡片
- 高质量PNG导出（2x像素比）

### 卡片设计规范
- **标题区域**：新闻标题 + 来源/日期信息
- **内容区域**：摘要 + 相关标签 + 可选学习要点
- **标签样式**：前2个实心，其余轮廓样式
- **水印**：右下角显示logo + "机器视觉"标识

### 深度链接使用
```bash
# 预选新闻项目
prompt.html?id=123

# 从归档数据预选（归档模式）
prompt.html?id=123&date=2024-01-15
```

## 归档机制与文件结构

### 快照创建逻辑
1. 仅在 `news.json` 内容变更时创建快照
2. 快照包含整个当前窗口数据集（非增量）
3. 使用UTC日期格式：`YYYY-MM-DD.json`

### 归档保留策略
- 保留最新 60 个快照（可通过 `ARCHIVE_MAX` 环境变量调整）
- 超出限制的历史快照自动清理
- 归档索引文件 (`index.json`) 维护可用日期列表

### 数据结构
```json
// data/archive/index.json
{
  "generatedAt": "2024-01-15T12:00:00Z",
  "dates": [
    {"date": "2024-01-15", "count": 12},
    {"date": "2024-01-14", "count": 10}
  ]
}
```

## Logo 缓存刷新 (BUILD_VERSION)

所有JavaScript文件使用统一的缓存清除机制：

```javascript
const BUILD_VERSION = 'v3';

// Logo URL示例
const logoUrl = `assets/company-logo.svg?v=${BUILD_VERSION}`;
```

这确保logo更新时能够绕过浏览器缓存，及时显示最新版本。

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
## 聚类 & LLM 增强功能说明

### 聚类参数
- 相似度阈值：0.75–0.95（默认 0.88），越低越容易合并。
- “标题二次合并”：对初次聚类结果代表标题做 >0.92 Jaccard 相似再合并。

### 缓存
- localStorage 键：`CLUSTER_CACHE_V1`
- 清空缓存按钮删除并强制重新计算。

### LLM 增强
- 配置键：`LLM_CONFIG_V1`
- 仅对未 `_llmEnhanced` 的聚类调用接口。
- 失败聚类加 `_llmError` 标记，其他继续。

### 学习卡片
- 点击“生成学习卡片”写入 `selectedCluster` 后跳转 `card-generator.html`。
- 展示：topic / summary / keyPoints / sources + 用户笔记区。

### 诊断
- `window.__CLUSTERS__` 当前聚类数组
- `window.__CLUSTER_DIAG__()` 返回统计：rawCount / clusterCount / enhanced / threshold / titleMerge
