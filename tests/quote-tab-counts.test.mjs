import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// The Quotes tab counts come from the server and live quote changes refresh once per burst (2026-11-16).
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { quoteTabCounts } = loadLib('quote-tab-counts');
const { subscribeToQuoteChanges, QUOTE_BURST_WAIT_MS } = loadLib('live-quote-updates');

test('uses the server counts for every quote of the dealership', () => {
  const items = Array.from({ length: 100 }, () => ({ status: 'booked' }));
  assert.deepEqual(
    quoteTabCounts({ all: 450, pending: 130, accepted: 12, booked: 300, rejected: 8 }, items, 450),
    { all: 450, pending: 130, accepted: 12, booked: 300, rejected: 8 },
  );
});

test('falls back to counting the downloaded quotes when the server sends no counts', () => {
  assert.deepEqual(
    quoteTabCounts(undefined, [{ status: 'pending' }, { status: 'Booked' }, { status: 'other' }], 3),
    { all: 3, pending: 1, accepted: 0, booked: 1, rejected: 0 },
  );
  assert.deepEqual(quoteTabCounts({ all: 'x' }, [], 0), { all: 0, pending: 0, accepted: 0, booked: 0, rejected: 0 });
});

test('a burst of quote changes refreshes once', async () => {
  const handlers = {};
  const socket = { on: (event, fn) => { handlers[event] = fn; }, off: (event) => { delete handlers[event]; } };
  let refreshes = 0;
  const stop = subscribeToQuoteChanges(socket, () => { refreshes += 1; });
  handlers['quote:change']();
  handlers['quote:change']();
  handlers['quote:change']();
  await new Promise((resolve) => setTimeout(resolve, QUOTE_BURST_WAIT_MS + 100));
  assert.equal(refreshes, 1);
  stop();
  assert.equal(handlers['quote:change'], undefined);
});

test('only the newest quote refresh updates the screen', () => {
  const hook = fs.readFileSync(fileURLToPath(new URL('../src/hooks/useTransportationData.ts', import.meta.url)), 'utf8');
  assert.match(hook, /const sequence = \+\+quoteSnapshotSequenceRef\.current;/);
  assert.match(hook, /if \(sequence !== quoteSnapshotSequenceRef\.current\) return false;/);
  assert.match(hook, /subscribeToQuoteChanges\(sock, handleQuoteChange\)/);
});
