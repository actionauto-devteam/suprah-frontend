import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/lib/web-push-subscription.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function setup({ subscription = null, permission = 'granted' } = {}) {
  const values = new Map(), calls = [];
  const module = { exports: {} };
  new Function('module', 'exports', 'localStorage', 'Notification', compiled)(module, module.exports,
    { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }, { permission });
  const fresh = { endpoint: 'fresh' };
  const registration = { pushManager: {
    getSubscription: async () => subscription,
    subscribe: async options => { calls.push(options); return fresh; },
  } };
  return { api: module.exports, registration, calls, fresh };
}
test('granted permission recovers a missing browser subscription without prompting', async () => {
  const { api, registration, calls, fresh } = setup();
  assert.equal(await api.recoverDevicePush(registration, 'YWJj'), fresh);
  assert.equal(calls.length, 1); assert.equal(calls[0].userVisibleOnly, true);
});
test('concurrent hooks share one subscription recovery', async () => {
  const { api, registration, calls } = setup();
  await Promise.all([api.recoverDevicePush(registration, 'YWJj'), api.recoverDevicePush(registration, 'YWJj')]);
  assert.equal(calls.length, 1);
});
test('a healthy subscription is retained', async () => {
  const subscription = { endpoint: 'existing', expirationTime: null };
  const { api, registration, calls } = setup({ subscription });
  assert.equal(await api.recoverDevicePush(registration, 'YWJj'), subscription);
  assert.equal(calls.length, 0);
});
test('explicit disable survives automatic recovery until the user enables push', async () => {
  const { api, registration, calls } = setup();
  api.setDevicePushDisabled(true);
  assert.equal(await api.recoverDevicePush(registration, 'YWJj'), null);
  assert.equal(calls.length, 0);
  api.setDevicePushDisabled(false);
  assert.ok(await api.recoverDevicePush(registration, 'YWJj'));
});
test('expired subscriptions are renewed once', async () => {
  let unsubscribed = 0;
  const { api, registration, calls } = setup({ subscription: { expirationTime: 1, unsubscribe: async () => { unsubscribed++; } } });
  await api.recoverDevicePush(registration, 'YWJj');
  assert.equal(unsubscribed, 1); assert.equal(calls.length, 1);
});
test('denied and default permissions never silently subscribe', async () => {
  for (const permission of ['denied', 'default']) {
    const { api, registration, calls } = setup({ permission });
    assert.equal(await api.recoverDevicePush(registration, 'YWJj'), null);
    assert.equal(calls.length, 0);
  }
});
