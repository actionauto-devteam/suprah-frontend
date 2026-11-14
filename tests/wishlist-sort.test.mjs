import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Wishlist sort: one dropdown, no row of chips that runs off the screen
// (2026-11-13), and the same control as the Shop's sort (2026-11-14).
const read = (rel) => fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
const page = read('app/(customer)/customer/saved/page.tsx');
const filters = read('components/shop-inventory-filters.tsx');

test('the Wishlist uses the Shop sort dropdown with the same four choices', () => {
  assert.match(filters, /export function PillSelect\(\{/);
  assert.match(page, /import \{ PillSelect \} from "@\/components\/shop-inventory-filters";/);
  assert.match(page, /<PillSelect\s+value=\{sortBy\}/);
  assert.match(page, /ariaLabel="Sort saved vehicles"/);
  for (const label of ['Saved Order', 'Price: Low', 'Price: High', 'Newest Year']) assert.match(page, new RegExp(`label: "${label}"`));
});

test('no sideways-scrolling chip row is left', () => {
  assert.doesNotMatch(page, /overflow-x-auto no-scrollbar/);
  assert.doesNotMatch(page, /onClick=\{\(\) => setSortBy\(/);
});
