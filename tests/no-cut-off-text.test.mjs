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
