import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do, following its
// relative and "@/..." imports.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const candidates = [file, `${file}.ts`, `${file}.tsx`];
  const filename = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const cjs = { exports: {} };
  const require = (id) => {
    if (id.startsWith('@/types/')) return {};
    if (id.startsWith('@/')) return load(path.join(SRC, id.slice(2)));
    if (id.startsWith('.')) return load(path.join(path.dirname(filename), id));
    return {};
  };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, require, cjs);
  return cjs.exports;
}

const { validateSoldOnDelivery, SOLD_ON_DELIVERY_REQUIRED } = load(path.join(SRC, 'components/create-load/validation'));

test('a new load not made from a quote needs a yes or no', () => {
  const unanswered = validateSoldOnDelivery(true, null);
  assert.equal(unanswered.valid, false);
  assert.deepEqual(unanswered.issues, [{ field: 'vehicles.soldOnDelivery', message: SOLD_ON_DELIVERY_REQUIRED }]);
  assert.equal(validateSoldOnDelivery(true, true).valid, true);
  assert.equal(validateSoldOnDelivery(true, false).valid, true);
});

test("a load made from a quote isn't asked", () => {
  assert.equal(validateSoldOnDelivery(false, null).valid, true);
});

test('the message says what to choose', () => {
  assert.equal(SOLD_ON_DELIVERY_REQUIRED, 'Choose whether the car is sold to the person receiving it.');
});
