/**
 * Cloudflare Worker to serve Nova Spektr renderer static assets This worker
 * serves the built renderer application for PR previews
 */

export interface Env {
  // ASSETS binding is automatically created when using [site] in wrangler.toml
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  // Add bindings here if needed (KV, R2, etc.)
  // PR_DEPLOYMENTS?: KVNamespace;
  // PR_ASSETS?: R2Bucket;
}

// MIME type mappings for common file types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'application/javascript;charset=utf-8',
  '.mjs': 'application/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain;charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
};

/**
 * Get MIME type for a file based on its extension
 */
function getMimeType(pathname: string): string {
  const ext = pathname.substring(pathname.lastIndexOf('.'));
  return MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Get cache control headers based on file type
 */
function getCacheControl(pathname: string): string {
  // Cache static assets aggressively
  if (pathname.match(/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico|wasm)$/i)) {
    return 'public, max-age=31536000, immutable';
  }
  // Cache HTML with shorter TTL
  if (pathname.endsWith('.html')) {
    return 'public, max-age=300, must-revalidate';
  }
  // Default: no cache for other files
  return 'no-cache';
}

/**
 * Handle the request and serve static files
 */
async function handleRequest(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  let pathname = url.pathname;

  // Remove leading slash for file lookup
  if (pathname.startsWith('/')) {
    pathname = pathname.substring(1);
  }

  // Default to index.html for root or directory requests
  if (pathname === '' || pathname.endsWith('/')) {
    pathname = 'index.html';
  }

  // Security: prevent path traversal attacks
  if (pathname.includes('..') || pathname.includes('//')) {
    return new Response('Invalid path', { status: 400 });
  }

  try {
    // Get the file from the site binding (static assets)
    // In Cloudflare Workers, static assets are served via the ASSETS binding
    // which is automatically created when using [site] in wrangler.toml
    // The ASSETS binding provides a fetch method to retrieve static files
    const assetRequest = new Request(new URL(pathname, request.url), {
      method: request.method,
      headers: request.headers,
    });
    const asset = await env.ASSETS.fetch(assetRequest);

    if (asset.status === 404) {
      // For SPA routing, serve index.html for any non-file requests
      // This allows client-side routing to work
      if (!pathname.includes('.')) {
        const indexAsset = await env.ASSETS.fetch(new Request(new URL('index.html', request.url), request));
        if (indexAsset.ok) {
          return new Response(indexAsset.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/html;charset=utf-8',
              'Cache-Control': getCacheControl('index.html'),
            },
          });
        }
      }
      return new Response('Not Found', { status: 404 });
    }

    // Get appropriate headers
    const contentType = getMimeType(pathname);
    const cacheControl = getCacheControl(pathname);

    // Create response with proper headers
    const headers = new Headers(asset.headers);
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', cacheControl);

    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // CORS headers (if needed for API requests from the app)
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(asset.body, {
      status: asset.status,
      headers,
    });
  } catch (error) {
    console.error('Error serving asset:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Main worker export
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Handle OPTIONS for CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow GET and HEAD methods
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    return handleRequest(request, env, _ctx);
  },
};
