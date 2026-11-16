import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Readable text in the notification screens and the customer layout (2026-11-14):
// nothing smaller than 11px; small fixed-height counters keep their text inside.
const FILES = [
  'components/notifications/NotificationDrawer.tsx',
  'components/notifications/NotificationDetailsModal.tsx',
  'components/notifications/NotificationItem.tsx',
  'components/notifications/NotificationPage.tsx',
  'app/(customer)/customer/layout.tsx',
];

for (const rel of FILES) {
  test(`${rel} has no text smaller than 11px`, () => {
    const source = fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
    assert.doesNotMatch(source, /text-\[(?:[1-9]|10)(?:\.\d+)?px\]/);
    for (const line of source.split('\n').filter((l) => /\bh-4(?:\.5)?\b/.test(l) && l.includes('text-[11px]'))) {
      assert.match(line, /leading-none/, line.trim());
    }
  });
}
