import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Register VIN (2026-11-13): it used to only close the membership card, because
// My Garage read its tab from the address once. Now the tabs follow the address
// and "?add=vehicle" opens Add vehicle.
const read = (rel) => fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
const garage = read('app/(customer)/customer/page.tsx');

test('My Garage tabs follow the address instead of reading it once', () => {
  assert.doesNotMatch(garage, /defaultValue=\{initialTab\}/);
  assert.match(garage, /<Tabs value=\{activeTab\} onValueChange=\{selectTab\}/);
  assert.match(garage, /setActiveTab\(urlTab\);\s*\}, \[urlTab\]\);/);
});

test('?add=vehicle opens Add vehicle once and drops itself from the address', () => {
  assert.match(garage, /if \(addParam !== "vehicle"\) return;\s*setIsAddVehicleOpen\(true\);\s*router\.replace\(`\/customer\?tab=\$\{urlTab\}`/);
});

test('every Register VIN link opens My Vehicles with Add vehicle', () => {
  for (const rel of ['components/customer/MembershipCardModal.tsx', 'app/(customer)/customer/membership/page.tsx', 'app/member/[memberId]/page.tsx']) {
    const file = read(rel);
    assert.match(file, /\/customer\?tab=vehicles&add=vehicle/, rel);
    assert.doesNotMatch(file, /"\/customer\?tab=vehicles"/, rel);
  }
});
