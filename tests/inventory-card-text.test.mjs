import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// All Inventory (2026-11-17): no car text spills out of its card, is cut off
// with "…" or is clipped, the filter pills never scroll sideways out of view,
// and nothing is smaller than 11px.
const read = (rel) => fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
const page = read('app/(dashboard)/inventory/page.tsx');
const premium = read('components/customer/PremiumVehicleCard.tsx');
const card = read('components/car-inventory-card.tsx');
const filters = read('components/shop-inventory-filters.tsx');
const paging = read('components/inventory-pagination.tsx');

test('the grid fits as many cards as the space allows, each at least 17rem wide', () => {
  const autoFill = /md:grid-cols-\[repeat\(auto-fill,minmax\(17rem,1fr\)\)\]/g;
  assert.equal(page.match(autoFill)?.length, 2, 'the cards and the loading preview');
  assert.doesNotMatch(page, /xl:grid-cols-4/);
});

test('the desktop card wraps every piece of text instead of cutting it off', () => {
  assert.doesNotMatch(premium, /["'`\s]truncate["'`\s]/);
  assert.doesNotMatch(premium, /line-clamp-\d/);
  assert.doesNotMatch(premium, /text-\[(?:8|9|10)(?:\.5)?px\]/);
  assert.match(premium, /const WRAPPING_BADGE = "h-auto max-w-full shrink whitespace-normal/);
  assert.equal(premium.match(/cn\(WRAPPING_BADGE,/g)?.length, 4, 'both badges, with and without a photo');
});

test('the photo header grows instead of hiding a long name', () => {
  assert.match(premium, /className="relative grid grid-cols-1 overflow-hidden bg-zinc-950"/);
  assert.match(premium, /<div className="col-start-1 row-start-1 aspect-16\/10" aria-hidden="true" \/>/);
  assert.doesNotMatch(premium, /absolute inset-x-0 bottom-0 z-10/);
  assert.doesNotMatch(premium, /absolute top-4 left-4/);
  assert.match(premium, /"absolute inset-0 h-full w-full object-cover/);
});

test('prices drop under their label on a narrow card', () => {
  assert.equal(premium.match(/flex flex-wrap justify-between items-center gap-x-2/g)?.length, 2);
  assert.match(premium, /ml-auto text-xl @min-\[20rem\]:text-2xl font-extrabold text-primary tabular-nums/);
  assert.match(premium, /mt-2\.5 flex flex-wrap items-center justify-between/);
});

test('the specs sit two by two unless the card is wide', () => {
  assert.match(premium, /"grid-cols-2 gap-y-3 @min-\[26rem\]:grid-cols-4 @min-\[26rem\]:gap-y-0"/);
  assert.equal(premium.match(/max-w-full text-center text-xs sm:text-sm font-semibold text-foreground break-words \[overflow-wrap:anywhere\]/g)?.length, 3);
});

test('list rows switch layout by their own width and never clip a long name', () => {
  assert.match(card, /"@container group relative flex overflow-hidden rounded-2xl/);
  assert.match(card, /mobileOptimized \? "min-h-28 sm:min-h-30" : "min-h-26 sm:min-h-30"/);
  assert.doesNotMatch(card, /sm:h-30/);
  assert.match(card, /"hidden @min-\[36rem\]:flex flex-col items-end/);
  assert.match(card, /"@min-\[36rem\]:hidden flex flex-col items-end/);
  assert.match(card, /className="absolute inset-0 @min-\[36rem\]:hidden z-1"/);
});

test('phone spec labels put the icon above the word when both do not fit', () => {
  assert.equal(card.match(/flex flex-wrap items-center gap-x-1 gap-y-0\.5 text-\[11px\] font-black uppercase/g)?.length, 3);
});

test('the filter pills wrap instead of scrolling sideways', () => {
  assert.doesNotMatch(filters, /overflow-x-auto/);
  assert.doesNotMatch(filters, /scrollbarWidth: "none"/);
  assert.match(filters, /<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-0\.5">/);
});

test('the phone sort shows the whole choice', () => {
  assert.match(filters, /h-auto min-h-9 w-full min-w-0 justify-between whitespace-normal/);
  assert.match(filters, /\*:data-\[slot=select-value\]:line-clamp-none/);
});

test('filters and paging have no text under 11px and nothing cut off', () => {
  for (const source of [filters, paging]) {
    assert.doesNotMatch(source, /text-\[(?:8|9|10)(?:\.5)?px\]/);
    assert.doesNotMatch(source, /["'`\s]truncate["'`\s]/);
  }
});
