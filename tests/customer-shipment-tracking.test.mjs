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

const { LIVE_MAP_STAGES, arrivalLine, isShipmentNotification, positionLine, updatedAgo, withLivePosition } = loadLib('customer-shipment-tracking');
const { CUSTOMER_SEES_DRIVER_NOTICE, WHO_SEES_DRIVER_LOCATION } = loadLib('driver-privacy');

// Thursday, Nov 5, 2026, 10:00 AM in Mountain Time (MST, UTC-7).
const NOW = Date.parse('2026-11-05T17:00:00Z');

test('the map shows only while the car is on the truck', () => {
  assert.deepEqual([...LIVE_MAP_STAGES].sort(), ['arrived', 'on_the_way', 'picked_up']);
  for (const stage of ['waiting', 'booked', 'driver_accepted', 'delivered', 'cancelled', 'finding_driver']) {
    assert.equal(LIVE_MAP_STAGES.has(stage), false, stage);
  }
});

test('the arrival time reads in Mountain Time, with the day only when it is not today', () => {
  assert.equal(arrivalLine('2026-11-05T22:40:00Z', NOW), 'Arriving around 3:40 PM MST');
  assert.equal(arrivalLine('2026-11-06T16:05:00Z', NOW), 'Arriving around Fri, Nov 6, 9:05 AM MST');
  // Daylight time in summer.
  assert.equal(arrivalLine('2026-07-01T20:00:00Z', Date.parse('2026-07-01T15:00:00Z')), 'Arriving around 2:00 PM MDT');
  assert.equal(arrivalLine(null, NOW), '');
  assert.equal(arrivalLine('soon', NOW), '');
});

test('says how fresh the arrival time is', () => {
  assert.equal(updatedAgo('2026-11-05T16:59:40Z', NOW), 'updated just now');
  assert.equal(updatedAgo('2026-11-05T16:54:00Z', NOW), 'updated 6 min ago');
  assert.equal(updatedAgo('2026-11-05T14:00:00Z', NOW), 'updated 3 h ago');
  assert.equal(updatedAgo(undefined, NOW), '');
});

test("explains the driver's position plainly, including when it is old or rough", () => {
  assert.deepEqual(positionLine(null, NOW), {
    text: "Waiting for your driver's location. It shows here as soon as their phone shares it.",
    stale: true,
  });
  assert.match(positionLine({ measuredAt: '2026-11-05T16:59:30Z', approximate: false }, NOW).text, /^Live location\. It moves on the map as your driver does/);
  assert.match(positionLine({ measuredAt: '2026-11-05T16:50:00Z', approximate: false }, NOW).text, /^Location from 10 min ago\./);
  const old = positionLine({ measuredAt: '2026-11-05T15:00:00Z', approximate: false }, NOW);
  assert.equal(old.stale, true);
  assert.match(old.text, /We haven't had your driver's location for 2 h\. .*still on its way\./);
  assert.match(positionLine({ measuredAt: '2026-11-05T16:59:30Z', approximate: true }, NOW).text, /The spot is approximate\.$/);
});

test('drivers are told customers see their location from pickup until delivery', () => {
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /where you are from pickup until delivery/);
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /never see your phone number or email/);
  assert.match(WHO_SEES_DRIVER_LOCATION, /^Only the dispatcher responsible for your accepted load/);
  assert.match(WHO_SEES_DRIVER_LOCATION, /customer receiving the vehicle also sees where you are from pickup until delivery\./);
});

test('a live position moves the driver, but never backwards or onto another shipment', () => {
  const view = {
    live: true,
    driver: { position: { lat: 40.5, lng: -105.08 }, measuredAt: '2026-11-05T16:59:00.000Z', approximate: false },
    delivery: { lat: 39.75, lng: -104.99 },
    eta: null,
    route: null,
  };
  const update = (measuredAt, extra = {}) => ({
    quoteId: 'q1',
    driver: { position: { lat: 40.4, lng: -105.05 }, measuredAt, approximate: true, ...extra },
  });
  const moved = withLivePosition(view, update('2026-11-05T16:59:30Z'), 'q1');
  assert.deepEqual(moved.driver, { position: { lat: 40.4, lng: -105.05 }, measuredAt: '2026-11-05T16:59:30.000Z', approximate: true });
  assert.deepEqual(moved.delivery, view.delivery);
  // Older than what's shown, another shipment, broken, or the map isn't live: unchanged.
  assert.equal(withLivePosition(view, update('2026-11-05T16:58:00Z'), 'q1'), view);
  assert.equal(withLivePosition(view, update('2026-11-05T16:59:30Z'), 'q2'), view);
  assert.equal(withLivePosition(view, update('not a time'), 'q1'), view);
  assert.equal(withLivePosition(view, update('2026-11-05T16:59:30Z', { position: { lat: 'x', lng: 1 } }), 'q1'), view);
  const notLive = { ...view, live: false };
  assert.equal(withLivePosition(notLive, update('2026-11-05T16:59:30Z'), 'q1'), notLive);
  assert.equal(withLivePosition(undefined, update('2026-11-05T16:59:30Z'), 'q1'), undefined);
  // The first position after "waiting for your driver's location".
  assert.equal(withLivePosition({ ...view, driver: null }, update('2026-11-05T16:59:30Z'), 'q1').driver.position.lat, 40.4);
});

test('shipment notifications refresh My Shipments; others do not', () => {
  assert.equal(isShipmentNotification({ metadata: { route: '/customer/shipments' } }), true);
  assert.equal(isShipmentNotification({ metadata: { route: '/customer/shipments?shipment=q1&chat=driver' } }), true);
  for (const other of [{ metadata: { route: '/customer/shipments-old' } }, { metadata: { route: '/transportation/load/1' } }, { metadata: {} }, {}, null]) {
    assert.equal(isShipmentNotification(other), false, JSON.stringify(other));
  }
});

test('dispatchers choosing a driver see only a rounded distance, and drivers are told', () => {
  const { DISPATCH_SEES_DISTANCE_NOTICE } = loadLib('driver-privacy');
  assert.match(DISPATCH_SEES_DISTANCE_NOTICE, /dispatchers looking for a driver see only how far you are from their pickup, rounded to 5 miles, never your exact location\.$/);
  assert.match(DISPATCH_SEES_DISTANCE_NOTICE, /rounded to 5 miles/);
  assert.match(WHO_SEES_DRIVER_LOCATION, /Dispatchers choosing a driver for another load see only about how far you are from its pickup, rounded to 5 miles, never your exact location\.$/);
});

test('the live map follows the driver like a ride-hailing app', () => {
  const { FOLLOW_ZOOM, liveMapCamera } = loadLib('customer-shipment-tracking');
  const driver = { lat: 40.76, lng: -111.89 };
  const delivery = { lat: 40.23, lng: -111.66 };
  const base = { following: true, started: false, driver, delivery, deliveryShown: false, currentZoom: 9 };
  // First look: straight to the driver, a few streets close.
  assert.deepEqual(liveMapCamera(base), { target: 'driver', center: [-111.89, 40.76], zoom: FOLLOW_ZOOM });
  // Already zoomed in closer: that zoom is kept.
  assert.equal(liveMapCamera({ ...base, currentZoom: 15 }).zoom, 15);
  // Then it glides along at whatever zoom the customer picked.
  assert.deepEqual(liveMapCamera({ ...base, started: true, currentZoom: 11 }), { target: 'driver', center: [-111.89, 40.76] });
  // Not following: the customer's own view is left alone.
  assert.equal(liveMapCamera({ ...base, following: false }), null);
  assert.equal(liveMapCamera({ ...base, following: false, started: true }), null);
});

test('before the driver shows, the map shows the delivery point once', () => {
  const { liveMapCamera } = loadLib('customer-shipment-tracking');
  const delivery = { lat: 40.23, lng: -111.66 };
  const waiting = { following: true, started: false, driver: null, delivery, deliveryShown: false, currentZoom: 9 };
  assert.deepEqual(liveMapCamera(waiting), { target: 'delivery', center: [-111.66, 40.23], zoom: 12 });
  assert.equal(liveMapCamera({ ...waiting, deliveryShown: true }), null);
  assert.equal(liveMapCamera({ ...waiting, delivery: null }), null);
});
