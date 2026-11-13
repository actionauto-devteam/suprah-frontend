import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// A CRM lead's Shipping card (2026-11-14): when its quotes can't load, staff see
// a short note with Try again instead of the card disappearing.
const card = fs.readFileSync(fileURLToPath(new URL('../src/components/transportation/LeadShippingCard.tsx', import.meta.url)), 'utf8');

test('a failed load shows a note with Try again', () => {
  assert.match(card, /if \(!signal\?\.aborted\) setLoadFailed\(true\)/);
  assert.match(card, /if \(ordered\.length === 0 && loadFailed\) \{/);
  assert.match(card, /We couldn&apos;t load this lead&apos;s shipping quotes\./);
  assert.match(card, /onClick=\{\(\) => void loadShipments\(\)\}/);
});

test('a lead with no quotes still shows nothing, and quotes already shown stay', () => {
  assert.match(card, /if \(ordered\.length === 0\) return null/);
  assert.match(card, /setLoadFailed\(false\)\s*try \{/);
  assert.doesNotMatch(card, /console\.warn/);
});
