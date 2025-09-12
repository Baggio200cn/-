/**
 * 统一 LLM Provider 接口：
 * provider.chat({
 *   baseURL, apiKey, model, messages, temperature, signal
 * }) => { content, raw }
 */

export const LLMProviders = {
  'openai': {
    name: 'OpenAI Compatible',
    async chat(opts){
      const {
        baseURL, apiKey, model,
        messages, temperature=0.3,
        jsonMode=false, signal
      } = opts;

      const body = {
        model,
        messages,
        temperature
      };
      if(jsonMode){
        body.response_format = { type:'json_object' };
      }

      const headers = {
        'Content-Type':'application/json'
      };

      // If baseURL looks like a proxy (not api.openai.com), add proxy token auth
      if (baseURL && !baseURL.includes('api.openai.com') && apiKey && apiKey !== 'dummy') {
        headers['Authorization'] = 'Bearer ' + apiKey;
      } else if (baseURL && baseURL.includes('api.openai.com') && apiKey) {
        // Direct OpenAI API call
        headers['Authorization'] = 'Bearer ' + apiKey;
      }

      const res = await fetch(trimSlash(baseURL) + '/chat/completions', {
        method:'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });
      if(!res.ok){
        const txt = await res.text();
        throw new Error('LLM HTTP '+res.status+' '+txt);
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return { content, raw:data };
    }
  },

  'anthropic': {
    name: 'Anthropic Claude',
    async chat(opts){
      const {
        baseURL='https://api.anthropic.com/v1',
        apiKey, model, messages, temperature=0.3, jsonMode=false, signal
      } = opts;

      // Claude 接口：把 OpenAI 风格 messages 转为 Claude format
      const sys = messages.find(m=>m.role==='system')?.content || '';
      const userParts = messages.filter(m=>m.role!=='system').map(m=>{
        return m.role.toUpperCase()+': '+m.content;
      }).join('\n\n');

      const body = {
        model,
        max_tokens: 1200,
        temperature,
        system: sys,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      };
      if(jsonMode){
        body.metadata = { json: true };
      }

      const res = await fetch(trimSlash(baseURL) + '/messages', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key': apiKey,
          'anthropic-version':'2023-06-01'
        },
        body: JSON.stringify(body),
        signal
      });
      if(!res.ok){
        const txt = await res.text();
        throw new Error('Claude HTTP '+res.status+' '+txt);
      }
      const data = await res.json();
      const content = data.content?.[0]?.text || '';
      return { content, raw:data };
    }
  },

  // 其他兼容服务可继续添加
};

function trimSlash(u){ return u.replace(/\/+$/,''); }

export function getLLMProvider(key='openai'){
  return LLMProviders[key] || LLMProviders['openai'];
}
