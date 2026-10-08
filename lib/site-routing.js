export const SITE_ORIGIN = 'https://tikto.video';

const pageNames = ['about', 'privacy', 'terms', 'copyright', 'contact', 'faq'];
export const PAGE_FILES = Object.freeze({
  '/': 'index.html',
  '/ar/': 'ar/index.html',
  ...Object.fromEntries(pageNames.flatMap(name => [
    [`/${name}`, `${name}.html`],
    [`/ar/${name}`, `ar/${name}.html`]
  ]))
});

export const STATIC_FILES = Object.freeze({
  ...PAGE_FILES,
  ...Object.fromEntries([
    'styles.css', 'app.js', 'legal.css', 'legal.js', 'favicon.ico',
    'favicon.png', 'og-image.svg', 'sitemap.xml', 'googlec0345ce99ca76489.html',
    'site.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png',
    'icons/icon-512.png', 'icons/icon-maskable-512.png'
  ].map(file => [`/${file}`, file]))
});

const aliases = new Map([
  ['/index', '/'], ['/index.html', '/'], ['/index/', '/'],
  ['/ar', '/ar/'], ['/ar/index', '/ar/'], ['/ar/index.html', '/ar/'], ['/ar/index/', '/ar/'],
  ['/favicon.png', '/favicon.ico']
]);
for (const pathname of Object.keys(PAGE_FILES)) {
  if (pathname.endsWith('/')) continue;
  for (const suffix of ['.html', '/', '/index', '/index.html']) {
    aliases.set(`${pathname}${suffix}`, pathname);
  }
}

const publicHosts = new Set(['tikto.video', 'www.tikto.video', 'tikvideo.tikvid.workers.dev']);

// Combine scheme, hostname and page aliases into one redirect; keep query strings.
// Local development and authenticated Cloudflare previews keep their own origin.
export function canonicalRedirect(url, method = 'GET') {
  const pathname = method === 'GET' || method === 'HEAD'
    ? aliases.get(url.pathname) || url.pathname
    : url.pathname;
  const origin = publicHosts.has(url.hostname) ? SITE_ORIGIN : url.origin;
  if (pathname === url.pathname && origin === url.origin) return null;
  return `${origin}${pathname}${url.search}`;
}

export const ROBOTS_TEXT = `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
