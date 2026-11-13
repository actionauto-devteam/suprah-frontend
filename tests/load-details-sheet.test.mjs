import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Transportation load/quote details on phones (2026-11-13): the sheet opens
// across the whole screen every time and can still be dragged narrower.
const sheet = fs.readFileSync(fileURLToPath(new URL('../src/components/transportation/TransportationMobileDetailsDrawer.tsx', import.meta.url)), 'utf8');

test('the sheet opens at the full available width', () => {
  assert.match(sheet, /defaultWidth: maxWidth,/);
  assert.doesNotMatch(sheet, /viewportWidth \* 0\.72/);
  assert.match(sheet, /if \(open\) setDrawerWidth\(null\);\s*\}, \[open\]\);/);
  assert.match(sheet, /const resolvedWidth = drawerWidth \?\? bounds\.defaultWidth;/);
});

test('it stays resizable on phones wherever there is room to drag', () => {
  assert.match(sheet, /canResize: viewportWidth < MOBILE_BREAKPOINT && maxWidth - minWidth >= MIN_RESIZE_RANGE/);
  assert.doesNotMatch(sheet, /RESIZABLE_MIN_VIEWPORT/);
  assert.match(sheet, /onPointerDown=\{startResize\}/);
});

test('an earlier drag is not remembered for the next opening', () => {
  assert.doesNotMatch(sheet, /localStorage/);
});
