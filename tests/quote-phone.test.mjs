import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { usableQuotePhone } = load(path.join(SRC, 'lib/quote-phone'));

test('an account phone with its area code fills in the quote form as saved', () => {
  assert.equal(usableQuotePhone('801-555-0100'), '801-555-0100');
  assert.equal(usableQuotePhone(' (385) 555-0199 '), '(385) 555-0199');
  assert.equal(usableQuotePhone('+1 801 555 0100'), '+1 801 555 0100');
});

test("a phone the server wouldn't accept leaves the field for the customer to type", () => {
  for (const value of ['', '555', '000', 'call me', '1'.repeat(16), `801-555-0100 ${'x'.repeat(30)}`, null, undefined]) {
    assert.equal(usableQuotePhone(value), '', String(value));
  }
});
