import app from './index.js';

function originOf(request) {
  return new URL(request.url).origin.replace(/\/$/, '');
}

function robotsResponse(request) {
  const origin = originOf(request);
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/atom.xml?redirect=false&start-index=1&max-results=500\n`,
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

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function atomResponse(request) {
  const origin = originOf(request);
  const now = new Date().toISOString();
  const entries = [
    ['/', 'TikVideo - TikTok Downloader'],
    ['/about.html', 'About TikVideo'],
    ['/privacy.html', 'Privacy Policy'],
    ['/terms.html', 'Terms of Service'],
    ['/copyright.html', 'Copyright'],
    ['/contact.html', 'Contact']
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${xmlEscape(origin)}/</id>
  <title>TikVideo - TikTok Downloader</title>
  <updated>${now}</updated>
  <link href="${xmlEscape(origin)}/" rel="alternate" type="text/html" />
${entries.map(([path, title]) => `  <entry>
    <id>${xmlEscape(origin + (path || '/'))}</id>
    <title>${xmlEscape(title)}</title>
    <updated>${now}</updated>
    <link href="${xmlEscape(origin + (path || '/'))}" rel="alternate" type="text/html" />
  </entry>`).join('\n')}
</feed>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/robots.txt') {
      return robotsResponse(request);
    }

    if (request.method === 'GET' && url.pathname === '/atom.xml') {
      return atomResponse(request);
    }

    return app.fetch(request, env, ctx);
  }
};
