import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads the component file the same way the other tests do; its React, icon
// and map imports become empty objects, which tripPaths doesn't use.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const file = path.join(SRC, 'components/driver-tracker/TripRouteMap.tsx');
const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
const cjs = { exports: {} };
new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
const { tripPaths } = cjs.exports;

test('one line per driver, in the order they drove, keeping each position', () => {
  const points = [
    { driverId: 'a', lat: 40.1, lng: -111.1 },
    { driverId: 'a', lat: 40.2, lng: -111.2 },
    { driverId: 'b', lat: 40.3, lng: -111.3 },
    { driverId: 'b', lat: 40.4, lng: -111.4 },
  ];
  assert.deepEqual(tripPaths(points), [
    { driverId: 'a', path: [{ lat: 40.1, lng: -111.1 }, { lat: 40.2, lng: -111.2 }] },
    { driverId: 'b', path: [{ lat: 40.3, lng: -111.3 }, { lat: 40.4, lng: -111.4 }] },
  ]);
  assert.deepEqual(tripPaths([]), []);
});
