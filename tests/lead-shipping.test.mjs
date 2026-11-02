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

const { quoteStatusWords, quotePriceWords, leadIdFromShipmentsEvent, announceLeadShipmentsChanged } = loadLib('lead-shipping');

test("words a lead's quotes the way the Quotes tab does", () => {
  assert.equal(quoteStatusWords('pending'), 'Pending');
  assert.equal(quoteStatusWords('booked'), 'Converted to Load');
  assert.equal(quoteStatusWords('rejected'), 'Rejected');
  assert.equal(quotePriceWords(950.4), '$950');
  assert.equal(quotePriceWords(null), '');
  assert.equal(quotePriceWords(0), '');
});

test("refreshes only the lead a new quote was made from", () => {
  assert.equal(leadIdFromShipmentsEvent({ detail: { leadId: 'lead-1' } }), 'lead-1');
  assert.equal(leadIdFromShipmentsEvent({ detail: { leadId: 42 } }), '');
  assert.equal(leadIdFromShipmentsEvent({ detail: null }), '');
  assert.equal(leadIdFromShipmentsEvent({}), '');
  // Outside a browser there is nothing to tell, and nothing breaks.
  assert.doesNotThrow(() => announceLeadShipmentsChanged('lead-1'));
});
