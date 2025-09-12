/**
 * 集中维护 LLM 增强输出 schema
 * 你只需在 SCHEMA 中增删字段即可。其它代码 (prompt 生成、校验、应用) 会自动适配。
 *
 * type 支持: string | string[] | number | object | any
 * required: LLM 必须给出；如果缺失会用 default 并标记 _schemaWarnings
 */

export const ENHANCEMENT_SCHEMA = {
  topicZh: {
    type: 'string',
    required: true,
    default: '',
    desc: '优化后的中文主题（尽量 12 字内）'
  },
  summaryZh: {
    type: 'string',
    required: true,
    default: '',
    desc: '改写精炼的中文摘要（<=60汉字）'
  },
  keyPointsEnRefined: {
    type: 'string[]',
    required: false,
    default: [],
    maxLen: 4,
    desc: '精炼后的英文要点（最多4条）'
  },
  keyPointsZh: {
    type: 'string[]',
    required: false,
    default: [],
    maxLen: 4,
    desc: '与英文要点语义对齐的中文要点'
  },
  promptImproved: {
    type: 'string',
    required: false,
    default: '',
    desc: '改进后的英文图片生成提示词'
  },
  notes: {
    type: 'string',
    required: false,
    default: '',
    desc: '模型可选补充建议'
  }

  // 例如以后想增加:
  // trendScore: { type:'number', required:false, default:0, desc:'热度/趋势分 0-1' },
  // riskAssessment: { type:'string', required:false, default:'', desc:'潜在风险简述' }
};

/**
 * 生成 Prompt 中“Return JSON keys exactly: { ... }” 的 JSON 模板字符串
 */
export function buildSchemaReturnSection(){
  const obj = {};
  Object.keys(ENHANCEMENT_SCHEMA).forEach(k=>{
    const meta = ENHANCEMENT_SCHEMA[k];
    if(meta.type === 'string') obj[k] = '';
    else if(meta.type === 'string[]') obj[k] = [];
    else if(meta.type === 'number') obj[k] = 0;
    else if(meta.type === 'object') obj[k] = {};
    else obj[k] = null;
  });
  return JSON.stringify(obj, null, 1);
}

/**
 * 校验并规范化 LLM 返回的 JSON
 * @returns { normalizedJson, warnings[] }
 */
export function validateEnhancementJson(json){
  const warnings = [];
  const norm = {};

  if(!json || typeof json !== 'object'){
    return {
      normalizedJson: buildDefaults(),
      warnings: ['OUTPUT_NOT_OBJECT']
    };
  }

  for(const key of Object.keys(ENHANCEMENT_SCHEMA)){
    const meta = ENHANCEMENT_SCHEMA[key];
    let val = json[key];

    if(val === undefined || val === null || (meta.type==='string' && val.trim?.()==='')){
      if(meta.required) warnings.push(`MISSING_REQUIRED:${key}`);
      val = clone(meta.default);
    }

    switch(meta.type){
      case 'string':
        if(typeof val !== 'string'){ warnings.push(`TYPE_${key}_STRING_EXPECTED`); val = String(val||''); }
        break;
      case 'string[]':
        if(!Array.isArray(val)){ warnings.push(`TYPE_${key}_ARRAY_EXPECTED`); val = []; }
        val = val.map(v=> typeof v==='string'?v:JSON.stringify(v));
        if(meta.maxLen && val.length>meta.maxLen){
          val = val.slice(0, meta.maxLen);
          warnings.push(`TRUNC_${key}`);
        }
        break;
      case 'number':
        if(typeof val !== 'number'){ const n = Number(val); if(Number.isFinite(n)) val = n; else { val = meta.default; warnings.push(`TYPE_${key}_NUMBER_EXPECTED`);} }
        break;
      case 'object':
        if(typeof val !== 'object' || Array.isArray(val)){ warnings.push(`TYPE_${key}_OBJECT_EXPECTED`); val = meta.default||{}; }
        break;
      default:
        // any，不处理
        break;
    }

    norm[key] = val;
  }

  // 额外字段忽略，记录
  Object.keys(json).forEach(k=>{
    if(!ENHANCEMENT_SCHEMA[k]) warnings.push(`UNEXPECTED_FIELD:${k}`);
  });

  return { normalizedJson: norm, warnings };
}

function buildDefaults(){
  const d = {};
  Object.entries(ENHANCEMENT_SCHEMA).forEach(([k,meta])=>{
    d[k] = clone(meta.default);
  });
  return d;
}

function clone(v){
  if(Array.isArray(v)) return v.slice();
  if(v && typeof v==='object') return JSON.parse(JSON.stringify(v));
  return v;
}

export function listSchemaHumanReadable(){
  return Object.entries(ENHANCEMENT_SCHEMA).map(([k,meta])=>{
    return `${k}: ${meta.type} ${meta.required?'(required)':''} - ${meta.desc||''}`;
  }).join('\n');
}
