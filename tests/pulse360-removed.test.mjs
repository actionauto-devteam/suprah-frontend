import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Pulse 360 is switched off (2026-11-15): no header bell or pop-up on staff
// pages, no Pulse health card on Timeproof Clock, and no Pulse 360 page.
const src = (rel) => fileURLToPath(new URL(`../src/${rel}`, import.meta.url));

test('staff pages no longer mount the Pulse 360 bell or pop-up', () => {
  const layout = fs.readFileSync(src('app/(dashboard)/layout.tsx'), 'utf8');
  assert.doesNotMatch(layout, /Pulse360Bell|Pulse360Popup|"pulse360"/);
  assert.match(layout, /<NotificationBell/);
  assert.match(layout, /YapLineDock/);
});

test('Timeproof Clock no longer shows the Pulse health card', () => {
  const clock = fs.readFileSync(src('app/(dashboard)/crm/timeproof-clock/page.tsx'), 'utf8');
  assert.doesNotMatch(clock, /PulseHealthCard/);
});

test('the Pulse 360 page is gone', () => {
  assert.equal(fs.existsSync(src('app/(dashboard)/crm/pulse360/page.tsx')), false);
});
