import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { PAGE_FILES } from '../lib/site-routing.js';

async function unusedPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function checkServer(label, command) {
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  let logs = '';
  const child = spawn(process.execPath, command(port), {
    env: { ...process.env, PORT: String(port), TOKEN_SECRET: '', WRANGLER_SEND_METRICS: 'false', CI: 'true' },
    detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  const get = (pathname, options = {}) => fetch(origin + pathname, {
    redirect: 'manual', signal: AbortSignal.timeout(10000), ...options
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 160; attempt++) {
      if (child.exitCode !== null) throw new Error(`${label} exited: ${logs}`);
      try {
        const response = await get('/robots.txt');
        ready = response.status === 200;
        await response.arrayBuffer();
      } catch {}
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, `${label} did not start: ${logs}`);
    for (const [pathname, file] of Object.entries(PAGE_FILES)) {
      const response = await get(pathname);
      assert.equal(response.status, 200, `${label}: ${pathname}`);
      assert.equal(response.headers.get('X-Robots-Tag'), null);
      assert.match(response.headers.get('Content-Type'), /text\/html/);
      assert.ok(response.headers.get('Content-Security-Policy'));
      assert.equal(await response.text(), await readFile(new URL(`../frontend/${file}`, import.meta.url), 'utf8'));
      const head = await get(pathname, { method: 'HEAD' });
      assert.equal(head.status, 200, `HEAD ${pathname}`);
      assert.equal(await head.text(), '');
      if (!pathname.endsWith('/')) {
        for (const suffix of ['.html', '/', '/index', '/index.html']) {
          const alias = await get(pathname + suffix + '?source=search');
          assert.equal(alias.status, 301, pathname + suffix);
          assert.equal(alias.headers.get('Location'), origin + pathname + '?source=search');
          await alias.arrayBuffer();
        }
      }
    }
    for (const [pathname, finalPath] of [['/ar', '/ar/'], ['/ar/index.html', '/ar/'], ['/index.html', '/'], ['/favicon.png', '/favicon.ico']]) {
      const response = await get(pathname);
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('Location'), origin + finalPath);
      await response.arrayBuffer();
    }
    for (const file of ['app.js', 'styles.css', 'legal.css', 'favicon.ico', 'og-image.svg', 'sitemap.xml', 'googlec0345ce99ca76489.html']) {
      const response = await get('/' + file);
      assert.equal(response.status, 200, file);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL(`../frontend/${file}`, import.meta.url)));
    }
    const robots = await get('/robots.txt');
    assert.match(await robots.text(), /Sitemap: https:\/\/tikto\.video\/sitemap\.xml/);
    for (const pathname of ['/robots.txt', '/sitemap.xml', '/favicon.ico']) {
      const head = await get(pathname, { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), '');
    }
    for (const pathname of ['/server.js', '/package.json', '/.assetsignore', '/missing-page', '/ar/missing.html']) {
      const response = await get(pathname);
      assert.equal(response.status, 404, pathname);
      await response.arrayBuffer();
    }
    const api = await get('/api/token', { method: 'POST' });
    assert.equal(api.status, 500, 'API still requires a configured secret');
    assert.match((await api.json()).error.message, /secret/i);
    console.log(`${label}: all 14 pages, HEAD, redirects, assets, 404s and API isolation passed`);
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    const exited = child.exitCode === null ? once(child, 'exit') : Promise.resolve();
    if (child.exitCode === null) {
      if (process.platform === 'win32') child.kill();
      else process.kill(-child.pid, 'SIGTERM');
    }
    await Promise.race([exited, delay(3000)]);
    if (child.exitCode === null && process.platform !== 'win32') {
      try { process.kill(-child.pid, 'SIGKILL'); } catch {}
    }
  }
}

await checkServer('Cloudflare local runtime', port => [
  'node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1',
  '--port', String(port), '--inspector-port', '0', '--log-level', 'error'
]);
await checkServer('Node server', () => ['frontend/server.js']);
