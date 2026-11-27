import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Driver loads (2026-11-15): current loads in full, delivered loads a page at
// a time from the server; the dashboard and Schedule ask for current loads only.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const { CURRENT_LOADS_URL, deliveredLoadsUrl, refreshDeliveredLoads, appendDeliveredLoads } = load(path.join(SRC, 'lib/driver-load-history'));

test('delivered loads are asked for a page at a time, with search on the server', () => {
  assert.equal(deliveredLoadsUrl(1, ''), '/api/driver-tracking/my-loads?view=history&page=1');
  assert.equal(deliveredLoadsUrl(3, '  camry '), '/api/driver-tracking/my-loads?view=history&page=3&q=camry');
  assert.equal(deliveredLoadsUrl(0, 'a&b'), '/api/driver-tracking/my-loads?view=history&page=1&q=a%26b');
  assert.equal(CURRENT_LOADS_URL, '/api/driver-tracking/my-loads?view=current');
});

test('a refresh keeps older pages already opened, without repeats', () => {
  const shown = [{ _id: 'c' }, { _id: 'b' }, { _id: 'a' }];
  assert.deepEqual(refreshDeliveredLoads(shown, [{ _id: 'd' }, { _id: 'c' }]).map((l) => l._id), ['d', 'c', 'b', 'a']);
});

test('Load more adds the next page after the loads shown, without repeats', () => {
  assert.deepEqual(appendDeliveredLoads([{ _id: 'd' }, { _id: 'c' }], [{ _id: 'c' }, { _id: 'b' }]).map((l) => l._id), ['d', 'c', 'b']);
});

test('the Loads page uses current loads plus paged delivered loads', () => {
  const page = read('app/(driver)/driver/loads/page.tsx');
  assert.doesNotMatch(page, /my-loads\?page=/);
  assert.match(page, /apiClient\.get\(CURRENT_LOADS_URL, \{ headers \}\)/);
  assert.match(page, /const totalLoadCount = currentLoads\.length \+ deliveredTotal;/);
  assert.match(page, /hasMoreDelivered && !loadingMore && \(tab === 'completed' \|\| tab === 'all'\)/);
});

test('Load more drops a page that arrives after the search changed (2026-11-16)', () => {
  const page = read('app/(driver)/driver/loads/page.tsx');
  const loadMore = page.slice(page.indexOf('if (append) {'), page.indexOf('setDeliveredLoads((prev) => appendDeliveredLoads('));
  assert.ok(loadMore.includes('const res = await apiClient.get(deliveredLoadsUrl(pageNum, search), { headers });'));
  assert.ok(loadMore.includes('if (search !== deliveredSearchRef.current) return;'));
});

test('the dashboard and Schedule ask for current loads only', () => {
  assert.match(read('app/(driver)/driver/page.tsx'), /my-loads\?view=current/);
  assert.match(read('app/(driver)/driver/schedule/page.tsx'), /my-loads\?view=current/);
});

test('Current Load on computers: grows with its content, so the page scrolls over it (2026-11-26)', () => {
  const page = read('app/(driver)/driver/page.tsx').replace(/\r\n/g, '\n');
  // The card isn't a scroll box that holds the mouse wheel, and can't be squeezed.
  assert.match(page, /className="driver-loads-panel flex flex-col [^"]*overflow-clip[^"]*"/);
  assert.match(page, /<CardContent className="p-4 flex-1">/);
  // The other loads list still scrolls on laptops but hands the wheel back to the page.
  const panel = page.slice(page.indexOf('id="driver-loads-panel"'), page.indexOf('id="driver-preferences-panel"'));
  assert.ok(panel.length > 0);
  assert.doesNotMatch(panel, /overscroll-contain/);
  const css = fs.readFileSync(path.join(SRC, 'app/(driver)/driver-portal.css'), 'utf8');
  assert.match(css, /\.driver-work-column \{ height: 100%; grid-template-rows: auto 1fr; align-content: stretch; \}/);
});
