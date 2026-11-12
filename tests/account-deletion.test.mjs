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

const {
  ACCOUNT_DELETION_BODY,
  ACCOUNT_DELETION_ENDPOINT,
  ACCOUNT_DELETION_TEXT,
  DELETION_HELP,
  RETENTION_ACKNOWLEDGEMENT,
  RETENTION_NOTICE,
  RETENTION_POLICY_HREF,
  deletionConfirmed,
  deletionErrorMessage,
  deletionReady,
} = load(path.join(SRC, 'lib/account-deletion'));
const refused = (status, message) => ({ response: { status, data: { message } } });

test("drivers use the Driver Portal's address, which works before approval; customers use their profile's", () => {
  assert.equal(ACCOUNT_DELETION_ENDPOINT.driver, '/api/driver-profile/account');
  assert.equal(ACCOUNT_DELETION_ENDPOINT.customer, '/api/profile/delete-account');
});

test('the delete button works once DELETE is typed', () => {
  for (const typed of ['DELETE', 'delete', ' Delete ']) assert.equal(deletionConfirmed(typed), true, typed);
  for (const typed of ['', 'DELET', 'DELETE ME', 'remove']) assert.equal(deletionConfirmed(typed), false, typed);
});

test('before deleting, they are told what Suprah AI keeps and why, and must tick that they understand', () => {
  for (const words of [RETENTION_NOTICE, RETENTION_ACKNOWLEDGEMENT]) {
    assert.match(words, /Suprah AI keeps some transaction records and personal information/);
    assert.match(words, /compliance, accounting, tax laws and fraud prevention/);
  }
  assert.match(RETENTION_ACKNOWLEDGEMENT, /^I understand that/);
  assert.equal(RETENTION_POLICY_HREF, '/privacy-policy#data-retention');
  assert.deepEqual({ ...ACCOUNT_DELETION_BODY }, { acknowledgedRetention: true });
});

test('delete works only once the acknowledgement is ticked and DELETE is typed', () => {
  assert.equal(deletionReady({ acknowledged: true, confirmText: 'delete' }), true);
  assert.equal(deletionReady({ acknowledged: false, confirmText: 'DELETE' }), false);
  assert.equal(deletionReady({ acknowledged: true, confirmText: '' }), false);
});

test('anyone having a problem is told how to reach Suprah AI support', () => {
  assert.equal(DELETION_HELP, 'Having a problem deleting your account? Contact Suprah AI support at support@suprahai.com.');
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
  const staff = "Staff accounts are deleted through a request to your dealership admin. Open your Profile and press Request account deletion.";
  assert.equal(deletionErrorMessage(refused(403, staff)), staff);
  assert.match(deletionErrorMessage({ request: {}, message: 'Network Error' }), /couldn't delete your account because the server couldn't be reached/);
});
