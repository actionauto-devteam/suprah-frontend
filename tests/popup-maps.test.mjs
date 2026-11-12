import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pick on map and the trip history map sit in pop-up windows, which add their
// content a moment after they open. Each map is made once its box is on the
// page, so it never stays on "Loading the map…" (2026-11-12). The map credit
// the map providers require is a plain line of text under each map, with no
// (i) button on the map, and the available-load map has no "ctrl + scroll" note.
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

test('the map credit is a plain line under each map, with no (i) button on the map', () => {
  const baseMap = read('lib/base-map.ts');
  assert.ok(baseMap.includes('attributionControl: false,'));
  assert.ok(!baseMap.includes('AttributionControl('));
  assert.ok(read('components/create-load/LocationMapPicker.tsx').includes('{mapCredit && <p className="-mt-2 text-right text-[11px] text-muted-foreground">{mapCredit}</p>}'));
  assert.ok(read('components/driver-tracker/TripRouteMap.tsx').includes('{credit && <p className="-mt-1 text-right text-[11px] text-muted-foreground">{credit}</p>}'));
});

test('the available-load map moves with one finger, with no ctrl + scroll note and no (i) on it', () => {
  const page = read('app/(driver)/driver/available-loads/[id]/page.tsx');
  assert.ok(!page.includes('cooperativeGestures'));
  assert.ok(page.includes('attributionControl: false,'));
  assert.ok(page.includes('dragRotate: false, pitchWithRotate: false, touchPitch: false,'));
  assert.ok(page.includes('setMapCredit(mapCreditText(map));'));
  assert.ok(page.includes('{mapCredit && <p className="px-3 py-1.5 text-right text-[11px] text-muted-foreground">{mapCredit}</p>}'));
});
