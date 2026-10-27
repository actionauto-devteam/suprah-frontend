import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do; its
// "@/lib/…" imports resolve to the matching src/lib file.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const requireLib = (specifier) => loadLib(specifier.replace(/^@\/lib\//, ''));
  new Function('exports', 'require', 'module', outputText)(cjs.exports, requireLib, cjs);
  return cjs.exports;
}

const { locationBlockedMessage, locationBlockedChip } = loadLib('driver-location-messages');
const { SUPPORT_EMAIL } = loadLib('support-contact');

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

// The iPhone app adds "SuprahiOSApp" to the browser's user agent.
function openInIPhoneApp() {
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 SuprahiOSApp' },
    configurable: true,
  });
}

afterEach(() => {
  delete globalThis.window;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
});

test('on the website the messages stay exactly as before', () => {
  assert.equal(
    locationBlockedMessage('accepted'),
    'Location is blocked for this site. You have an accepted load, so Dispatch needs your location. Allow location for this site in your browser settings.',
  );
  assert.equal(
    locationBlockedMessage('optional'),
    'Location is blocked for this site. Allow it in your browser settings if you want to share your location.',
  );
  assert.equal(locationBlockedChip(false), 'Location blocked. Allow it in your browser settings.');
});

test('in the iPhone app the messages point to iPhone Settings and Suprah AI support', () => {
  openInIPhoneApp();
  for (const reason of ['retained', 'accepted', 'optional']) {
    const text = locationBlockedMessage(reason);
    assert.match(text, /^Location is blocked for the Suprah app\./);
    assert.match(text, /open iPhone Settings, tap Suprah, then Location, and choose While Using the App\./);
    assert.ok(text.endsWith(`contact Suprah AI support at ${SUPPORT_EMAIL}.`), text);
    assert.doesNotMatch(text, /browser/);
  }
  assert.match(locationBlockedMessage('retained'), /Dispatch kept a load with you/);
  assert.match(locationBlockedMessage('accepted'), /You have an accepted load/);
  assert.equal(locationBlockedChip(true), 'Location blocked. Allow it in iPhone Settings → Suprah.');
});
