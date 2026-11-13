import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Customer notifications (2026-11-13): Home "View all" opens the drawer, a
// notification opens what it's about, and a shipment step opens that shipment.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const { shipmentNotificationRoute } = load(path.join(SRC, 'lib/customer-shipment-tracking'));
const { OPEN_NOTIFICATIONS_EVENT } = load(path.join(SRC, 'lib/notification-open'));
const QUOTE = '6553f1c2a4b5c6d7e8f90123';

test('a shipment step opens that shipment, old and new notifications alike', () => {
  assert.equal(
    shipmentNotificationRoute({ metadata: { route: '/customer/shipments', quoteId: QUOTE } }),
    `/customer/shipments?shipment=${QUOTE}`,
  );
});

test('other notifications keep their own links', () => {
  assert.equal(shipmentNotificationRoute({ metadata: { route: `/customer/shipments?shipment=${QUOTE}&chat=driver`, quoteId: QUOTE } }), null);
  assert.equal(shipmentNotificationRoute({ metadata: { route: '/customer/shipments', quoteId: 'not-an-id' } }), null);
  assert.equal(shipmentNotificationRoute({ metadata: { route: '/customer/saved', quoteId: QUOTE } }), null);
  assert.equal(shipmentNotificationRoute({ metadata: null }), null);
  assert.equal(shipmentNotificationRoute(null), null);
  assert.match(read('components/notifications/notification-utils.ts'), /const shipmentRoute = shipmentNotificationRoute\(notification\);\s*if \(shipmentRoute\) return shipmentRoute;\s*\/\/ Prefer the contextual route/);
});

test('Home "View all" opens the drawer and each notification opens its page', () => {
  const home = read('components/customer/garage/OverviewTab.tsx');
  assert.doesNotMatch(home, /<Link href="\/customer\/notifications" className="text-\[11px\] text-primary font-semibold hover:underline">/);
  assert.match(home, /onClick=\{openNotificationDrawer\}/);
  assert.match(home, /onClick=\{\(\) => openNotification\(notif\)\}/);
  assert.match(home, /getNotificationRoute\(notif, "\/customer"\)/);
  const bell = read('components/notifications/NotificationBell.tsx');
  assert.equal(OPEN_NOTIFICATIONS_EVENT, 'suprah:open-notifications');
  assert.match(bell, /window\.addEventListener\(OPEN_NOTIFICATIONS_EVENT, openDrawer\)/);
});

test('in the customer and driver portals the drawer closes when a notification opens its page', () => {
  const drawer = read('components/notifications/NotificationDrawer.tsx');
  assert.match(drawer, /const inPortal = pathname\.startsWith\('\/customer'\) \|\| pathname\.startsWith\('\/driver'\);\s*if \(inPortal && getNotificationRoute\(notification, pathname\)\) onClose\(\);/);
});

test('My Shipments scrolls to the linked shipment and outlines it', () => {
  const page = read('app/(customer)/customer/shipments/page.tsx');
  assert.match(page, /id=\{shipmentCardId\(entry\.id\)\}/);
  assert.match(page, /if \(!chatLink\.kind\) \{\s*setHighlightedId\(entry\.id\);/);
  assert.match(page, /highlighted=\{highlightedId === entry\.id\}/);
});
