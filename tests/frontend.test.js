import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const app = await readFile(new URL('../frontend/app.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const video = { type: 'video', title: 'Sample story', downloadUrl: '/api/download?token=test', author: {} };
async function page(t, fetch, language = 'en') {
  const file = language === 'ar' ? 'ar/index.html' : 'index.html';
  const source = await readFile(new URL('../frontend/' + file, import.meta.url), 'utf8');
  const dom = new JSDOM(source.replace(/<script\b[^>]*src=[^>]*><\/script>/g, ''), {
    url: 'https://tikto.video/' + (language === 'ar' ? 'ar/' : ''), runScripts: 'outside-only'
  });
  t.after(() => dom.window.close());
  await new Promise(resolve => dom.window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  dom.window.fetch = fetch;
  dom.window.eval(app);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom.window;
}
function submit(w, url = 'https://vt.tiktok.com/sample/') {
  w.document.getElementById('url-input').value = url;
  w.document.getElementById('extract-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
}
const hidden = (w, id) => w.document.getElementById(id).classList.contains('hidden');

test('reject HTTP, unrelated hosts and unrecognized subdomains before calling the API', async t => {
  let calls = 0;
  const w = await page(t, () => { calls++; throw new Error('Unexpected request'); });
  for (const url of ['', 'http://www.tiktok.com/video/1', 'https://evil.tiktok.com/video/1', 'https://example.com/']) {
    submit(w, url);
    assert.equal(hidden(w, 'error-card'), false);
    assert.equal(w.document.getElementById('url-input').getAttribute('aria-invalid'), 'true');
  }
  assert.equal(calls, 0);
});

test('clear cancels an in-flight request and ignores even a late response from that request', async t => {
  let finish; let signal;
  const w = await page(t, (url, options) => {
    signal = options.signal;
    return new Promise(resolve => { finish = resolve; });
  });
  submit(w);
  assert.equal(w.document.getElementById('submit-btn').disabled, true);
  w.document.getElementById('clear-btn').click();
  assert.equal(signal.aborted, true);
  assert.equal(w.document.getElementById('submit-btn').disabled, false);
  finish(response({ data: { token: 'test' } }));
  await tick(); await tick();
  assert.equal(hidden(w, 'result-section'), true);
  assert.equal(hidden(w, 'status-card'), true);
  assert.equal(w.document.getElementById('url-input').value, '');
});

test('a cancelled older request cannot unlock or overwrite a newer request', async t => {
  const pending = [];
  const w = await page(t, () => new Promise(resolve => pending.push(resolve)));
  submit(w);
  w.document.getElementById('clear-btn').click();
  submit(w, 'https://vt.tiktok.com/new/');
  pending[0](response({ data: { token: 'old' } }));
  await tick(); await tick();
  assert.equal(w.document.getElementById('submit-btn').disabled, true);
  pending[1](response({ data: { token: 'new' } }));
  await tick(); await tick();
  pending[2](response({ success: true, data: video }));
  await tick(); await tick();
  assert.equal(hidden(w, 'result-section'), false);
  assert.equal(w.document.getElementById('res-title').textContent, 'Sample story');
});

test('missing thumbnails and avatars stay hidden and video download is a native link', async t => {
  const w = await page(t, url => Promise.resolve(response(url === '/api/token' ? { data: { token: 'test' } } : { success: true, data: video })));
  submit(w); await tick(); await tick();
  assert.equal(hidden(w, 'res-avatar'), true);
  assert.equal(w.document.querySelector('.media-thumbnail-container').classList.contains('hidden'), true);
  assert.equal(w.document.getElementById('download-standard-btn').getAttribute('role'), null);
  assert.match(w.document.getElementById('download-standard-btn').href, /api\/download/);
});

test('photo controls, keyboard download-all and modal focus work without nested buttons', async t => {
  const photos = { type: 'image', images: ['https://example.com/one.jpg', 'https://example.com/two.jpg'], imageDownloadUrls: ['/api/download?image=1', '/api/download?image=2'] };
  const w = await page(t, url => Promise.resolve(response(url === '/api/token' ? { data: { token: 'test' } } : { success: true, data: photos })));
  submit(w); await tick(); await tick();
  const d = w.document;
  assert.equal(d.querySelectorAll('.photo-item').length, 2);
  assert.equal(d.querySelectorAll('.photo-item[role="button"]').length, 0);
  assert.equal(d.getElementById('download-standard-btn').getAttribute('role'), 'button');
  const opener = d.querySelector('.photo-view-button');
  opener.focus(); opener.click();
  assert.equal(d.activeElement.id, 'photo-lightbox-close');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(d.activeElement.id, 'photo-lightbox-download');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(d.activeElement.id, 'photo-lightbox-close');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(hidden(w, 'photo-lightbox'), true);
  assert.equal(d.activeElement, opener);
  let downloads = 0;
  w.HTMLAnchorElement.prototype.click = () => { downloads++; };
  d.getElementById('download-standard-btn').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.equal(downloads, 2);
});

test('Arabic clipboard denial gives a helpful localized message, not a browser exception', async t => {
  const w = await page(t, () => { throw new Error('No request expected'); }, 'ar');
  Object.defineProperty(w.navigator, 'clipboard', { value: { readText: async () => { throw new Error('Permission denied'); } } });
  w.document.getElementById('paste-btn').click(); await tick();
  assert.match(w.document.getElementById('error-message').textContent, /الصق رابط/);
  assert.doesNotMatch(w.document.getElementById('error-message').textContent, /Permission denied/);
});

test('both language pages retain SEO metadata and explain stories and expired download links after JavaScript', async t => {
  for (const language of ['en', 'ar']) {
    const w = await page(t, () => {}, language);
    assert.equal(w.document.title, w.document.querySelector('meta[property="og:title"]').content);
    assert.equal(w.document.querySelector('meta[name="description"]').content, w.document.querySelector('meta[property="og:description"]').content);
    assert.match(w.document.querySelector('[data-i18n="faq7a"]').textContent, language === 'ar' ? /القصص العامة/ : /public TikTok story/);
    const linkAnswer = w.document.querySelector('[data-i18n="faq4a"]');
    const question = linkAnswer.closest('details');
    question.open = true;
    assert.match(linkAnswer.textContent, language === 'ar' ? /تنتهي صلاحية روابط التحميل بعد بضع دقائق/ : /Download links expire after a few minutes/);
    assert.match(linkAnswer.textContent, language === 'ar' ? /أرسل رابط مشاركة تيك توك الأصلي مجددًا/ : /submit the original TikTok share link again/);
  }
});
