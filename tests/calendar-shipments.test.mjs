import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { shipmentToCalendarItem, isShipmentItem, shipmentLoadHref } = loadLib('calendar-shipments');

const LOAD = '64b0000000000000000000b1';
const entry = {
  loadId: LOAD, loadNumber: 'LD-7', status: 'Posted', kind: 'pickup',
  title: 'Pickup window: LD-7 · 2021 Toyota Camry · Orem, UT → Denver, CO', startDate: '2026-11-01', endDate: '2026-11-03',
};
const dayToInstant = (day, endOfDay) => `${day}T${endOfDay ? '23:59:59' : '00:00:00'}-07:00`;

test('a shipment is a read-only, all-day calendar item that can never be edited', () => {
  const item = shipmentToCalendarItem(entry, dayToInstant);
  assert.equal(item.id, `shipment:${LOAD}:pickup`);
  assert.equal(item.source, 'shipment');
  assert.equal(item.type, 'shipment');
  assert.equal(item.allDay, true);
  assert.equal(item.canEdit, false);
  assert.equal(item.start, '2026-11-01T00:00:00-07:00');
  assert.equal(item.end, '2026-11-03T23:59:59-07:00');
  assert.equal(item.title, entry.title);
});

test('clicking a shipment opens its load; other items keep opening the calendar editor', () => {
  const item = shipmentToCalendarItem(entry, dayToInstant);
  assert.equal(isShipmentItem(item), true);
  assert.equal(isShipmentItem(item.id), true);
  assert.equal(shipmentLoadHref(item), `/transportation/load/${LOAD}`);
  assert.equal(isShipmentItem({ id: '64b0000000000000000000c9' }), false);
  assert.equal(shipmentLoadHref({ id: '64b0000000000000000000c9' }), '');
  assert.equal(shipmentLoadHref({ id: 'shipment:not-an-id:pickup' }), '');
  assert.equal(isShipmentItem(null), false);
});
