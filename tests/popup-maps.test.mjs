import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pick on map and the trip history map sit in pop-up windows, which add their
// content a moment after they open. Each map is made once its box is on the
// page, so it never stays on "Loading the map…" (2026-11-12). Every map has
// the (i) map credit Mapbox requires, kept quiet, and the available-load map
// has no "ctrl + scroll" note.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const read = (file) => fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\s+/g, ' ');

test('Pick on map is made once its box exists, not only on the first render', () => {
  const source = read('components/create-load/LocationMapPicker.tsx');
  assert.ok(source.includes('const [mapContainer, setMapContainer] = React.useState<HTMLDivElement | null>(null)'));
  assert.ok(source.includes('<div ref={setMapContainer}'));
  assert.ok(source.includes('}, [mapContainer])'));
});

test('the trip history map is made once its box exists', () => {
  const source = read('components/driver-tracker/TripRouteMap.tsx');
  assert.ok(source.includes('const [container, setContainer] = React.useState<HTMLDivElement | null>(null)'));
  assert.ok(source.includes('<div ref={setContainer}'));
  assert.ok(source.includes('}, [container, points, paths]);'));
});

test('every map has the (i) map credit, in a corner clear of its own buttons', () => {
  const baseMap = read('lib/base-map.ts');
  assert.ok(baseMap.includes('import "@/styles/map-credit.css"'));
  assert.ok(baseMap.includes('new library.AttributionControl({ compact: true }), corner'));
  assert.ok(baseMap.includes('addMapCredit(map as unknown as CreditMap, library)'), 'Pick on map and trip history');
  const corners = {
    'app/(dashboard)/driver-tracker/page.tsx': 'addMapCredit(map, mapboxgl, "bottom-right");',
    'app/(driver)/driver/page.tsx': 'addMapCredit(map, mapboxgl, "top-left");',
    'app/(driver)/driver/available-loads/[id]/page.tsx': 'addMapCredit(map, mapboxgl);',
    'components/customer/ShipmentLiveMap.tsx': 'addMapCredit(map, mapboxgl, "bottom-left")',
    'components/driver-tracker/LoadRouteOverview.tsx': 'addMapCredit(map, mapboxgl);',
  };
  for (const [file, call] of Object.entries(corners)) assert.ok(read(file).includes(call), file);
});

test('the credit is quiet: see-through until hovered, focused or opened', () => {
  const css = read('styles/map-credit.css');
  assert.ok(css.includes('.mapboxgl-ctrl.mapboxgl-ctrl-attrib, .maplibregl-ctrl.maplibregl-ctrl-attrib { opacity: 0.55;'));
  assert.ok(css.includes('.mapboxgl-ctrl.mapboxgl-ctrl-attrib:hover'));
  assert.ok(css.includes('.mapboxgl-ctrl.mapboxgl-ctrl-attrib.mapboxgl-compact-show'));
});

test('the available-load map moves with one finger, with no ctrl + scroll note', () => {
  const page = read('app/(driver)/driver/available-loads/[id]/page.tsx');
  assert.ok(!page.includes('cooperativeGestures'));
  assert.ok(page.includes('dragRotate: false, pitchWithRotate: false, touchPitch: false,'));
});
