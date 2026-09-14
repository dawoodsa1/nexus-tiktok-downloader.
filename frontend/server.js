import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const PORT = process.env.PORT || 3000;
const SECRET = process.env.TOKEN_SECRET || 'nexus_ultra_secret_key_2026';

function createToken(payload, ttl = 300) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttl };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  const [data, sig] = (token || '').split('.');
  if (!data || !sig) throw new Error('Invalid Token');
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (sig !== expected) throw new Error('Signature Mismatch');
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token Expired');
  return payload;
}

async function assertSafeUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  const addresses = await dns.lookup(parsed.hostname, { all: true });
  for (const { address } of addresses) {
    if (address.startsWith('127.') || address.startsWith('10.') || address.startsWith('192.168.') || address.startsWith('169.254.')) {
      throw new Error('Access to private IP blocked');
    }
  }
}

async function extractTikTok(url) {
  let finalUrl = url;
  if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    finalUrl = head.url || url;
  }
  const videoId = (finalUrl.match(/\/video\/(\d+)/) || [])[1] || 'video';
  const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`);
  const oembed = oembedRes.ok ? await oembedRes.json() : {};

  const pageRes = await fetch(finalUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await pageRes.text();
  let mediaUrl = null;
  let hdMediaUrl = null;

  const rehydrate = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/);
  if (rehydrate) {
    try {
      const json = JSON.parse(rehydrate[1]);
      const scope = json['__DEFAULT_SCOPE__'] || {};
      const item = scope['webapp.video-detail']?.itemInfo?.itemStruct;
      if (item) {
        mediaUrl = item.video?.playAddr || item.video?.downloadAddr;
        hdMediaUrl = item.video?.bitrateInfo?.[0]?.PlayAddr?.UrlList?.[0];
      }
    } catch {}
  }
  if (!mediaUrl) {
    const m = html.match(/"playAddr":"([^"]+)"/);
    if (m) mediaUrl = JSON.parse(`"${m[1]}"`);
  }
  if (!mediaUrl) throw new Error('Could not retrieve MP4 stream.');

  return {
    id: videoId,
    type: 'video',
    title: oembed.title || 'TikTok Video',
    thumbnail: oembed.thumbnail_url || '',
    mediaUrl,
    hdMediaUrl,
    author: { name: oembed.author_name || 'Creator', username: oembed.author_unique_id || 'user', avatar: '' },
    videoDuration: 0
  };
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'POST' && parsed.pathname === '/api/token') {
      const token = createToken({ session: crypto.randomUUID() }, 180);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, data: { token } }));
    }

    if (req.method === 'GET' && parsed.pathname === '/api/extract') {
      const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
      verifyToken(auth);
      const url = parsed.searchParams.get('url');
      if (!url) throw new Error('URL required');
      const data = await extractTikTok(url);
      const dlToken = createToken({ id: data.id, url: data.mediaUrl, q: 'sd' });
      const resp = { ...data, downloadUrl: `/api/download?token=${encodeURIComponent(dlToken)}` };
      if (data.hdMediaUrl) {
        const hdToken = createToken({ id: data.id, url: data.hdMediaUrl, q: 'hd' });
        resp.hdDownloadUrl = `/api/download?token=${encodeURIComponent(hdToken)}`;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, data: resp }));
    }

    if (req.method === 'GET' && parsed.pathname === '/api/download') {
      const token = parsed.searchParams.get('token');
      const payload = verifyToken(token);
      await assertSafeUrl(payload.url);
      const mediaRes = await fetch(payload.url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.tiktok.com/' } });
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="nexus_${payload.id}_${payload.q}.mp4"`
      });
      return Readable.fromWeb(mediaRes.body).pipe(res);
    }

    if (req.method === 'GET') {
      const fileMap = { '/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css', '/app.js': 'app.js' };
      const file = fileMap[parsed.pathname];
      if (file) {
        const ext = path.extname(file);
        const mime = ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : 'application/javascript';
        const content = await fs.readFile(path.join(FRONTEND_DIR, file));
        res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8` });
        return res.end(content);
      }
    }
    res.writeHead(404); res.end('Not Found');
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { message: err.message } }));
  }
});

server.listen(PORT, () => console.log(`Nexus running on port ${PORT}`));
