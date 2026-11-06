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

const { pickupDistanceText } = loadLib('driver-load-compatibility');

test('the distance badge words a rounded distance as "About" or "Under 5 mi"', () => {
  assert.equal(pickupDistanceText(20, true), 'About 20 mi from pickup');
  assert.equal(pickupDistanceText(1250, true), 'About 1,250 mi from pickup');
  assert.equal(pickupDistanceText(0, true), 'Under 5 mi from pickup');
});

test('an exact distance (the dispatcher of an accepted load, or home base) stays exact', () => {
  assert.equal(pickupDistanceText(12.4, false), '12 mi from pickup');
  assert.equal(pickupDistanceText(0, false), '0 mi from pickup');
});

test('nothing when the distance is unknown', () => {
  assert.equal(pickupDistanceText(null, true), null);
  assert.equal(pickupDistanceText(undefined), null);
  assert.equal(pickupDistanceText(Number.NaN, true), null);
});
