import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Dispatch Chat's people search (2026-11-13): the line under the search box
// says who each person can find, matching the server's rules, and long names
// wrap instead of being cut off.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const { peopleSearchReach } = load(path.join(SRC, 'lib/dispatch-people-search'));
const picker = fs.readFileSync(path.join(SRC, 'components/dispatch-channels/channel-people.tsx'), 'utf8');

test('drivers are told they find people from dealerships they have hauled for', () => {
  assert.equal(
    peopleSearchReach('driver'),
    "You can find staff and drivers from dealerships you've hauled loads for, and people you share a channel with.",
  );
});

test('dealership staff are told they find drivers and their own team', () => {
  for (const role of ['employee', 'admin', undefined, null]) {
    assert.equal(peopleSearchReach(role), "You can find drivers, your dealership's staff, and people you share a channel with.");
  }
});

test('the Suprah AI team can find everyone', () => {
  assert.equal(peopleSearchReach('super_admin'), 'You can find any driver or staff member on Suprah AI.');
});

test('the picker shows who can be found, the server message on errors, and wraps long names', () => {
  assert.ok(picker.includes('peopleSearchReach(user?.role)'));
  assert.ok(picker.includes('aria-describedby={hintId}'));
  assert.ok(picker.includes('userErrorMessage(error, "search for people")'));
  assert.ok(!picker.includes('userErrorMessage(null,'));
  assert.ok(!picker.includes('className="truncate text-sm font-medium"'));
  assert.ok(picker.includes('Nobody you can find matches that name.'));
});
