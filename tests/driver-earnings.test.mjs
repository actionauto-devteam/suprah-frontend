import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// The driver's Earnings page reads counts and loads waiting for pay from the server (2026-11-16).
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { EARNINGS_LOADS_URL, earningsLoadsFrom } = loadLib('driver-earnings');
const page = fs.readFileSync(fileURLToPath(new URL('../src/app/(driver)/driver/earnings/page.tsx', import.meta.url)), 'utf8');

test('uses the server counts and loads waiting for pay', () => {
  const data = { completedCount: 250, unpaidCount: 120, unpaidLoads: [{ _id: 'l1', status: 'Delivered' }] };
  assert.deepEqual(earningsLoadsFrom(data, new Set()), { completedCount: 250, unpaidCount: 120, unpaidLoads: [{ _id: 'l1', status: 'Delivered' }] });
  assert.equal(EARNINGS_LOADS_URL, '/api/driver-tracking/my-loads?view=earnings');
});

test('an older server sends every load: the same numbers are worked out from it', () => {
  const loads = [
    { _id: 'a', status: 'Delivered' },
    { _id: 'b', status: 'Delivered' },
    { _id: 'c', status: 'In-Transit' },
  ];
  const fromArray = earningsLoadsFrom(loads, new Set(['a']));
  assert.equal(fromArray.completedCount, 2);
  assert.equal(fromArray.unpaidCount, 1);
  assert.deepEqual(fromArray.unpaidLoads.map((l) => l._id), ['b']);
  assert.equal(earningsLoadsFrom({ loads }, new Set()).completedCount, 2);
  assert.deepEqual(earningsLoadsFrom(null, new Set()), { completedCount: 0, unpaidCount: 0, unpaidLoads: [] });
});

test('a failure is shown with Try again instead of zeros', () => {
  assert.match(page, /We couldn&apos;t load your earnings/);
  assert.match(page, /userErrorMessage\(err, "load your earnings"\)/);
  assert.doesNotMatch(page, /\/\/ silent/);
  assert.doesNotMatch(page, /data\?\.data\?\.loads/);
});
