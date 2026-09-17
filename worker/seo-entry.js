import app from './index.js';

function originOf(request) {
  return new URL(request.url).origin.replace(/\/$/, '');
}

function applySecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (headers.get('Content-Type')?.toLowerCase().includes('text/html')) {
    headers.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://www.tiktok.com https://www.tikwm.com; frame-src https:; upgrade-insecure-requests");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function robotsResponse(request) {
  const origin = originOf(request);
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/atom.xml?redirect=false&start-index=1&max-results=500\n`, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&apos;');
}

function atomResponse(request) {
  const origin = originOf(request);
  const updated = '2026-09-17T20:06:40Z';
  const entries = [['/', 'TikVideo - TikTok Downloader'], ['/about.html', 'About TikVideo'], ['/privacy.html', 'Privacy Policy'], ['/terms.html', 'Terms of Service'], ['/copyright.html', 'Copyright'], ['/contact.html', 'Contact']];
  const body = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<feed xmlns=\"http://www.w3.org/2005/Atom\">\n  <id>${xmlEscape(origin)}/</id>\n  <title>TikVideo - TikTok Downloader</title>\n  <updated>${updated}</updated>\n  <link href=\"${xmlEscape(origin)}/\" rel=\"alternate\" type=\"text/html\" />\n${entries.map(([path, title]) => `  <entry>\n    <id>${xmlEscape(origin + (path || '/'))}</id>\n    <title>${xmlEscape(title)}</title>\n    <updated>${updated}</updated>\n    <link href=\"${xmlEscape(origin + (path || '/'))}\" rel=\"alternate\" type=\"text/html\" />\n  </entry>`).join('\\n')}\n</feed>\n`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/atom+xml; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function getClientKey(request, pathname) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
  return `${pathname}:${ip}`;
}

async function enforceApiRateLimit(request, env, pathname) {
  if (!env.RATE_LIMITER) return true;
  const result = await env.RATE_LIMITER.limit({ key: getClientKey(request, pathname) });
  return result.success;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isOldWorkerHost = url.hostname === 'tikvideo.tikvid.workers.dev';
    const isApiPath = url.pathname === '/api' || url.pathname.startsWith('/api/');
    if ((request.method === 'GET' || request.method === 'HEAD') && isOldWorkerHost && !isApiPath) return Response.redirect(`https://tikto.video${url.pathname}${url.search}`, 301);
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/favicon.png') return Response.redirect(`${originOf(request)}/favicon.ico`, 301);
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/favicon.ico') {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'image/x-icon');
      headers.set('Cache-Control', 'public, max-age=86400, must-revalidate');
      return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, statusText: response.statusText, headers });
    }
    if (request.method === 'GET' && url.pathname === '/robots.txt') return applySecurityHeaders(robotsResponse(request));
    if (request.method === 'GET' && url.pathname === '/atom.xml') return applySecurityHeaders(atomResponse(request));
    if (isApiPath) {
      try {
        const allowed = await enforceApiRateLimit(request, env, url.pathname);
        if (!allowed) return applySecurityHeaders(new Response(JSON.stringify({ success:false, error:{ message:'Too many requests. Please try again later.' } }), { status:429, headers:{ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'Retry-After':'60', 'X-Content-Type-Options':'nosniff' } }));
      } catch {
        return applySecurityHeaders(new Response(JSON.stringify({ success:false, error:{ message:'Rate limiting service unavailable.' } }), { status:503, headers:{ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' } }));
      }
    }
    const response = await app.fetch(request, env, ctx);
    return applySecurityHeaders(response);
  }
};
