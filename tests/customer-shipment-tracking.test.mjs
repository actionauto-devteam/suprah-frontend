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

const { LIVE_MAP_STAGES, arrivalLine, positionLine, updatedAgo } = loadLib('customer-shipment-tracking');
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
  assert.match(positionLine({ measuredAt: '2026-11-05T16:59:30Z', approximate: false }, NOW).text, /^Live location\. It refreshes about every minute/);
  assert.match(positionLine({ measuredAt: '2026-11-05T16:50:00Z', approximate: false }, NOW).text, /^Location from 10 min ago\./);
  const old = positionLine({ measuredAt: '2026-11-05T15:00:00Z', approximate: false }, NOW);
  assert.equal(old.stale, true);
  assert.match(old.text, /We haven't had your driver's location for 2 h\. .*still on its way\./);
  assert.match(positionLine({ measuredAt: '2026-11-05T16:59:30Z', approximate: true }, NOW).text, /The spot is approximate\.$/);
});

test('drivers are told customers see their location from pickup until delivery', () => {
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /where you are on a map from pickup until delivery/);
  assert.match(CUSTOMER_SEES_DRIVER_NOTICE, /never see your phone number or email/);
  assert.match(WHO_SEES_DRIVER_LOCATION, /^Only the dispatcher responsible for your accepted load/);
  assert.match(WHO_SEES_DRIVER_LOCATION, /customer receiving the vehicle also sees where you are from pickup until delivery\.$/);
});
