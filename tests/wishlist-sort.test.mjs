import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Wishlist sort (2026-11-13): one labelled dropdown, no row of chips that runs
// off the screen and needs sideways scrolling.
const page = fs.readFileSync(fileURLToPath(new URL('../src/app/(customer)/customer/saved/page.tsx', import.meta.url)), 'utf8');

test('the sort is a labelled dropdown with the same four choices', () => {
  assert.match(page, /<label\s+htmlFor="wishlist-sort"/);
  assert.match(page, /<SelectTrigger id="wishlist-sort" className="h-9 w-full min-w-0/);
  for (const label of ['Saved Order', 'Price: Low', 'Price: High', 'Newest Year']) assert.match(page, new RegExp(`label: "${label}"`));
  assert.match(page, /SORT_OPTIONS\.map\(\(opt\) => \(\s*<SelectItem key=\{opt\.key\} value=\{opt\.key\}/);
});

test('no sideways-scrolling chip row is left', () => {
  assert.doesNotMatch(page, /overflow-x-auto no-scrollbar/);
  assert.doesNotMatch(page, /onClick=\{\(\) => setSortBy\(opt\.key\)\}/);
});
