import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do; its
// "@/lib/…" imports resolve to the matching src/lib file.
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

const { userErrorMessage } = loadLib('user-error');
const { SUPPORT_EMAIL } = loadLib('support-contact');
const SUPPORT = `contact Suprah AI support at ${SUPPORT_EMAIL}.`;
const failed = (status, data = {}) => ({ response: { status, data } });

test('shows the server message when there is one', () => {
  const message = 'Load LD-1 is Delivered, so it can\'t be deleted.';
  assert.equal(userErrorMessage(failed(409, { message }), 'delete this load'), message);
});

test('server problems name Suprah AI support and the email', () => {
  const text = userErrorMessage(failed(500), 'delete this load');
  assert.match(text, /^We couldn't delete this load because of a problem on our side\./);
  assert.ok(text.endsWith(SUPPORT), text);
});

test('no-permission never sends drivers to an administrator', () => {
  const text = userErrorMessage(failed(403), 'open this load');
  assert.doesNotMatch(text, /administrator/i);
  assert.match(text, /organization admin/);
  assert.ok(text.endsWith(SUPPORT), text);
});

test('unknown failures without a status still say who to contact', () => {
  const text = userErrorMessage(new Error('Request failed with status code 500'), 'create this quote');
  assert.doesNotMatch(text, /status code/);
  assert.ok(text.endsWith(SUPPORT), text);
});

test('no connection explains it instead of showing "Network Error"', () => {
  const text = userErrorMessage({ message: 'Network Error', request: {} }, 'open your loads and quotes');
  assert.doesNotMatch(text, /Network Error/);
  assert.match(text, /couldn't be reached/);
});

test('messages the app already wrote for people pass through unchanged', () => {
  const message = 'Your session has ended. Please sign in again, then delete the quote.';
  assert.equal(userErrorMessage(new Error(message), 'delete this quote'), message);
});
