import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do, with its "@/..."
// imports loaded the same way.
function load(relative) {
  const filename = fileURLToPath(new URL(`../src/${relative}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const require = (id) => (id.startsWith('@/') && !id.startsWith('@/types/') ? load(id.slice(2)) : {});
  new Function('exports', 'require', 'module', outputText)(cjs.exports, require, cjs);
  return cjs.exports;
}

const { mountainDateTimeInput, mountainDateTimeValue, formatMountainDateTime } = load('lib/mountain-time');

test('a date-and-time field means Mountain Time on any device', () => {
  // Nov 5, 2026 is standard time (MST, UTC-7); July is daylight time (MDT, UTC-6).
  assert.equal(mountainDateTimeValue('2026-11-05T09:00'), '2026-11-05T16:00:00.000Z');
  assert.equal(mountainDateTimeValue('2026-07-01T09:00'), '2026-07-01T15:00:00.000Z');
  assert.equal(mountainDateTimeValue(''), '');
  assert.equal(mountainDateTimeValue('not a date'), '');
});

test('a saved moment fills the field with its Mountain Time', () => {
  assert.equal(mountainDateTimeInput('2026-11-05T16:00:00.000Z'), '2026-11-05T09:00');
  assert.equal(mountainDateTimeInput('2026-11-06T06:30:00.000Z'), '2026-11-05T23:30');
  assert.equal(mountainDateTimeInput('2026-11-05T07:00:00.000Z'), '2026-11-05T00:00');
  assert.equal(mountainDateTimeInput(null), '');
  assert.equal(mountainDateTimeInput('garbage'), '');
});

test('what the field shows is what gets saved', () => {
  for (const value of ['2026-11-05T09:00', '2026-03-08T12:15', '2026-12-31T23:45']) {
    assert.equal(mountainDateTimeInput(mountainDateTimeValue(value)), value);
  }
});

test('moments read in Mountain Time with MST or MDT', () => {
  assert.equal(formatMountainDateTime('2026-11-05T16:00:00.000Z'), 'Nov 5, 9:00 AM MST');
  assert.equal(formatMountainDateTime('2026-07-01T15:00:00.000Z'), 'Jul 1, 9:00 AM MDT');
});
