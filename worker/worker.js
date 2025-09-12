/**
 * Cloudflare Worker Proxy for OpenAI APIs
 * 
 * Fixes CORS/405 issues by forwarding /v1/* calls to api.openai.com
 * with proper CORS headers and server-side API key injection.
 * 
 * Environment Variables:
 * - OPENAI_API_KEY (required): Your OpenAI API key
 * - PROXY_TOKEN (optional): Bearer token to authenticate frontend requests
 */

/* global Response, Headers */
/* eslint-env serviceworker */

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    // Only handle /v1/* paths
    if (!url.pathname.startsWith('/v1/')) {
      return new Response('Not Found', { status: 404 });
    }
    
    // Check proxy token if configured
    if (env.PROXY_TOKEN) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return corsResponse('Unauthorized: Missing Bearer token', 401);
      }
      
      const token = authHeader.substring(7);
      if (token !== env.PROXY_TOKEN) {
        return corsResponse('Unauthorized: Invalid token', 401);
      }
    }
    
    // Check required OpenAI API key
    if (!env.OPENAI_API_KEY) {
      return corsResponse('Server Error: OpenAI API key not configured', 500);
    }
    
    try {
      // Prepare headers for upstream request
      const upstreamHeaders = new Headers();
      
      // Copy safe headers from original request
      for (const [key, value] of request.headers.entries()) {
        const lowerKey = key.toLowerCase();
        // Strip problematic headers that might cause CORS issues
        if (!lowerKey.startsWith('sec-') && 
            lowerKey !== 'origin' && 
            lowerKey !== 'referer' &&
            lowerKey !== 'authorization') {
          upstreamHeaders.set(key, value);
        }
      }
      
      // Add OpenAI authorization
      upstreamHeaders.set('Authorization', `Bearer ${env.OPENAI_API_KEY}`);
      
      // Forward to OpenAI API
      const upstreamUrl = `https://api.openai.com${url.pathname}${url.search}`;
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: upstreamHeaders,
        body: request.body,
      });
      
      // Create response with CORS headers
      const response = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
      
      // Copy response headers and add CORS
      for (const [key, value] of upstreamResponse.headers.entries()) {
        response.headers.set(key, value);
      }
      
      // Add CORS headers to response
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      
      return response;
      
    } catch (error) {
      console.error('Proxy error:', error);
      return corsResponse(`Proxy Error: ${error.message}`, 500);
    }
  },
};

function corsResponse(message, status = 200) {
  return new Response(message, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Content-Type': 'text/plain',
    }
  });
}