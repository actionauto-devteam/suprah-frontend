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

const { verificationDetailsText } = loadLib('driver-verification-reminder');

test('the Driver Page names the missing verification details in plain words', () => {
  assert.equal(
    verificationDetailsText(['Insurance Provider', 'Insurance Policy Number', 'VIN']),
    'insurance provider, insurance policy number and VIN',
  );
  assert.equal(verificationDetailsText(['VIN']), 'VIN');
  assert.equal(verificationDetailsText(['CDL Number', 'SSN Last 4']), 'CDL number and SSN last 4');
});

test('nothing missing means no reminder', () => {
  assert.equal(verificationDetailsText([]), null);
  assert.equal(verificationDetailsText(undefined), null);
  assert.equal(verificationDetailsText(null), null);
  assert.equal(verificationDetailsText(['', '  ']), null);
});
