/**
 * 统一图像生成接口：
 * provider.generate({
 *   baseURL, apiKey, model, prompt, size, aspectRatio, apiVersion
 * }) => { imageUrl, raw }
 *
 * 兼容：
 * - OpenAI Images (不再发送 response_format；同时支持 b64_json 或 url)
 * - Azure OpenAI Images（带 api-version；支持 b64_json 或 url）
 * - SD WebUI Relay（示例用）
 */

export const ImageProviders = {
  'openai-images': {
    name: 'OpenAI Images',
    async generate({ baseURL, apiKey, model='gpt-image-1', prompt, size='1024x1280', signal }){
      // Not sending response_format, supporting both b64_json and url
      const body = {
        model,
        prompt,
        size,
        // quality: 'standard', // optional
        // style: 'vivid',      // optional
        // n: 1                 // optional
      };

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

      const res = await fetch(trimSlash(baseURL) + '/images/generations', {
        method:'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });
      if(!res.ok){
        const txt=await res.text();
        throw new Error('Image HTTP '+res.status+' '+txt);
      }
      const data = await res.json();
      const item = data.data?.[0];
      if(!item) throw new Error('No image data');

      if(item.b64_json){
        return { imageUrl: 'data:image/png;base64,' + item.b64_json, raw:data };
      }
      if(item.url){
        // Direct URL return (some services only return temporary URLs)
        return { imageUrl: item.url, raw:data };
      }
      throw new Error('No b64_json or url in response');
    }
  },

  'azure-openai-images': {
    name: 'Azure OpenAI Images',
    async generate({ baseURL, apiKey, model='gpt-image-1', prompt, size='1024x1280', apiVersion='2024-06-01', signal }){
      // Azure OpenAI 常见路径： https://{resource}.openai.azure.com/openai
      // 生成接口：POST {baseURL}/images/generations?api-version=2024-06-01
      // 注：通常不接受 response_format 参数
      const url = trimSlash(baseURL) + '/images/generations?api-version=' + encodeURIComponent(apiVersion);
      const body = {
        model,
        prompt,
        size
      };
      const res = await fetch(url, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify(body),
        signal
      });
      if(!res.ok){
        const txt=await res.text();
        throw new Error('Azure Image HTTP '+res.status+' '+txt);
      }
      const data = await res.json();
      const item = data.data?.[0];
      if(!item) throw new Error('No image data');

      if(item.b64_json){
        return { imageUrl: 'data:image/png;base64,' + item.b64_json, raw:data };
      }
      if(item.url){
        return { imageUrl: item.url, raw:data };
      }
      throw new Error('No b64_json or url in response');
    }
  },

  // 示例：Stable Diffusion WebUI relay
  'sd-webui': {
    name: 'SD WebUI Relay',
    async generate({ baseURL, apiKey, model, prompt, aspectRatio='4:5', steps=30, signal }){
      const body = {
        prompt,
        steps,
        aspect_ratio: aspectRatio,
        model
      };
      const headers = { 'Content-Type':'application/json' };
      if(apiKey) headers['Authorization'] = 'Bearer '+apiKey;

      const res = await fetch(trimSlash(baseURL) + '/txt2img', {
        method:'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });
      if(!res.ok){
        const txt=await res.text();
        throw new Error('SD HTTP '+res.status+' '+txt);
      }
      const data = await res.json();
      const b64 = data.images?.[0];
      if(!b64) throw new Error('No image data');
      const imageUrl = 'data:image/png;base64,' + b64;
      return { imageUrl, raw:data };
    }
  }
};

function trimSlash(u){ return (u||'').replace(/\/+$/,''); }

export function getImageProvider(key='openai-images'){
  return ImageProviders[key] || ImageProviders['openai-images'];
}
