import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Load photos on phones (2026-11-13): the card, its photo viewer and the
// details' photo viewer use resolveImageUrl like the rest of the app.
const read = (rel) => fs.readFileSync(fileURLToPath(new URL(`../src/components/transportation/${rel}`, import.meta.url)), 'utf8');

test('the phone load card and its photo viewer resolve photo addresses', () => {
  const card = read('TransportationMobileLoadCard.tsx');
  assert.match(card, /const heroImage = !imageFailed \? resolveImageUrl\(firstVehicle\?\.imageUrl\) : undefined;/);
  assert.match(card, /src: resolveImageUrl\(vehicle\.imageUrl\) \|\| undefined,/);
  assert.doesNotMatch(card, /src: vehicle\.imageUrl \|\| undefined/);
});

test("the load details' photo viewer resolves photo addresses", () => {
  const details = read('TransportationMobileLoadDetailSections.tsx');
  assert.match(details, /src: resolveImageUrl\(vehicle\.imageUrl\) \|\| undefined,/);
  assert.doesNotMatch(details, /src: vehicle\.imageUrl \|\| undefined/);
});
