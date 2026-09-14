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
   Paths / Configuration
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const PORT = Number(process.env.PORT || 3000);

const SECRET =
  process.env.TOKEN_SECRET ||
  crypto.randomBytes(32).toString('hex');


const TOKEN_TTL = 180;
const DOWNLOAD_TOKEN_TTL = 300;


/* =========================================================
   Security / Constants
========================================================= */

const MAX_URL_LENGTH = 2048;

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
   Token Helpers
========================================================= */

function createToken(payload, ttl = TOKEN_TTL) {
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttl
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
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token.');
  }

  const separator = token.indexOf('.');

  if (separator <= 0) {
    throw new Error('Invalid token.');
  }

  const data = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (!data || !signature) {
    throw new Error('Invalid token.');
  }

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest();

  let received;

  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    throw new Error('Invalid token signature.');
  }

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    throw new Error('Invalid token signature.');
  }

  let payload;

  try {
    payload = JSON.parse(
      Buffer
        .from(data, 'base64url')
        .toString('utf8')
    );
  } catch {
    throw new Error('Invalid token payload.');
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    typeof payload.exp !== 'number' ||
    payload.exp <= now
  ) {
    throw new Error('Token expired.');
  }

  return payload;
}


/* =========================================================
   URL / Host Validation
========================================================= */

function isAllowedTikTokHost(hostname) {
  const host = hostname
    .toLowerCase()
    .replace(/\.$/, '');

  if (ALLOWED_TIKTOK_HOSTS.has(host)) {
    return true;
  }

  return false;
}


function validateTikTokUrl(rawUrl) {
  if (
    typeof rawUrl !== 'string' ||
    !rawUrl.trim()
  ) {
    throw new Error('URL required.');
  }

  if (rawUrl.length > MAX_URL_LENGTH) {
    throw new Error('URL is too long.');
  }

  let parsed;

  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed.');
  }

  if (!isAllowedTikTokHost(parsed.hostname)) {
    throw new Error('Only TikTok URLs are allowed.');
  }

  return parsed.toString();
}


/* =========================================================
   IP / SSRF Protection
========================================================= */

function isPrivateIp(address) {
  const version = net.isIP(address);

  if (version === 4) {
    const parts = address
      .split('.')
      .map(Number);

    const [a, b] = parts;

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

    if (
      a === 0
    ) {
      return true;
    }

    return false;
  }

  if (version === 6) {
    const normalized =
      address.toLowerCase();

    if (
      normalized === '::1' ||
      normalized === '::'
    ) {
      return true;
    }

    if (
      normalized.startsWith('fc') ||
      normalized.startsWith('fd')
    ) {
      return true;
    }

    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
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
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid media URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS media URLs are allowed.');
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
    throw new Error('Media host could not be resolved.');
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(
        'Access to private network addresses is blocked.'
      );
    }
  }
}


/* =========================================================
   TikTok URL Resolution
========================================================= */

async function resolveTikTokUrl(url) {
  const parsed = new URL(url);

  const hostname =
    parsed.hostname.toLowerCase();

  if (
    hostname === 'vm.tiktok.com' ||
    hostname === 'vt.tiktok.com'
  ) {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(
        `TikTok redirect failed (${response.status}).`
      );
    }

    const finalUrl = response.url;

    return validateTikTokUrl(finalUrl);
  }

  return validateTikTokUrl(url);
}


/* =========================================================
   TikTok Extraction
========================================================= */

async function extractTikTok(rawUrl) {
  const finalUrl =
    await resolveTikTokUrl(rawUrl);

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
    const oembedResponse =
      await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent':
              'Mozilla/5.0'
          },
          signal:
            AbortSignal.timeout(15000)
        }
      );

    if (oembedResponse.ok) {
      try {
        oembed =
          await oembedResponse.json();
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

  const pageResponse =
    await fetch(
      finalUrl,
      {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language':
            'en-US,en;q=0.9'
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


  let mediaUrl = null;
  let hdMediaUrl = null;
  let duration = 0;

  let item = null;


  /* -------------------------------------------------------
     Universal Rehydration Data
  ------------------------------------------------------- */

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
          ?.itemStruct || null;

    } catch {
      item = null;
    }
  }


  /* -------------------------------------------------------
     Media URL
  ------------------------------------------------------- */

  if (item?.video) {

    mediaUrl =
      item.video.playAddr ||
      item.video.downloadAddr ||
      null;


    const bitrateInfo =
      Array.isArray(
        item.video.bitrateInfo
      )
        ? item.video.bitrateInfo
        : [];


    if (bitrateInfo.length) {

      const candidates =
        bitrateInfo
          .map(entry => ({
            bitrate:
              Number(entry?.Bitrate || 0),

            url:
              entry?.PlayAddr
                ?.UrlList
                ?.find(Boolean) ||
              entry?.PlayAddr
                ?.UrlList?.[0] ||
              null
          }))
          .filter(entry => entry.url);


      candidates.sort(
        (a, b) =>
          b.bitrate - a.bitrate
      );


      if (candidates.length) {
        hdMediaUrl =
          candidates[0].url;
      }
    }


    duration =
      Number(
        item.video.duration || 0
      );
  }


  /* -------------------------------------------------------
     Fallback playAddr
  ------------------------------------------------------- */

  if (!mediaUrl) {

    const match =
      html.match(
        /"playAddr":"([^"]+)"/
      );

    if (match) {

      try {
        mediaUrl =
          JSON.parse(
            `"${match[1]}"`
          );
      } catch {
        mediaUrl = null;
      }
    }
  }


  if (!mediaUrl) {
    throw new Error(
      'Could not retrieve an available MP4 stream from TikTok.'
    );
  }


  /* -------------------------------------------------------
     Validate extracted media URLs
  ------------------------------------------------------- */

  await assertSafeUrl(mediaUrl);

  if (hdMediaUrl) {
    try {
      await assertSafeUrl(hdMediaUrl);
    } catch {
      hdMediaUrl = null;
    }
  }


  /* -------------------------------------------------------
     Result
  ------------------------------------------------------- */

  return {
    id: videoId || 'video',

    type: 'video',

    title:
      oembed.title ||
      item?.desc ||
      'TikTok Video',

    thumbnail:
      oembed.thumbnail_url ||
      '',

    mediaUrl,

    hdMediaUrl,

    author: {
      name:
        oembed.author_name ||
        item?.author?.nickname ||
        'Creator',

      username:
        oembed.author_unique_id ||
        item?.author?.uniqueId ||
        'user',

      avatar:
        oembed.author_url ||
        ''
    },

    videoDuration:
      Number.isFinite(duration)
        ? duration
        : 0
  };
}


/* =========================================================
   HTTP Helpers
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
   Static Frontend
========================================================= */

const FILE_MAP = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js'
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

  const filePath =
    path.join(
      FRONTEND_DIR,
      file
    );

  const content =
    await fs.readFile(filePath);

  const ext =
    path.extname(file);

  let mime =
    'application/octet-stream';

  if (ext === '.html') {
    mime = 'text/html';
  } else if (ext === '.css') {
    mime = 'text/css';
  } else if (ext === '.js') {
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
              TOKEN_TTL
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
            req.headers.authorization || '';

          const token =
            authorization.replace(
              /^Bearer\s+/i,
              ''
            );

          verifyToken(token);

          const rawUrl =
            parsed.searchParams.get('url');

          if (!rawUrl) {
            throw new Error(
              'URL required.'
            );
          }

          const data =
            await extractTikTok(rawUrl);


          const downloadToken =
            createToken(
              {
                id: data.id,
                url: data.mediaUrl,
                q: 'sd'
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
                  id: data.id,
                  url: data.hdMediaUrl,
                  q: 'hd'
                },
                DOWNLOAD_TOKEN_TTL
              );

            responseData.hdDownloadUrl =
              `/api/download?token=${encodeURIComponent(hdToken)}`;
          }


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
            verifyToken(token);


          if (
            !payload.url ||
            !payload.id
          ) {
            throw new Error(
              'Invalid download token.'
            );
          }


          await assertSafeUrl(
            payload.url
          );


          const mediaResponse =
            await fetch(
              payload.url,
              {
                redirect: 'follow',

                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',

                  'Referer':
                    'https://www.tiktok.com/'
                },

                signal:
                  AbortSignal.timeout(60000)
              }
            );


          if (!mediaResponse.ok) {

            throw new Error(
              `Media server returned HTTP ${mediaResponse.status}.`
            );
          }


          if (!mediaResponse.body) {
            throw new Error(
              'Media response has no body.'
            );
          }


          const contentType =
            mediaResponse.headers.get(
              'content-type'
            ) || 'video/mp4';


          const safeId =
            String(payload.id)
              .replace(
                /[^a-zA-Z0-9_-]/g,
                '_'
              );


          const quality =
            payload.q === 'hd'
              ? 'hd'
              : 'sd';


          res.writeHead(
            200,
            {
              'Content-Type':
                contentType.includes('video')
                  ? contentType
                  : 'video/mp4',

              'Content-Disposition':
                `attachment; filename="nexus_${safeId}_${quality}.mp4"`,

              'Cache-Control':
                'no-store',

              'X-Content-Type-Options':
                'nosniff'
            }
          );


          return Readable
            .fromWeb(mediaResponse.body)
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


        /* ---------------------------------------------------
           404
        --------------------------------------------------- */

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


        const message =
          error?.message ||
          'Internal server error.';


        const status =
          /token/i.test(message)
            ? 401
            : /Only TikTok URLs/i.test(message)
              ? 400
              : /URL required/i.test(message)
                ? 400
                : 400;


        return sendError(
          res,
          status,
          message
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
