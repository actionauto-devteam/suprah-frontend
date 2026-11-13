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

const {
  SHIPMENT_STAGE_META,
  shipmentSteps,
  currentShipmentStep,
  driverInitials,
  formatShipmentPrice,
  formatShipmentDate,
  formatExpectedByDate,
} = loadLib('customer-shipments');
const { CUSTOMER_SEES_DRIVER_NOTICE } = loadLib('driver-privacy');
const { quoteVehicleNotice } = loadLib('quote-vehicle');

const STAGES = [
  'waiting', 'accepted', 'declined', 'unavailable', 'withdrawn', 'booked', 'finding_driver', 'driver_accepted',
  'picked_up', 'on_the_way', 'arrived', 'delivered', 'cancelled',
];

test('every status has plain wording', () => {
  for (const stage of STAGES) {
    const meta = SHIPMENT_STAGE_META[stage];
    assert.ok(meta.label.length > 0 && meta.description.endsWith('.'), stage);
    // Never a phone number, an email or the dealership's internal words.
    assert.doesNotMatch(meta.description, /phone|email|internal/i, stage);
  }
  assert.equal(SHIPMENT_STAGE_META.finding_driver.tone, 'waiting');
  assert.equal(SHIPMENT_STAGE_META.delivered.description, "Your vehicle was delivered. If something isn't right, contact the dealership.");
  assert.equal(SHIPMENT_STAGE_META.unavailable.label, 'No longer available');
  assert.equal(SHIPMENT_STAGE_META.withdrawn.label, 'Withdrawn');
  assert.equal(SHIPMENT_STAGE_META.withdrawn.description, 'You withdrew this request. The dealership has been told.');
});

test('the progress line follows the shipment', () => {
  const states = (stage, shipment = null) =>
    shipmentSteps({ stage, requestedAt: '2026-10-20T15:00:00Z', shipment }).map((step) => step.state);
  const U = 'upcoming';
  assert.deepEqual(states('waiting'), ['current', U, U, U, U, U, U]);
  assert.deepEqual(states('booked'), ['done', 'current', U, U, U, U, U]);
  // Back to waiting for a driver after one handed it back: the booking still stands.
  assert.deepEqual(states('finding_driver'), ['done', 'current', U, U, U, U, U]);
  assert.deepEqual(states('driver_accepted'), ['done', 'done', 'current', U, U, U, U]);
  assert.deepEqual(states('picked_up'), ['done', 'done', 'done', 'current', U, U, U]);
  assert.deepEqual(states('on_the_way'), ['done', 'done', 'done', 'done', 'current', U, U]);
  assert.deepEqual(states('arrived'), ['done', 'done', 'done', 'done', 'done', 'current', U]);
  assert.deepEqual(states('delivered'), ['done', 'done', 'done', 'done', 'done', 'done', 'done']);
  for (const stage of ['declined', 'unavailable', 'withdrawn', 'cancelled']) {
    assert.equal(shipmentSteps({ stage, requestedAt: null, shipment: null }), null, stage);
  }
});

test('steps carry the time each one happened', () => {
  const steps = shipmentSteps({
    stage: 'on_the_way',
    requestedAt: '2026-10-20T15:00:00Z',
    shipment: {
      bookedAt: '2026-10-21T15:00:00Z',
      driverAcceptedAt: '2026-10-21T18:00:00Z',
      pickedUpAt: '2026-10-22T15:00:00Z',
      onTheWayAt: '2026-10-22T16:00:00Z',
      arrivedAt: null,
      deliveredAt: null,
    },
  });
  assert.deepEqual(steps.map((step) => step.at), [
    '2026-10-20T15:00:00Z', '2026-10-21T15:00:00Z', '2026-10-21T18:00:00Z', '2026-10-22T15:00:00Z', '2026-10-22T16:00:00Z', null, null,
  ]);
  assert.deepEqual(currentShipmentStep(steps), { step: steps[4], position: 5, total: 7 });
});

test('a shipment the dealership booked for the customer starts at Booked', () => {
  const steps = shipmentSteps({ kind: 'shared', stage: 'driver_accepted', requestedAt: null, shipment: { bookedAt: '2026-11-04T01:00:00Z' } });
  assert.deepEqual(steps.map((step) => step.key), ['booked', 'driver_accepted', 'picked_up', 'on_the_way', 'arrived', 'delivered']);
  assert.deepEqual(steps.map((step) => step.state), ['done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  assert.equal(currentShipmentStep(steps).total, 6);
  const delivered = shipmentSteps({ kind: 'shared', stage: 'delivered', requestedAt: null, shipment: {} });
  assert.deepEqual(currentShipmentStep(delivered), { step: delivered[5], position: 6, total: 6 });
  assert.equal(currentShipmentStep(null), null);
});

test('drivers without a photo get their initials, and are told what customers see', () => {
  assert.equal(driverInitials('Mark Anthony Reyes'), 'MR');
  assert.equal(driverInitials('  mark '), 'M');
  assert.equal(driverInitials(''), '?');
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /full name, profile photo and truck/);
  // Short and plain (2026-11-13): two sentences each, no "deliver to see".
  const { DISPATCH_SEES_DISTANCE_NOTICE, DRIVER_PRIVACY_HEADING } = loadLib('driver-privacy');
  assert.equal(DRIVER_PRIVACY_HEADING, 'Who can see your details');
  assert.doesNotMatch(CUSTOMER_SEES_DRIVER_NOTICE, /deliver to see/);
  assert.ok(CUSTOMER_SEES_DRIVER_NOTICE.length < 300, CUSTOMER_SEES_DRIVER_NOTICE.length);
  assert.ok(DISPATCH_SEES_DISTANCE_NOTICE.length < 170, DISPATCH_SEES_DISTANCE_NOTICE.length);
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /never see your phone number or email/);
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

test('the expected delivery date is the day staff entered, never the day before', () => {
  // Stored at UTC midnight; in Mountain Time that instant is still the evening before.
  assert.equal(formatExpectedByDate('2026-11-03T00:00:00.000Z'), 'Nov 3, 2026');
  assert.equal(formatExpectedByDate('2026-12-31'), 'Dec 31, 2026');
  assert.equal(formatExpectedByDate(null), '');
  assert.equal(formatExpectedByDate('soon'), '');
});
