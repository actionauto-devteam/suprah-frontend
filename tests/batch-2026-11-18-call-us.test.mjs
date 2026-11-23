import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Batch E (2026-11-18): the car cards no longer offer "Call us", which dialed
// one fixed number for every dealership's cars. Customers ask the car's own
// dealership with "Ask the dealership" (decided 2026-11-02); staff don't call
// themselves about their own inventory.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const FILES = [
  'hooks/useInventoryActions.ts',
  'components/car-inventory-card.tsx',
  'components/customer/PremiumVehicleCard.tsx',
  'app/(customer)/customer/shop/page.tsx',
  'app/(dashboard)/inventory/page.tsx',
];

test('no card or page dials a fixed phone number', () => {
  for (const file of FILES) {
    const src = read(file);
    assert.doesNotMatch(src, /handleCallUs|onCallUs/, file);
    assert.doesNotMatch(src, /tel:\+?1?8017666137|801-766-6137|\(801\) 766-6137/, file);
    assert.doesNotMatch(src, />\s*Call us\s*<|> Call Us\s*</i, file);
  }
});

test('customers still ask the car\'s own dealership from the phone card', () => {
  const card = read('components/car-inventory-card.tsx');
  assert.equal(card.split('>Ask the dealership</span>').length - 1, 2);
  assert.match(card, /onCheckAvailability\(vehicle\)/);
});

test('the staff desktop card keeps Apply Now as one full-width button', () => {
  const card = read('components/customer/PremiumVehicleCard.tsx');
  assert.match(card, /<Button\n\s+onClick=\{\(\) => onApplyNow\?\.\(vehicle\)\}\n\s+className="w-full text-xs sm:text-sm h-11 font-semibold shadow-md"\n\s+>\n\s+Apply Now/);
  assert.doesNotMatch(card, /\bPhone\b/);
});
