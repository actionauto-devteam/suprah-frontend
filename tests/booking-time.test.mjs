import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do, with its
// "@/lib/..." imports loaded the same way.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const require = (id) => (id.startsWith('@/lib/') ? loadLib(id.slice('@/lib/'.length)) : {});
  new Function('exports', 'require', 'module', outputText)(cjs.exports, require, cjs);
  return cjs.exports;
}

const { mountainTomorrow, pickedDayLabel, pickedTimeLabel, serviceSlotStart } = loadLib('booking-time');

test('a service slot is that time on that day in Mountain Time', () => {
  // Nov 5, 2026 is standard time (MST, UTC-7).
  assert.equal(serviceSlotStart('2026-11-05', '10:00 AM').toISOString(), '2026-11-05T17:00:00.000Z');
  assert.equal(serviceSlotStart('2026-11-05', '12:00 PM').toISOString(), '2026-11-05T19:00:00.000Z');
  assert.equal(serviceSlotStart('2026-11-05', '12:30 AM').toISOString(), '2026-11-05T07:30:00.000Z');
  assert.equal(serviceSlotStart('2026-11-05', '4:15 PM').toISOString(), '2026-11-05T23:15:00.000Z');
  // Summer dates are daylight time (MDT, UTC-6).
  assert.equal(serviceSlotStart('2026-07-01', '10:00 AM').toISOString(), '2026-07-01T16:00:00.000Z');
});

test('an unreadable day or time gives no slot instead of a wrong one', () => {
  assert.equal(serviceSlotStart('', '10:00 AM'), null);
  assert.equal(serviceSlotStart('2026-11-05', ''), null);
  assert.equal(serviceSlotStart('2026-11-05', 'soon'), null);
});

test('the picked day and time read the way the customer picked them', () => {
  assert.equal(pickedDayLabel('2026-11-05'), 'Thu, Nov 5');
  assert.equal(pickedTimeLabel('2026-11-05', '10:00 AM'), '10:00 AM MST');
  assert.equal(pickedTimeLabel('2026-07-01', '10:00 AM'), '10:00 AM MDT');
  assert.equal(pickedTimeLabel('2026-11-05', ''), '');
});

test('tomorrow is a Mountain Time calendar day', () => {
  assert.match(mountainTomorrow(), /^\d{4}-\d{2}-\d{2}$/);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
  const [y, m, d] = today.split('-').map(Number);
  assert.equal(mountainTomorrow(), new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10));
});
