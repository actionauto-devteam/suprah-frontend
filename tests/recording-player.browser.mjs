import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href : 'playwright');
const origin = process.env.RECORDING_PREVIEW_URL || 'http://127.0.0.1:3011';
const record = { _id: '507f1f77bcf86cd799439021', callLogId: '507f1f77bcf86cd799439022', direction: 'inbound', state: 'ready', manualPaused: false, incomplete: false, endedAt: '2026-10-03T00:01:00Z', files: [{ _id: '507f1f77bcf86cd799439023', bytes: 8, startedAt: '2026-10-03T00:00:00Z', endedAt: '2026-10-03T00:01:00Z' }] };
const permissions = ['view', 'download', 'share', 'review', 'control', 'delete'];
const audio = Buffer.alloc(16044); audio.write('RIFF'); audio.writeUInt32LE(16036, 4); audio.write('WAVEfmt ', 8); audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(16000, 40);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } }); const page = await context.newPage(); let delayed; let release; let requested;
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' };
      if (pathname.includes('/recordings/media/')) return route.fulfill({ contentType: 'audio/wav', body: audio, headers });
      if (pathname.endsWith('/media-session')) {
        requested?.(); if (delayed) await delayed;
        return route.fulfill({ json: { data: { path: '/api/crm/communications/recordings/media/fixture' } }, headers });
      }
      if (pathname.endsWith('/recording')) return route.fulfill({ json: { data: { recording: { ...record, state: 'recording' }, permissions, canControl: true } }, headers });
      if (pathname.includes('/recordings/')) return route.fulfill({ json: { data: { recording: record, permissions, shares: [], audits: [] } }, headers });
      throw new Error(`Unexpected API ${pathname}`);
    });
    await page.goto(`${origin}/recording-preview`); await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.locator('audio').waitFor();
    await page.locator('audio').evaluate(async element => { window.previousAudio = element; await element.play(); });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.RECORDING_SCREENSHOTS) { await fs.mkdir(process.env.RECORDING_SCREENSHOTS, { recursive: true }); await page.screenshot({ path: `${process.env.RECORDING_SCREENSHOTS}/recording-security-${width}.png`, fullPage: true }); }
    await page.evaluate(() => window.dispatchEvent(new Event('suprah:clear-private-cache')));
    await page.waitForFunction(() => !document.querySelector('audio')); assert.equal(await page.evaluate(() => window.previousAudio.paused && !window.previousAudio.getAttribute('src')), true);
    delayed = new Promise(resolve => { release = resolve; }); const started = new Promise(resolve => { requested = resolve; });
    await page.getByRole('button', { name: 'Play', exact: true }).click(); await started;
    await page.evaluate(() => window.dispatchEvent(new Event('suprah:clear-private-cache'))); release(); delayed = undefined;
    await page.getByRole('button', { name: 'Play', exact: true }).waitFor({ state: 'visible' }); await page.waitForFunction(() => !document.querySelector('button:disabled'));
    assert.equal(await page.locator('audio').count(), 0, 'in-flight media cannot reopen playback after logout');
    await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.locator('audio').waitFor();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('recording-preview:account', { detail: 'preview-B' })));
    await page.waitForFunction(() => !document.querySelector('audio')); await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.locator('audio').waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('supraspace:refresh-crm-token'))); await page.waitForFunction(() => !document.querySelector('audio'));
    results.push({ width, logoutStopsAudio: true, lateResponseIgnored: true, accountSwitchClearsAudio: true, noOverflow: true }); await context.close();
  }
  process.stdout.write(JSON.stringify(results));
} finally { await browser.close(); }
