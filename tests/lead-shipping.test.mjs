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

const { quoteStatusWords, quotePriceWords, leadIdFromShipmentsEvent, announceLeadShipmentsChanged, withFocusedQuote } = loadLib('lead-shipping');

test('moves the quote a link pointed to to the top', () => {
  const list = [{ quoteId: 'q3' }, { quoteId: 'q2' }, { quoteId: 'q1' }];
  assert.deepEqual(withFocusedQuote(list, 'q1'), { shipments: [{ quoteId: 'q1' }, { quoteId: 'q3' }, { quoteId: 'q2' }], focused: true });
  assert.deepEqual(withFocusedQuote(list, 'q3').shipments.map((s) => s.quoteId), ['q3', 'q2', 'q1']);
  // A quote that isn't this lead's, or no quote, leaves the list as it is.
  assert.deepEqual(withFocusedQuote(list, 'other'), { shipments: list, focused: false });
  assert.deepEqual(withFocusedQuote(list, ''), { shipments: list, focused: false });
});

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
