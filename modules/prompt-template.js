// prompt-template.js
// 负责：把一个 cluster 的信息转成用于生成“图片学习卡”的英文 Prompt，支持多种风格
const STYLE_PRESET_SNIPPETS = {
  'vintage-journal': {
    label: 'Vintage Didactic Journaling',
    styleLine: 'vintage scientific notebook aesthetic, soft archival paper texture, early 20th century British industrial undertone, meticulous academic layout + warm handcrafted details',
    palette: 'muted parchment base, deep navy and oxidized brass accents, restrained ink blacks, selective desaturated red emphasis',
    typography: 'elegant serif headings + clear engineering handwritten annotation layers',
    extras: 'ruled margins, marginalia symbols, hand drawn circles / brackets, subtle grid, ink spread, light edge wear'
  },
  'clean': {
    styleLine: 'minimal white modern study card, flat design, soft neutral shadows',
    palette: 'white + light gray base, cool blue accent',
    typography: 'geometric sans-serif with subtle mono annotations',
    extras: 'balanced spacing, unobtrusive dividers'
  },
  'tech-blue': {
    styleLine: 'sleek product UI panel, subtle glass layer, controlled gradients',
    palette: 'cool tech blues, slate gray neutrals, cyan highlight',
    typography: 'semi-condensed modern sans + code style sublabels',
    extras: 'soft glow accents, fine grid overlay'
  },
  'dark-neon': {
    styleLine: 'futuristic dark slate, neon cyan & magenta edge glows',
    palette: 'charcoal base, cyan / magenta neon accents',
    typography: 'clean sans light + bold contrast headers',
    extras: 'subtle scanlines, soft bloom'
  },
  'paper-note': {
    styleLine: 'handcrafted study note, light ivory paper, taped fragments',
    palette: 'ivory, muted graphite, warm sepia, faint pastel marks',
    typography: 'serif main + casual handwritten annotations',
    extras: 'torn edge textures, faint pencil guidelines'
  }
};

function extractCompanies(cluster){
  const companies = new Set();
  cluster.items.forEach(it=>{
    const m = it.title.match(/^(Google|NVIDIA|Intel|AWS|Apple|PyTorch|GitHub|OpenCV|Ultralytics|TensorFlow)\b/i);
    if(m) companies.add(capitalize(m[1]));
  });
  return [...companies];
}
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

/**
 * 返回 { prompt, blueprint, meta }
 */
export function generateStudyCardPrompt(cluster, options = {}){
  const {
    stylePreset='vintage-journal',
    mode='single',
    maxKeyPoints=4
  } = options;

  const style = STYLE_PRESET_SNIPPETS[stylePreset] || STYLE_PRESET_SNIPPETS['vintage-journal'];

  const topicEn = cluster.topicEn || cluster.topic || 'Vision Update';
  const topicZh = cluster.topicZh || '';
  const summaryZh = cluster.summaryZh || cluster.summary || '';
  const kpZh = (cluster.keyPointsZh || cluster.keyPoints || []).slice(0, maxKeyPoints).filter(Boolean);
  const companies = extractCompanies(cluster);
  const tags = (cluster.tags || []).slice(0,6);

  const usedKeyPointsLine = kpZh.length
    ? `Key Points (Chinese concise): ${kpZh.join(' | ')}.`
    : '';

  const companiesLine = companies.length
    ? `Represent companies subtly (icons / initials): ${companies.join(', ')}.`
    : 'If relevant companies exist, hint them subtly.';

  const prompt =
`You are an independent scholarly magazine art director & journaling artist.
Design a SINGLE vintage didactic study card (aspect ratio 4:5).

Title (English main + small Chinese subtitle):
"${topicEn}" / "${topicZh}"

Theme Summary (Chinese): ${summaryZh}

${usedKeyPointsLine}

${companiesLine}
Tags (semantic accents): ${tags.join(', ') || 'vision, AI'}

Aesthetic: ${style.styleLine}.
Palette: ${style.palette}.
Typography: ${style.typography}.
Ornamental Elements: ${style.extras}.
Texture cues: subtle paper grain, light marginal wear, restrained ink spread.

Hierarchical Emphasis System:
- Primary: central title / theorem frame (serif)
- Secondary: boxed or circled highlight marks
- Tertiary: handwritten engineering side notes & arrows

Mandatory Layout Principles:
- Clean academic structure, breathing space, margin guides
- Avoid clutter, no watermark, no photographic realism
- Balanced contrast; keep all text legible
- Subtle handcrafted warmth without overpowering the information

If icons are used: keep them minimal line-based.
OUTPUT: Pure visual generation prompt (English focus). Do NOT add explanations or numbering.`;

  return {
    prompt,
    blueprint: {
      topicEn, topicZh, stylePreset,
      keyPointsZh: kpZh,
      companies, tags
    },
    meta: { stylePreset, usedKeyPoints: kpZh.length, companies: companies.length }
  };
}
