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
  checkableVins,
  cleanVin,
  convertedSameVehicleWarning,
  inventoryShippingStates,
  loadStatusWords,
  loadsWithVin,
  sameVinWarning,
} = loadLib('vehicle-shipping');

const VIN = '1HGCM82633A123456';
const result = {
  loads: [
    { _id: 'load-1', loadNumber: 'LD-7', status: 'In-Transit', vehicleIds: ['car-1'], vins: [VIN] },
    { _id: 'load-2', loadNumber: 'LD-8', status: 'Draft', vehicleIds: ['car-1'], vins: [] },
  ],
  quotes: [
    { _id: 'quote-1', status: 'pending', vehicleId: 'car-1' },
    { _id: 'quote-2', status: 'accepted', vehicleId: 'car-2' },
  ],
};

test('VINs are checked the way loads store them', () => {
  assert.equal(cleanVin(' 1hgcm8-2633a 123456 '), VIN);
  assert.equal(cleanVin(42), '');
  assert.deepEqual(checkableVins([VIN, VIN.toLowerCase(), '12345', undefined, '']), [VIN]);
});

test('an Inventory car shows its live load first, then a waiting quote', () => {
  const states = inventoryShippingStates(result, [
    { id: 'car-1', vin: '' },
    { id: 'car-2', vin: '' },
    { id: 'car-3', vin: VIN.toLowerCase() },
    { id: 'car-4', vin: '' },
  ]);
  assert.deepEqual(states.get('car-1'), { kind: 'load', load: result.loads[0], moreLoads: 1 });
  assert.deepEqual(states.get('car-2'), { kind: 'quote', quote: result.quotes[1] });
  assert.equal(states.get('car-3')?.kind, 'load');
  assert.equal(states.has('car-4'), false);
  assert.equal(inventoryShippingStates(null, [{ id: 'car-1' }]).size, 0);
});

test('Create Load warns about each VIN already on a live load', () => {
  assert.deepEqual(loadsWithVin(result, VIN.toLowerCase()).map((load) => load.loadNumber), ['LD-7']);
  assert.deepEqual(loadsWithVin(result, 'OTHERVIN123'), []);
  assert.equal(
    sameVinWarning(VIN, [result.loads[0]]),
    `VIN ${VIN} is already on load LD-7 (In transit). Check it isn't the same shipment before you save.`,
  );
});

test('Convert to Load says the new draft can be deleted if it is a duplicate', () => {
  assert.equal(
    convertedSameVehicleWarning(result.loads),
    "This car is also on loads LD-7 (In transit), LD-8 (Draft). Check it isn't the same shipment. The new load is a draft, so you can delete it if it's a duplicate.",
  );
  assert.equal(loadStatusWords('Picked Up'), 'Picked up');
  assert.equal(loadStatusWords('Posted'), 'Posted');
});
