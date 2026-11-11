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

const { staffSignUpHref, staffSignInHref, staffInvitePath, staffInviteVisitor, inviteRoleLabel } = load(path.join(SRC, 'lib/staff-invite'));

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
