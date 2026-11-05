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

const { ratingSummary, receivedLine, reviewProblem, reviewStarted, starsLabel } = loadLib('shipment-review');

test('stars read clearly', () => {
  assert.equal(starsLabel(4), '4 out of 5 stars');
  assert.equal(starsLabel(1), '1 out of 5 star');
  assert.equal(starsLabel(0), 'No stars');
  assert.equal(starsLabel(null), 'No stars');
});

test("Driver Tracker shows a driver's average only once customers rated them", () => {
  assert.equal(ratingSummary({ average: 4.666, count: 3 }), '4.7 from 3 customers');
  assert.equal(ratingSummary({ average: 5, count: 1 }), '5.0 from 1 customer');
  assert.equal(ratingSummary({ average: 0, count: 0 }), '');
  assert.equal(ratingSummary(null), '');
});

test('a review says what is missing before it is sent, like the server', () => {
  assert.equal(reviewProblem({ driverStars: 5 }, true), null);
  assert.equal(reviewProblem({ dealershipComment: 'Thanks' }, true), null);
  assert.equal(reviewProblem({ driverComment: 'Great' }, true), 'Choose 1 to 5 stars for your driver, then send your review.');
  assert.equal(reviewProblem({}, true), 'Choose stars for your driver or write a few words for the dealership, then send your review.');
  assert.equal(reviewProblem({ driverStars: 5 }, false), 'Write a few words for the dealership, then send your review.');
  assert.match(reviewProblem({ driverStars: 4, driverComment: 'x'.repeat(1001) }, true), /up to 1,000 characters/);
  assert.match(reviewProblem({ dealershipComment: 'x'.repeat(2001) }, true), /up to 2,000 characters/);
});

test('"Confirm received" only sends a review when one was started', () => {
  assert.equal(reviewStarted({ driverStars: null, driverComment: '  ', dealershipComment: '' }), false);
  assert.equal(reviewStarted({ driverStars: 3 }), true);
  assert.equal(reviewStarted({ dealershipComment: 'Good' }), true);
});

test('the confirmation reads in Mountain Time', () => {
  assert.equal(receivedLine('2026-11-05T22:40:00Z'), 'You confirmed you received it on Nov 5 at 3:40 PM MST.');
  assert.equal(receivedLine(null), '');
  assert.equal(receivedLine('soon'), '');
});
