import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = __dirname;
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

async function extractTikTok(url) {
  // محرك الاستخراج المباشر والسريع
  try {
    const apiRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && json.data && (json.data.play || json.data.hdplay)) {
        const d = json.data;
        let playUrl = d.play || '';
        if (playUrl.startsWith('/')) playUrl = `https://www.tikwm.com${playUrl}`;
        
        let hdUrl = d.hdplay || d.play || '';
        if (hdUrl.startsWith('/')) hdUrl = `https://www.tikwm.com${hdUrl}`;

        return {
          id: d.id || 'video',
          type: 'video',
          title: d.title || 'TikTok Video',
          thumbnail: d.cover || d.origin_cover || '',
          mediaUrl: playUrl,
          hdMediaUrl: (hdUrl && hdUrl !== playUrl) ? hdUrl : null,
          author: {
            name: d.author?.nickname || 'Creator',
            username: d.author?.unique_id || 'user',
            avatar: d.author?.avatar || ''
          },
          videoDuration: d.duration || 0
        };
      }
    }
  } catch (err) {
    console.error('Extract error:', err);
  }

  throw new Error('تعذر استخراج الفيديو، يرجى التأكد من أن الرابط عام وصحيح.');
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
      
      const mediaRes = await fetch(payload.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.tiktok.com/'
        },
        redirect: 'follow'
      });

      if (!mediaRes.ok) {
        res.writeHead(mediaRes.status || 502, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('فشل في جلب وسائط الفيديو.');
      }

      const headers = {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="nexus_${payload.id}_${payload.q}.mp4"`,
        'Cache-Control': 'no-cache'
      };

      const cl = mediaRes.headers.get('content-length');
      if (cl) headers['Content-Length'] = cl;

      res.writeHead(200, headers);
      return Readable.fromWeb(mediaRes.body).pipe(res);
    }

    if (req.method === 'GET') {
      const fileMap = { '/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css', '/app.js': 'app.js' };
      const file = fileMap[parsed.pathname];
      if (file) {
        const ext = path.extname(file);
        const mime = ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : 'application/javascript';
        let content;
        try {
          content = await fs.readFile(path.join(FRONTEND_DIR, file));
        } catch {
          content = await fs.readFile(path.join(FRONTEND_DIR, 'frontend', file));
        }
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
