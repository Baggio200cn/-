import { getLLMProvider } from './llm-providers.js';

const DEFAULT_TIMEOUT = 60_000;

export class LLMService {
  constructor(cfg){
    this.cfg = cfg;
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = cfg.maxConcurrent || 2;
  }

  updateConfig(cfg){ this.cfg = { ...this.cfg, ...cfg }; }

  enqueue(taskFn){
    return new Promise((resolve,reject)=>{
      this.queue.push({ taskFn, resolve, reject });
      this._next();
    });
  }

  _next(){
    if(this.running >= this.maxConcurrent) return;
    const item = this.queue.shift();
    if(!item) return;
    this.running++;
    (async ()=>{
      try {
        const res = await item.taskFn();
        item.resolve(res);
      } catch(e){
        item.reject(e);
      } finally {
        this.running--;
        this._next();
      }
    })();
  }

  async chatJSON({ system, user, model, temperature=0.3 }){
    const provider = getLLMProvider(this.cfg.provider || 'openai');
    const controller = new AbortController();
    const timeout = setTimeout(()=> controller.abort(), DEFAULT_TIMEOUT);

    try {
      const { content } = await provider.chat({
        baseURL: this.cfg.baseURL,
        apiKey: this.cfg.apiKey,
        model: model || this.cfg.model,
        temperature,
        jsonMode: true,
        messages: [
          { role:'system', content: system },
          { role:'user', content: user }
        ],
        signal: controller.signal
      });
      return safeParseJSON(content);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function safeParseJSON(str){
  try { return JSON.parse(str); }
  catch {
    // 尝试截取 JSON 主体
    const match = str.match(/\{[\s\S]*\}$/);
    if(match){
      try { return JSON.parse(match[0]); } catch {}
    }
    return { _error:'JSON_PARSE_FAIL', raw:str };
  }
}
