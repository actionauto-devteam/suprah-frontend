import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright');
const bundledWebpack = require('next/dist/compiled/webpack/webpack');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'meet-screen-'));
let browser;

try {
  await fs.writeFile(path.join(temp, 'loader.cjs'), `
    const ts = require(${JSON.stringify(require.resolve('typescript'))});
    module.exports = function(source) {
      if (this.resourcePath.endsWith('.css')) {
        const names = [...source.matchAll(/\\.([a-zA-Z][\\w-]*)/g)].map(m => m[1]);
        return 'const style = document.createElement("style"); style.textContent = '
          + JSON.stringify(source) + '; document.head.append(style); export default '
          + JSON.stringify(Object.fromEntries(names.map(name => [name, name]))) + ';';
      }
      return ts.transpileModule(source, { compilerOptions: {
        target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
      }}).outputText;
    };
  `);
  await fs.writeFile(path.join(temp, 'entry.tsx'), `
    import * as React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MeetSharedScreen } from ${JSON.stringify(path.join(root, 'src/components/suprah-meet/MeetSharedScreen.tsx'))};
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = '#071410'; ctx.font = '64px sans-serif';
    ctx.fillText('Suprah Meet screen-sharing check', 80, 160);
    window.stream = canvas.captureStream(1);
    let frame = 0;
    setInterval(() => {
      ctx.fillStyle = frame++ % 2 ? '#071410' : '#ffffff';
      ctx.fillRect(80, 220, 40, 40);
    }, 100);
    window.bindings = [];
    window.boundElements = [];
    const bind = (id, el) => {
      if (el) {
        el.srcObject = window.stream;
        window.bindings.push(id);
        window.boundElements.push(el);
      }
    };
    const app = createRoot(document.getElementById('root'));
    window.showShare = (id = 7) => app.render(
      <React.StrictMode>
      <div style={{ display: 'flex', height: 'calc(100dvh - 160px)', padding: 8 }}>
        <MeetSharedScreen tileId={id} bind={bind}>
          <div style={{ width: 160, height: 96, flexShrink: 0 }}>Participant</div>
        </MeetSharedScreen>
      </div>
      </React.StrictMode>
    );
    window.stopShare = () => app.render(<p>Screen sharing stopped</p>);
    window.showShare();
  `);
  await new Promise((resolve, reject) => {
    bundledWebpack.webpack({
      mode: 'development', devtool: false, entry: path.join(temp, 'entry.tsx'),
      output: { path: temp, filename: 'bundle.js' },
      resolve: {
        extensions: ['.tsx', '.ts', '.js'], alias: { '@': path.join(root, 'src') },
        modules: [path.join(root, 'node_modules'), 'node_modules'],
      },
      module: { rules: [{ test: /\.(tsx?|css)$/, use: path.join(temp, 'loader.cjs') }] },
    }, (error, stats) => {
      if (error || stats.hasErrors()) reject(error ?? new Error(stats.toString({ all: false, errors: true })));
      else resolve();
    });
  });
  const postcss = require('postcss');
  const tailwind = require('@tailwindcss/postcss');
  const css = await postcss([tailwind({ base: root })]).process(`
    @import "tailwindcss" source(none);
    @import "tw-animate-css";
    @source "${path.join(root, 'src/components/ui/dialog.tsx').replaceAll('\\', '/')}";
    @source "${path.join(root, 'src/components/suprah-meet/MeetSharedScreen.tsx').replaceAll('\\', '/')}";
  `, { from: path.join(root, 'meet-screen-test.css') });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>');
  await page.addStyleTag({ content: css.css });
  await page.addScriptTag({ path: path.join(temp, 'bundle.js') });
  const expand = page.getByRole('button', { name: 'Expand shared screen' });
  const dialog = page.getByRole('dialog', { name: 'Shared screen' });

  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
    for (const [width, height] of [[390, 844], [667, 375], [844, 390], [1024, 768], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
      const thumbnails = await page.locator('.people').isVisible();
      assert.equal(thumbnails, height > 500 || height > width);
      const inline = await page.locator('video').boundingBox();
      await expand.click();
      await dialog.waitFor();
      const box = await dialog.boundingBox();
      assert.deepEqual(box, { x: 0, y: 0, width, height }, `${theme} ${width}x${height} fills viewport`);
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
      assert.equal(await page.locator('video').count(), 1);
      assert.equal(await page.evaluate(() => window.boundElements
        .filter(el => el !== document.querySelector('video'))
        .every(el => el.srcObject === null && el.paused)), true, 'detached videos release the stream');
      assert.equal(await page.locator('video').evaluate(el => getComputedStyle(el).objectFit), 'contain');
      assert.equal(await page.locator('video').evaluate(el => el.muted && el.playsInline), true);
      const expanded = await page.locator('video').boundingBox();
      assert.ok(expanded.width >= inline.width && expanded.height > inline.height);
      assert.equal(await page.evaluate(() => window.stream.getTracks()[0].readyState), 'live');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.getByRole('button', { name: 'Back to meeting' }).click();
      await dialog.waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Expand shared screen');
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
      console.log('PASS', theme, width, height, 'expand, fit, close, focus and media');
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expand.click();
  const bindings = await page.evaluate(() => window.bindings.length);
  await page.setViewportSize({ width: 844, height: 390 });
  assert.equal(await page.locator('video').count(), 1);
  assert.equal(await page.evaluate(() => window.bindings.length), bindings, 'rotation keeps the video binding');
  await page.evaluate(() => window.showShare(9));
  await page.waitForFunction(() => window.bindings.at(-1) === 9);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  await expand.click();
  await page.evaluate(() => window.stopShare());
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await page.locator('video').count(), 0);
  assert.equal(await page.evaluate(() => window.boundElements
    .every(el => el.srcObject === null && el.paused)), true, 'share ending releases every video element');
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).pointerEvents), 'auto');
  assert.deepEqual(errors, []);
  console.log('PASS rotation, source replacement, Escape and share-ending cleanup');
} finally {
  await browser?.close();
  await fs.rm(temp, { recursive: true, force: true });
}
