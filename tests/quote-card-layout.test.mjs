import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Transportation on computers (2026-11-14): the quote card has the same layout
// as the load card, photo on the left from computer width.
const read = (rel) => fs.readFileSync(fileURLToPath(new URL(`../src/components/${rel}`, import.meta.url)), 'utf8');

test('the quote card and the load card share one layout', () => {
  const quote = read('QuoteCard.tsx');
  const load = read('LoadCard.tsx');
  const row = '<div className="flex flex-col lg:flex-row lg:min-h-64">';
  const photo = 'relative w-full h-56 sm:h-64 lg:h-auto lg:w-52 xl:w-60 2xl:w-72 overflow-hidden shrink-0 bg-muted/30';
  for (const card of [quote, load]) {
    assert.ok(card.includes(row));
    assert.ok(card.includes(photo));
  }
  assert.doesNotMatch(quote, /aspect-4\/3|2xl:flex-row 2xl:min-h-80/);
});
