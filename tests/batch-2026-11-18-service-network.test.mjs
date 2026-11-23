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
  // A card without a pin stays on the list and explains on the card itself (2026-11-23).
  assert.match(page, /if \(!pin\) \{\n(?:\s+\/\/[^\n]*\n)+\s+setNoPinNoteId\(loc\._id\)\n\s+return\n\s+\}/);
});

test('pins come only from saved locations: no browser lookup the Census service blocks (2026-11-23)', () => {
  assert.doesNotMatch(page, /geocoding\.geo\.census\.gov/);
  assert.doesNotMatch(page, /geocodeAddress|isGeocoding|geocodeTotal|Finding map pins/);
  assert.doesNotMatch(page, /Geocoding locations/);
});

test('each card says whether it is on our built-in map, never mixing it up with Google Maps (2026-11-23)', () => {
  // On the map: a real button that opens it there (the Map tab on phones).
  assert.match(page, /\{loc\.pin \? \(\n\s+<button\n\s+type="button"\n\s+onClick=\{e => \{ e\.stopPropagation\(\); flyToLocation\(loc\) \}\}/);
  assert.match(page, /<span className="lg:hidden">Show on Map tab<\/span>/);
  assert.match(page, /<span className="hidden lg:inline">Show on the map<\/span>/);
  // Not on the map: says so, and tapping the card explains it on the card.
  assert.match(page, /<span className="lg:hidden">Not shown on the Map tab<\/span>/);
  assert.match(page, /<span className="hidden lg:inline">Not shown on the map<\/span>/);
  assert.match(page, /\{noPinNoteId === loc\._id && !loc\.pin && \(\n\s+<p role="status"/);
  assert.match(page, /This location isn&apos;t on the Map tab yet\./);
  assert.match(page, /Open in Google Maps gives directions in a new tab\./);
  assert.doesNotMatch(page, /Not on the map yet|NOT_ON_MAP/);
});

test('Open in Google Maps says where it goes and opens a separate tab safely (2026-11-23)', () => {
  assert.match(page, /Open in Google Maps <ExternalLink className="w-3 h-3 ml-1\.5" aria-hidden="true" \/>/);
  assert.match(page, /aria-label=\{`Open \$\{locationTitle\(loc\)\} in Google Maps \(opens in a new tab\)`\}/);
  assert.match(page, /window\.open\(googleMapsUrl\(loc\), '_blank', 'noopener,noreferrer'\)/);
  assert.doesNotMatch(page, /Open in Maps\b/);
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
  assert.match(page, /const MAP_UNAVAILABLE = "The map isn't available right now\. Use the list and Open in Google Maps for directions\."/);
});

test('pin labels are readable and wrap instead of ending in "…"', () => {
  const css = page.slice(page.indexOf('.sn-marker-label {'), page.indexOf('.sn-marker-label--closest'));
  assert.match(css, /font-size: 11px;/);
  assert.match(css, /white-space: normal;/);
  assert.doesNotMatch(css, /text-overflow: ellipsis|white-space: nowrap|font-size: 10px/);
});
