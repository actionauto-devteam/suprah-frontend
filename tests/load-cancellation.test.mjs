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

const {
  LOAD_CANCELLATION_REASONS,
  LOAD_CANCELLATION_REASON_LABELS,
  canSubmitCancellation,
  cancellationReasonLabel,
} = loadLib('load-cancellation');
const { CANCELLABLE_LOAD_STATUSES, isCancellableLoadStatus } = loadLib('load-status');

test('matches the server list of reasons, each with a plain label', () => {
  assert.deepEqual([...LOAD_CANCELLATION_REASONS], [
    'customer_cancelled',
    'vehicle_unavailable',
    'duplicate_load',
    'price_not_agreed',
    'other',
  ]);
  for (const reason of LOAD_CANCELLATION_REASONS) {
    assert.ok(LOAD_CANCELLATION_REASON_LABELS[reason].length > 0);
  }
  assert.equal(cancellationReasonLabel('vehicle_unavailable'), 'Vehicle sold or unavailable');
  assert.equal(cancellationReasonLabel('something_new'), 'Reason not recorded');
  assert.equal(cancellationReasonLabel(undefined), 'Reason not recorded');
});

test('the form needs a reason, and a short note for Other', () => {
  assert.equal(canSubmitCancellation(null, ''), false);
  assert.equal(canSubmitCancellation('customer_cancelled', ''), true);
  assert.equal(canSubmitCancellation('other', ''), false);
  assert.equal(canSubmitCancellation('other', '  ab  '), false);
  assert.equal(canSubmitCancellation('other', 'Wrong pickup city'), true);
  assert.equal(canSubmitCancellation('duplicate_load', 'x'.repeat(501)), false);
});

test('loads can be cancelled only before pickup', () => {
  assert.deepEqual([...CANCELLABLE_LOAD_STATUSES], ['Draft', 'Posted', 'Assigned', 'Accepted']);
  for (const status of ['Picked Up', 'In-Transit', 'Delivered', 'Cancelled', '', undefined]) {
    assert.equal(isCancellableLoadStatus(status), false);
  }
  assert.equal(isCancellableLoadStatus('Accepted'), true);
});
