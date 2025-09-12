# Cloudflare Worker Deployment Guide

This guide shows how to deploy the OpenAI API proxy Worker to fix CORS/405 issues in 5 minutes using the Cloudflare Dashboard.

## Quick Deploy (Cloudflare Dashboard)

### 1. Create a new Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** in the left sidebar
3. Click **Create Application**
4. Choose **Create Worker**
5. Give it a name like `openai-proxy` or `mv-daily-proxy`

### 2. Replace the Worker code

1. Delete the default code in the editor
2. Copy the entire content from [`worker/worker.js`](../worker/worker.js) in this repository
3. Paste it into the Cloudflare Worker editor
4. Click **Save and Deploy**

### 3. Configure environment variables

1. In your Worker dashboard, go to **Settings** tab
2. Click **Variables** section
3. Add environment variables:
   - **OPENAI_API_KEY** (required): Your OpenAI API key (e.g., `sk-proj-...`)
   - **PROXY_TOKEN** (optional): A secure token to protect your proxy (e.g., `your-secure-random-token-123`)
4. Click **Save and deploy**

### 4. Test your Worker

Your Worker will be available at: `https://your-worker-name.your-subdomain.workers.dev`

Test with curl:
```bash
# Test without proxy token (if PROXY_TOKEN not set)
curl -X POST https://your-worker-name.your-subdomain.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}],"max_tokens":5}'

# Test with proxy token (if PROXY_TOKEN is set)
curl -X POST https://your-worker-name.your-subdomain.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secure-random-token-123" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}],"max_tokens":5}'
```

### 5. Configure your app

1. Open your mv-daily app
2. Click **LLM 设置面板** (LLM Settings Panel)
3. Set **Proxy Base** to: `https://your-worker-name.your-subdomain.workers.dev`
4. Set **Proxy Token** to: `your-secure-random-token-123` (if you configured PROXY_TOKEN)
5. Leave **API Base** and **API Key** empty (the proxy will handle these)
6. Click **保存配置** (Save Configuration)

## Custom Domain (Optional)

For production use, you may want to use a custom domain:

1. In Worker settings, go to **Triggers** tab
2. Click **Add Custom Domain**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Follow DNS configuration instructions
5. Update your app configuration to use the custom domain

## GitHub Actions Deployment (Advanced)

For automated deployments, see the optional workflow in [`.github/workflows/deploy-worker.yml`](../.github/workflows/deploy-worker.yml).

You'll need to:
1. Uncomment the workflow file
2. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Workers edit permissions
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PROXY_TOKEN`: (optional) Your proxy authentication token

## Security Notes

- **PROXY_TOKEN**: Use a long, random token to prevent unauthorized access to your proxy
- **OPENAI_API_KEY**: Keep your API key secure in Cloudflare's environment variables
- **Rate Limiting**: Consider adding rate limiting if you expect high traffic
- **Domain Restrictions**: For production, consider restricting CORS origins to your domain

## Troubleshooting

**Worker returns 401 Unauthorized:**
- Check that PROXY_TOKEN matches between Worker and app
- Ensure Authorization header format is `Bearer your-token`

**Worker returns 500 Server Error:**
- Check that OPENAI_API_KEY is properly set in Worker environment
- Verify the API key is valid and has sufficient quota

**CORS errors still occur:**
- Ensure you're using the Worker URL as the base URL in your app
- Verify the Worker is properly deployed and accessible

**API calls fail:**
- Test the Worker directly with curl first
- Check browser network tab for error details
- Verify you're calling `/v1/*` endpoints through the proxy