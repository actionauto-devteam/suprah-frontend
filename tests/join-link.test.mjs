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

const { joinNextPath, joinSignInHref, joinSuccess, joinSignedInNote } = load(path.join(SRC, 'lib/join-link'));

test('each kind of link leads to its own next step after signing in', () => {
  assert.equal(joinNextPath('driver'), '/driver/pending');
  assert.equal(joinNextPath('customer'), '/customer');
  const driver = new URL(joinSignInHref('driver', ' sam@example.com '), 'https://x');
  assert.equal(driver.pathname, '/sign-in');
  assert.equal(driver.searchParams.get('email'), 'sam@example.com');
  assert.equal(driver.searchParams.get('redirect_url'), '/driver/pending');
  assert.equal(new URL(joinSignInHref('customer', 'maria@example.com'), 'https://x').searchParams.get('redirect_url'), '/customer');
});

test('the driver is told to sign in and finish the application, not just to wait', () => {
  const driver = joinSuccess('driver', 'Suprah AI');
  assert.equal(driver.button, 'Continue to your application');
  assert.match(driver.message, /sign in and finish your application/);
  const customer = joinSuccess('customer', 'Action Auto Utah');
  assert.equal(customer.title, 'Account created!');
  assert.match(customer.message, /Action Auto Utah is ready/);
  assert.doesNotMatch(customer.message, /email/i);
});

test('someone already signed in is asked to sign out first', () => {
  assert.equal(
    joinSignedInNote('customer', 'boss@dealer.com'),
    "You're signed in as boss@dealer.com. This link creates a new customer account, so sign out first to continue.",
  );
  assert.match(joinSignedInNote('driver', ''), /signed in as another account\. This link creates a new driver account/);
});

test('the form says what the link creates and what comes next', () => {
  const { joinFormNote } = load(path.join(SRC, 'lib/join-link'));
  assert.match(joinFormNote('driver', 'Suprah AI'), /^This creates a driver account\. Next, you'll sign in and finish your application/);
  assert.equal(joinFormNote('customer', 'Action Auto Utah'), 'This creates a customer account with Action Auto Utah, where you can shop cars, save favorites and follow shipments.');
});
