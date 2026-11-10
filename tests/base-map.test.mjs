import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do.
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = path.join(ROOT, 'src');
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', 'process', outputText)(cjs.exports, () => ({}), cjs, { env: {} });
  return cjs.exports;
}

const { chooseBaseMap, amazonStyleUrl, amazonRegion, mapboxStyleUrl, MAPLIBRE_VERSION, MAPLIBRE_WORKER_URL } = load(path.join(SRC, 'lib/base-map'));
const { foundFromAddress, foundFromPlace, addressLine } = load(path.join(SRC, 'components/create-load/map-picker-places'));

test('Amazon when its browser key is set, then Mapbox, otherwise no map', () => {
  assert.equal(chooseBaseMap({ amazonKey: 'v1.public.key', mapboxToken: 'pk.token' }), 'amazon');
  assert.equal(chooseBaseMap({ amazonKey: '  ', mapboxToken: 'pk.token' }), 'mapbox');
  assert.equal(chooseBaseMap({}), null);
});

test("Amazon's map style: Standard in light or dark, Hybrid for satellite", () => {
  assert.equal(
    amazonStyleUrl({ key: 'v1.public.key', region: 'us-east-1', theme: 'dark', view: 'map' }),
    'https://maps.geo.us-east-1.amazonaws.com/v2/styles/Standard/descriptor?color-scheme=Dark&key=v1.public.key',
  );
  assert.equal(
    amazonStyleUrl({ key: 'k', region: '', theme: 'light', view: 'satellite' }),
    'https://maps.geo.us-west-2.amazonaws.com/v2/styles/Hybrid/descriptor?key=k',
  );
  assert.equal(amazonRegion('not a region'), 'us-west-2');
  assert.equal(mapboxStyleUrl('light', 'satellite'), 'mapbox://styles/mapbox/satellite-streets-v12');
});

test("MapLibre's worker in public/ matches the installed MapLibre", () => {
  const installed = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/maplibre-gl/package.json'), 'utf8')).version;
  assert.equal(MAPLIBRE_VERSION, installed, 'update MAPLIBRE_VERSION and copy the new worker into public/vendor after upgrading maplibre-gl');
  const worker = path.join(ROOT, 'public', MAPLIBRE_WORKER_URL);
  assert.ok(fs.existsSync(worker), `${MAPLIBRE_WORKER_URL} is missing`);
  assert.match(fs.readFileSync(worker, 'utf8').slice(0, 400), new RegExp(`v${installed.replace(/\./g, '\\.')}/LICENSE`));
});

test('a pin fills the address without a business name; a searched business keeps its name', () => {
  assert.deepEqual(foundFromAddress({ address: '100 State St', city: 'Orem', state: 'UT', zip: '84058', country: 'US' }), {
    source: 'map', name: '', address: '100 State St', city: 'Orem', state: 'UT', zip: '84058', country: 'US', exact: false,
  });
  const dealership = foundFromPlace({ name: 'Action Auto Utah', address: '100 State St', city: 'Orem', state: 'UT', zip: '84058', country: 'US', exact: true });
  assert.equal(dealership.name, 'Action Auto Utah');
  assert.equal(dealership.exact, true);
  assert.equal(addressLine(dealership), '100 State St, Orem, UT 84058');
});
