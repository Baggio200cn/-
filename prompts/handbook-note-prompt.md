# 手帐风学习卡片 Prompt 模板

## 完整的Prompt模板

```
请创建一个手帐风格的学习卡片，使用温暖的色调和手绘元素。内容如下：

**标题**: {title}

**核心观点**:
{keyPoints}

**技术要点**:
{technicalDetails}

**应用场景**:
{applications}

**行业影响**:
{industryImpact}

**学习要点**:
{learningPoints}

**设计要求**:
- 使用温暖的米色或奶白色背景
- 手绘风格的装饰元素（花边、线条、小图标）
- 清晰的层次结构和信息布局
- 适合阅读的字体大小和行距
- 整体风格温馨友好，适合学习记录

**尺寸**: 方形1080x1080像素
```

## 使用说明

### 参数说明
- `{title}`: 新闻标题
- `{keyPoints}`: 核心观点总结（2-4句话）
- `{technicalDetails}`: 技术要点详解（2-4句话）
- `{applications}`: 应用场景描述（2-4句话）
- `{industryImpact}`: 行业影响分析（2-4句话）
- `{learningPoints}`: 关键学习要点（2-4句话）

### 引擎参数建议

**ChatGPT/GPT-4**:
- 温度(Temperature): 0.3-0.5 (保持创意但确保内容准确)
- 最大令牌(Max Tokens): 1500-2000
- 频率惩罚(Frequency Penalty): 0.2

**Claude**:
- 模式: Balanced
- 创造性: Medium
- 长度: Detailed

**Midjourney**:
- 风格参数: --style raw --ar 1:1 --v 6
- 质量: --q 2
- 种子: 可选择固定种子确保风格一致性

### 输出示例
使用此模板将生成一个结构化的、适合制作手帐风学习卡片的完整prompt，包含所有必要的设计指导和内容要求。

### 注意事项
1. 确保内容精炼但信息完整
2. 保持各部分长度平衡
3. 考虑视觉层次和阅读体验
4. 适合在社交媒体和学习平台分享