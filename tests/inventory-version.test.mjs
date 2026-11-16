import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Inventory's quiet refresh skips the full download when nothing changed (2026-11-16).
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { INVENTORY_VERSION_URL, inventoryUnchanged, inventoryVersionOf } = loadLib('inventory-version');
const page = fs.readFileSync(fileURLToPath(new URL('../src/app/(dashboard)/inventory/page.tsx', import.meta.url)), 'utf8');

test('reads the stamp the full list came with', () => {
  assert.equal(inventoryVersionOf({ vehicles: [], inventoryVersion: '42:1000:2026-11-16T05' }), '42:1000:2026-11-16T05');
  assert.equal(inventoryVersionOf({ vehicles: [] }), null);
  assert.equal(inventoryVersionOf(null), null);
  assert.equal(INVENTORY_VERSION_URL, '/api/vehicles/inventory-version');
});

test('skips only when both stamps are known and the same', () => {
  assert.equal(inventoryUnchanged('a', 'a'), true);
  assert.equal(inventoryUnchanged('a', 'b'), false);
  assert.equal(inventoryUnchanged(null, 'a'), false);
  assert.equal(inventoryUnchanged('a', null), false);
});

test('the quiet refresh checks the stamp first and downloads only when it changed', () => {
  const quiet = page.slice(page.indexOf('const refreshQuietly'), page.indexOf('}, [fetchInventoryVersion, fetchVehicleDataset, inventoryView]);'));
  assert.ok(quiet.indexOf('fetchInventoryVersion(inventoryView)') > -1);
  assert.ok(quiet.indexOf('fetchInventoryVersion(inventoryView)') < quiet.indexOf('fetchVehicleDataset(inventoryView)'));
  assert.match(quiet, /if \(inventoryUnchanged\(shown, latest\)\) \{/);
});

test('the stamp shown is the one of the cars on screen', () => {
  assert.match(page, /shownVersionRef\.current\[inventoryView\] =\s+downloadedVersionsRef\.current\.get\(vehiclesFromResponse\) \?\? null;/);
  assert.match(page, /shownVersionRef\.current\[inventoryView\] = downloadedVersionsRef\.current\.get\(fresh\) \?\? null;/);
  assert.match(page, /shownVersionRef\.current\[view\] =\s+downloadedVersionsRef\.current\.get\(vehicles\) \?\? shownVersionRef\.current\[view\];/);
});
