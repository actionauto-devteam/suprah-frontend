import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const playwright = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright');
const browserType = playwright[process.env.PLAYWRIGHT_BROWSER || 'chromium'];
const webpack = require('next/dist/compiled/webpack/webpack').webpack;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'toast-deck-'));
let browser;

try {
  await fs.writeFile(path.join(temp, 'loader.cjs'), `
    const ts = require(${JSON.stringify(require.resolve('typescript'))});
    module.exports = source => ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
    }}).outputText;
  `);
  await fs.writeFile(path.join(temp, 'entry.tsx'), `
    import * as React from 'react';
    import { createRoot } from 'react-dom/client';
    import { toast } from '@/lib/readable-toast';
    import { toast as raw } from 'sonner';
    import { Toaster } from '@/components/ui/sonner';
    window.toast = toast; window.raw = raw;
    window.flush = async action => {
      window.IS_REACT_ACT_ENVIRONMENT = true;
      try { await React.act(async () => { action(); }); }
      finally { window.IS_REACT_ACT_ENVIRONMENT = false; }
    };
    window.startPromise = () => raw.promise(new Promise(resolve => { window.finishPromise = resolve; }), {
      loading: 'Saving changes', success: 'Changes saved', error: 'Save failed', duration: 60000,
    });
    function Fixture() {
      React.useEffect(() => { window.fixtureReady = true; return () => { window.fixtureReady = false; }; }, []);
      return <Toaster />;
    }
    createRoot(document.getElementById('root')).render(<React.StrictMode><Fixture /></React.StrictMode>);
  `);
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false, entry: path.join(temp, 'entry.tsx'),
    output: { path: temp, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': path.join(root, 'src') }, modules: [path.join(root, 'node_modules'), 'node_modules'] },
    module: { rules: [{ test: /\.tsx?$/, use: path.join(temp, 'loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors()
    ? reject(error ?? new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const css = await require('postcss')([require('@tailwindcss/postcss')({ base: root })]).process(`
    @import "tailwindcss" source(none);
    @import "tw-animate-css";
    @source "${path.join(root, 'src/components/ui/sonner.tsx').replaceAll('\\', '/')}";
    @source "${path.join(root, 'src/components/ui/toast-deck.tsx').replaceAll('\\', '/')}";
  `, { from: path.join(root, 'toast-deck-test.css') });
  browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-11-19T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-19T00:00:01Z'));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>');
  await page.addStyleTag({ content: css.css });
  await page.addScriptTag({ path: path.join(temp, 'bundle.js') });
  await page.locator('section[aria-label="Notifications"]').waitFor({ state: 'attached' });
  await page.clock.runFor(32);
  await page.waitForFunction(() => window.fixtureReady);
  const card = page.locator('section[aria-label="Notifications"] [data-type]');
  const close = page.getByRole('button', { name: 'Close', exact: true });
  const advance = async ms => {
    await page.clock.runFor(ms);
    await page.evaluate(() => window.flush(() => {}));
  };
  const emit = async (kind, text, options = {}, raw = false) => {
    await page.evaluate(({ kind, text, options, raw }) => window[raw ? 'raw' : 'toast'][kind](text, options), { kind, text, options, raw });
    await advance(1);
    await page.getByText(text, { exact: true }).waitFor();
  };
  const gone = () => card.waitFor({ state: 'detached' });

  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await emit('success', 'Saved');
      assert.equal(await close.isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.clock.runFor(3800);
      assert.equal(await card.isVisible(), true);
      await page.clock.runFor(300);
      await gone();
      await emit('error', 'Detailed problem '.repeat(30).trim());
      await page.clock.runFor(4800);
      assert.equal(await card.isVisible(), true);
      await page.clock.runFor(300);
      await gone();
      console.log('PASS', theme, width, height, 'four/five-second dismissal, close button and containment');
    }
  }

  await emit('info', 'Long caller duration', { duration: 60000 }, true);
  await page.clock.runFor(5100);
  await gone();
  await page.evaluate(() => window.raw.info('Infinite caller duration', { duration: Infinity }));
  await page.clock.runFor(1);
  await page.getByText('Infinite caller duration', { exact: true }).waitFor();
  await page.clock.runFor(5100);
  await gone();

  await page.evaluate(() => {
    window.raw.info('First queued message');
    window.raw.success('Second queued message');
    window.raw.warning('Third queued message');
  });
  await page.clock.runFor(1);
  await page.getByText('Third queued message', { exact: true }).waitFor();
  const next = page.getByRole('button', { name: 'Message 1 of 3. Show message 2.' });
  assert.equal(await next.isVisible(), true);
  await next.evaluate(element => window.flush(() => element.click()));
  await page.clock.runFor(32);
  await page.getByText('Second queued message', { exact: true }).waitFor();
  await page.clock.runFor(4100);
  await gone();
  console.log('PASS long/infinite caller durations and queued messages expire together');

  await emit('info', 'Interaction check', { id: 'interaction' });
  await page.clock.runFor(1500);
  await card.evaluate(element => window.flush(() => element.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))));
  await advance(32);
  await page.clock.runFor(6000);
  assert.equal(await card.isVisible(), true);
  await close.evaluate(element => window.flush(() => element.focus()));
  await card.evaluate(element => window.flush(() => element.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }))));
  await page.clock.runFor(6000);
  assert.equal(await card.isVisible(), true);
  await close.evaluate(element => window.flush(() => element.blur()));
  await advance(32);
  await page.clock.runFor(2600);
  await gone();
  console.log('PASS independent hover/focus pause and resume');

  await emit('info', 'Dismiss while hovered', { id: 'reused' });
  await card.evaluate(element => window.flush(() => element.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))));
  await close.evaluate(element => window.flush(() => element.click()));
  await page.clock.runFor(32);
  await gone();
  await emit('success', 'Reused ID dismisses normally', { id: 'reused' });
  await page.clock.runFor(4100);
  await gone();
  console.log('PASS dismissal clears interaction state before a toast ID is reused');
  await emit('info', 'Touch does not pin the pop-up');
  await card.evaluate(element => window.flush(() => element.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }))));
  await page.clock.runFor(4100);
  await gone();
  console.log('PASS hover/focus, manual dismissal, reused IDs and touch timing');

  await page.evaluate(() => window.startPromise());
  await page.clock.runFor(1);
  await page.getByText('Saving changes', { exact: true }).waitFor();
  await page.clock.runFor(10000);
  assert.equal(await card.isVisible(), true);
  assert.equal(await close.count(), 0);
  await page.evaluate(() => window.finishPromise('done'));
  await page.clock.runFor(1);
  await page.getByText('Changes saved', { exact: true }).waitFor();
  await page.clock.runFor(5100);
  await gone();
  assert.deepEqual(errors, []);
  console.log('PASS promise/loading lifecycle and no browser JavaScript errors');
} finally {
  await browser?.close();
  await fs.rm(temp, { recursive: true, force: true });
}
