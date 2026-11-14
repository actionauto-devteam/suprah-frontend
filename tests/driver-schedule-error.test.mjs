import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Driver Schedule (2026-11-14): when the schedule can't load, the driver is
// told so with a Try again button, never "Schedule Clear".
const page = fs.readFileSync(fileURLToPath(new URL('../src/app/(driver)/driver/schedule/page.tsx', import.meta.url)), 'utf8');

test('a failed load is shown as a plain message, not an empty schedule', () => {
  assert.match(page, /setLoadError\(userErrorMessage\(error, "load your schedule"\)\)/);
  assert.match(page, /\{loadError \? \(/);
  assert.match(page, /We couldn&apos;t load your schedule/);
  assert.doesNotMatch(page, /console\.error\("Failed to fetch schedule/);
  // "Schedule Clear" only shows when the schedule loaded and is empty.
  assert.match(page, /\) : sortedDates\.length === 0 \? \(/);
});

test('Try again loads the schedule again', () => {
  assert.match(page, /const retry = \(\) => \{\s*setIsLoading\(true\);\s*void fetchData\(\);/);
  assert.match(page, /onClick=\{retry\}/);
  assert.match(page, /setLoadError\(null\);/);
});
