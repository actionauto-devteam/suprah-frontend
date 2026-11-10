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

const { ACCOUNT_DELETION_ENDPOINT, ACCOUNT_DELETION_TEXT, deletionConfirmed } = load(path.join(SRC, 'lib/account-deletion'));

test("drivers use the Driver Portal's address, which works before approval; customers use their profile's", () => {
  assert.equal(ACCOUNT_DELETION_ENDPOINT.driver, '/api/driver-profile/account');
  assert.equal(ACCOUNT_DELETION_ENDPOINT.customer, '/api/profile/delete-account');
});

test('the delete button works once DELETE is typed', () => {
  for (const typed of ['DELETE', 'delete', ' Delete ']) assert.equal(deletionConfirmed(typed), true, typed);
  for (const typed of ['', 'DELET', 'DELETE ME', 'remove']) assert.equal(deletionConfirmed(typed), false, typed);
});

test('each account says plainly what goes, what stays and when it is blocked', () => {
  assert.match(ACCOUNT_DELETION_TEXT.driver.kept, /Former driver/);
  assert.match(ACCOUNT_DELETION_TEXT.driver.removed, /documents/);
  assert.match(ACCOUNT_DELETION_TEXT.driver.blockedWhen, /load is in progress|payout/);
  assert.match(ACCOUNT_DELETION_TEXT.customer.kept, /Former customer/);
  assert.match(ACCOUNT_DELETION_TEXT.customer.removed, /Wishlist/);
  assert.match(ACCOUNT_DELETION_TEXT.customer.blockedWhen, /being shipped to you/);
});
