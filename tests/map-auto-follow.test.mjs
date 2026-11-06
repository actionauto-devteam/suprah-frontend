import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do.
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

const { stopsFollowing } = loadLib('map-follow');
const { followModeOnFocus } = loadLib('driver-tracking-view');

test('dragging the map stops following; zooming keeps following', () => {
  // Looking around: mouse drag, one finger, arrow keys.
  assert.equal(stopsFollowing({ type: 'mousemove' }), true);
  assert.equal(stopsFollowing({ type: 'pointermove' }), true);
  assert.equal(stopsFollowing({ type: 'touchmove', touches: { length: 1 } }), true);
  assert.equal(stopsFollowing({ type: 'keydown', key: 'ArrowLeft' }), true);
  // Zooming: two-finger pinch, scroll, double tap, + and - keys, the zoom buttons.
  assert.equal(stopsFollowing({ type: 'touchmove', touches: { length: 2 } }), false);
  assert.equal(stopsFollowing({ type: 'wheel' }), false);
  assert.equal(stopsFollowing({ type: 'dblclick' }), false);
  assert.equal(stopsFollowing({ type: 'keydown', key: '+' }), false);
  assert.equal(stopsFollowing({ type: 'click' }), false);
  // The map's own moves (following the driver) have no event.
  assert.equal(stopsFollowing(undefined), false);
  assert.equal(stopsFollowing(null), false);
});

test('Driver Tracker follows a driver as soon as they are chosen', () => {
  const coords = { lat: 40.76, lng: -111.89 };
  assert.equal(followModeOnFocus({ coords }), 'following');
  assert.equal(followModeOnFocus({ coords, canViewExactGps: true }), 'following');
  // Nothing to follow: exact location not shared with this staff member, or no position.
  assert.equal(followModeOnFocus({ coords, canViewExactGps: false }), 'off');
  assert.equal(followModeOnFocus({ coords: null }), 'off');
  assert.equal(followModeOnFocus({ coords: { lat: 200, lng: 0 } }), 'off');
});
