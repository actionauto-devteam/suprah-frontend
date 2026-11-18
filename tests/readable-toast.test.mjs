import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads src/lib/readable-toast.ts with a stand-in for sonner that records each call.
const calls = [];
const fakeSonner = Object.assign((message, options) => calls.push(['toast', message, options]), {
  success: (message, options) => calls.push(['success', message, options]),
  error: (message, options) => calls.push(['error', message, options]),
  warning: (message, options) => calls.push(['warning', message, options]),
  info: (message, options) => calls.push(['info', message, options]),
  message: (message, options) => calls.push(['message', message, options]),
  loading: (message, options) => calls.push(['loading', message, options]),
  dismiss: (id) => calls.push(['dismiss', id]),
});
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const requireLib = (specifier) => (specifier === 'sonner' ? { toast: fakeSonner } : loadLib(specifier.replace(/^@\/lib\//, '')));
  new Function('exports', 'require', 'module', outputText)(cjs.exports, requireLib, cjs);
  return cjs.exports;
}

const { readableDuration, readableOptions, toast } = loadLib('readable-toast');

const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

test('problems stay 8 to 15 seconds, by how much there is to read', () => {
  assert.equal(readableDuration('error', 'Saved.'), 8000);
  assert.equal(readableDuration('warning', words(25)), 10500);
  assert.equal(readableDuration('error', words(20), words(20)), 15000);
  assert.equal(readableDuration('error', words(200)), 15000);
});

test('good news and notes stay 4 to 8 seconds', () => {
  assert.equal(readableDuration('success', 'Saved.'), 4000);
  assert.equal(readableDuration('info', words(14)), 5700);
  assert.equal(readableDuration('message', words(100)), 8000);
  // Text that isn't plain (a component) gets the shortest time for its kind.
  assert.equal(readableDuration('success', { type: 'span' }), 4000);
});

test('problems get a close button; the caller can always choose', () => {
  assert.deepEqual(readableOptions('error', 'It failed.'), { closeButton: true, duration: 8000 });
  assert.deepEqual(readableOptions('success', 'Done.'), { duration: 4000 });
  assert.deepEqual(readableOptions('error', 'It failed.', { duration: 3000, closeButton: false, id: 'x' }), {
    closeButton: false, duration: 3000, id: 'x',
  });
  assert.equal(readableOptions('warning', 'Careful', { description: words(30) }).duration, 12300);
});

test('works like sonner: same calls, with reading time added; loading and dismiss unchanged', () => {
  calls.length = 0;
  toast.error("We couldn't save the load. Try again.");
  toast.success('Saved.', { id: 't1' });
  toast('Heads up');
  toast.loading('Saving…');
  toast.dismiss('t1');
  assert.deepEqual(calls.map(([kind]) => kind), ['error', 'success', 'toast', 'loading', 'dismiss']);
  assert.deepEqual(calls[0][2], { closeButton: true, duration: 8000 });
  assert.deepEqual(calls[1][2], { id: 't1', duration: 4000 });
  assert.equal(calls[2][2].duration, 4000);
  assert.equal(calls[3][2], undefined);
});
