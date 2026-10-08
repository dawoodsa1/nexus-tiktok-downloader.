import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import worker from '../worker/seo-entry.js';
import { PAGE_FILES, STATIC_FILES, SITE_ORIGIN } from '../lib/site-routing.js';

const sitemap = await readFile(new URL('../frontend/sitemap.xml', import.meta.url), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const pageHtml = new Map(await Promise.all(Object.entries(PAGE_FILES).map(async ([pathname, file]) =>
  [SITE_ORIGIN + pathname, await readFile(new URL(`../frontend/${file}`, import.meta.url), 'utf8')]
)));
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map(match => [match[1], match[2]]));
}
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]));
}

test('the sitemap contains exactly the 14 final canonical pages', () => {
  assert.equal(urls.length, 14);
  assert.equal(new Set(urls).size, 14);
  assert.deepEqual(new Set(urls), new Set(pageHtml.keys()));
});

test('sitemap modification dates are valid, nonfuture dates for every final URL', () => {
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  assert.equal(entries.length, urls.length);
  for (const [, entry] of entries) {
    const date = entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    assert.match(date || '', /^\d{4}-\d{2}-\d{2}$/);
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    assert.ok(Number.isFinite(timestamp) && timestamp <= Date.now());
    assert.equal(new Date(timestamp).toISOString().slice(0, 10), date);
  }
});

test('FAQ structured answers match the visible questions and point to a real download form', () => {
  for (const pathname of ['/faq', '/ar/faq']) {
    const document = new JSDOM(pageHtml.get(SITE_ORIGIN + pathname)).window.document;
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    const details = [...document.querySelectorAll('.faq-list details')];
    assert.equal(schema.url, SITE_ORIGIN + pathname);
    assert.equal(schema.inLanguage, document.documentElement.lang);
    assert.equal(schema.mainEntity.length, details.length);
    for (const [index, detail] of details.entries()) {
      assert.equal(schema.mainEntity[index].name, detail.querySelector('summary').textContent);
      assert.equal(schema.mainEntity[index].acceptedAnswer.text, detail.querySelector('p').textContent);
    }
    const formPath = pathname.startsWith('/ar/') ? '/ar/' : '/';
    assert.ok(document.querySelector(`main a[href="${formPath}"]`));
    assert.doesNotMatch(document.querySelector('main').textContent, /paste it above|الصقه أعلاه/i);
  }
});

test('all pages have matching canonical, Open Graph and reciprocal language URLs', () => {
  const titles = new Set();
  for (const [url, html] of pageHtml) {
    const links = tags(html, 'link');
    assert.deepEqual(links.filter(link => link.rel === 'canonical').map(link => link.href), [url], url);
    assert.equal(tags(html, 'meta').find(meta => meta.property === 'og:url')?.content, url);
    assert.doesNotMatch(tags(html, 'meta').find(meta => meta.name === 'robots')?.content || '', /noindex|nofollow/i);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, url);
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    assert.ok(title && !titles.has(title), `unique title: ${url}`);
    titles.add(title);
    const alternates = links.filter(link => link.rel === 'alternate' && link.hreflang);
    assert.deepEqual(new Set(alternates.map(link => link.hreflang)), new Set(['en', 'ar', 'x-default']));
    for (const alternate of alternates) {
      assert.ok(pageHtml.has(alternate.href), `final language URL: ${alternate.href}`);
      const reciprocal = tags(pageHtml.get(alternate.href), 'link').filter(link => link.hreflang);
      assert.ok(reciprocal.some(link => link.href === url), `reciprocal link to ${url}`);
    }
    for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(match[1]));
    }
    for (const tag of [...tags(html, 'a'), ...tags(html, 'link'), ...tags(html, 'script'), ...tags(html, 'img')]) {
      const raw = tag.href || tag.src;
      if (!raw || raw.startsWith('#')) continue;
      const target = new URL(raw, url);
      if (target.origin !== SITE_ORIGIN) continue;
      assert.ok(Object.hasOwn(STATIC_FILES, target.pathname), `working direct link ${raw} on ${url}`);
    }
  }
});

test('installable app metadata uses a public start page and real PNG icons from every public page', async () => {
  const manifest = JSON.parse(await readFile(new URL('../frontend/site.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.short_name, 'TikVideo');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.id, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.prefer_related_applications, false);
  assert.ok(pageHtml.has(new URL(manifest.start_url, SITE_ORIGIN).href), 'app starts on a public canonical page');
  for (const size of ['192x192', '512x512']) {
    assert.ok(manifest.icons.some(icon => icon.sizes === size && icon.purpose === 'any'), `install icon: ${size}`);
  }
  const icons = [...manifest.icons, { src: '/icons/icon-180.png', sizes: '180x180' }];
  for (const icon of icons) {
    const pathname = new URL(icon.src, SITE_ORIGIN).pathname;
    assert.ok(Object.hasOwn(STATIC_FILES, pathname), `public icon: ${icon.src}`);
    const bytes = await readFile(new URL(`../frontend/${STATIC_FILES[pathname]}`, import.meta.url));
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes, icon.src);
  }
  for (const [url, html] of pageHtml) {
    const links = tags(html, 'link');
    assert.equal(links.find(link => link.rel === 'manifest')?.href, '/site.webmanifest?v=brand2', url);
    assert.equal(links.find(link => link.rel === 'apple-touch-icon')?.href, '/icons/icon-180.png?v=brand2', url);
    assert.ok(links.some(link => link.rel === 'icon' && link.type === 'image/png' && link.sizes === '192x192'), url);
  }
});

test('both homepages have a crawlable language switch without JavaScript', () => {
  for (const [pathname, destination] of [['/', '/ar/'], ['/ar/', '/']]) {
    const switchLink = tags(pageHtml.get(SITE_ORIGIN + pathname), 'a').find(link => link.id === 'language-btn');
    assert.equal(switchLink?.href, destination);
  }
});

const noAssets = { ASSETS: { fetch() { throw new Error('Unexpected asset lookup'); } } };
test('HTTP, www and legacy host aliases redirect permanently in one hop with the query intact', async () => {
  for (const origin of ['http://tikto.video', 'http://www.tikto.video', 'https://www.tikto.video', 'https://tikvideo.tikvid.workers.dev']) {
    const response = await worker.fetch(new Request(`${origin}/ar/about.html?ref=test%20link`), noAssets);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), `${SITE_ORIGIN}/ar/about?ref=test%20link`);
  }
  const response = await worker.fetch(new Request('http://tikto.video/api/token', { method: 'POST' }), noAssets);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('Location'), `${SITE_ORIGIN}/api/token`);
});

test('public pages stay available without the API secret and receive security headers', async () => {
  const requested = [];
  const env = { ASSETS: { async fetch(request) {
    requested.push(new URL(request.url).pathname);
    return new Response(request.method === 'HEAD' ? null : '<h1>Page</h1>', { headers: { 'Content-Type': 'text/html' } });
  } } };
  for (const [pathname, file] of Object.entries(PAGE_FILES)) {
    for (const method of ['GET', 'HEAD']) {
      const response = await worker.fetch(new Request(SITE_ORIGIN + pathname, { method }), env);
      assert.equal(response.status, 200);
      assert.equal(requested.at(-1), `/${file}`);
      assert.equal(response.headers.get('X-Robots-Tag'), null);
      assert.ok(response.headers.get('Strict-Transport-Security'));
      assert.match(response.headers.get('Content-Security-Policy'), /static\.cloudflareinsights\.com/);
      if (method === 'HEAD') assert.equal(await response.text(), '');
    }
  }
});

test('API secret checks and rate limiting do not block robots or public pages', async () => {
  const missingSecret = await worker.fetch(new Request(SITE_ORIGIN + '/api/token', { method: 'POST' }), noAssets);
  assert.equal(missingSecret.status, 500);
  const denied = { ...noAssets, RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const limited = await worker.fetch(new Request(SITE_ORIGIN + '/api/token', { method: 'POST' }), denied);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '60');
  const robots = await worker.fetch(new Request(SITE_ORIGIN + '/robots.txt'), denied);
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/tikto\.video\/sitemap\.xml/);
  const env = { ...noAssets, TOKEN_SECRET: 'test-only-secret-'.repeat(3) };
  const tokenResponse = await worker.fetch(new Request(SITE_ORIGIN + '/api/token', { method: 'POST' }), env);
  assert.equal(tokenResponse.status, 200);
  assert.ok((await tokenResponse.json()).data.token);
  const unauthorized = await worker.fetch(new Request(SITE_ORIGIN + '/api/extract'), env);
  assert.equal(unauthorized.status, 401);
});

test('private files and nonexistent pages return real 404 responses', async () => {
  for (const pathname of ['/server.js', '/package.json', '/.env', '/missing-page', '/ar/missing.html', '/constructor']) {
    const response = await worker.fetch(new Request(SITE_ORIGIN + pathname), noAssets);
    assert.equal(response.status, 404, pathname);
  }
});
