import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// One toast card at a time with a switch button (2026-11-13).
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
  DEFAULT_TOAST_LIFETIME,
  deckIndexAfterChange,
  deckPositionLabel,
  deckSwitchLabel,
  nextDeckIndex,
  toastLifetime,
} = load(path.join(SRC, 'lib/toast-deck'));

test('the switch goes 1 → 2 → 3 → back to 1, and so on', () => {
  const seen = [];
  let index = 0;
  for (let click = 0; click < 5; click += 1) {
    index = nextDeckIndex(index, 3);
    seen.push(deckPositionLabel(index, 3));
  }
  assert.deepEqual(seen, ['2/3', '3/3', '1/3', '2/3', '3/3']);
  assert.equal(nextDeckIndex(0, 1), 0);
  assert.equal(nextDeckIndex(0, 0), 0);
});

test('a toast that just arrived shows at once', () => {
  // Toasts are listed newest first.
  assert.equal(deckIndexAfterChange(['b', 'a'], ['c', 'b', 'a'], 'a', 1), 0);
  assert.equal(deckIndexAfterChange([], ['a'], null, 0), 0);
});

test('the toast on show stays on show while others come and go', () => {
  // An update to another toast, or another toast closing, keeps it.
  assert.equal(deckIndexAfterChange(['c', 'b', 'a'], ['c', 'b', 'a'], 'b', 1), 1);
  assert.equal(deckIndexAfterChange(['c', 'b', 'a'], ['b', 'a'], 'a', 2), 1);
});

test('when the toast on show closes, the one that took its place shows', () => {
  assert.equal(deckIndexAfterChange(['c', 'b', 'a'], ['c', 'a'], 'b', 1), 1);
  assert.equal(deckIndexAfterChange(['c', 'b', 'a'], ['c', 'b'], 'a', 2), 1);
  assert.equal(deckIndexAfterChange(['a'], [], 'a', 0), 0);
});

test('loading toasts stay until they are updated; others use their own time or the default', () => {
  assert.equal(toastLifetime({ type: 'loading' }), Infinity);
  assert.equal(toastLifetime({ type: 'success', duration: 6500 }), 6500);
  assert.equal(toastLifetime({ type: 'success' }), DEFAULT_TOAST_LIFETIME);
  assert.equal(toastLifetime({ type: 'error' }, 9000), 9000);
  assert.equal(DEFAULT_TOAST_LIFETIME, 4000);
});

test('screen readers hear where they are and what the button does', () => {
  assert.equal(deckSwitchLabel(0, 3), 'Message 1 of 3. Show message 2.');
  assert.equal(deckSwitchLabel(2, 3), 'Message 3 of 3. Show message 1.');
});

test('the app Toaster draws the one-card deck; screens keep calling toast()', () => {
  const toaster = fs.readFileSync(path.join(SRC, 'components/ui/sonner.tsx'), 'utf8');
  assert.match(toaster, /<ToastDeck\b/);
  assert.doesNotMatch(toaster, /<Sonner\b/);
  assert.match(toaster, /--suprah-status-banner-h/);
  const deck = fs.readFileSync(path.join(SRC, 'components/ui/toast-deck.tsx'), 'utf8');
  assert.match(deck, /const \{ toasts \} = useSonner\(\)/);
  assert.match(deck, /count > 1 \? \(/);
  assert.match(deck, /aria-label=\{deckSwitchLabel\(index, count\)\}/);
  // Only the toast on screen counts down, and pointing at it pauses it.
  assert.match(deck, /if \(!shown \|\| interacting \|\| pageHidden\) return/);
});
