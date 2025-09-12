import { getImageProvider } from './image-providers.js';

export async function generateClusterImage(cluster, cfg, { onStatus }={}){
  const {
    imageProvider='openai-images',
    imageBaseURL,
    imageApiKey,
    imageModel,
    size='1024x1280',
    aspectRatio='4:5'
  } = cfg;

  const provider = getImageProvider(imageProvider);

  onStatus?.('request');

  const { imageUrl } = await provider.generate({
    baseURL: imageBaseURL,
    apiKey: imageApiKey,
    model: imageModel,
    prompt: (cluster.promptFinal || cluster.promptDraft),
    size,
    aspectRatio
  });

  cluster.imageUrl = imageUrl;
  cluster.imageProvider = imageProvider;
  cluster.imageGeneratedAt = Date.now();
  onStatus?.('done', imageUrl);
  return imageUrl;
}
