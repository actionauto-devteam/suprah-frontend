import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// The Video button (2026-11-13): it opens a window that plays the car's video
// when it has one, and otherwise says there's no video yet (with the dealer's
// page for the car when there is one). The dealer page is never played.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const { vehicleVideo, vehiclePageLink } = load(path.join(SRC, 'lib/vehicle-video'));

test('video files play in the window', () => {
  assert.deepEqual(vehicleVideo('https://cdn.example.com/cars/2024-acura.mp4'), { kind: 'file', src: 'https://cdn.example.com/cars/2024-acura.mp4' });
  assert.equal(vehicleVideo('https://cdn.example.com/walkaround.MOV?token=1').kind, 'file');
  assert.equal(vehicleVideo('https://cdn.example.com/clip.webm').kind, 'file');
});

test('YouTube and Vimeo links play through their own players', () => {
  const youtube = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1';
  for (const link of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ']) {
    assert.deepEqual(vehicleVideo(link), { kind: 'embed', provider: 'YouTube', src: youtube }, link);
  }
  assert.deepEqual(vehicleVideo('https://vimeo.com/123456789'), { kind: 'embed', provider: 'Vimeo', src: 'https://player.vimeo.com/video/123456789' });
});

test("the dealer's page for the car is a link, never played as a video", () => {
  const page = 'https://www.actionautoutah.com/vehicle-details/2024-acura-mdx-l21792';
  assert.equal(vehicleVideo(page), null);
  assert.equal(vehiclePageLink(page), page);
});

test('nothing unsafe or empty opens', () => {
  for (const value of ['', '   ', undefined, null, 'not a link', 'javascript:alert(1)', 'data:video/mp4;base64,AAAA', 'https://youtube.com/watch?v=short']) {
    assert.equal(vehicleVideo(value), null, String(value));
  }
  assert.equal(vehiclePageLink('javascript:alert(1)'), null);
  assert.equal(vehiclePageLink(undefined), null);
});

test('the window uses one wording and wraps on small phones', () => {
  const dialog = fs.readFileSync(path.join(SRC, 'components/inventory/VehicleVideoDialog.tsx'), 'utf8');
  assert.ok(dialog.includes("View on the dealership's website"));
  assert.ok(!/dealer's|this car/.test(dialog));
  assert.ok(dialog.includes('h-auto min-h-11 max-w-full gap-2 whitespace-normal'));
});

test('Inventory and Shop both show the Video window', () => {
  for (const file of ['app/(dashboard)/inventory/page.tsx', 'app/(customer)/customer/shop/page.tsx']) {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');
    assert.ok(source.includes('<VehicleVideoDialog open={openModals.video} onOpenChange={setVideoOpen} vehicle={selectedVehicle} />'), file);
  }
});
