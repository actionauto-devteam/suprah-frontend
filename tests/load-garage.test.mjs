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

const { garageStatusNote } = loadLib('load-garage');

test('the button speaks for itself, so an available car has no note', () => {
  assert.equal(garageStatusNote({ state: 'available', customerName: 'Maria Santos', vehicleLabel: '2021 Toyota Camry' }), '');
  assert.equal(garageStatusNote(null), '');
  assert.equal(garageStatusNote(undefined), '');
});

test('says plainly when the car is already there or why it cannot be added', () => {
  assert.equal(
    garageStatusNote({ state: 'done', customerName: 'Maria Santos', vehicleLabel: '2021 Toyota Camry' }),
    "The 2021 Toyota Camry is in Maria Santos's My Garage.",
  );
  assert.equal(
    garageStatusNote({ state: 'other_dealership', customerName: 'Maria Santos' }),
    "Maria Santos is registered with another dealership, so this car can't be added to their My Garage from here.",
  );
  assert.equal(
    garageStatusNote({ state: 'no_inventory_car', customerName: 'Maria Santos' }),
    "This car isn't in your Inventory anymore, so it can't be added to the customer's My Garage from here.",
  );
});
