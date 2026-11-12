import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Driver Tracker, the driver's dashboard and the available-load map use the
// shared map (Amazon's when its key is set, Mapbox until then), and place
// lookups go through the server, Amazon Location once it's on (2026-11-12).
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = path.join(ROOT, 'src');
function load(file, env = {}, modules = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', 'process', outputText)(cjs.exports, (id) => modules[id] ?? {}, cjs, { env });
  return cjs.exports;
}

const MAPBOX_STYLES = { light: 'mapbox://styles/mapbox/streets-v12', dark: 'mapbox://styles/mapbox/dark-v11' };
const amazonStyle = { getStyle: () => ({ layers: [{ type: 'background' }, { type: 'symbol', layout: { 'text-font': ['Amazon Ember Regular'] } }] }) };

test("with Amazon's browser key, the live maps use Amazon's style and its font for labels", () => {
  const map = load(path.join(SRC, 'lib/base-map'), { NEXT_PUBLIC_AMAZON_LOCATION_API_KEY: 'v1.public.key', NEXT_PUBLIC_MAPBOX_TOKEN: 'pk.token' });
  assert.equal(map.LIVE_MAP_PROVIDER, 'amazon');
  assert.match(map.liveMapStyle('dark', MAPBOX_STYLES), /^https:\/\/maps\.geo\.us-west-2\.amazonaws\.com\/v2\/styles\/Standard\/descriptor\?color-scheme=Dark&key=/);
  assert.deepEqual(map.liveMapLabelFont(amazonStyle), ['Amazon Ember Regular']);
});

test('without it, they keep their own Mapbox styles and fonts', () => {
  const map = load(path.join(SRC, 'lib/base-map'), { NEXT_PUBLIC_MAPBOX_TOKEN: 'pk.token' });
  assert.equal(map.LIVE_MAP_PROVIDER, 'mapbox');
  assert.equal(map.liveMapStyle('dark', MAPBOX_STYLES), 'mapbox://styles/mapbox/dark-v11');
  assert.equal(map.liveMapStyle('light', MAPBOX_STYLES), 'mapbox://styles/mapbox/streets-v12');
  assert.equal(map.liveMapLabelFont(amazonStyle), undefined);
  assert.equal(map.loadLiveMapLibrary.length, 0);
});

test('with no map set up, there is no live map', () => {
  const map = load(path.join(SRC, 'lib/base-map'), {});
  assert.equal(map.LIVE_MAP_PROVIDER, null);
  assert.equal(map.loadLiveMapLibrary(), null);
});

test("a style's label font is the first one its own labels use", () => {
  const { styleTextFont } = load(path.join(SRC, 'lib/base-map'), {});
  assert.deepEqual(styleTextFont(amazonStyle), ['Amazon Ember Regular']);
  assert.equal(styleTextFont({ getStyle: () => ({ layers: [{ type: 'line' }] }) }), undefined);
  assert.equal(styleTextFont({ getStyle: () => ({ layers: [{ type: 'symbol', layout: { 'text-font': ['get', 'font'] } }] }) }), undefined);
  assert.equal(styleTextFont({}), undefined);
});

function lookupWith(serverAnswer) {
  const calls = { server: 0, mapbox: 0 };
  const apiClient = {
    get: async () => {
      calls.server += 1;
      if (serverAnswer instanceof Error) throw serverAnswer;
      return { data: { data: serverAnswer } };
    },
  };
  globalThis.fetch = async () => {
    calls.mapbox += 1;
    return { json: async () => ({ features: [{ center: [-96.8, 32.78] }] }) };
  };
  const { lookupPlacePosition } = load(path.join(SRC, 'lib/driver-next-stop'), {}, { '@/lib/api-client': { apiClient } });
  return { lookupPlacePosition, calls };
}
const options = { getToken: async () => 'token', mapboxToken: 'pk.token' };

test("places come from the server's service; Mapbox isn't asked when the server answers", async () => {
  let { lookupPlacePosition, calls } = lookupWith({ position: { lat: 40.3, lng: -111.7 }, available: true });
  assert.deepEqual(await lookupPlacePosition('Orem, UT', options), { lat: 40.3, lng: -111.7 });
  assert.deepEqual(calls, { server: 1, mapbox: 0 });

  ({ lookupPlacePosition, calls } = lookupWith({ position: null, available: true }));
  assert.equal(await lookupPlacePosition('Nowhere, ZZ', options), null);
  assert.deepEqual(calls, { server: 1, mapbox: 0 });
});

test('Mapbox in the browser only when the server has no place service or can not be reached', async () => {
  let { lookupPlacePosition, calls } = lookupWith({ position: null, available: false });
  assert.deepEqual(await lookupPlacePosition('Dallas, TX', options), { lat: 32.78, lng: -96.8 });
  assert.deepEqual(calls, { server: 1, mapbox: 1 });

  ({ lookupPlacePosition, calls } = lookupWith(new Error('Network Error')));
  assert.deepEqual(await lookupPlacePosition('Dallas, TX', options), { lat: 32.78, lng: -96.8 });
  assert.equal(calls.mapbox, 1);
});

test('the driver maps no longer use Google Maps', () => {
  const read = (file) => fs.readFileSync(path.join(SRC, file), 'utf8');
  for (const file of [
    'app/(dashboard)/driver-tracker/page.tsx',
    'app/(driver)/driver/page.tsx',
    'app/(driver)/driver/available-loads/[id]/page.tsx',
    'components/driver-tracker/driver-focus-layer.ts',
    'components/driver/driver-next-stop-layer.ts',
    'components/driver-tracker/driver-fleet-layer.ts',
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /@\/lib\/google-maps|google\.maps\.|GOOGLE_MAPS\b/, file);
  }
  assert.equal(fs.existsSync(path.join(SRC, 'lib/google-maps.ts')), false);
  assert.equal(fs.existsSync(path.join(SRC, 'components/driver-tracker/google-driver-fleet-layer.ts')), false);
});

test('the map credit as plain text: no links, no "Improve this map", each name once', () => {
  const { mapCreditText } = load(path.join(SRC, 'lib/base-map'), { NEXT_PUBLIC_MAPBOX_TOKEN: 'pk.token' });
  const mapboxStyle = {
    getStyle: () => ({
      sources: {
        composite: {
          attribution: '<a href="https://www.mapbox.com/about/maps/" target="_blank" title="Mapbox">&copy; Mapbox</a> <a href="https://www.openstreetmap.org/about/" target="_blank">&copy; OpenStreetMap</a> <a class="mapbox-improve-map" href="https://www.mapbox.com/contribute/" target="_blank">Improve this map</a>',
        },
        extra: { attribution: '© OpenStreetMap' },
        lines: { type: 'geojson' },
      },
    }),
  };
  assert.equal(mapCreditText(mapboxStyle, 'mapbox'), '© Mapbox © OpenStreetMap');
  assert.equal(mapCreditText({ getStyle: () => ({ sources: {} }) }, 'mapbox'), '© Mapbox © OpenStreetMap');
  assert.equal(mapCreditText(null, 'amazon'), '© Amazon Location Service © OpenStreetMap');
  assert.equal(mapCreditText(null, null), '');
});
