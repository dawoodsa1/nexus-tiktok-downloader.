import 'dotenv/config';

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';


/* =========================================================
   Configuration
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(
  __dirname,
  '..',
  'frontend'
);

const PORT = Number(
  process.env.PORT || 3000
);

/*
 * IMPORTANT:
 * TOKEN_SECRET must remain unchanged between server restarts.
 */
const SECRET = process.env.TOKEN_SECRET;

if (
  !SECRET ||
  SECRET.trim().length < 32
) {
  throw new Error(
    'TOKEN_SECRET is missing or too short. Add a stable secret of at least 32 characters to .env'
  );
}

const SESSION_TOKEN_TTL = 180;
const DOWNLOAD_TOKEN_TTL = 300;

const MAX_URL_LENGTH = 2048;


/* =========================================================
   Hosts
========================================================= */

const ALLOWED_TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  'douyin.com',
  'www.douyin.com'
]);


/* =========================================================
   Token
========================================================= */

function createToken(payload, ttl) {
  const now =
    Math.floor(Date.now() / 1000);

  const body = {
    v: 1,
    ...payload,
    iat: now,
    exp: now + ttl
  };

  const data = Buffer
    .from(JSON.stringify(body))
    .toString('base64url');

  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}


function verifyToken(token) {
  if (
    !token ||
    typeof token !== 'string'
  ) {
    throw new Error(
      'Invalid token.'
    );
  }

  const separator =
    token.indexOf('.');

  if (separator <= 0) {
    throw new Error(
      'Invalid token.'
    );
  }

  const data =
    token.slice(0, separator);

  const signature =
    token.slice(separator + 1);

  if (
    !data ||
    !signature
  ) {
    throw new Error(
      'Invalid token.'
    );
  }

  const expected =
    crypto
      .createHmac('sha256', SECRET)
      .update(data)
      .digest();

  let received;

  try {
    received =
      Buffer.from(
        signature,
        'base64url'
      );
  } catch {
    throw new Error(
      'Invalid token signature.'
    );
  }

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(
      received,
      expected
    )
  ) {
    throw new Error(
      'Invalid token signature.'
    );
  }

  let payload;

  try {
    payload =
      JSON.parse(
        Buffer
          .from(data, 'base64url')
          .toString('utf8')
      );
  } catch {
    throw new Error(
      'Invalid token payload.'
    );
  }

  const now =
    Math.floor(Date.now() / 1000);

  if (
    typeof payload.exp !== 'number' ||
    payload.exp <= now
  ) {
    throw new Error(
      'Token expired.'
    );
  }

  return payload;
}


/* =========================================================
   TikTok URL Validation
========================================================= */

function isAllowedTikTokHost(hostname) {
  const host =
    hostname
      .toLowerCase()
      .replace(/\.$/, '');

  return ALLOWED_TIKTOK_HOSTS.has(host);
}


function validateTikTokUrl(rawUrl) {
  if (
    typeof rawUrl !== 'string' ||
    !rawUrl.trim()
  ) {
    throw new Error(
      'URL required.'
    );
  }

  const value =
    rawUrl.trim();

  if (
    value.length > MAX_URL_LENGTH
  ) {
    throw new Error(
      'URL is too long.'
    );
  }

  let parsed;

  try {
    parsed =
      new URL(value);
  } catch {
    throw new Error(
      'Invalid URL.'
    );
  }

  if (
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      'Only HTTPS TikTok URLs are allowed.'
    );
  }

  if (
    !isAllowedTikTokHost(
      parsed.hostname
    )
  ) {
    throw new Error(
      'Only TikTok URLs are allowed.'
    );
  }

  return parsed.toString();
}


/* =========================================================
   IP / SSRF Protection
========================================================= */

function isPrivateIp(address) {
  const version =
    net.isIP(address);

  if (version === 4) {

    const [
      a,
      b
    ] =
      address
        .split('.')
        .map(Number);

    if (a === 10) return true;

    if (
      a === 172 &&
      b >= 16 &&
      b <= 31
    ) {
      return true;
    }

    if (
      a === 192 &&
      b === 168
    ) {
      return true;
    }

    if (a === 127) return true;

    if (
      a === 169 &&
      b === 254
    ) {
      return true;
    }

    if (a === 0) return true;

    return false;
  }

  if (version === 6) {

    const value =
      address.toLowerCase();

    if (
      value === '::' ||
      value === '::1'
    ) {
      return true;
    }

    if (
      value.startsWith('fc') ||
      value.startsWith('fd')
    ) {
      return true;
    }

    if (
      value.startsWith('fe8') ||
      value.startsWith('fe9') ||
      value.startsWith('fea') ||
      value.startsWith('feb')
    ) {
      return true;
    }

    return false;
  }

  return true;
}


async function assertSafeUrl(rawUrl) {
  let parsed;

  try {
    parsed =
      new URL(rawUrl);
  } catch {
    throw new Error(
      'Invalid media URL.'
    );
  }

  if (
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      'Only HTTPS media URLs are allowed.'
    );
  }

  const addresses =
    await dns.lookup(
      parsed.hostname,
      {
        all: true,
        verbatim: true
      }
    );

  if (!addresses.length) {
    throw new Error(
      'Media host could not be resolved.'
    );
  }

  for (
    const { address } of addresses
  ) {
    if (isPrivateIp(address)) {
      throw new Error(
        'Access to private network addresses is blocked.'
      );
    }
  }
}


/* =========================================================
   Resolve Short URL
========================================================= */

async function resolveTikTokUrl(rawUrl) {
  const validated =
    validateTikTokUrl(rawUrl);

  const parsed =
    new URL(validated);

  const hostname =
    parsed.hostname.toLowerCase();

  if (
    hostname === 'vm.tiktok.com' ||
    hostname === 'vt.tiktok.com'
  ) {

    const response =
      await fetch(
        validated,
        {
          method: 'GET',
          redirect: 'follow',

          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',

            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',

            'Accept-Language':
              'en-US,en;q=0.9'
          },

          signal:
            AbortSignal.timeout(15000)
        }
      );

    if (!response.ok) {
      throw new Error(
        `TikTok redirect failed (${response.status}).`
      );
    }

    return validateTikTokUrl(
      response.url
    );
  }

  return validated;
}


/* =========================================================
   Decode TikTok escaped strings
========================================================= */

function decodeEscapedString(value) {
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  try {
    return JSON.parse(
      `"${value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
      }"`
    );
  } catch {
    try {
      return value
        .replaceAll('\\/', '/')
        .replaceAll('\u0026', '&')
        .replaceAll('\\u0026', '&')
        .replaceAll('\\u002F', '/')
        .replaceAll('\\/', '/');
    } catch {
      return value;
    }
  }
}


/* =========================================================
   Extract Avatar
========================================================= */

function getAvatarUrlFromAuthor(author) {

  if (!author) {
    return '';
  }

  const candidates = [
    author.avatarLarger,
    author.avatarMedium,
    author.avatarThumb,
    author.avatar
  ];


  for (
    const candidate of candidates
  ) {

    if (
      typeof candidate === 'string' &&
      /^https?:\/\//i.test(candidate)
    ) {
      return candidate;
    }


    if (
      candidate &&
      Array.isArray(candidate.urlList)
    ) {

      const url =
        candidate.urlList.find(
          value =>
            typeof value === 'string' &&
            /^https?:\/\//i.test(value)
        );

      if (url) {
        return url;
      }
    }
  }

  return '';
}


function extractAvatarFromHtml(html) {

  const patterns = [

    /"avatarLarger":"([^"]+)"/i,

    /"avatarMedium":"([^"]+)"/i,

    /"avatarThumb":"([^"]+)"/i,

    /"avatar":"([^"]+)"/i

  ];


  for (
    const pattern of patterns
  ) {

    const match =
      html.match(pattern);

    if (!match) {
      continue;
    }

    const decoded =
      decodeEscapedString(
        match[1]
      );

    if (
      decoded &&
      /^https?:\/\//i.test(decoded)
    ) {
      return decoded;
    }
  }

  return '';
}


/* =========================================================
   Extract Media
========================================================= */

function chooseHighestBitrate(
  bitrateInfo
) {

  if (
    !Array.isArray(bitrateInfo)
  ) {
    return null;
  }

  const candidates =
    bitrateInfo
      .map(entry => {

        const urlList =
          entry?.PlayAddr?.UrlList;

        const url =
          Array.isArray(urlList)
            ? urlList.find(
                value =>
                  typeof value === 'string' &&
                  /^https?:\/\//i.test(value)
              )
            : null;

        return {
          bitrate:
            Number(
              entry?.Bitrate || 0
            ),

          url
        };

      })
      .filter(
        item => item.url
      );


  candidates.sort(
    (a, b) =>
      b.bitrate - a.bitrate
  );


  return candidates[0]?.url || null;
}


/* =========================================================
   TikTok Extraction
========================================================= */

async function extractTikTok(rawUrl) {

  const finalUrl =
    await resolveTikTokUrl(
      rawUrl
    );


  const videoId =
    (
      finalUrl.match(
        /\/video\/(\d+)/
      ) || []
    )[1] || null;


  /* -------------------------------------------------------
     oEmbed
  ------------------------------------------------------- */

  let oembed = {};

  try {

    const response =
      await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`,
        {
          headers: {
            'Accept':
              'application/json',

            'User-Agent':
              'Mozilla/5.0'
          },

          signal:
            AbortSignal.timeout(15000)
        }
      );


    if (response.ok) {

      try {
        oembed =
          await response.json();
      } catch {
        oembed = {};
      }
    }

  } catch {
    oembed = {};
  }


  /* -------------------------------------------------------
     TikTok Page
  ------------------------------------------------------- */

  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36';


  const pageResponse =
    await fetch(
      finalUrl,
      {
        redirect: 'follow',

        headers: {
          'User-Agent':
            userAgent,

          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',

          'Accept-Language':
            'en-US,en;q=0.9',

          'Cache-Control':
            'no-cache'
        },

        signal:
          AbortSignal.timeout(20000)
      }
    );


  if (!pageResponse.ok) {
    throw new Error(
      `TikTok returned HTTP ${pageResponse.status}.`
    );
  }


  const html =
    await pageResponse.text();


  /* -------------------------------------------------------
     Universal Data
  ------------------------------------------------------- */

  let item = null;

  const rehydrate =
    html.match(
      /<script[^>]+id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i
    );


  if (rehydrate) {

    try {

      const json =
        JSON.parse(
          rehydrate[1]
        );

      const scope =
        json?.__DEFAULT_SCOPE__ || {};

      item =
        scope?.['webapp.video-detail']
          ?.itemInfo
          ?.itemStruct ||
        null;

    } catch {
      item = null;
    }
  }


  /* -------------------------------------------------------
     Media URLs
  ------------------------------------------------------- */

  let mediaUrl = null;
  let hdMediaUrl = null;

  let duration = 0;


  if (item?.video) {

    mediaUrl =
      item.video.playAddr ||
      item.video.downloadAddr ||
      null;


    duration =
      Number(
        item.video.duration || 0
      );


    hdMediaUrl =
      chooseHighestBitrate(
        item.video.bitrateInfo
      );
  }


  /* -------------------------------------------------------
     HTML fallback
  ------------------------------------------------------- */

  if (!mediaUrl) {

    const match =
      html.match(
        /"playAddr":"([^"]+)"/
      );


    if (match) {

      const decoded =
        decodeEscapedString(
          match[1]
        );

      if (
        decoded &&
        /^https?:\/\//i.test(decoded)
      ) {
        mediaUrl = decoded;
      }
    }
  }


  if (!mediaUrl) {
    throw new Error(
      'Could not retrieve an available MP4 stream from TikTok.'
    );
  }


  /* -------------------------------------------------------
     Avatar
  ------------------------------------------------------- */

  let avatar =
    getAvatarUrlFromAuthor(
      item?.author
    );


  if (!avatar) {
    avatar =
      extractAvatarFromHtml(
        html
      );
  }


  /* -------------------------------------------------------
     Security validation
  ------------------------------------------------------- */

  await assertSafeUrl(
    mediaUrl
  );


  if (hdMediaUrl) {

    try {
      await assertSafeUrl(
        hdMediaUrl
      );
    } catch {
      hdMediaUrl = null;
    }
  }


  /* -------------------------------------------------------
     Result
  ------------------------------------------------------- */

  return {

    id:
      videoId ||
      item?.id ||
      'video',

    type:
      'video',

    title:
      oembed.title ||
      item?.desc ||
      'TikTok Video',

    thumbnail:
      oembed.thumbnail_url ||
      '',

    mediaUrl,

    hdMediaUrl,

    sourceUrl:
      finalUrl,

    userAgent,

    author: {

      name:
        oembed.author_name ||
        item?.author?.nickname ||
        'Creator',

      username:
        oembed.author_unique_id ||
        item?.author?.uniqueId ||
        'user',

      avatar
    },

    videoDuration:
      Number.isFinite(duration)
        ? duration
        : 0
  };
}


/* =========================================================
   Media Request
========================================================= */

async function fetchMedia(
  mediaUrl,
  sourceUrl,
  userAgent,
  clientRequest
) {

  await assertSafeUrl(
    mediaUrl
  );


  const headers = {

    'User-Agent':
      userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',

    'Accept':
      '*/*',

    'Referer':
      sourceUrl ||
      'https://www.tiktok.com/',

    'Origin':
      'https://www.tiktok.com'
  };


  if (
    clientRequest.headers.range
  ) {
    headers.Range =
      clientRequest.headers.range;
  }


  const response =
    await fetch(
      mediaUrl,
      {
        method: 'GET',

        redirect: 'follow',

        headers,

        signal:
          AbortSignal.timeout(60000)
      }
    );


  if (
    response.status === 403
  ) {
    throw new Error(
      'TikTok media server returned HTTP 403 for the current media source.'
    );
  }


  if (!response.ok) {
    throw new Error(
      `Media server returned HTTP ${response.status}.`
    );
  }


  if (!response.body) {
    throw new Error(
      'Media response has no body.'
    );
  }


  return response;
}


/* =========================================================
   JSON
========================================================= */

function sendJson(
  res,
  statusCode,
  data
) {

  res.writeHead(
    statusCode,
    {
      'Content-Type':
        'application/json; charset=utf-8',

      'Cache-Control':
        'no-store',

      'X-Content-Type-Options':
        'nosniff'
    }
  );

  res.end(
    JSON.stringify(data)
  );
}


function sendError(
  res,
  statusCode,
  message
) {

  sendJson(
    res,
    statusCode,
    {
      success: false,
      error: {
        message
      }
    }
  );
}


/* =========================================================
   Frontend
========================================================= */

const FILE_MAP = {

  '/':
    'index.html',

  '/index.html':
    'index.html',

  '/styles.css':
    'styles.css',

  '/app.js':
    'app.js'
};


async function serveFrontend(
  pathname,
  res
) {

  const file =
    FILE_MAP[pathname];

  if (!file) {
    return false;
  }


  const content =
    await fs.readFile(
      path.join(
        FRONTEND_DIR,
        file
      )
    );


  const ext =
    path.extname(file);


  let mime =
    'application/octet-stream';


  if (ext === '.html') {
    mime = 'text/html';
  }

  if (ext === '.css') {
    mime = 'text/css';
  }

  if (ext === '.js') {
    mime = 'application/javascript';
  }


  res.writeHead(
    200,
    {
      'Content-Type':
        `${mime}; charset=utf-8`,

      'X-Content-Type-Options':
        'nosniff'
    }
  );


  res.end(content);

  return true;
}


/* =========================================================
   Server
========================================================= */

const server =
  http.createServer(
    async (req, res) => {

      try {

        const host =
          req.headers.host ||
          `localhost:${PORT}`;


        const parsed =
          new URL(
            req.url || '/',
            `http://${host}`
          );


        /* ---------------------------------------------------
           Session Token
        --------------------------------------------------- */

        if (
          req.method === 'POST' &&
          parsed.pathname === '/api/token'
        ) {

          const token =
            createToken(
              {
                session:
                  crypto.randomUUID()
              },
              SESSION_TOKEN_TTL
            );


          return sendJson(
            res,
            200,
            {
              success: true,

              data: {
                token
              }
            }
          );
        }


        /* ---------------------------------------------------
           Extract
        --------------------------------------------------- */

        if (
          req.method === 'GET' &&
          parsed.pathname === '/api/extract'
        ) {

          const authorization =
            req.headers.authorization ||
            '';


          const sessionToken =
            authorization.replace(
              /^Bearer\s+/i,
              ''
            );


          verifyToken(
            sessionToken
          );


          const rawUrl =
            parsed.searchParams.get(
              'url'
            );


          if (!rawUrl) {
            throw new Error(
              'URL required.'
            );
          }


          const data =
            await extractTikTok(
              rawUrl
            );


          /*
           * Store the TikTok source URL,
           * not the temporary CDN URL.
           */

          const downloadToken =
            createToken(
              {
                id:
                  data.id,

                sourceUrl:
                  data.sourceUrl,

                userAgent:
                  data.userAgent,

                q:
                  'sd'
              },
              DOWNLOAD_TOKEN_TTL
            );


          const responseData = {
            ...data,

            downloadUrl:
              `/api/download?token=${encodeURIComponent(downloadToken)}`
          };


          if (data.hdMediaUrl) {

            const hdToken =
              createToken(
                {
                  id:
                    data.id,

                  sourceUrl:
                    data.sourceUrl,

                  userAgent:
                    data.userAgent,

                  q:
                    'hd'
                },
                DOWNLOAD_TOKEN_TTL
              );


            responseData.hdDownloadUrl =
              `/api/download?token=${encodeURIComponent(hdToken)}`;
          }


          delete responseData.mediaUrl;
          delete responseData.hdMediaUrl;
          delete responseData.sourceUrl;
          delete responseData.userAgent;


          return sendJson(
            res,
            200,
            {
              success: true,
              data: responseData
            }
          );
        }


        /* ---------------------------------------------------
           Download
        --------------------------------------------------- */

        if (
          req.method === 'GET' &&
          parsed.pathname === '/api/download'
        ) {

          const token =
            parsed.searchParams.get(
              'token'
            );


          const payload =
            verifyToken(
              token
            );


          if (
            !payload.sourceUrl ||
            !payload.id
          ) {
            throw new Error(
              'Invalid download token.'
            );
          }


          /*
           * Get a fresh media source.
           */

          const freshData =
            await extractTikTok(
              payload.sourceUrl
            );


          let mediaUrl =
            freshData.mediaUrl;


          if (
            payload.q === 'hd' &&
            freshData.hdMediaUrl
          ) {
            mediaUrl =
              freshData.hdMediaUrl;
          }


          if (!mediaUrl) {
            throw new Error(
              'No media source is currently available.'
            );
          }


          const mediaResponse =
            await fetchMedia(
              mediaUrl,
              freshData.sourceUrl,
              freshData.userAgent,
              req
            );


          const contentType =
            mediaResponse
              .headers
              .get(
                'content-type'
              ) ||
            'video/mp4';


          const contentLength =
            mediaResponse
              .headers
              .get(
                'content-length'
              );


          const contentRange =
            mediaResponse
              .headers
              .get(
                'content-range'
              );


          const safeId =
            String(
              freshData.id ||
              payload.id
            )
              .replace(
                /[^a-zA-Z0-9_-]/g,
                '_'
              );


          const quality =
            payload.q === 'hd'
              ? 'hd'
              : 'sd';


          const responseHeaders = {

            'Content-Type':
              contentType.includes('video')
                ? contentType
                : 'video/mp4',

            'Content-Disposition':
              `attachment; filename="nexus_${safeId}_${quality}.mp4"`,

            'Cache-Control':
              'no-store',

            'X-Content-Type-Options':
              'nosniff',

            'Accept-Ranges':
              'bytes'
          };


          if (contentLength) {
            responseHeaders[
              'Content-Length'
            ] =
              contentLength;
          }


          if (contentRange) {
            responseHeaders[
              'Content-Range'
            ] =
              contentRange;
          }


          const statusCode =
            mediaResponse.status === 206
              ? 206
              : 200;


          res.writeHead(
            statusCode,
            responseHeaders
          );


          return Readable
            .fromWeb(
              mediaResponse.body
            )
            .pipe(res);
        }


        /* ---------------------------------------------------
           Frontend
        --------------------------------------------------- */

        if (
          req.method === 'GET'
        ) {

          const served =
            await serveFrontend(
              parsed.pathname,
              res
            );


          if (served) {
            return;
          }
        }


        return sendError(
          res,
          404,
          'Not Found.'
        );

      } catch (error) {

        console.error(
          'Nexus server error:',
          error
        );


        if (res.headersSent) {

          try {
            res.destroy();
          } catch {}

          return;
        }


        let status = 400;


        if (
          /token/i.test(
            error?.message || ''
          )
        ) {
          status = 401;
        }


        return sendError(
          res,
          status,
          error?.message ||
          'Internal server error.'
        );
      }
    }
  );


/* =========================================================
   Start
========================================================= */

server.listen(
  PORT,
  () => {
    console.log(
      `Nexus TikTok Downloader running on port ${PORT}`
    );
  }
);
