import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do, following its "@/..." imports.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const require = (id) => (id.startsWith('@/') ? load(path.join(SRC, id.slice(2))) : {});
  new Function('exports', 'require', 'module', outputText)(cjs.exports, require, cjs);
  return cjs.exports;
}

const { ACCOUNT_DELETION_ENDPOINT, ACCOUNT_DELETION_TEXT, deletionConfirmed, deletionErrorMessage } = load(path.join(SRC, 'lib/account-deletion'));
const refused = (status, message) => ({ response: { status, data: { message } } });

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

test("says what is blocking the deletion when the sign-in check refuses", () => {
  assert.match(
    deletionErrorMessage(refused(403, 'Please verify your email address to use this feature. Check your inbox for the verification link.')),
    /^Your email address isn't verified yet, so your account can't be deleted\. Open the verification link/,
  );
  assert.match(
    deletionErrorMessage(refused(403, "Your account setup isn't finished yet. Complete onboarding to use this feature.")),
    /^Your account setup isn't finished yet, so it can't be deleted\./,
  );
  assert.match(
    deletionErrorMessage(refused(403, 'Your account has been suspended. Contact your administrator for help.')),
    /suspended, so it can't be deleted here\. Email Suprah AI support at support@suprahai\.com/,
  );
});

test("the server's own reason (a load in progress, staff accounts) is shown as it is", () => {
  const load = 'You have load LD-1042 in progress. Deliver it or ask dispatch to take it back, then you can delete your account.';
  assert.equal(deletionErrorMessage(refused(409, load)), load);
  const staff = "Staff accounts can't be deleted here. Ask your dealership admin to remove your account.";
  assert.equal(deletionErrorMessage(refused(403, staff)), staff);
  assert.match(deletionErrorMessage({ request: {}, message: 'Network Error' }), /couldn't delete your account because the server couldn't be reached/);
});
