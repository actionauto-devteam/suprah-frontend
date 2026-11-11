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

const { staffSignUpHref, staffSignInHref, staffInvitePath, staffInviteVisitor, inviteRoleLabel, staffInviteGuide, staffSignUpBlocker } = load(path.join(SRC, 'lib/staff-invite'));

test('"Create my account" opens the staff sign-up form with the invitation, and comes back to it', () => {
  const href = new URL(staffSignUpHref('abc123'), 'https://x');
  assert.equal(href.pathname, '/sign-up');
  assert.equal(href.searchParams.get('token'), 'abc123');
  assert.equal(href.searchParams.get('redirect_url'), '/accept-invite?token=abc123');
});

test('"I already have an account" signs in with the invited email filled in, then back to the invitation', () => {
  const href = new URL(staffSignInHref('abc123', 'maria@dealer.com'), 'https://x');
  assert.equal(href.pathname, '/sign-in');
  assert.equal(href.searchParams.get('email'), 'maria@dealer.com');
  assert.equal(href.searchParams.get('token'), 'abc123');
  assert.equal(href.searchParams.get('redirect_url'), staffInvitePath('abc123'));
});

test('the page offers the right next step for who is looking at it', () => {
  const invite = { inviteEmail: 'Maria@Dealer.com' };
  assert.equal(staffInviteVisitor({ ...invite, isSignedIn: false }), 'signed-out');
  assert.equal(staffInviteVisitor({ ...invite, isSignedIn: true, signedInEmail: 'maria@dealer.com', signedInRole: 'customer' }), 'invited-account');
  assert.equal(staffInviteVisitor({ ...invite, isSignedIn: true, signedInEmail: 'boss@dealer.com', signedInRole: 'admin' }), 'other-account');
  assert.equal(staffInviteVisitor({ ...invite, isSignedIn: true, signedInEmail: 'maria@dealer.com', signedInRole: 'driver' }), 'driver-account');
  assert.equal(staffInviteVisitor({ ...invite, isSignedIn: true, signedInEmail: null, signedInRole: 'employee' }), 'other-account');
});

test('roles read naturally', () => {
  assert.equal(inviteRoleLabel('member'), 'Member');
  assert.equal(inviteRoleLabel('admin'), 'Admin');
  assert.equal(inviteRoleLabel(''), 'Member');
});

const invite = (accountStatus, extra = {}) => ({
  email: "maria@dealer.com", organizationName: "Action Auto Utah", inviterName: "Jo", role: "member", accountStatus, ...extra,
});

test("a new email: what creating the account does, with both buttons", () => {
  const guide = staffInviteGuide({ visitor: "signed-out", invite: invite("none") });
  assert.deepEqual(guide.actions, ["create", "sign-in"]);
  assert.match(guide.note, /straight to Action Auto Utah's dashboard as Member/);
});

test("a customer account is told it becomes staff and loses the customer portal, before and when accepting", () => {
  const signedOut = staffInviteGuide({ visitor: "signed-out", invite: invite("customer") });
  assert.deepEqual(signedOut.actions, ["sign-in"]);
  assert.equal(signedOut.signInLabel, "Sign in to accept");
  assert.match(signedOut.note, /becomes? .*staff account at Action Auto Utah|into a staff account at Action Auto Utah/);
  assert.match(signedOut.note, /My Garage, Wishlist and My Shipments won't be available/);
  const signedIn = staffInviteGuide({ visitor: "invited-account", invite: invite("customer") });
  assert.deepEqual(signedIn.actions, ["accept"]);
  assert.equal(signedIn.acceptLabel, "Accept and switch to staff");
  assert.equal(signedIn.tone, "warning");
});

test("a driver email is told it can't be used for staff, with nothing to press but sign out", () => {
  const signedOut = staffInviteGuide({ visitor: "signed-out", invite: invite("driver") });
  assert.deepEqual(signedOut.actions, []);
  assert.match(signedOut.note, /is registered as a driver account, so it can't be used for a staff account. Ask Jo to send the invitation to a different email./);
  assert.deepEqual(staffInviteGuide({ visitor: "driver-account", invite: invite("driver") }).actions, ["sign-out"]);
});

test("staff at another dealership are told they will move", () => {
  const guide = staffInviteGuide({ visitor: "invited-account", invite: invite("other-dealership-staff") });
  assert.equal(guide.acceptLabel, "Accept and move to Action Auto Utah");
  assert.match(guide.note, /won't have access to your current dealership/);
});

test("another signed-in account is asked to sign out", () => {
  const guide = staffInviteGuide({ visitor: "other-account", invite: invite("none"), signedInEmail: "boss@dealer.com" });
  assert.deepEqual(guide.actions, ["sign-out"]);
  assert.match(guide.note, /signed in as boss@dealer.com/);
});

test("the staff sign-up form refuses emails that already have an account", () => {
  assert.equal(staffSignUpBlocker(invite("none")), null);
  assert.match(staffSignUpBlocker(invite("customer")), /already has an account. Sign in instead/);
  assert.match(staffSignUpBlocker(invite("driver")), /registered as a driver account/);
});
