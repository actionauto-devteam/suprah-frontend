import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/sw.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
for (const userAgent of ['Desktop Chrome', 'Android Mobile']) {
  test(`Meet push displays a system notification and opens its room with zero Suprah windows (${userAgent})`, async () => {
    const handlers = new Map(), shown = [], opened = [];
    const fakeSelf = {
      __SW_MANIFEST: [], location: { origin: 'https://suprah.example', href: 'https://suprah.example/sw.js' }, navigator: { userAgent },
      addEventListener: (name, handler) => handlers.set(name, handler),
      registration: { pushManager: { getSubscription: async () => null }, getNotifications: async () => [],
        showNotification: async (title, options) => shown.push({ title, options }) },
      clients: { matchAll: async () => [], openWindow: async (url) => opened.push(url) },
    };
    class Strategy {}
    const require = (name) => name === '@serwist/next/worker' ? { defaultCache: [] }
      : name === 'serwist' ? { NetworkFirst: Strategy, NetworkOnly: Strategy,
        Serwist: class { addEventListeners() {} }, setCacheNameDetails() {} }
      : { isRecordingApiUrl: () => false };
    const module = { exports: {} };
    new Function('require', 'module', 'exports', 'self', 'indexedDB', 'process', compiled)(require, module, module.exports,
      fakeSelf, { open() { throw new Error('No page authentication storage needed for push display'); } }, { env: {} });
    const pending = [];
    const payload = { title: 'Suprah Meet - Planning starts soon', body: 'Join your meeting', tag: 'meet:session:reminder',
      data: { url: '/crm/suprah-meet/room/MEET-1234', priority: 'high', soundProfile: 'attention', meetingCode: 'MEET-1234' } };
    handlers.get('push')({ data: { json: () => payload }, waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
    assert.equal(shown.length, 1);
    assert.equal(shown[0].title, payload.title);
    assert.equal(shown[0].options.tag, payload.tag);
    assert.equal(shown[0].options.data.url, payload.data.url);
    assert.notEqual(shown[0].options.silent, true);
    assert.deepEqual(shown[0].options.vibrate, [180, 80, 180]);
    const clicks = [];
    handlers.get('notificationclick')({ notification: { data: shown[0].options.data, close() {} }, action: '',
      waitUntil: (promise) => clicks.push(promise) });
    await Promise.all(clicks);
    assert.deepEqual(opened, ['https://suprah.example/crm/suprah-meet/room/MEET-1234']);
  });
}
