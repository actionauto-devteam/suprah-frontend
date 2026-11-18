import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Suprah Pay fixes (2026-11-19), one section per fix.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

// ── Payments are staff-only ─────────────────────────────────────────────────
const garageOverview = read('components/customer/garage/OverviewTab.tsx');

test("My Garage's Payments Due counts only the customer's own unpaid invoices", () => {
  assert.match(garageOverview, /apiClient\.get\("\/api\/payments\/my-payments"\)/);
  assert.match(garageOverview, /d\?\.stats\?\.pendingCount/);
  // The staff list (every customer's invoices) is no longer read here.
  assert.doesNotMatch(garageOverview, /apiClient\.get\("\/api\/payments",/);
});

test('no customer screen reads the staff payment list', () => {
  for (const rel of [
    'components/customer/garage/OverviewTab.tsx',
    'app/(customer)/customer/payments/page.tsx',
  ]) {
    assert.doesNotMatch(read(rel), /["'`]\/api\/payments["'`?]/, rel);
  }
});
