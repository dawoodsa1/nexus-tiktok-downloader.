import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = __dirname;
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.TOKEN_SECRET;
const SESSION_TOKEN_TTL = 180;
const DOWNLOAD_TOKEN_TTL = 300;
const MAX_URL_LENGTH = 2048;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

if (!SECRET || SECRET.trim().length < 32) {
  throw new Error('TOKEN_SECRET is missing or too short. Add a stable secret of at least 32 characters to .env');
}

const ALLOWED_TIKTOK_HOSTS = new Set(['tiktok.com','www.tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com','douyin.com','www.douyin.com']);

function createToken(payload, ttl) {
  const now = Math.floor(Date.now() / 1000);
  const body = { v: 1, ...payload, iat: now, exp: now + ttl };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') throw new Error('Invalid token.');
  const separator = token.indexOf('.');
  if (separator <= 0) throw new Error('Invalid token.');
  const data = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest();
  let received;
  try { received = Buffer.from(signature, 'base64url'); } catch { throw new Error('Invalid token signature.'); }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new Error('Invalid token signature.');
  let payload;
  try { payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); } catch { throw new Error('Invalid token payload.'); }
  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token expired.');
  return payload;
}

function validateTikTokUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) throw new Error('URL required.');
  const value = rawUrl.trim();
  if (value.length > MAX_URL_LENGTH) throw new Error('URL is too long.');
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('Invalid URL.'); }
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS TikTok URLs are allowed.');
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!ALLOWED_TIKTOK_HOSTS.has(host)) throw new Error('Only TikTok URLs are allowed.');
  return parsed.toString();
}

function isPrivateIp(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127 || (a === 169 && b === 254) || a === 0;
  }
  if (version === 6) {
    const v = address.toLowerCase();
    return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb');
  }
  return true;
}

async function assertSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error('Invalid media URL.'); }
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS media URLs are allowed.');
  const addresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('Media host could not be resolved.');
  for (const { address } of addresses) if (isPrivateIp(address)) throw new Error('Access to private network addresses is blocked.');
}

function getResponseCookies(response) {
  try {
    if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie().map(c => c.split(';')[0]).filter(Boolean).join('; ');
    const raw = response.headers.get('set-cookie');
    if (!raw) return '';
    return raw.split(/,(?=[^;,]+=)/).map(c => c.split(';')[0]).filter(Boolean).join('; ');
  } catch { return ''; }
}

function decodeEscapedString(value) {
  if (typeof value !== 'string') return null;
  let result = value.replaceAll('\\/', '/').replaceAll('\\u0026', '&').replaceAll('\\u002F', '/');
  try { result = JSON.parse(`"${result.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`); } catch {}
  return result;
}

function getAvatarUrlFromAuthor(author) {
  if (!author) return '';
  const candidates = [author.avatarLarger, author.avatarMedium, author.avatarThumb, author.avatar];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate;
    if (candidate && Array.isArray(candidate.urlList)) {
      const url = candidate.urlList.find(v => typeof v === 'string' && /^https?:\/\//i.test(v));
      if (url) return url;
    }
  }
  return '';
}

function extractAvatarFromHtml(html) {
  for (const pattern of [/"avatarLarger":"([^"]+)"/i, /"avatarMedium":"([^"]+)"/i, /"avatarThumb":"([^"]+)"/i, /"avatar":"([^"]+)"/i]) {
    const match = html.match(pattern);
    if (!match) continue;
    const decoded = decodeEscapedString(match[1]);
    if (decoded && /^https?:\/\//i.test(decoded)) return decoded;
  }
  return '';
}

function chooseHighestBitrate(bitrateInfo) {
  if (!Array.isArray(bitrateInfo)) return null;
  const candidates = bitrateInfo.map(entry => {
    const urlList = entry?.PlayAddr?.UrlList;
    const url = Array.isArray(urlList) ? urlList.find(v => typeof v === 'string' && /^https?:\/\//i.test(v)) : null;
    return { bitrate: Number(entry?.Bitrate || 0), url };
  }).filter(x => x.url);
  candidates.sort((a, b) => b.bitrate - a.bitrate);
  return candidates[0]?.url || null;
}

async function resolveTikTokUrl(rawUrl) {
  const validated = validateTikTokUrl(rawUrl);
  const parsed = new URL(validated);
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
    const response = await fetch(validated, { redirect:'follow', headers:{'User-Agent':USER_AGENT,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Accept-Language':'en-US,en;q=0.9'}, signal:AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`TikTok redirect failed (${response.status}).`);
    return validateTikTokUrl(response.url);
  }
  return validated;
}

async function extractTikTok(rawUrl) {
  const finalUrl = await resolveTikTokUrl(rawUrl);
  const videoId = (finalUrl.match(/\/video\/(\d+)/) || [])[1] || null;
  let oembed = {};
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`, { headers:{Accept:'application/json','User-Agent':USER_AGENT}, signal:AbortSignal.timeout(15000) });
    if (response.ok) { try { oembed = await response.json(); } catch {} }
  } catch {}
  const pageResponse = await fetch(finalUrl, { redirect:'follow', headers:{'User-Agent':USER_AGENT,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8','Accept-Language':'en-US,en;q=0.9','Cache-Control':'no-cache','Upgrade-Insecure-Requests':'1'}, signal:AbortSignal.timeout(20000) });
  if (!pageResponse.ok) throw new Error(`TikTok returned HTTP ${pageResponse.status}.`);
  const html = await pageResponse.text();
  const cookies = getResponseCookies(pageResponse);
  let item = null;
  const rehydrate = html.match(/<script[^>]+id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (rehydrate) { try { const json = JSON.parse(rehydrate[1]); item = json?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct || null; } catch {} }
  let mediaUrl = item?.video?.playAddr || null;
  let downloadUrl = item?.video?.downloadAddr || null;
  let hdMediaUrl = chooseHighestBitrate(item?.video?.bitrateInfo);
  const duration = Number(item?.video?.duration || 0);
  if (!mediaUrl) { const match = html.match(/"playAddr":"([^"]+)"/); if (match) { const decoded = decodeEscapedString(match[1]); if (decoded && /^https?:\/\//i.test(decoded)) mediaUrl = decoded; } }
  if (!downloadUrl) { const match = html.match(/"downloadAddr":"([^"]+)"/); if (match) { const decoded = decodeEscapedString(match[1]); if (decoded && /^https?:\/\//i.test(decoded)) downloadUrl = decoded; } }
  if (!mediaUrl && !downloadUrl) throw new Error('Could not retrieve an available MP4 stream from TikTok.');
  if (!mediaUrl) mediaUrl = downloadUrl;
  let avatar = getAvatarUrlFromAuthor(item?.author);
  if (!avatar) avatar = extractAvatarFromHtml(html);
  if (mediaUrl) { try { await assertSafeUrl(mediaUrl); } catch { mediaUrl = null; } }
  if (downloadUrl) { try { await assertSafeUrl(downloadUrl); } catch { downloadUrl = null; } }
  if (hdMediaUrl) { try { await assertSafeUrl(hdMediaUrl); } catch { hdMediaUrl = null; } }
  if (!mediaUrl && downloadUrl) mediaUrl = downloadUrl;
  if (!mediaUrl) throw new Error('No valid media URL was found.');
  return { id:videoId || item?.id || 'video', type:'video', title:oembed.title || item?.desc || 'TikTok Video', thumbnail:oembed.thumbnail_url || '', mediaUrl, downloadUrl, hdMediaUrl, sourceUrl:finalUrl, mediaHeaders:{'User-Agent':USER_AGENT,Referer:finalUrl,Cookie:cookies}, author:{name:oembed.author_name || item?.author?.nickname || 'Creator',username:oembed.author_unique_id || item?.author?.uniqueId || 'user',avatar}, videoDuration:Number.isFinite(duration) ? duration : 0 };
}

async function fetchTikwmData(sourceUrl) {
  const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(sourceUrl)}&hd=1`, { headers:{'User-Agent':USER_AGENT,Accept:'application/json',Referer:'https://www.tikwm.com/'}, signal:AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Fallback provider returned HTTP ${response.status}.`);
  const json = await response.json();
  if (json?.code !== 0 || !json?.data) throw new Error(json?.msg || 'Fallback provider returned no media.');
  const data = json.data;
  const urls = [data.hdplay,data.play,data.wmplay].filter(v => typeof v === 'string' && /^https?:\/\//i.test(v));
  if (!urls.length) throw new Error('Fallback provider returned no downloadable media URL.');
  const safeUrls = [];
  for (const url of urls) { try { await assertSafeUrl(url); safeUrls.push(url); } catch {} }
  return { urls:safeUrls, title:data.title || '', duration:Number(data.duration || 0) };
}

async function fetchMedia(mediaUrl, mediaHeaders, clientRequest) {
  await assertSafeUrl(mediaUrl);
  const range = clientRequest.headers.range;
  const profiles = [
    {'User-Agent':mediaHeaders?.['User-Agent'] || USER_AGENT,Accept:'*/*',Referer:mediaHeaders?.Referer || 'https://www.tiktok.com/',Origin:'https://www.tiktok.com','Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'video','Accept-Encoding':'identity'},
    {'User-Agent':USER_AGENT,Accept:'*/*',Referer:'https://www.tiktok.com/',Origin:'https://www.tiktok.com','Accept-Encoding':'identity'},
    {'User-Agent':USER_AGENT,Accept:'video/mp4,video/*;q=0.9,*/*;q=0.8','Accept-Encoding':'identity'}
  ];
  if (mediaHeaders?.Cookie) profiles[0].Cookie = mediaHeaders.Cookie;
  let lastResponse = null;
  for (const headers of profiles) {
    if (range) headers.Range = range;
    try { const response = await fetch(mediaUrl,{redirect:'follow',headers,signal:AbortSignal.timeout(60000)}); if ((response.ok || response.status === 206) && response.body) return response; lastResponse=response; console.log(`Media source returned HTTP ${response.status}`); } catch (error) { console.error('Media source failed:',error?.message); }
  }
  return lastResponse;
}

function sendJson(res,statusCode,data){res.writeHead(statusCode,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function sendError(res,statusCode,message){sendJson(res,statusCode,{success:false,error:{message}});}

const FILE_MAP = {
  '/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/legal.css':'legal.css',
  '/about.html':'about.html','/privacy.html':'privacy.html','/terms.html':'terms.html','/copyright.html':'copyright.html','/contact.html':'contact.html',
  '/googlec0345ce99ca76489.html':'googlec0345ce99ca76489.html'
};
const INDEXABLE_PATHS = ['','/about.html','/privacy.html','/terms.html','/copyright.html','/contact.html'];

function getPublicOrigin(req){
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto === 'https' ? 'https' : 'http';
  const host = forwardedHost || req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`.replace(/\/$/,'');
}

function applyCanonicalPlaceholders(content, origin){ return content.replaceAll('__CANONICAL_URL__',origin); }

async function serveFrontend(pathname,res,req){
  const file = FILE_MAP[pathname];
  if (!file) return false;
  let content = await fs.readFile(path.join(FRONTEND_DIR,file),'utf8');
  const ext = path.extname(file);
  const mime = ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : 'application/javascript';
  if (ext === '.html') content = applyCanonicalPlaceholders(content,getPublicOrigin(req));
  res.writeHead(200,{'Content-Type':`${mime}; charset=utf-8`,'X-Content-Type-Options':'nosniff','Cache-Control':ext === '.html' ? 'public, max-age=300' : 'public, max-age=3600'});
  res.end(content);
  return true;
}

function sendRobots(req,res){
  const origin = getPublicOrigin(req);
  const body = `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}); res.end(body);
}

function sendSitemap(req,res){
  const origin = getPublicOrigin(req);
  const urls = INDEXABLE_PATHS.map(p => `<url><loc>${origin}${p || '/'}</loc></url>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}); res.end(body);
}

const server = http.createServer(async (req,res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const parsed = new URL(req.url || '/',`http://${host}`);
    if (req.method === 'GET' && parsed.pathname === '/robots.txt') return sendRobots(req,res);
    if (req.method === 'GET' && parsed.pathname === '/sitemap.xml') return sendSitemap(req,res);
    if (req.method === 'POST' && parsed.pathname === '/api/token') return sendJson(res,200,{success:true,data:{token:createToken({session:crypto.randomUUID()},SESSION_TOKEN_TTL)}});
    if (req.method === 'GET' && parsed.pathname === '/api/extract') {
      const auth=req.headers.authorization || ''; verifyToken(auth.replace(/^Bearer\s+/i,''));
      const rawUrl=parsed.searchParams.get('url'); if(!rawUrl) throw new Error('URL required.');
      const data=await extractTikTok(rawUrl);
      const downloadToken=createToken({id:data.id,sourceUrl:data.sourceUrl,q:'sd'},DOWNLOAD_TOKEN_TTL);
      const responseData={...data,downloadUrl:`/api/download?token=${encodeURIComponent(downloadToken)}`};
      if(data.hdMediaUrl){const hdToken=createToken({id:data.id,sourceUrl:data.sourceUrl,q:'hd'},DOWNLOAD_TOKEN_TTL);responseData.hdDownloadUrl=`/api/download?token=${encodeURIComponent(hdToken)}`;}
      delete responseData.mediaUrl; delete responseData.downloadUrl; delete responseData.hdMediaUrl; delete responseData.sourceUrl; delete responseData.mediaHeaders;
      responseData.downloadUrl=`/api/download?token=${encodeURIComponent(downloadToken)}`;
      return sendJson(res,200,{success:true,data:responseData});
    }
    if (req.method === 'GET' && parsed.pathname === '/api/download') {
      const payload=verifyToken(parsed.searchParams.get('token')); if(!payload.sourceUrl || !payload.id) throw new Error('Invalid download token.');
      const freshData=await extractTikTok(payload.sourceUrl); const candidates=[];
      if(freshData.hdMediaUrl)candidates.push(freshData.hdMediaUrl); if(freshData.mediaUrl)candidates.push(freshData.mediaUrl); if(freshData.downloadUrl)candidates.push(freshData.downloadUrl);
      const unique=[...new Set(candidates.filter(Boolean))]; let mediaResponse=null;
      for(const candidate of unique){console.log('Trying native media source:',new URL(candidate).hostname);mediaResponse=await fetchMedia(candidate,freshData.mediaHeaders,req);if(mediaResponse?.body && (mediaResponse.ok || mediaResponse.status===206))break;mediaResponse=null;}
      if(!mediaResponse){console.log('Native TikTok media request failed; trying fallback provider.');try{const fallback=await fetchTikwmData(payload.sourceUrl);for(const candidate of fallback.urls){console.log('Trying fallback media source:',new URL(candidate).hostname);mediaResponse=await fetchMedia(candidate,{'User-Agent':USER_AGENT,Referer:'https://www.tikwm.com/'},req);if(mediaResponse?.body && (mediaResponse.ok || mediaResponse.status===206))break;mediaResponse=null;}}catch(fallbackError){console.error('Fallback provider failed:',fallbackError?.message);}}
      if(!mediaResponse)throw new Error('TikTok media servers rejected the request (403). Native and fallback sources were unavailable.');
      const contentType=mediaResponse.headers.get('content-type') || 'video/mp4'; const contentLength=mediaResponse.headers.get('content-length'); const contentRange=mediaResponse.headers.get('content-range'); const acceptRanges=mediaResponse.headers.get('accept-ranges') || 'bytes'; const safeId=String(freshData.id || payload.id || 'video').replace(/[^a-zA-Z0-9_-]/g,'_'); const quality=payload.q === 'hd' ? 'hd' : 'sd';
      const headers={'Content-Type':contentType.includes('video') ? contentType : 'video/mp4','Content-Disposition':`attachment; filename="nexus_${safeId}_${quality}.mp4"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':acceptRanges};
      if(contentLength)headers['Content-Length']=contentLength; if(contentRange)headers['Content-Range']=contentRange; res.writeHead(mediaResponse.status===206?206:200,headers); return Readable.fromWeb(mediaResponse.body).pipe(res);
    }
    if(req.method === 'GET' && await serveFrontend(parsed.pathname,res,req)) return;
    return sendError(res,404,'Not Found.');
  } catch(error){console.error('Nexus server error:',error);if(res.headersSent){try{res.destroy();}catch{}return;}const message=error?.message || 'Internal server error.';return sendError(res,/token/i.test(message)?401:400,message);}
});

server.listen(PORT,()=>console.log(`Nexus TikTok Downloader running on port ${PORT}`));