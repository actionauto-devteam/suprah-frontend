import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/sw.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup({ active = false, notifications = new Map(), clock = { now: 1_000_000 }, failFirst = false, failHistory = false } = {}) {
  const handlers = new Map(), shown = [], opened = [];
  let closed = 0;
  const fakeSelf = {
    __SW_MANIFEST: [], location: { origin: 'https://suprah.example', href: 'https://suprah.example/sw.js' },
    navigator: { userAgent: 'Chrome Windows' }, addEventListener: (name, handler) => handlers.set(name, handler),
    registration: {
      pushManager: { getSubscription: async () => null },
      getNotifications: async ({ tag } = {}) => {
        if (failHistory) throw new Error('Expected notification history failure');
        return [...notifications.values()].filter(notification => !tag || notification.tag === tag);
      },
      showNotification: async (title, options) => {
        if (failFirst) { failFirst = false; throw new Error('Expected display failure'); }
        const notification = {
          title, ...options, timestamp: clock.now,
          close: () => { closed++; notifications.delete(options.tag); },
        };
        notifications.set(options.tag, notification);
        shown.push(notification);
      },
    },
    clients: { matchAll: async () => active ? [{ focused: true, visibilityState: 'visible' }] : [], openWindow: async url => opened.push(url) },
  };
  class Strategy {}
  const require = name => name === '@serwist/next/worker' ? { defaultCache: [] }
    : name === 'serwist' ? { NetworkFirst: Strategy, NetworkOnly: Strategy, Serwist: class { addEventListeners() {} }, setCacheNameDetails() {} }
      : { isRecordingApiUrl: () => false };
  class ClockDate extends Date { static now() { return clock.now; } }
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'self', 'indexedDB', 'process', 'Date', 'console', compiled)(
    require, loaded, loaded.exports, fakeSelf, { open() { throw new Error('Push display must not need application credentials'); } },
    { env: {} }, ClockDate, { error() {}, warn() {}, log() {} },
  );
  const push = async payload => {
    const pending = [];
    handlers.get('push')({ data: payload === null ? null : { json: () => {
      if (payload === 'malformed') throw new Error('Invalid push JSON');
      return payload;
    } }, waitUntil: promise => pending.push(promise) });
    await Promise.all(pending);
  };
  return { push, handlers, shown, opened, notifications, clock, get closed() { return closed; } };
}

const message = (number = 1, extra = {}) => ({
  title: 'General', body: `Message ${number}`, tag: 'conversation:general',
  data: { conversationId: 'general', messageId: `message-${number}`, url: '/crm/supra-space?conversationId=general', ...extra },
});

test('device banners are non-sticky and rapid conversation updates do not repeatedly alert', async () => {
  const worker = setup();
  for (let index = 1; index <= 20; index++) {
    await worker.push(message(index));
    worker.clock.now += 1000;
  }
  assert.equal(worker.shown.length, 20);
  assert.equal(worker.shown.filter(notification => notification.renotify).length, 1);
  assert.ok(worker.shown.every(notification => notification.requireInteraction === false));
  assert.equal(worker.notifications.size, 1);
  assert.equal(worker.notifications.values().next().value.body, 'Message 20');
  assert.equal(worker.closed, 0);
  worker.clock.now += 5000;
  await worker.push(message(21));
  assert.equal(worker.shown.at(-1).renotify, true);
});

test('simultaneous ordinary pushes retain the summary count without a banner storm', async () => {
  const worker = setup();
  await Promise.all(Array.from({ length: 20 }, (_, index) => worker.push({ title: `Notice ${index}`, body: 'New activity', tag: 'crm', data: { url: '/notifications' } })));
  assert.equal(worker.notifications.size, 1);
  const summary = worker.notifications.get('notification-summary');
  assert.equal(summary.data.count, 20);
  assert.equal(summary.title, 'You have 20 new notifications');
  assert.equal(worker.shown.filter(notification => notification.renotify).length, 1);
  assert.equal(worker.closed, 0);
});

test('simultaneous conversation pushes are checked in order per conversation', async () => {
  const worker = setup();
  await Promise.all(Array.from({ length: 10 }, (_, index) => worker.push(message(index))));
  assert.equal(worker.shown.filter(notification => notification.renotify).length, 1);
  await worker.push({ ...message(11), tag: 'conversation:other' });
  assert.equal(worker.shown.at(-1).renotify, true);
  assert.equal(worker.notifications.size, 2);
});

test('quiet replacements survive worker restart and preserve click routing', async () => {
  const first = setup();
  await first.push(message(1));
  first.clock.now += 1000;
  const restarted = setup({ notifications: first.notifications, clock: first.clock });
  await restarted.push(message(2));
  const latest = restarted.shown.at(-1);
  assert.equal(latest.renotify, false);
  assert.equal(latest.data.messageId, 'message-2');
  assert.equal(restarted.closed, 0);
  const clicks = [];
  restarted.handlers.get('notificationclick')({ notification: latest, action: '', waitUntil: promise => clicks.push(promise) });
  await Promise.all(clicks);
  assert.equal(restarted.opened.length, 1);
  assert.match(restarted.opened[0], /conversationId=general/);
  assert.equal(restarted.closed, 1);
});

test('foreground replacements stay quiet while urgent device alerts retain their sound and actions', async () => {
  const worker = setup({ active: true });
  await worker.push(message(1));
  await worker.push(message(2));
  assert.equal(worker.shown.at(-1).renotify, false);
  const urgent = { title: 'Dispatch alert', body: 'Respond now', tag: 'dispatch:urgent', actions: [{ action: 'ack', title: 'Acknowledge' }],
    data: { url: '/driver', priority: 'high', soundProfile: 'urgent', alertId: 'alert-1' } };
  await worker.push(urgent);
  await worker.push(urgent);
  assert.ok(worker.shown.slice(-2).every(notification => notification.renotify && !notification.silent && notification.requireInteraction === false));
  assert.deepEqual(worker.shown.at(-1).vibrate, [250, 100, 250, 100, 350]);
  assert.deepEqual(worker.shown.at(-1).actions, urgent.actions);
});

test('missing and malformed payload fallbacks use the same non-sticky device policy', async () => {
  for (const active of [false, true]) {
    const worker = setup({ active });
    await worker.push(null);
    await worker.push('malformed');
    assert.ok(worker.shown.every(notification => notification.requireInteraction === false));
    assert.equal(worker.closed, 0);
  }
});

test('a failed native display does not block the next notification for the same tag', async () => {
  const worker = setup({ failFirst: true });
  await worker.push(message(1));
  await worker.push(message(2));
  assert.equal(worker.shown.at(-1).tag, 'conversation:general');
  assert.equal(worker.shown.at(-1).body, 'Message 2');
  assert.equal(worker.shown.at(-1).requireInteraction, false);
});

test('notification-history lookup failure preserves delivery, metadata and actions', async () => {
  const worker = setup({ failHistory: true });
  const payload = { ...message(1), actions: [{ action: 'reply', title: 'Reply' }] };
  await worker.push(payload);
  const shown = worker.shown.at(-1);
  assert.equal(shown.tag, payload.tag);
  assert.equal(shown.data.messageId, payload.data.messageId);
  assert.deepEqual(shown.actions, payload.actions);
  assert.equal(shown.requireInteraction, false);
});
