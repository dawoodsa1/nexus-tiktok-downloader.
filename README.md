# TikVideo

TikVideo serves static English and Arabic pages and a Cloudflare Worker API for retrieving available TikTok videos, photos and supported public stories. The production origin is `https://tikto.video`.

## Development and checks

Use Node.js 22 or newer (CI uses Node.js 24).

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:runtime
npx wrangler deploy --dry-run
```

`npm run test:runtime` starts the actual local Cloudflare runtime and the alternative Node server, checks all 14 pages and their redirects, then stops both processes. It does not contact TikTok or require production credentials.

For Cloudflare development, run `npx wrangler dev`. For the alternative Node server, run `npm start`. Set a stable `TOKEN_SECRET` of at least 32 characters in Cloudflare secrets, or in a local `.dev.vars` / `.env` file as appropriate. Public pages, robots and the sitemap remain available without this secret; API requests require it. Never commit secret files.

## Public URLs and deployment

- The English home is `/`; the Arabic home is `/ar/`.
- Informational pages use extensionless URLs, for example `/about` and `/ar/faq`.
- `lib/site-routing.js` defines public files and permanent redirects. HTML files remain on disk with their `.html` extensions.
- Canonical tags, language alternates, navigation and `frontend/sitemap.xml` all point directly to the final URLs.
- Keep each sitemap `lastmod` accurate: update it when the page's content, meaningful links or structured data actually changes. Do not refresh all dates for CSS-only changes or every deployment. FAQ JSON-LD must match the visible questions and answers; the tests verify this.
- Cloudflare must invoke the Worker before assets (`run_worker_first: true`). The Worker handles redirects and headers, then fetches the exact file with `html_handling: "none"`. Keep these settings together. Requests through the Worker count toward the Worker request allowance.
- `frontend/.assetsignore` excludes backend and package files; the public file map also prevents access to unlisted files. Add new public pages to the map and sitemap together.
- GitHub CI checks syntax, metadata, frontend interaction regressions, both runtimes, the deployment bundle and sitemap XML. The existing Cloudflare Workers Builds connection deploys the `main` branch; this repository does not contain Cloudflare credentials.
- Keep the `tikto.video` custom domain attached to this Worker in Cloudflare. HTTP and `www` requests are redirected when they reach the Worker. A `www` DNS/custom-domain binding must exist in Cloudflare for `www` to reach this code. The old `workers.dev` endpoint intentionally remains disabled.
- The alternative Node server honors `X-Forwarded-Proto` for TLS termination and should only be exposed through a trusted reverse proxy that sets that header.

## Search Console after deployment

The sitemap URL stays `https://tikto.video/sitemap.xml`. Submit it after meaningful updates and inspect the final canonical URLs. Manual indexing requests are optional for important updated pages; there is no need to request every sitemap URL individually. Old `.html` URLs are expected to be excluded as redirected pages. Search Console summary reports can lag behind URL Inspection. A successful live test confirms technical accessibility, not a guarantee that Google will index every page.

Public story downloads use the existing media extraction path and require a supported, still-available share link. Private or expired stories are not guaranteed to work. Download links expire after five minutes; submit the source URL again when needed.
