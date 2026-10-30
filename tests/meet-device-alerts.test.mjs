import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/components/suprah-meet/MeetDeviceAlerts.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function setup({ ios = false, installed = false, permission = 'granted', fail = false, accepted = true } = {}) {
  const cells = [], effects = [], requests = [];
  let cursor = 0, tree;
  const react = {
    useState(value) { const i = cursor++; if (!(i in cells)) cells[i] = value; return [cells[i], (next) => { cells[i] = next; }]; },
    useEffect(fn) { const i = cursor++; if (!(i in cells)) { cells[i] = true; effects.push(fn); } },
  };
  const push = { isSupported: true, isSubscribed: true, isLoading: false,
    refreshSubscription: async () => ({ endpoint: 'this-device' }), subscribe: async () => 'subscribed' };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const require = (name) => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
    : name === '@/hooks/useCrmWebPush' ? { useCrmWebPush: () => push }
    : name === '@/lib/api-client' ? { apiClient: { post: async (url, body) => {
      requests.push({ url, body });
      if (fail) throw { response: { data: { message: 'Device push was rejected.' } } };
      return { data: { data: { accepted } } };
    } } } : new Proxy({}, { get: (_target, key) => key });
  const module = { exports: {} };
  const events = { addEventListener() {}, removeEventListener() {} };
  const notification = { permission };
  new Function('require', 'module', 'exports', 'window', 'document', 'navigator', 'Notification', compiled)(
    require, module, module.exports, { ...events, Notification: notification, matchMedia: () => ({ matches: installed }) },
    { ...events, visibilityState: 'visible' }, { userAgent: ios ? 'iPhone Safari' : 'Desktop', maxTouchPoints: 0 }, notification);
  const render = () => { cursor = 0; tree = module.exports.MeetDeviceAlerts(); effects.splice(0).forEach((fn) => fn()); };
  const nodes = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes)
    : [node, ...nodes(node.props?.children)];
  const text = (node) => node == null ? '' : typeof node !== 'object' ? String(node)
    : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
  render(); render();
  return { requests, text: () => text(tree), buttons: () => nodes(tree).filter((node) => node.type === 'Button'),
    sendTest: async () => { nodes(tree).find((node) => node.type === 'Button').props.onClick(); await new Promise((resolve) => setImmediate(resolve)); render(); } };
}
test('device test invokes the backend push sender for the current subscription', async () => {
  const ui = setup();
  assert.match(ui.text(), /Send test notification/);
  await ui.sendTest();
  assert.deepEqual(ui.requests, [{ url: '/api/crm/meet/device-notifications/test', body: { endpoint: 'this-device' } }]);
  assert.match(ui.text(), /push service/);
});
test('device test reports rejected push delivery without claiming a notification was received', async () => {
  const ui = setup({ fail: true });
  await ui.sendTest();
  assert.match(ui.text(), /Device push was rejected/);
  assert.doesNotMatch(ui.text(), /Test sent/);
});
test('iPhone browser explains installation instead of offering a push button that cannot work there', () => {
  const ui = setup({ ios: true });
  assert.match(ui.text(), /Home Screen/);
  assert.equal(ui.buttons().length, 0);
});
test('blocked permissions explain device settings instead of claiming the device is ready', () => {
  const ui = setup({ permission: 'denied' });
  assert.match(ui.text(), /blocked/);
  assert.equal(ui.buttons().length, 0);
});

test('a stale server response cannot falsely confirm that a device test was accepted', async () => {
  const ui = setup({ accepted: false });
  await ui.sendTest();
  assert.match(ui.text(), /could not confirm/);
  assert.doesNotMatch(ui.text(), /Test sent/);
});
