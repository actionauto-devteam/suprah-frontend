import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

test('built recording worker blocks private offline replay and preserves normal PWA caching', { timeout: 120000 }, async () => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href : 'playwright');
  const worker = await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.ok(worker.includes('/api/crm/communications/record'), 'normal build must contain recording bypass');
  const logins = new Map(); const media = new Map(); let allowed = true; let hits = 0; let mainOrigin;
  const audio = Buffer.alloc(44 + 16000);
  audio.write('RIFF', 0); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8); audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(16000, 40);
  const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(pair => { const split = pair.trim().indexOf('='); return [pair.trim().slice(0, split), pair.trim().slice(split + 1)]; }));
  const api = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', mainOrigin || '*'); res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.setHeader('Cache-Control', 'private, no-store');
    if (req.method === 'OPTIONS') return res.end();
    const path = new URL(req.url, 'http://localhost').pathname; const cookies = cookie(req); const identity = logins.get(cookies.auth);
    if (path.startsWith('/login/')) {
      const user = path.split('/').pop(); const sid = `${user}-${Math.random()}`; logins.set(sid, user); res.setHeader('Set-Cookie', `auth=${sid}; HttpOnly; Path=/`); return res.end(user);
    }
    if (path === '/logout') { logins.delete(cookies.auth); res.setHeader('Set-Cookie', 'auth=; Max-Age=0; HttpOnly; Path=/'); return res.end(); }
    if (path === '/permission/off') { allowed = false; return res.end(); }
    if (path === '/permission/on') { allowed = true; return res.end(); }
    if (path.endsWith('/media-session')) {
      if (!identity || !allowed) { res.statusCode = 401; return res.end('Denied'); }
      const id = String(media.size + 1); const secret = `media-${id}`; media.set(id, { sid: cookies.auth, secret });
      const mediaPath = `/api/crm/communications/recordings/media/${id}`; res.setHeader('Set-Cookie', `recording_media=${secret}; HttpOnly; Path=${mediaPath}`); return res.end(JSON.stringify({ path: mediaPath }));
    }
    if (path.startsWith('/api/crm/communications/')) {
      hits += 1; const session = media.get(path.split('/').pop());
      if (!identity || !allowed || (path.includes('/media/') && (!session || session.sid !== cookies.auth || session.secret !== cookies.recording_media))) { res.statusCode = 401; return res.end('Denied'); }
      if (session) { res.setHeader('Content-Type', 'audio/wav'); res.setHeader('Content-Length', String(audio.length)); return res.end(audio); }
      res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ user: identity, hits }));
    }
    res.end('fixture');
  });
  const web = http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/sw.js') { res.setHeader('Content-Type', 'application/javascript'); res.setHeader('Cache-Control', 'no-store'); return res.end(worker); }
    if (path === '/fixture.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end('window.fixtureCached=true;'); }
    if (path === '/' || path === '/offline') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><html><body><audio controls crossorigin="use-credentials"></audio></body></html>'); }
    res.setHeader('Content-Type', path.endsWith('.js') ? 'application/javascript' : 'text/plain'); res.end('');
  });
  const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await listen(web); await listen(api);
  mainOrigin = `http://127.0.0.1:${web.address().port}`; const apiOrigin = `http://127.0.0.1:${api.address().port}`;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(); const page = await context.newPage(); await page.goto(mainOrigin);
    const privatePaths = ['/recordings/media/legacy', '/recordings/id', '/calls/id/recording'];
    await page.evaluate(async ({ apiOrigin, privatePaths }) => {
      for (const name of ['static-audio-assets', 'cross-origin', 'apis']) {
        const cache = await caches.open(name);
        for (const path of privatePaths) await cache.put(`${apiOrigin}/api/crm/communications${path}`, new Response('private-old-audio'));
        await cache.put(`${location.origin}/fixture.js`, new Response('window.fixtureCached=true;'));
      }
      await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }, { apiOrigin, privatePaths });
    await page.waitForFunction(async () => {
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) if (request.url.includes('/api/crm/communications/record') || request.url.includes('/calls/id/recording')) return false;
      return true;
    });
    const keys = () => page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(request => request.url)))).flat());
    assert.equal((await keys()).some(key => key.includes('/api/crm/communications/record') || key.includes('/calls/id/recording')), false, 'activation purges old protected responses even from audio caches');
    assert.equal((await keys()).some(key => key.endsWith('/fixture.js')), true, 'migration preserves unrelated static entries');
    const fetchApi = path => page.evaluate(async url => { try { const response = await fetch(url, { credentials: 'include' }); return { status: response.status, text: await response.text() }; } catch { return { offline: true }; } }, `${apiOrigin}${path}`);
    await fetchApi('/login/A');
    const response = await fetchApi('/api/crm/communications/recordings/id/media-session'); const mediaPath = JSON.parse(response.text).path;
    assert.equal((await fetchApi(mediaPath)).status, 200); const before = hits; assert.equal((await fetchApi(mediaPath)).status, 200); assert.equal(hits, before + 1);
    await page.locator('audio').evaluate((element, source) => { element.src = source; element.load(); }, `${apiOrigin}${mediaPath}`);
    await page.waitForFunction(() => document.querySelector('audio').readyState >= 1); assert.ok(await page.locator('audio').evaluate(element => element.duration > 0));
    for (const path of ['/recordings/id', '/calls/id/recording', '/recording-settings', '/recording-shares/id']) assert.equal((await fetchApi(`/api/crm/communications${path}`)).status, 200);
    await page.reload(); assert.equal((await fetchApi(mediaPath)).status, 200);
    await fetchApi('/permission/off'); assert.equal((await fetchApi(mediaPath)).status, 401); await fetchApi('/permission/on');
    await fetchApi('/logout'); assert.equal((await fetchApi(mediaPath)).status, 401);
    await fetchApi('/login/B'); assert.equal((await fetchApi(mediaPath)).status, 401);
    const bSession = JSON.parse((await fetchApi('/api/crm/communications/recordings/id/media-session')).text); assert.equal((await fetchApi(bSession.path)).status, 200);
    await page.evaluate(async () => { await fetch('/fixture.js'); });
    await page.waitForFunction(async () => {
      for (const name of await caches.keys()) if (name.includes('static-js-assets') && await (await caches.open(name)).match(`${location.origin}/fixture.js`)) return true;
      return false;
    });
    assert.equal((await keys()).some(key => key.includes('/api/crm/communications/record') || key.includes('/calls/id/recording')), false, 'online playback and APIs never entered any service-worker cache');
    await context.setOffline(true);
    assert.equal((await fetchApi(bSession.path)).offline, true); assert.equal((await fetchApi('/api/crm/communications/recordings/id')).offline, true); assert.equal((await fetchApi('/api/crm/communications/calls/id/recording')).offline, true);
    assert.equal(await page.evaluate(async () => (await fetch('/fixture.js')).status), 200, 'normal static caching still works offline');
    await context.setOffline(false);
    await page.evaluate(async ({ apiOrigin }) => { const cache = await caches.open('static-audio-assets'); await cache.put(`${apiOrigin}/api/crm/communications/recordings/media/old`, new Response('private-old')); navigator.serviceWorker.controller.postMessage({ type: 'SUPRASPACE_CLEAR_PRIVATE_DATA' }); }, { apiOrigin });
    await page.waitForFunction(async () => { for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) if (request.url.includes('/recordings/media/old')) return false; return true; });
    assert.equal((await keys()).some(key => key.endsWith('/fixture.js')), true, 'logout purge leaves static caching intact');
    await context.close();
  } finally {
    await browser.close(); await Promise.all([new Promise(resolve => web.close(resolve)), new Promise(resolve => api.close(resolve))]);
  }
});
