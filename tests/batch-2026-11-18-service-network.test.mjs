import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Service Network (2026-11-18): only usable pins go on the map (never 0,0 off
// the coast of Africa), distances and "Closest" come only from them, the
// pop-up and labels are built from text, and notices are plain and visible on
// phones on either tab.
const page = fs.readFileSync(
  fileURLToPath(new URL('../src/app/(customer)/customer/network/page.tsx', import.meta.url)),
  'utf8',
).replace(/\r\n/g, '\n'); // Windows checkouts use CRLF line endings

test('a pin is used only when it is two numbers inside the US', () => {
  assert.match(page, /import \{ validCoordinates \} from "@\/lib\/driver-tracking-view"/);
  assert.match(page, /if \(!Array\.isArray\(coordinates\) \|\| coordinates\.length !== 2\) return null/);
  assert.match(page, /if \(!validCoordinates\(\{ lat, lng \}\)\) return null/);
  // 0,0 and anything outside the US (Alaska and Hawaii included) is not a pin.
  assert.match(page, /if \(lat < 18 \|\| lat > 72 \|\| lng > -65\) return null/);
  // Nothing reads the saved coordinates directly any more.
  assert.doesNotMatch(page, /loc\.location\.coordinates\[/);
  assert.doesNotMatch(page, /const \[lng, lat\] = loc\.location\.coordinates/);
});

test('markers, distances, Closest and selecting a location all use the usable pin', () => {
  assert.match(page, /const pin: \[number, number\] \| null = loc\.pin \?\? usablePin\(loc\)\n\s+if \(!pin\) return/);
  assert.match(page, /if \(userCoords && pin\) \{/);
  assert.match(page, /isClosest: Boolean\(userCoords\) && index === 0 && Number\.isFinite\(loc\.distanceNum\)/);
  assert.doesNotMatch(page, /userCoords && i === 0/);
  assert.equal(page.split('loc.isClosest').length - 1, 5, 'the marker and the four places on the list card');
  assert.match(page, /if \(!pin\) \{\n\s+\/\/ Nothing to show on the map: stay on the list \(2026-11-18\)\.\n\s+setMapNotice\(NOT_ON_MAP\)\n\s+return\n\s+\}/);
});

test('locations without a usable pin are placed from their address, and the card says when one is missing', () => {
  assert.match(page, /const needsGeocode = locations\.filter\(loc => !usablePin\(loc\) && loc\.address && loc\.city\)/);
  assert.match(page, /usablePin\(\{ location: \{ coordinates: coords \} \}\)/);
  assert.match(page, /Finding map pins… \{Math\.min\(geocodedCount, geocodeTotal\)\} of \{geocodeTotal\}/);
  assert.match(page, /\{!loc\.pin && geocodeTotal > 0 && !isGeocoding && \(/);
  assert.match(page, /Not on the map yet/);
  assert.doesNotMatch(page, /Geocoding locations/);
});

test('the pop-up and the pin labels are built from text, not HTML', () => {
  assert.match(page, /\.setDOMContent\(popupBody\)/);
  assert.match(page, /line\.textContent = text/);
  assert.match(page, /label\.textContent = markerLabel\(loc\)/);
  assert.doesNotMatch(page, /\.setHTML\(/);
  assert.doesNotMatch(page, /\.innerHTML\s*=/);
});

test('notices are plain, show above both tabs, and can be dismissed', () => {
  assert.match(page, /<div role="status" aria-live="polite"[^>]*>\n\s+<Crosshair/);
  assert.match(page, /aria-label="Dismiss notice"/);
  assert.doesNotMatch(page, /absolute bottom-6 left-1\/2/, 'no longer only inside the map, which phones hide on the list tab');
  assert.doesNotMatch(page, /Mapbox token|Mapbox Token|NEXT_PUBLIC_MAPBOX_TOKEN<\/code>|WebGL/);
  assert.match(page, /const NOT_ON_MAP = "This location isn't on the map yet\. Use Open in Maps for directions\."/);
});

test('pin labels are readable and wrap instead of ending in "…"', () => {
  const css = page.slice(page.indexOf('.sn-marker-label {'), page.indexOf('.sn-marker-label--closest'));
  assert.match(css, /font-size: 11px;/);
  assert.match(css, /white-space: normal;/);
  assert.doesNotMatch(css, /text-overflow: ellipsis|white-space: nowrap|font-size: 10px/);
});
