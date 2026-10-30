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

const { isSoldLeadStatus, leadAddressToDestination, leadQuoteInitialData, inventoryVehicleFromApi, leadQuoteCreatedMessage, quoteStatusWords, quotePriceWords } =
  loadLib('lead-shipping');

test('the button shows only on leads in the Sold group', () => {
  for (const status of ['Sold', 'In Finance', 'Online Financing']) assert.equal(isSoldLeadStatus(status), true);
  for (const status of ['New', 'Working', 'Closed', 'Bought Elsewhere', '', undefined]) assert.equal(isSoldLeadStatus(status), false);
});

test("splits a lead's address into the quote's destination fields", () => {
  assert.deepEqual(leadAddressToDestination('123 Main St, Denver, CO 80202'), {
    toStreetAddress: '123 Main St', toCity: 'Denver', toState: 'CO', zipCode: '80202',
  });
  assert.deepEqual(leadAddressToDestination('  456 Oak Ave,  Provo, ut, 84601-1234, USA '), {
    toStreetAddress: '456 Oak Ave', toCity: 'Provo', toState: 'UT', zipCode: '84601-1234',
  });
  assert.deepEqual(leadAddressToDestination('Boise, ID'), { toCity: 'Boise', toState: 'ID' });
});

test("doesn't guess when the address can't be split", () => {
  assert.deepEqual(leadAddressToDestination('Near the old mill, call first'), { toStreetAddress: 'Near the old mill, call first' });
  assert.deepEqual(leadAddressToDestination('12 Main St, Springfield, XX 11111'), { toStreetAddress: '12 Main St, Springfield, XX 11111' });
  assert.deepEqual(leadAddressToDestination(''), {});
  assert.deepEqual(leadAddressToDestination(undefined), {});
});

test("pre-fills the customer's details from the lead", () => {
  assert.deepEqual(
    leadQuoteInitialData({ firstName: ' Maria ', lastName: 'Santos', email: 'maria@example.com', phone: '801 555 0100', address: 'Denver, CO 80202' }),
    { firstName: 'Maria', lastName: 'Santos', email: 'maria@example.com', phone: '801 555 0100', toCity: 'Denver', toState: 'CO', zipCode: '80202' },
  );
});

test('shapes Inventory cars like Transportation does', () => {
  const car = inventoryVehicleFromApi({ _id: 'car-1', year: 2021, make: 'Toyota', modelName: 'Camry', vin: 'VIN1', location: 'Orem, UT', images: ['a.jpg'] });
  assert.equal(car.id, 'car-1');
  assert.equal(car.model, 'Camry');
  assert.equal(car.location, 'Orem, UT');
  assert.equal(car.image, 'a.jpg');
});

test('confirms the quote with a plain price', () => {
  assert.equal(leadQuoteCreatedMessage(1234.6), "Quote created. Estimated shipping: $1,235. You'll find it under Quotes in Transportation.");
  assert.equal(leadQuoteCreatedMessage(undefined), "Quote created. You'll find it under Quotes in Transportation.");
});

test("words a lead's quotes the way the Quotes tab does", () => {
  assert.equal(quoteStatusWords('pending'), 'Pending');
  assert.equal(quoteStatusWords('booked'), 'Converted to Load');
  assert.equal(quoteStatusWords('rejected'), 'Rejected');
  assert.equal(quotePriceWords(950.4), '$950');
  assert.equal(quotePriceWords(null), '');
  assert.equal(quotePriceWords(0), '');
});
