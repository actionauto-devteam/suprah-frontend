import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Staff account deletion requests (2026-11-12): staff ask, an admin of their
// dealership approves or rejects with a reason.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const {
  STAFF_DELETION_ENDPOINT,
  STAFF_DELETION_MINE_ENDPOINT,
  STAFF_DELETION_TEXT,
  canRequestStaffDeletion,
  myRequestSummary,
  rejectionReasonProblem,
  staffDeletionRequestBody,
} = load(path.join(SRC, 'lib/staff-deletion'));

test('dealership members and admins send a request; drivers, customers and the Suprah AI team do not', () => {
  assert.equal(canRequestStaffDeletion({ role: 'employee', organizationId: 'org1' }), true);
  assert.equal(canRequestStaffDeletion({ role: 'admin', organizationId: 'org1' }), true);
  for (const role of ['driver', 'customer', 'super_admin']) assert.equal(canRequestStaffDeletion({ role, organizationId: 'org1' }), false, role);
  assert.equal(canRequestStaffDeletion({ role: 'employee', organizationId: null }), false);
  assert.equal(canRequestStaffDeletion(null), false);
});

test('the request carries the acknowledgement and the optional message', () => {
  assert.equal(STAFF_DELETION_ENDPOINT, '/api/account-deletion-requests');
  assert.equal(STAFF_DELETION_MINE_ENDPOINT, '/api/account-deletion-requests/mine');
  assert.deepEqual(staffDeletionRequestBody('  '), { acknowledgedRetention: true });
  assert.deepEqual(staffDeletionRequestBody('  Last day is Friday '), { acknowledgedRetention: true, note: 'Last day is Friday' });
  assert.equal(staffDeletionRequestBody('x'.repeat(600)).note.length, 500);
});

test('a rejection needs a reason of 5 to 500 characters', () => {
  assert.equal(rejectionReasonProblem('Hand over your leads first.'), null);
  assert.match(rejectionReasonProblem(' no '), /at least 5 characters/);
  assert.match(rejectionReasonProblem('x'.repeat(501)), /500 characters or fewer/);
});

test("the staff member's card says where their request stands, with the admin's reason", () => {
  const pendingSummary = myRequestSummary({ id: 'r1', status: 'pending', createdAt: '2026-11-12T15:00:00Z' }, 'Action Auto Utah');
  assert.equal(pendingSummary.title, 'Deletion request sent');
  assert.match(pendingSummary.message, /^Waiting for an admin of Action Auto Utah to review it \(sent Nov 12, 2026\)\. You can keep using your account until then\.$/);

  const rejected = myRequestSummary(
    { id: 'r1', status: 'rejected', createdAt: '2026-11-12T15:00:00Z', decidedAt: '2026-11-13T15:00:00Z', rejectionReason: 'Hand over your leads first.' },
    '',
  );
  assert.equal(rejected.title, 'Your deletion request was declined');
  assert.equal(rejected.message, 'An admin of your dealership declined it on Nov 13, 2026. Their reason: Hand over your leads first.');
  assert.equal(myRequestSummary(null, 'Action Auto Utah'), null);
});

test('the request window says what goes, what the dealership keeps and how it works', () => {
  assert.match(STAFF_DELETION_TEXT.removed, /CRM sign-in stops working/);
  assert.match(STAFF_DELETION_TEXT.keptByDealership, /time records/);
  assert.match(STAFF_DELETION_TEXT.howItWorks, /reject it, you'll see their reason/);
});
