const SESSION_TOKEN_TTL = 180;
const DOWNLOAD_TOKEN_TTL = 300;
const MAX_URL_LENGTH = 2048;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ALLOWED_TIKTOK_HOSTS = new Set(['tiktok.com','www.tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com','douyin.com','www.douyin.com']);
const INDEXABLE_PATHS = ['','/about.html','/privacy.html','/terms.html','/copyright.html','/contact.html'];

function b64url(bytes) {
  let binary='';
  const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes);
  for (let i=0;i<data.length;i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unb64url(value) {
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-value.length%4)%4)), c=>c.charCodeAt(0));
}
async function hmac(data, secret) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data)));
}
async function createToken(payload, ttl, secret) {
  const now=Math.floor(Date.now()/1000);
  const body=b64url(JSON.stringify({v:1,...payload,iat:now,exp:now+ttl}));
  return `${body}.${b64url(await hmac(body,secret))}`;
}
async function verifyToken(token, secret) {
  if(!token || typeof token!=='string') throw new Error('Invalid token.');
  const separator=token.indexOf('.'); if(separator<=0) throw new Error('Invalid token.');
  const data=token.slice(0,separator), signature=token.slice(separator+1);
  let received; try{received=unb64url(signature)}catch{throw new Error('Invalid token signature.')}
  const expected=await hmac(data,secret);
  if(received.length!==expected.length) throw new Error('Invalid token signature.');
  let different=0; for(let i=0;i<expected.length;i++) different|=expected[i]^received[i];
  if(different!==0) throw new Error('Invalid token signature.');
  let payload; try{payload=JSON.parse(new TextDecoder().decode(unb64url(data)))}catch{throw new Error('Invalid token payload.')}
  if(typeof payload.exp!=='number' || payload.exp<=Math.floor(Date.now()/1000)) throw new Error('Token expired.');
  return payload;
}
function validateTikTokUrl(rawUrl){
  if(typeof rawUrl!=='string'||!rawUrl.trim()) throw new Error('URL required.');
  const value=rawUrl.trim(); if(value.length>MAX_URL_LENGTH) throw new Error('URL is too long.');
  let parsed; try{parsed=new URL(value)}catch{throw new Error('Invalid URL.')}
  if(parsed.protocol!=='https:') throw new Error('Only HTTPS TikTok URLs are allowed.');
  const host=parsed.hostname.toLowerCase().replace(/\.$/,'');
  if(!ALLOWED_TIKTOK_HOSTS.has(host)) throw new Error('Only TikTok URLs are allowed.');
  return parsed.toString();
}
function validateMediaUrl(rawUrl){
  let parsed; try{parsed=new URL(rawUrl)}catch{throw new Error('Invalid media URL.')}
  if(parsed.protocol!=='https:') throw new Error('Only HTTPS media URLs are allowed.');
  const host=parsed.hostname.toLowerCase().replace(/\.$/,'');
  if(!host || host==='localhost' || host==='localhost.localdomain' || host==='0.0.0.0' || host==='::1' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Unsafe media host.');
  if(/^\d+(?:\.\d+){3}$/.test(host)){
    const [a,b,c,d]=host.split('.').map(Number);
    if(a===10 || a===127 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&b===168) || a===0 || a>=224) throw new Error('Unsafe media host.');
  }
  return parsed.toString();
}
function decodeEscapedString(value){
  if(typeof value!=='string') return null;
  let result=value.replaceAll('\\/','/').replaceAll('\\u0026','&').replaceAll('\\u002F','/');
  try{result=JSON.parse(`\"${result.replace(/\\/g,'\\\\').replace(/\"/g,'\\\"')}\"`)}catch{}
  return result;
}
function getAvatarUrl(author){
  if(!author) return '';
  for(const candidate of [author.avatarLarger,author.avatarMedium,author.avatarThumb,author.avatar]){
    if(typeof candidate==='string'&&/^https?:\/\//i.test(candidate)) return candidate;
    if(candidate&&Array.isArray(candidate.urlList)){const url=candidate.urlList.find(v=>typeof v==='string'&&/^https?:\/\//i.test(v));if(url)return url;}
  }
  return '';
}
function extractAvatarFromHtml(html){
  for(const pattern of [/\"avatarLarger\":\"([^\"]+)\"/i,/\"avatarMedium\":\"([^\"]+)\"/i,/\"avatarThumb\":\"([^\"]+)\"/i,/\"avatar\":\"([^\"]+)\"/i]){
    const match=html.match(pattern); if(!match)continue; const decoded=decodeEscapedString(match[1]); if(decoded&&/^https?:\/\//i.test(decoded))return decoded;
  } return '';
}
function chooseHighestBitrate(info){
  if(!Array.isArray(info))return null;
  return info.map(e=>({bitrate:Number(e?.Bitrate||0),url:Array.isArray(e?.PlayAddr?.UrlList)?e.PlayAddr.UrlList.find(v=>typeof v==='string'&&/^https?:\/\//i.test(v)):null})).filter(x=>x.url).sort((a,b)=>b.bitrate-a.bitrate)[0]?.url||null;
}
function getResponseCookies(response){
  try{
    if(typeof response.headers.getSetCookie==='function') return response.headers.getSetCookie().map(c=>c.split(';')[0]).filter(Boolean).join('; ');
    const raw=response.headers.get('set-cookie');
    if(!raw) return '';
    return raw.split(/,(?=[^;,]+=)/).map(c=>c.split(';')[0]).filter(Boolean).join('; ');
  }catch{return '';}
}
async function resolveTikTokUrl(rawUrl){
  const validated=validateTikTokUrl(rawUrl), parsed=new URL(validated), host=parsed.hostname.toLowerCase();
  if(host==='vm.tiktok.com'||host==='vt.tiktok.com'){
    const response=await fetch(validated,{redirect:'follow',headers:{'User-Agent':USER_AGENT,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Accept-Language':'en-US,en;q=0.9'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`TikTok redirect failed (${response.status}).`);
    return validateTikTokUrl(response.url);
  }
  return validated;
}
async function extractTikTok(rawUrl){
  const finalUrl=await resolveTikTokUrl(rawUrl), videoId=(finalUrl.match(/\/video\/(\d+)/)||[])[1]||null;
  let oembed={};
  try{const r=await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`,{headers:{Accept:'application/json','User-Agent':USER_AGENT},signal:AbortSignal.timeout(15000)});if(r.ok){try{oembed=await r.json()}catch{}}}catch{}
  const page=await fetch(finalUrl,{redirect:'follow',headers:{'User-Agent':USER_AGENT,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8','Accept-Language':'en-US,en;q=0.9','Cache-Control':'no-cache','Upgrade-Insecure-Requests':'1'},signal:AbortSignal.timeout(20000)});
  if(!page.ok)throw new Error(`TikTok returned HTTP ${page.status}.`);
  const html=await page.text();
  const cookies=getResponseCookies(page);
  let item=null; const rehydrate=html.match(/<script[^>]+id=[\"']__UNIVERSAL_DATA_FOR_REHYDRATION__[\"'][^>]*>([\s\S]*?)<\/script>/i);
  if(rehydrate){try{const json=JSON.parse(rehydrate[1]);item=json?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct||null}catch{}}
  let mediaUrl=item?.video?.playAddr||null,downloadUrl=item?.video?.downloadAddr||null,hdMediaUrl=chooseHighestBitrate(item?.video?.bitrateInfo);
  const duration=Number(item?.video?.duration||0);
  if(!mediaUrl){const m=html.match(/\"playAddr\":\"([^\"]+)\"/);if(m){const d=decodeEscapedString(m[1]);if(d&&/^https?:\/\//i.test(d))mediaUrl=d;}}
  if(!downloadUrl){const m=html.match(/\"downloadAddr\":\"([^\"]+)\"/);if(m){const d=decodeEscapedString(m[1]);if(d&&/^https?:\/\//i.test(d))downloadUrl=d;}}
  if(!mediaUrl&&!downloadUrl)throw new Error('Could not retrieve an available MP4 stream from TikTok.');
  if(!mediaUrl)mediaUrl=downloadUrl;
  const avatar=getAvatarUrl(item?.author)||extractAvatarFromHtml(html);
  for(const candidate of [mediaUrl,downloadUrl,hdMediaUrl].filter(Boolean)) validateMediaUrl(candidate);
  return {id:videoId||item?.id||'video',type:'video',title:oembed.title||item?.desc||'TikTok Video',thumbnail:oembed.thumbnail_url||'',mediaUrl,downloadUrl,hdMediaUrl,sourceUrl:finalUrl,mediaHeaders:{'User-Agent':USER_AGENT,Referer:finalUrl,Cookie:cookies},author:{name:oembed.author_name||item?.author?.nickname||'Creator',username:oembed.author_unique_id||item?.author?.uniqueId||'user',avatar},videoDuration:Number.isFinite(duration)?duration:0};
}
async function fetchTikwmData(sourceUrl){
  const r=await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(sourceUrl)}&hd=1`,{headers:{'User-Agent':USER_AGENT,Accept:'application/json',Referer:'https://www.tikwm.com/'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`Fallback provider returned HTTP ${r.status}.`);
  const json=await r.json(); if(json?.code!==0||!json?.data)throw new Error(json?.msg||'Fallback provider returned no media.');
  const data=json.data,urls=[data.hdplay,data.play,data.wmplay].filter(v=>typeof v==='string'&&/^https?:\/\//i.test(v));
  if(!urls.length)throw new Error('Fallback provider returned no downloadable media URL.');
  const safeUrls=[]; for(const url of urls){try{safeUrls.push(validateMediaUrl(url))}catch{}}
  if(!safeUrls.length)throw new Error('Fallback provider returned no safe media URL.');
  return {urls:safeUrls,title:data.title||'',duration:Number(data.duration||0)};
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function error(message,status=400){return json({success:false,error:{message}},status)}
function mediaResponse(response){
  const headers=new Headers();
  for(const name of ['Content-Type','Content-Length','Content-Range','Accept-Ranges','ETag','Last-Modified']){const v=response.headers.get(name);if(v)headers.set(name,v)}
  headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function fetchMedia(mediaUrl,mediaHeaders,request){
  const safeUrl=validateMediaUrl(mediaUrl);
  const headers={'User-Agent':mediaHeaders?.['User-Agent']||USER_AGENT,Accept:'*/*',Referer:mediaHeaders?.Referer||'https://www.tiktok.com/',Origin:'https://www.tiktok.com','Accept-Encoding':'identity'};
  const range=request.headers.get('Range'); if(range)headers.Range=range;
  if(mediaHeaders?.Cookie)headers.Cookie=mediaHeaders.Cookie;
  try{
    const r=await fetch(safeUrl,{redirect:'follow',headers,signal:AbortSignal.timeout(60000)});
    if(!r.ok && r.status!==206) return r;
    if(r.body) return r;
    return r;
  }catch{return null}
}
function xmlEscape(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&apos;')}
function getOrigin(request){return new URL(request.url).origin.replace(/\/$/,'')}
function sitemapResponse(request){
  const origin=getOrigin(request);
  const urls=INDEXABLE_PATHS.map(path=>`  <url><loc>${xmlEscape(origin+(path||'/'))}</loc></url>`).join('\n');
  const body=`<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${urls}\n</urlset>\n`;
  return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
async function assetResponse(request,env){
  const response=await env.ASSETS.fetch(request);
  const contentType=response.headers.get('content-type')||'';
  if(!response.ok || !contentType.toLowerCase().includes('text/html')) return response;
  const content=await response.text();
  if(!content.includes('__CANONICAL_URL__')) return new Response(content,{status:response.status,statusText:response.statusText,headers:response.headers});
  const headers=new Headers(response.headers); headers.set('Cache-Control','no-store');
  return new Response(content.replaceAll('__CANONICAL_URL__',getOrigin(request)),{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const secret=env.TOKEN_SECRET;
    if(!secret||secret.length<32) return error('Server secret is not configured.',500);
    try{
      if(request.method==='POST'&&url.pathname==='/api/token') return json({success:true,data:{token:await createToken({scope:'extract'},SESSION_TOKEN_TTL,secret)}});
      if(request.method==='GET'&&url.pathname==='/api/extract'){
        const auth=request.headers.get('Authorization')||'';
        if(!auth.startsWith('Bearer ')) return error('Authorization required.',401);
        await verifyToken(auth.slice(7),secret);
        const sourceUrl=validateTikTokUrl(url.searchParams.get('url'));
        let data;
        try{data=await extractTikTok(sourceUrl)}catch(primary){
          const fallback=await fetchTikwmData(sourceUrl);
          data={id:'video',type:'video',title:fallback.title||'TikTok Video',thumbnail:'',mediaUrl:fallback.urls[0],downloadUrl:fallback.urls[0],hdMediaUrl:fallback.urls[0],sourceUrl,mediaHeaders:{'User-Agent':USER_AGENT,Referer:'https://www.tiktok.com/'},author:{name:'Creator',username:'user',avatar:''},videoDuration:fallback.duration||0};
        }
        const downloadToken=await createToken({scope:'download',sourceUrl:data.sourceUrl,mediaUrl:data.mediaUrl,downloadUrl:data.downloadUrl,hdMediaUrl:data.hdMediaUrl,mediaHeaders:data.mediaHeaders},DOWNLOAD_TOKEN_TTL,secret);
        return json({success:true,data:{id:data.id,type:data.type,title:data.title,thumbnail:data.thumbnail,videoDuration:data.videoDuration,author:data.author,downloadUrl:`/api/download?token=${encodeURIComponent(downloadToken)}&quality=standard`,hdDownloadUrl:data.hdMediaUrl?`/api/download?token=${encodeURIComponent(downloadToken)}&quality=hd`:null}});
      }
      if(request.method==='GET'&&url.pathname==='/api/download'){
        const payload=await verifyToken(url.searchParams.get('token'),secret);
        if(payload.scope!=='download') return error('Invalid download token.',401);
        const mediaUrl=url.searchParams.get('quality')==='hd'?(payload.hdMediaUrl||payload.downloadUrl||payload.mediaUrl):(payload.downloadUrl||payload.mediaUrl);
        if(!mediaUrl) return error('No media URL.',404);
        const upstream=await fetchMedia(mediaUrl,payload.mediaHeaders||{},request);
        if(!upstream) return error('Unable to retrieve media.',502);
        if(!(upstream.ok||upstream.status===206)) return error(`Media source returned HTTP ${upstream.status}.`,502);
        return mediaResponse(upstream);
      }
      if(url.pathname==='/robots.txt') return new Response(`User-agent: *\nAllow: /\nSitemap: ${getOrigin(request)}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
      if(url.pathname==='/sitemap.xml') return sitemapResponse(request);
      return assetResponse(request,env);
    }catch(e){return error(e?.message||'Internal server error.',500)}
  }
};
