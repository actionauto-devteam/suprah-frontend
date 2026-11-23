import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Batch F (2026-11-18): Driver Tracker and the driver home no longer redraw the
// whole page every second. The clocks and the GPS chip tick on their own, and
// screen readers hear the GPS chip's status changes, not every passing second.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const tracker = read('app/(dashboard)/driver-tracker/page.tsx');
const driverHome = read('app/(driver)/driver/page.tsx');

test('neither page keeps a one-second timer of its own', () => {
  for (const [name, page] of [['tracker', tracker], ['driver home', driverHome]]) {
    assert.doesNotMatch(page, /setInterval\(\(\) => setCurrentTime\(new Date\(\)\), 1000\)/, name);
    assert.doesNotMatch(page, /\bcurrentTime\b/, name);
  }
  assert.match(tracker, /<TrackerHeaderClock \/>/);
  assert.match(driverHome, /<DriverHeaderClock \/>/);
  assert.match(driverHome, /<DriverGpsChip\n/);
});

test('the clocks tick inside their own small parts', () => {
  const hook = read('hooks/useNow.ts');
  assert.match(hook, /export function useNow\(intervalMs = 1000\): Date/);
  assert.match(hook, /return \(\) => window\.clearInterval\(id\)/);
  for (const file of ['components/driver-tracker/TrackerHeaderClock.tsx', 'components/driver/DriverHeaderClock.tsx', 'components/driver/DriverGpsChip.tsx']) {
    assert.match(read(file), /const now = useNow\(1000\)/, file);
  }
  // Same Mountain Time display as before.
  assert.match(read('components/driver-tracker/TrackerHeaderClock.tsx'), /\(Mountain Time\)/);
  assert.match(read('components/driver/DriverHeaderClock.tsx'), /\(\{utc\} UTC\)/);
});

test('the GPS chip keeps its states, and screen readers hear only status changes', () => {
  const chip = read('components/driver/DriverGpsChip.tsx');
  assert.match(chip, /<span role="status" aria-live="polite" className="sr-only">\{chip\.spoken\}<\/span>/);
  assert.match(chip, /<div className="flex items-center gap-2" aria-hidden="true">/);
  assert.match(chip, /text: `Live · updated \$\{formatShortAge\(age\)\} ago`, spoken: "Live"/);
  assert.match(chip, /text: `Last update \$\{formatShortAge\(age\)\} ago`, spoken: "Your location hasn't updated for over a minute"/);
  for (const text of ['Connecting to GPS…', 'Waiting for a GPS fix…', 'Not sharing your location']) assert.ok(chip.includes(text), text);
  assert.match(driverHome, /permissionDenied=\{locationPermissionState === "denied"\}/);
  assert.match(driverHome, /recordedAt=\{lastCoords\?\.recordedAt \?\? null\}/);
});
