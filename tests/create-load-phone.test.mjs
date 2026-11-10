import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const candidates = [file, `${file}.ts`, `${file}.tsx`];
  const filename = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { usPhoneDigits, usPhoneIncomplete } = load(path.join(SRC, 'components/create-load/phone'));

test('pasted numbers with formatting or +1 keep the right 10 digits', () => {
  for (const pasted of ['+1 (801) 555-0100', '1-801-555-0100', '+1 801.555.0100', '(801) 555-0100', '801-555-0100', '8015550100']) {
    assert.equal(usPhoneDigits(pasted), '8015550100', pasted);
  }
});

test('an extension pasted after the number is left off', () => {
  assert.equal(usPhoneDigits('801-555-0100 ext 12'), '8015550100');
  assert.equal(usPhoneDigits('+1 801 555 0100 x12'), '8015550100');
});

test('typing one digit at a time still ends with the 10-digit number', () => {
  let value = '';
  for (const digit of '18015550100') value = usPhoneDigits(value + digit);
  assert.equal(value, '8015550100');
  // Extra digits after a full number are ignored.
  assert.equal(usPhoneDigits('80155501009'), '8015550100');
});

test('empty and partial numbers', () => {
  assert.equal(usPhoneDigits(''), '');
  assert.equal(usPhoneDigits(undefined), '');
  assert.equal(usPhoneDigits('801555'), '801555');
  assert.equal(usPhoneIncomplete('801555'), true);
  assert.equal(usPhoneIncomplete('8015550100'), false);
  assert.equal(usPhoneIncomplete('(385)555-0199'), false);
  assert.equal(usPhoneIncomplete(''), false);
  assert.equal(usPhoneIncomplete(undefined), false);
});
