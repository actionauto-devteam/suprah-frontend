import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// No "…" cut-offs on these screens (2026-11-14): addresses, customer contact
// details, vehicle names, load numbers and labels wrap onto more lines.
const FILES = [
  'components/QuoteCard.tsx',
  'components/LoadCard.tsx',
  'components/transportation/TransportationMobileLoadCard.tsx',
  'components/transportation/TransportationMobileQuoteCard.tsx',
  'app/(dashboard)/transportation/load/[id]/page.tsx',
  'components/car-inventory-card.tsx',
];

for (const rel of FILES) {
  test(`${rel} wraps text instead of cutting it off`, () => {
    const source = fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
    assert.doesNotMatch(source, /["'`\s]truncate["'`\s]/);
    assert.doesNotMatch(source, /line-clamp-\d/);
    assert.doesNotMatch(source, /text-ellipsis/);
    assert.match(source, /\[overflow-wrap:anywhere\]/);
  });
}

// Subscription page (2026-11-26): it was a fixed-height box whose own scroll
// area never scrolled, so the plans were cut off on phones and computers, and
// its comparison table scrolled sideways. Now the page grows and the app's
// main area scrolls it; the table fits the width it has, and narrow screens get
// a stacked list instead.
test('Subscription page grows with its content and never scrolls sideways', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('../src/components/expand/SubscriptionPlans.tsx', import.meta.url)), 'utf8');
  assert.doesNotMatch(source, /ScrollArea/);
  assert.doesNotMatch(source, /h-full bg-background overflow-hidden/);
  assert.match(source, /flex flex-col min-h-full bg-background/);
  assert.doesNotMatch(source, /overflow-x-auto/);
  assert.doesNotMatch(source, /min-w-180/);
  assert.match(source, /table-fixed/);
  assert.match(source, /@3xl:hidden/);
  assert.doesNotMatch(source, /text-\[(?:[0-9]|10)px\]/);
  assert.doesNotMatch(source, /whitespace-nowrap/);
  assert.doesNotMatch(source, /["'\`\s]truncate["'\`\s]/);
  assert.match(source, /sr-only">Not included/);
});
