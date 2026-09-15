import app from './index.js';

function originOf(request) {
  return new URL(request.url).origin.replace(/\/$/, '');
}

function robotsResponse(request) {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${originOf(request)}/sitemap.xml\n`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/robots.txt') {
      return robotsResponse(request);
    }

    return app.fetch(request, env, ctx);
  }
};
