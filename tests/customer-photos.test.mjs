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
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
const { resolveImageUrl } = loadLib('utils');
const BUCKET = 'https://pub-0123456789abcdef.r2.dev';

test('customer photos saved with a public-bucket address load through the backend', () => {
  assert.equal(resolveImageUrl(`${BUCKET}/vehicles/1730000000000-123456789.jpg`),
    'https://api.example.com/api/photos/vehicles/1730000000000-123456789.jpg');
  assert.equal(resolveImageUrl(`${BUCKET}/auction-listings/1730000000000-42.webp`),
    'https://api.example.com/api/photos/auction-listings/1730000000000-42.webp');
  assert.equal(resolveImageUrl(`${BUCKET}/aftermarket/media/1730000000000-7.PNG`),
    'https://api.example.com/api/photos/aftermarket-media/1730000000000-7.PNG');
});

test('profile pictures keep their own route', () => {
  assert.equal(resolveImageUrl(`${BUCKET}/avatars/1730000000000-1.jpg`),
    'https://api.example.com/api/crm/avatars/1730000000000-1.jpg');
});

test('other addresses are left as they are', () => {
  const dealerPhoto = 'https://images.dealer.example.com/vehicles/1730000000000-1.jpg';
  assert.equal(resolveImageUrl(dealerPhoto), dealerPhoto);
  const video = `${BUCKET}/aftermarket/media/1730000000000-7.mp4`;
  assert.equal(resolveImageUrl(video), video);
  const otherFolder = `${BUCKET}/stories/1730000000000-1.jpg`;
  assert.equal(resolveImageUrl(otherFolder), otherFolder);
  assert.equal(resolveImageUrl(`${BUCKET}/vehicles/photo.jpg`), `${BUCKET}/vehicles/photo.jpg`);
});
