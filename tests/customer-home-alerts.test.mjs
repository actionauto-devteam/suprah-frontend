import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Customer Home (2026-11-14): View all, the "new alerts" chip and the Alerts tile
// all open the same Notifications drawer.
const home = fs.readFileSync(fileURLToPath(new URL('../src/components/customer/garage/OverviewTab.tsx', import.meta.url)), 'utf8');

test('every notifications shortcut on Home opens the drawer', () => {
  assert.equal((home.match(/onClick=\{openNotificationDrawer\}/g) ?? []).length, 3);
  assert.doesNotMatch(home, /<Link href="\/customer\/notifications"/);
  assert.match(home, /opensDrawer: true,/);
  assert.match(home, /return stat\.opensDrawer \? \(\s*<button/);
});

test('the other tiles still open their pages', () => {
  for (const href of ['/customer/saved', '/customer/payments']) assert.match(home, new RegExp(`href: "${href}"`));
  assert.match(home, /<Link key=\{stat\.label\} href=\{stat\.href\}>/);
});
