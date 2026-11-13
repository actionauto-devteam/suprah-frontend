import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The Vehicle Inspector's pinned buttons on phones (2026-11-13): Ask the
// dealership and Save to Wishlist share the row, and one alone (staff have no
// Wishlist) takes the full width instead of half.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));

test('a lone Ask the dealership button uses the whole row', () => {
  const source = fs.readFileSync(path.join(SRC, 'components/inventory/VehicleDetailView.tsx'), 'utf8').replace(/\s+/g, ' ');
  assert.ok(source.includes('<div className={`grid gap-2 ${onInquiryClick && onToggleSave ? "grid-cols-2" : "grid-cols-1"}`}>'));
});
