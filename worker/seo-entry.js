import app from './index.js';

const INDEXABLE_PATHS = ['', '/about.html', '/privacy.html', '/terms.html', '/copyright.html', '/contact.html'];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function originOf(request) {
  return new URL(request.url).origin.replace(/\/$/, '');
}

function sitemapResponse(request) {
  const origin = originOf(request);
  const urls = INDEXABLE_PATHS
    .map(path => `  <url><loc>${xmlEscape(origin + (path || '/'))}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
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

    if (request.method === 'GET' && url.pathname === '/sitemap.xml') {
      return sitemapResponse(request);
    }

    if (request.method === 'GET' && url.pathname === '/robots.txt') {
      return robotsResponse(request);
    }

    return app.fetch(request, env, ctx);
  }
};
