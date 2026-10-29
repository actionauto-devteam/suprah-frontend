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

const { DECLINE_REASON_MAX, customerRequestAnswers, quoteDeleteConfirmation } = loadLib('customer-request');
const { inventoryVehicleFromParams, inventoryVehicleLabel } = loadLib('inventory-load-prefill');

const params = (values) => ({ get: (name) => (name in values ? values[name] : null) });

test('only a customer request still open can be accepted or declined', () => {
  const portal = (status) => customerRequestAnswers({ source: 'customer_portal', status });
  assert.deepEqual(portal('pending'), { accept: true, decline: true });
  assert.deepEqual(portal('Accepted'), { accept: false, decline: true });
  for (const status of ['rejected', 'booked']) {
    assert.deepEqual(portal(status), { accept: false, decline: false }, status);
  }
  assert.deepEqual(customerRequestAnswers({ status: 'pending' }), { accept: false, decline: false });
  assert.equal(DECLINE_REASON_MAX, 300);
});

test('deleting a customer request suggests Decline and says the customer is told', () => {
  const open = quoteDeleteConfirmation({ source: 'customer_portal', status: 'pending', firstName: 'Maria', lastName: 'Santos' });
  assert.equal(open.title, 'Delete Customer Request');
  assert.match(open.message, /^This request came from Maria Santos through the customer portal\. To turn it down, use Decline/);
  assert.match(open.message, /they'll be told it was closed/);

  const closed = quoteDeleteConfirmation({ source: 'customer_portal', status: 'rejected', firstName: '', lastName: '' });
  assert.match(closed.message, /^This request came from a customer through/);
  assert.doesNotMatch(closed.message, /Decline|told/);

  assert.deepEqual(quoteDeleteConfirmation({ status: 'pending', firstName: 'Ann', lastName: 'Lee' }), {
    title: 'Delete Quote',
    message: 'Are you sure you want to delete this quote for Ann Lee? This action cannot be undone.',
  });
});

test('Create Load fills in the Inventory vehicle from the link, keeping the VIN', () => {
  const vehicle = inventoryVehicleFromParams(
    params({ vin: ' 1hgcm82633a00435 2', year: '2021', make: 'Toyota', model: 'Camry', stockNumber: 'A12' }),
  );
  assert.deepEqual(vehicle, { vin: '1HGCM82633A004352', year: 2021, make: 'Toyota', model: 'Camry', stockNumber: 'A12' });
  assert.equal(inventoryVehicleLabel(vehicle), '2021 Toyota Camry');
});

test('the Create Load link is cleaned, and an empty link fills in nothing', () => {
  assert.equal(inventoryVehicleFromParams(params({})), null);
  assert.equal(inventoryVehicleFromParams(params({ year: '2021', stockNumber: 'A12' })), null);
  const odd = inventoryVehicleFromParams(params({ vin: '<script>', year: '21', make: 'x'.repeat(80) }));
  assert.equal(odd.vin, 'SCRIPT');
  assert.equal(odd.year, '');
  assert.equal(odd.make.length, 60);
  assert.equal(inventoryVehicleFromParams(params({ make: 'Ford', year: '3000' })).year, '');
  assert.equal(inventoryVehicleLabel({ vin: 'ABC', year: '', make: '', model: '', stockNumber: '' }), 'VIN ABC');
});
