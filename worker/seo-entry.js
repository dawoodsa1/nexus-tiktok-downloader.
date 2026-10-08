import app from './index.js';
import { canonicalRedirect, STATIC_FILES, ROBOTS_TEXT } from '../lib/site-routing.js';
import { securityHeaders } from '../lib/security-headers.js';

function applySecurityHeaders(response, request) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(
    headers.get('Content-Type'), new URL(request.url).protocol === 'https:'
  ))) headers.set(name, value);
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status, statusText: response.statusText, headers
  });
}

function apiError(message, status, extraHeaders = {}) {
  return new Response(JSON.stringify({ success: false, error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders }
  });
}

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const destination = canonicalRedirect(url, request.method);
  if (destination) return Response.redirect(destination,
    request.method === 'GET' || request.method === 'HEAD' ? 301 : 308);

  const isApiPath = url.pathname === '/api' || url.pathname.startsWith('/api/');
  if (isApiPath) {
    if (env.RATE_LIMITER) {
      try {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const result = await env.RATE_LIMITER.limit({ key: `${url.pathname}:${ip}` });
        if (!result.success) return apiError('Too many requests. Please try again later.', 429, { 'Retry-After': '60' });
      } catch {
        return apiError('Rate limiting service unavailable.', 503);
      }
    }
    const response = await app.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (url.pathname === '/robots.txt') {
    return new Response(ROBOTS_TEXT, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
    });
  }

  // An explicit public file map also prevents accidental exposure of backend files.
  const file = Object.hasOwn(STATIC_FILES, url.pathname) ? STATIC_FILES[url.pathname] : null;
  if (!file) return new Response('Not Found', { status: 404 });
  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/${file}`;
  const response = await env.ASSETS.fetch(new Request(assetUrl, request));
  const headers = new Headers(response.headers);
  if (url.pathname === '/site.webmanifest' && response.ok) {
    headers.set('Content-Type', 'application/manifest+json; charset=utf-8');
  }
  if (url.pathname === '/favicon.ico' && response.ok) {
    headers.set('Content-Type', 'image/x-icon');
    headers.set('Cache-Control', 'public, max-age=86400, must-revalidate');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    return applySecurityHeaders(await handleRequest(request, env, ctx), request);
  }
};
