import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pick on map and the trip history map sit in pop-up windows, which add their
// content a moment after they open. Each map is made once its box is on the
// page, so it never stays on "Loading the map…" (2026-11-12). The map credit
// is the small (i) button: the map providers' terms require it on the map.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const read = (file) => fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\s+/g, ' ');

test('Pick on map is made once its box exists, not only on the first render', () => {
  const source = read('components/create-load/LocationMapPicker.tsx');
  assert.match(source, /const \[mapContainer, setMapContainer\] = React\.useState<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /<div ref=\{setMapContainer\}/);
  assert.match(source, /\}, \[mapContainer\]\)/);
});

test('the trip history map is made once its box exists', () => {
  const source = read('components/driver-tracker/TripRouteMap.tsx');
  assert.match(source, /const \[container, setContainer\] = React\.useState<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /<div ref=\{setContainer\}/);
  assert.match(source, /\}, \[container, points, paths\]\);/);
});

test('the map credit is the small (i) button, never removed', () => {
  const source = read('lib/base-map.ts');
  assert.match(source, /attributionControl: false,/);
  assert.match(source, /new library\.AttributionControl\(\{ compact: true \}\), "bottom-right"/);
});
