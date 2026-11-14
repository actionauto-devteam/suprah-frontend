import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Phone load and quote cards (2026-11-14): on narrow cards (phones under about
// 390 px) the route stacks (origin, miles, destination) so long place names keep
// whole words; wider cards keep the three columns.
for (const name of ['TransportationMobileLoadCard', 'TransportationMobileQuoteCard']) {
  test(`${name} stacks the route on the narrowest cards`, () => {
    const card = fs.readFileSync(fileURLToPath(new URL(`../src/components/transportation/${name}.tsx`, import.meta.url)), 'utf8');
    assert.match(card, /<div className="@container mt-3 min-w-0">/);
    assert.match(card, /grid-cols-1 items-stretch gap-1 @min-\[19\.5rem\]:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
    assert.match(card, /text-left @min-\[19\.5rem\]:text-right/);
    assert.match(card, /flex flex-row-reverse items-center justify-end gap-1 [^"]*@min-\[19\.5rem\]:flex-row/);
    assert.doesNotMatch(card, /"mt-3 grid min-w-0 grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\] items-stretch gap-2"/);
  });
}
