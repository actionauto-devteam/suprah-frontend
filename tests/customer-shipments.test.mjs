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
  const requireLib = (specifier) => loadLib(specifier.replace(/^@\/lib\//, ''));
  new Function('exports', 'require', 'module', outputText)(cjs.exports, requireLib, cjs);
  return cjs.exports;
}

const { SHIPMENT_STAGE_META, shipmentSteps, formatShipmentPrice, formatShipmentDate } = loadLib('customer-shipments');
const { quoteVehicleNotice } = loadLib('quote-vehicle');

const STAGES = ['waiting', 'accepted', 'declined', 'unavailable', 'booked', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

test('every status has plain wording', () => {
  for (const stage of STAGES) {
    const meta = SHIPMENT_STAGE_META[stage];
    assert.ok(meta.label.length > 0 && meta.description.endsWith('.'), stage);
    assert.doesNotMatch(meta.description, /driver/i, stage);
  }
  assert.equal(SHIPMENT_STAGE_META.unavailable.label, 'No longer available');
});

test('the progress line follows the shipment', () => {
  const states = (stage, shipment = null) =>
    shipmentSteps({ stage, requestedAt: '2026-10-20T15:00:00Z', shipment }).map((step) => step.state);
  assert.deepEqual(states('waiting'), ['current', 'upcoming', 'upcoming', 'upcoming']);
  assert.deepEqual(states('booked'), ['done', 'current', 'upcoming', 'upcoming']);
  assert.deepEqual(states('on_the_way'), ['done', 'done', 'current', 'upcoming']);
  assert.deepEqual(states('delivered'), ['done', 'done', 'done', 'done']);
  for (const stage of ['declined', 'unavailable', 'cancelled']) {
    assert.equal(shipmentSteps({ stage, requestedAt: null, shipment: null }), null, stage);
  }
});

test('steps carry the time each one happened', () => {
  const steps = shipmentSteps({
    stage: 'on_the_way',
    requestedAt: '2026-10-20T15:00:00Z',
    shipment: { bookedAt: '2026-10-21T15:00:00Z', pickedUpAt: '2026-10-22T15:00:00Z', onTheWayAt: '2026-10-22T16:00:00Z', deliveredAt: null },
  });
  assert.deepEqual(steps.map((step) => step.at), ['2026-10-20T15:00:00Z', '2026-10-21T15:00:00Z', '2026-10-22T16:00:00Z', null]);
});

test('prices and dates read naturally', () => {
  assert.equal(formatShipmentPrice(950.4), '$950');
  assert.equal(formatShipmentPrice(null), '');
  assert.equal(formatShipmentDate('2026-10-22T16:00:00Z'), 'Oct 22, 10:00 AM');
  assert.equal(formatShipmentDate(null), '');
});

test('quote cards say when the vehicle is gone', () => {
  assert.deepEqual(quoteVehicleNotice({ status: 'rejected', closedReason: 'vehicle_unavailable' }), {
    label: 'Closed: vehicle no longer available',
    tone: 'stopped',
  });
  assert.deepEqual(quoteVehicleNotice({ status: 'pending', vehicleState: 'removed' }), { label: 'No longer in inventory', tone: 'stopped' });
  assert.deepEqual(quoteVehicleNotice({ status: 'booked', vehicleState: 'sold' }), { label: 'Vehicle sold', tone: 'info' });
  assert.equal(quoteVehicleNotice({ status: 'pending' }), null);
  assert.equal(quoteVehicleNotice({ status: 'accepted', closedReason: 'vehicle_unavailable' }), null);
});
