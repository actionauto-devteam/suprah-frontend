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

const { CHANGEABLE_VEHICLE_STATUSES, VEHICLE_STATUS_CHOICES, isVehicleOnTheWay, vehicleStatusChangedMessage } = loadLib('vehicle-status');

test('staff can choose Ready for Sale, In Recon or Sold, each explained plainly', () => {
  assert.deepEqual([...CHANGEABLE_VEHICLE_STATUSES], ['Ready for Sale', 'In Recon', 'Sold']);
  for (const status of CHANGEABLE_VEHICLE_STATUSES) {
    assert.ok(VEHICLE_STATUS_CHOICES[status].length > 20);
  }
  assert.ok(!CHANGEABLE_VEHICLE_STATUSES.includes('In Transit'));
});

test("a car on a load that's been picked up can't be changed", () => {
  const load = (status) => ({ kind: 'load', load: { _id: 'l1', loadNumber: 'LD-1', status }, moreLoads: 0 });
  assert.equal(isVehicleOnTheWay(load('Picked Up')), true);
  assert.equal(isVehicleOnTheWay(load('In-Transit')), true);
  assert.equal(isVehicleOnTheWay(load('Assigned')), false);
  assert.equal(isVehicleOnTheWay({ kind: 'quote', quote: { _id: 'q1', status: 'pending' } }), false);
  assert.equal(isVehicleOnTheWay(undefined), false);
});

test('confirms the change in plain words', () => {
  assert.equal(vehicleStatusChangedMessage('2021 Toyota Camry', 'Ready for Sale'), '2021 Toyota Camry is now Ready for Sale.');
  assert.equal(vehicleStatusChangedMessage(' ', 'Sold'), 'This car is now Sold.');
});
