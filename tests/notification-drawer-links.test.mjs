import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Notifications drawer footer (2026-11-13): drivers and customers get no staff
// inbox links, and Preferences opens their own preferences page.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const { notificationDrawerLinks } = load(path.join(SRC, 'lib/notification-drawer-links'));
const drawer = fs.readFileSync(path.join(SRC, 'components/notifications/NotificationDrawer.tsx'), 'utf8');

test('drivers and customers see no staff inbox links', () => {
  assert.deepEqual(notificationDrawerLinks('driver', '/driver/profile'), {
    showInboxLinks: false,
    preferencesHref: '/driver/notifications/preferences',
  });
  assert.deepEqual(notificationDrawerLinks('customer', '/customer'), {
    showInboxLinks: false,
    preferencesHref: '/customer/notifications/preferences',
  });
});

test('staff keep both inboxes and the preferences page for where they are', () => {
  for (const role of ['employee', 'admin', 'super_admin', undefined]) {
    assert.equal(notificationDrawerLinks(role, '/transportation').showInboxLinks, true, String(role));
  }
  assert.equal(notificationDrawerLinks('admin', '/crm/leads').preferencesHref, '/crm/notifications/preferences');
  assert.equal(notificationDrawerLinks('employee', '/inventory').preferencesHref, '/notifications/preferences');
});

test('the drawer footer follows those rules', () => {
  assert.match(drawer, /notificationDrawerLinks\(user\?\.role, pathname\)/);
  assert.match(drawer, /\{footerLinks\.showInboxLinks && \(/);
  assert.match(drawer, /href=\{footerLinks\.preferencesHref\}/);
});
