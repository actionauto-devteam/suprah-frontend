import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Car card buttons (2026-11-13): one row, the left button as wide as its words,
// the main button takes the rest, and labels shorten on narrow cards instead of
// spilling out of their buttons.
const card = fs.readFileSync(fileURLToPath(new URL('../src/components/car-inventory-card.tsx', import.meta.url)), 'utf8');

test('both button rows are one flexible row measured by the card, not a fixed grid', () => {
  assert.doesNotMatch(card, /grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,1\.35fr\)_auto\]/);
  assert.match(card, /"@container mt-1 flex items-center gap-2 border-t/);
  assert.match(card, /"@container flex items-center gap-2 px-4 pb-4"/);
  assert.match(card, /mobileOptimized && "hidden sm:flex"/);
});

test('Ask the dealership keeps its words inside the button and shortens to Ask on narrow cards', () => {
  assert.match(card, /<span className="hidden @min-\[18\.5rem\]:inline">Ask the dealership<\/span>\s*<span className="@min-\[18\.5rem\]:hidden">Ask<\/span>/);
  assert.match(card, /<span className="hidden @min-\[15\.5rem\]:inline">Ask the dealership<\/span>\s*<span className="@min-\[15\.5rem\]:hidden">Ask<\/span>/);
  assert.equal((card.match(/className="h-9 shrink-0 (gap-1\.5 )?rounded-xl border-border\/70/g) ?? []).length, 2);
});

test('View (or Create Load) takes the rest of the row', () => {
  assert.equal((card.match(/className="h-9 min-w-0 flex-1 /g) ?? []).length, 2);
  assert.match(card, /@min-\[21\.5rem\]:hidden">Create Load</);
  assert.match(card, /@min-\[18\.75rem\]:hidden">Create Load</);
});
