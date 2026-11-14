import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// No "…" cut-offs left in Driver Tracker, the Driver Portal, Transportation, the
// customer Garage, Shop's compare bar or the notification filter (2026-11-14).
const read = (rel) => fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');
const FILES = [
  'app/(dashboard)/driver-tracker/page.tsx',
  'components/driver-tracker/DriverLoadCompatibilityReviewDialog.tsx',
  'components/driver-tracker/DriverTrackerListCard.tsx',
  'components/driver-tracker/DriverTrackerMap.tsx',
  'app/(driver)/driver/page.tsx',
  'components/driver/VehicleConditionDialog.tsx',
  'components/driver-profile/DriverProfileView.tsx',
  'components/driver-profile/DriverVerificationForm.tsx',
  'components/driver-profile/EquipmentPage.tsx',
  'components/transportation/ConditionReportCard.tsx',
  'components/transportation/NeedsAttentionPanel.tsx',
  'components/transportation/TransportationMobileFilters.tsx',
  'components/transportation/TransportationMobileViewSwitcher.tsx',
  'components/transportation/VehicleImageLightbox.tsx',
  'app/(customer)/customer/shop/page.tsx',
  'components/customer/garage/OverviewTab.tsx',
  'components/customer/garage/ServiceLogTab.tsx',
  'components/customer/garage/VehiclesTab.tsx',
  'components/notifications/NotificationDrawer.tsx',
];

for (const rel of FILES) {
  test(`${rel} wraps text instead of cutting it off`, () => {
    const source = read(rel);
    assert.doesNotMatch(source, /["'`\s]truncate["'`\s$]/);
    assert.doesNotMatch(source, /line-clamp-\d|text-ellipsis/);
  });
}

test('photo part labels sit under same-size photos instead of on them', () => {
  for (const rel of ['components/driver/VehicleConditionDialog.tsx', 'components/transportation/ConditionReportCard.tsx']) {
    const source = read(rel);
    assert.match(source, /grid grid-cols-\d items-start gap-/, rel);
    assert.doesNotMatch(source, /absolute bottom-[\d.]+ left-[\d.]+ max-w-\[calc/, rel);
    assert.match(source, /break-words text-\[11px\] font-semibold leading-tight text-muted-foreground \[overflow-wrap:anywhere\]">\s*\{CONDITION_AREA_LABELS/, rel);
  }
});
