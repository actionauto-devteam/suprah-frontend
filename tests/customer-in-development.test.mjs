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

const { IN_DEVELOPMENT_SECTIONS, inDevelopmentFor } = loadLib('customer-in-development');
const { SUPPORT_EMAIL } = loadLib('support-contact');

test('the seven unfinished sections are marked, and finished ones are not', () => {
  assert.deepEqual(Object.keys(IN_DEVELOPMENT_SECTIONS).sort(), [
    '/customer/aftermarket', '/customer/call-center', '/customer/membership', '/customer/network',
    '/customer/payments', '/customer/refer', '/customer/support',
  ]);
  for (const finished of ['/customer', '/customer/shop', '/customer/saved', '/customer/shipments', '/customer/settings', '/customer/compare']) {
    assert.equal(inDevelopmentFor(finished), null, finished);
  }
});

test('a section and its sub-pages get the notice, with or without a trailing slash or query', () => {
  assert.equal(inDevelopmentFor('/customer/aftermarket').name, 'Aftermarket');
  assert.equal(inDevelopmentFor('/customer/aftermarket/123').name, 'Aftermarket');
  assert.equal(inDevelopmentFor('/customer/network/').name, 'Service Network');
  assert.equal(inDevelopmentFor('/customer/payments?tab=paid').name, 'Suprah Pay');
  // A different page that only starts the same way isn't matched.
  assert.equal(inDevelopmentFor('/customer/supported'), null);
  assert.equal(inDevelopmentFor(null), null);
  assert.equal(inDevelopmentFor(''), null);
});

test('every notice says what works now and what to do, in plain sentences', () => {
  for (const [path, notice] of Object.entries(IN_DEVELOPMENT_SECTIONS)) {
    assert.ok(notice.name.length > 0, path);
    assert.match(notice.worksNow, /^[A-Z].*\.$/, path);
    assert.match(notice.notReady, /^[A-Z].*\.$/, path);
  }
  assert.ok(IN_DEVELOPMENT_SECTIONS['/customer/support'].notReady.includes(SUPPORT_EMAIL));
  assert.ok(IN_DEVELOPMENT_SECTIONS['/customer/call-center'].notReady.includes(SUPPORT_EMAIL));
});
