import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Inventory car details (2026-11-16): the car's name, its spec chips and the
// shipping tag wrap onto more lines instead of being cut off with "…".
const read = (rel) => fs.readFileSync(fileURLToPath(new URL('../src/' + rel, import.meta.url)), 'utf8');

for (const file of ['components/inventory/VehicleDetailView.tsx', 'components/inventory/VehicleShippingTag.tsx']) {
  test(file + ' cuts nothing off', () => {
    const source = read(file);
    assert.doesNotMatch(source, /\btruncate\b/);
    assert.doesNotMatch(source, /line-clamp-\d/);
    assert.doesNotMatch(source, /text-ellipsis/);
  });
}

test('the wrapped text keeps whole words where it can and never spills out', () => {
  assert.match(read('components/inventory/VehicleDetailView.tsx'), /<h1 className="break-words \[overflow-wrap:anywhere\] text-base font-black/);
  assert.equal((read('components/inventory/VehicleShippingTag.tsx').match(/min-w-0 break-words \[overflow-wrap:anywhere\]/g) || []).length, 2);
});
