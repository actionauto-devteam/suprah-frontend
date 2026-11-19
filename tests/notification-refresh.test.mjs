import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync(new URL('../src/lib/notification-refresh.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(refresh) {
  let now = 0, visible = true, delay = 20_000, id = 0;
  const timers = new Map();
  const sandbox = { exports: {}, setTimeout: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; }, clearTimeout: id => timers.delete(id) };
  vm.runInNewContext(source, sandbox);
  const control = sandbox.exports.createNotificationRefreshController({
    refresh, getDelay: () => delay, isVisible: () => visible,
  });
  return { control, timers, remember: sandbox.exports.rememberNotificationId,
    hide: () => { visible = false; control.pause(); }, show: () => { visible = true; control.resume(); },
    setDelay: value => { delay = value; },
    advance: async ms => {
      now += ms;
      for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn(); }
      for (let i = 0; i < 5; i++) await Promise.resolve();
    },
  };
}

test('a burst of 100 realtime events needs one feed request', async () => {
  let requests = 0;
  const probe = setup(async () => { requests++; });
  for (let i = 0; i < 100; i++) probe.control.request();
  await probe.advance(249);
  assert.equal(requests, 0);
  await probe.advance(1);
  assert.equal(requests, 1);
  probe.control.dispose();
});

test('events arriving during a fetch trigger exactly one follow-up without overlapping requests', async () => {
  const completions = [];
  const probe = setup(() => new Promise(resolve => completions.push(resolve)));
  probe.control.resume();
  await probe.advance(0);
  for (let i = 0; i < 100; i++) probe.control.request();
  await probe.advance(10_000);
  assert.equal(completions.length, 1);
  completions[0]();
  await probe.advance(0);
  await probe.advance(250);
  assert.equal(completions.length, 2);
  probe.control.dispose();
  completions[1]();
  await probe.advance(0);
  assert.equal(probe.timers.size, 0);
});

test('polling reads the current failure backoff and resumes after recovery', async () => {
  let requests = 0;
  const probe = setup(async () => { requests++; probe.setDelay(requests === 1 ? 40_000 : 20_000); });
  probe.control.resume();
  await probe.advance(0);
  await probe.advance(39_999);
  assert.equal(requests, 1);
  await probe.advance(1);
  assert.equal(requests, 2);
  await probe.advance(20_000);
  assert.equal(requests, 3);
  probe.control.dispose();
});

test('hidden tabs pause requests and reconcile once on return', async () => {
  let requests = 0;
  const probe = setup(async () => { requests++; });
  probe.hide();
  for (let i = 0; i < 100; i++) probe.control.request();
  await probe.advance(60_000);
  assert.equal(requests, 0);
  probe.show();
  await probe.advance(0);
  assert.equal(requests, 1);
  probe.control.dispose();
  probe.control.request();
  await probe.advance(60_000);
  assert.equal(requests, 1);
});

test('failed refreshes do not leave the controller stuck', async () => {
  let requests = 0;
  const probe = setup(async () => { requests++; throw new Error('offline'); });
  probe.control.resume();
  await probe.advance(0);
  probe.control.request();
  await probe.advance(250);
  assert.equal(requests, 2);
  probe.control.dispose();
});

test('duplicate notification events are ignored without unbounded history', () => {
  const { remember } = setup(async () => {});
  const seen = new Set();
  assert.equal(remember(seen, 'first'), true);
  assert.equal(remember(seen, 'first'), false);
  for (let i = 0; i < 3000; i++) remember(seen, String(i));
  assert.equal(seen.size, 1000);
  assert.equal(remember(seen, '2999'), false);
});
