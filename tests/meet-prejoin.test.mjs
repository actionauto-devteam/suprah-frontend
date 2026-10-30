import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/components/suprah-meet/MeetPreJoin.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function previewHarness() {
  let cursor = 0, tree, resolveMedia, stopped = 0, played = 0;
  const cells = [], joined = [];
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  const video = { srcObject: null, play: async () => { played++; } };
  const react = {
    useState(value) { const i = cursor++; if (!(i in cells)) cells[i] = value; return [cells[i], (next) => { cells[i] = next; }]; },
    useRef(value) { const i = cursor++; return cells[i] ??= { current: value }; },
    useCallback: (fn) => fn,
    useEffect(fn) { const i = cursor++; if (!(i in cells)) cells[i] = { cleanup: fn() }; },
  };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const require = (name) => name === 'react' ? react : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx }
    : name === '@/lib/utils' ? { cn: (...parts) => parts.filter(Boolean).join(' ') }
    : new Proxy({}, { get: (_target, key) => key });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'navigator', compiled)(require, module, module.exports,
    { mediaDevices: { getUserMedia: () => new Promise((resolve) => { resolveMedia = resolve; }) } });
  const nodes = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node) => node == null ? '' : typeof node !== 'object' ? String(node)
    : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
  const render = () => {
    cursor = 0;
    tree = module.exports.MeetPreJoin({ title: 'Call', code: 'MEET-1234', onJoin: (choices) => joined.push(choices) });
    // The video remains mounted when the camera is off, so its ref is ready
    // before the first media permission response returns.
    nodes(tree).find((node) => node.type === 'video').props.ref.current = video;
    return tree;
  };
  render();
  return { render, joined, stream, video,
    startCamera: () => nodes(tree).find((node) => node.type === 'button' && /Turn camera on/.test(text(node))).props.onClick(),
    join: () => nodes(tree).find((node) => node.type === 'Button' && /Join now/.test(text(node))).props.onClick(),
    resolve: async () => { resolveMedia(stream); await new Promise((resolve) => setImmediate(resolve)); },
    unmount: () => cells.forEach((cell) => cell?.cleanup?.()),
    stopped: () => stopped, played: () => played,
  };
}
test('the first camera permission response attaches to the mounted preview and saved choices reach joining', async () => {
  const preview = previewHarness();
  preview.startCamera();
  await preview.resolve();
  preview.render();
  assert.equal(preview.video.srcObject, preview.stream);
  assert.equal(preview.played(), 1);
  preview.join();
  assert.deepEqual(preview.joined, [{ mic: false, camera: true }]);
  assert.equal(preview.video.srcObject, null);
  assert.equal(preview.stopped(), 1);
});
test('continuing into waiting while camera permission is pending closes the late preview stream', async () => {
  const preview = previewHarness();
  preview.startCamera();
  preview.join();
  await preview.resolve();
  assert.deepEqual(preview.joined, [{ mic: false, camera: false }]);
  assert.equal(preview.video.srcObject, null);
  assert.equal(preview.stopped(), 1);
  assert.equal(preview.played(), 0);
});
test('leaving device preparation stops a media stream returned after unmount', async () => {
  const preview = previewHarness();
  preview.startCamera();
  preview.unmount();
  await preview.resolve();
  assert.equal(preview.stopped(), 1);
  assert.equal(preview.video.srcObject, null);
  assert.equal(preview.played(), 0);
});

test('pending video playback never blocks camera readiness or continuing into waiting', async () => {
  const preview = previewHarness();
  preview.video.play = () => new Promise(() => {});
  preview.startCamera();
  await preview.resolve();
  preview.render();
  preview.join();
  assert.deepEqual(preview.joined, [{ mic: false, camera: true }]);
  assert.equal(preview.stopped(), 1);
});
