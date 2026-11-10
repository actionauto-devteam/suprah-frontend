import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do, following its
// relative and "@/..." imports.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const candidates = [file, `${file}.ts`, `${file}.tsx`];
  const filename = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const cjs = { exports: {} };
  const require = (id) => {
    if (id.startsWith('@/types/')) return {};
    if (id.startsWith('@/')) return load(path.join(SRC, id.slice(2)));
    if (id.startsWith('.')) return load(path.join(path.dirname(filename), id));
    return {};
  };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, require, cjs);
  return cjs.exports;
}

const { validateDates } = load(path.join(SRC, 'components/create-load/validation'));

const PAST = '2020-03-02';
const FUTURE = '2099-03-02';
const dates = (firstAvailable, pickupDeadline = '', deliveryDeadline = '') => ({ firstAvailable, pickupDeadline, deliveryDeadline, notes: '' });
const pastMessage = (result) => result.issues.find((issue) => issue.field === 'dates.firstAvailable')?.message;

test('a new load still needs a first available date of today or later', () => {
  const result = validateDates(dates(PAST));
  assert.equal(result.valid, false);
  assert.equal(pastMessage(result), "The first available date can't be in the past. Choose today or a later date.");
  assert.equal(validateDates(dates(FUTURE)).valid, true);
});

test("editing an older load isn't blocked by a past date that wasn't changed", () => {
  const saved = dates(PAST, '2020-03-05', '2020-03-09');
  assert.equal(validateDates(dates(PAST, '2020-03-05', '2020-03-09'), saved).valid, true);
});

test('a date changed while editing must still be today or later', () => {
  const saved = dates(PAST);
  const result = validateDates(dates('2020-03-01'), saved);
  assert.equal(result.valid, false);
  assert.ok(pastMessage(result));
  assert.equal(validateDates(dates(FUTURE), saved).valid, true);
});

test('deadlines still follow the first available date when editing', () => {
  const saved = dates(PAST);
  const result = validateDates(dates(PAST, '2020-03-01'), saved);
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues.map((issue) => issue.field), ['dates.pickupDeadline']);
});
