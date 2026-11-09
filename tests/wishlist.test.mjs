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

const { splitWishlist, withSaved, withoutSaved, wishlistCarName } = loadLib('wishlist');

const camry = { id: 'a', year: 2021, make: 'Toyota', model: 'Camry', trim: 'SE', price: 24000, available: true };
const civic = { id: 'b', year: 2019, make: 'Honda', model: 'Civic', available: false };

test('cars for sale and cars no longer available are shown apart', () => {
  const { available, unavailable } = splitWishlist([camry, civic, { id: 'c', year: 2020, make: 'Ford', model: 'F-150' }]);
  assert.deepEqual(available.map((car) => car.id), ['a', 'c']);
  assert.deepEqual(unavailable.map((car) => car.id), ['b']);
  assert.deepEqual(splitWishlist(undefined), { available: [], unavailable: [] });
});

test('the heart shows the change straight away, once', () => {
  assert.deepEqual(withSaved([civic], camry).map((car) => car.id), ['a', 'b']);
  assert.equal(withSaved([camry], camry).length, 1);
  assert.equal(withSaved(undefined, camry)[0].available, true);
  assert.deepEqual(withoutSaved([camry, civic], 'a').map((car) => car.id), ['b']);
  assert.deepEqual(withoutSaved(undefined, 'a'), []);
});

test('a car is named the way customers know it', () => {
  assert.equal(wishlistCarName(camry), '2021 Toyota Camry SE');
  assert.equal(wishlistCarName(civic), '2019 Honda Civic');
  assert.equal(wishlistCarName({}), 'This car');
});
