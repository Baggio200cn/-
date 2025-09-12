/**
 * 统一图像生成接口：
 * provider.generate({
 *   baseURL, apiKey, model, prompt, size, aspectRatio
 * }) => { imageUrl, raw }
 *
 * 对于异步（如某些 queue）可轮询，但这里先用同步直接返回。
 * 可扩展 replicate / stable diffusion webui relay / comfyui 等。
 */

export const ImageProviders = {
  'openai-images': {
    name: 'OpenAI Images',
    async generate({ baseURL, apiKey, model='gpt-image-1', prompt, size='1024x1280', signal }){
      const body = {
        model,
        prompt,
        size,
        response_format: 'b64_json'
      };
      const res = await fetch(trimSlash(baseURL) + '/images/generations', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer '+apiKey
        },
        body: JSON.stringify(body),
        signal
      });
      if(!res.ok){
        const txt=await res.text();
        throw new Error('Image HTTP '+res.status+' '+txt);
      }
      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if(!b64) throw new Error('No image data');
      const imageUrl = 'data:image/png;base64,' + b64;
      return { imageUrl, raw:data };
    }
  },

  // 占位：Stable Diffusion WebUI relay 样例
  'sd-webui': {
    name: 'SD WebUI Relay',
    async generate({ baseURL, apiKey, model, prompt, aspectRatio='4:5', steps=30, signal }){
      // 仅示意，实际参数需根据你的 relay 接口定义
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

function trimSlash(u){ return u.replace(/\/+$/,''); }

export function getImageProvider(key='openai-images'){
  return ImageProviders[key] || ImageProviders['openai-images'];
}
