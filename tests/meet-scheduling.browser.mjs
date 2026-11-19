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
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'meet-scheduling-'));
let browser;

try {
  await fs.writeFile(path.join(temp, 'loader.cjs'), `
    const ts = require(${JSON.stringify(require.resolve('typescript'))});
    module.exports = source => ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
    }}).outputText;
  `);
  await fs.writeFile(path.join(temp, 'stubs.tsx'), `
    import * as React from 'react';
    export const useRouter = () => ({ push: url => { window.openedRoom = url; } });
    export const useMeetSession = () => ({ activeCode: null, meet: {} });
    export const useOptionalCrmNotificationContext = () => null;
    export const MeetingSummaryPanel = () => null;
    export const MeetDeviceAlerts = () => null;
    export const CrmCalendarConnect = () => null;
    export const CrmCalendarSyncButton = () => null;
    export const MeetScheduleCleanup = () => null;
    export const ShareMeetingDialog = ({ onClose }) => <button onClick={onClose}>Close sharing</button>;
    export const apiClient = {
      get: async url => {
        if (url === '/api/crm/users') return { data: { data: { users: [{ _id: 'person', fullName: 'One teammate', role: 'employee' }] } } };
        if (url === '/api/crm/departments') return { data: { data: [] } };
        if (window.holdNext) {
          window.holdNext = false;
          return new Promise(resolve => { window.resolveStale = () => resolve({ data: { data: { meetings: window.initialRows, selfCrmUserId: 'host' } } }); });
        }
        if (window.createdRow) return new Promise((resolve, reject) => {
          window.resolveFresh = () => resolve({ data: { data: { meetings: [...window.initialRows, window.createdRow]
            .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) || Date.parse(b.createdAt) - Date.parse(a.createdAt)), selfCrmUserId: 'host' } } });
          window.rejectFresh = () => reject(new Error('Refresh temporarily unavailable'));
        });
        return { data: { data: { meetings: window.initialRows, selfCrmUserId: 'host' } } };
      },
      post: async (url, body) => {
        if (body.invitees.length !== 1 || body.invitees[0] !== 'person') throw new Error('Expected one invitee');
        window.createdRow = { ...window.initialRows[0], ...body, _id: 'created', code: 'MEET-9999',
          scheduledAt: body.scheduledAt + ':00-07:00', createdAt: new Date().toISOString() };
        return { data: { data: { ...window.createdRow, meetings: [window.createdRow] } } };
      },
    };
  `);
  await fs.writeFile(path.join(temp, 'entry.tsx'), `
    import * as React from 'react';
    import { createRoot } from 'react-dom/client';
    import Lobby from ${JSON.stringify(path.join(root, 'src/app/(dashboard)/crm/suprah-meet/page.tsx'))};
    window.initialRows = Array.from({ length: 11 }, (_, index) => ({
      _id: 'existing-' + index, code: 'MEET-' + (1000 + index), title: 'Existing ' + index,
      status: 'scheduled', visibility: 'private', hostCrmUserId: 'host', invitees: ['person'],
      inviteAll: false, inviteDepartments: [], participants: [], seriesId: null,
      recording: { status: 'idle' }, createdAt: '2026-11-20T15:00:00Z',
      scheduledAt: window.sameTime ? '2026-11-20T15:00:00-07:00'
        : '2026-11-20T' + String(9 + Math.floor(index / 2)).padStart(2, '0') + ':' + (index % 2 ? '30' : '00') + ':00-07:00',
    }));
    createRoot(document.getElementById('root')).render(<Lobby />);
  `);
  const aliases = Object.fromEntries([
    'next/navigation', '@/lib/api-client', '@/components/suprah-meet/MeetSessionProvider',
    '@/context/CrmNotificationContext', '@/components/suprah-meet/MeetingSummaryPanel',
    '@/components/suprah-meet/MeetDeviceAlerts', '@/components/CrmCalendarConnect',
    '@/components/CrmCalendarSyncButton', '@/components/suprah-meet/MeetScheduleCleanup',
    '@/components/suprah-meet/ShareMeetingDialog',
  ].map(name => [name + '$', path.join(temp, 'stubs.tsx')]));
  await new Promise((resolve, reject) => {
    require('next/dist/compiled/webpack/webpack').webpack({
      mode: 'development', devtool: false, entry: path.join(temp, 'entry.tsx'),
      output: { path: temp, filename: 'bundle.js' },
      resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { ...aliases, '@': path.join(root, 'src') },
        modules: [path.join(root, 'node_modules'), 'node_modules'] },
      module: { rules: [{ test: /\.tsx?$/, use: path.join(temp, 'loader.cjs') }] },
    }, (error, stats) => error || stats.hasErrors()
      ? reject(error ?? new Error(stats.toString({ all: false, errors: true }))) : resolve());
  });
  const globals = await fs.readFile(path.join(root, 'src/app/globals.css'), 'utf8');
  const themeRules = [...globals.matchAll(/(?:^|\n)(?::root|\.dark|@theme inline)\s*\{[^}]*\}/g)]
    .map(match => match[0]).join('\n');
  const css = await require('postcss')([require('@tailwindcss/postcss')({ base: root })]).process(`
    @import "tailwindcss" source(none);
    @custom-variant dark (&:is(.dark *));
    @source "${path.join(root, 'src/app/(dashboard)/crm/suprah-meet/page.tsx').replaceAll('\\', '/')}";
    @source "${path.join(root, 'src/components/ui').replaceAll('\\', '/')}";
    ${themeRules}
    body { background: var(--background); color: var(--foreground); }
  `, { from: path.join(root, 'meet-scheduling-test.css') });
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const scenario of [
    'Today', 'Tomorrow', ...(width === 390 && theme === 'dark' ? ['Same time'] : []),
  ]) {
    const day = scenario === 'Same time' ? 'Today' : scenario;
    const page = await browser.newPage({ viewport: { width, height: 1000 }, timezoneId: 'Asia/Manila' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-11-20T15:00:00Z') });
    await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><main style="overflow-x:hidden"><div id="root"></div></main>');
    await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
    await page.evaluate(sameTime => { window.sameTime = sameTime; }, scenario === 'Same time');
    await page.addStyleTag({ content: css.css });
    await page.addScriptTag({ path: path.join(temp, 'bundle.js') });
    await page.getByText('Existing 0', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Create a schedule', exact: true }).click();
    await page.getByRole('button', { name: day, exact: true }).click();
    await page.locator('select').first().selectOption('15:00');
    await page.getByPlaceholder('Meeting title').fill('Two-person schedule');
    await page.getByRole('button', { name: /One teammate/ }).click();
    await page.evaluate(() => { window.holdNext = true; window.dispatchEvent(new Event('online')); });
    await page.waitForFunction(() => Boolean(window.resolveStale));
    await page.getByRole('button', { name: 'Schedule meeting', exact: true }).click();
    await page.getByRole('button', { name: 'Close sharing' }).click();
    const meeting = page.getByText('Two-person schedule', { exact: true });
    await meeting.waitFor({ state: 'visible' });
    if (day === 'Tomorrow') {
      assert.equal(await page.getByRole('button', { name: 'Future schedules (1)' }).getAttribute('aria-expanded'), 'true');
    } else {
      await page.getByText(scenario === 'Same time' ? 'Page 1 of 2' : 'Page 2 of 2', { exact: true }).waitFor();
    }
    await page.evaluate(() => window.resolveStale());
    await meeting.waitFor({ state: 'visible' });
    await page.waitForFunction(() => Boolean(window.rejectFresh));
    await page.evaluate(() => window.rejectFresh());
    await page.getByText('Refresh temporarily unavailable', { exact: true }).waitFor();
    await meeting.waitFor({ state: 'visible' });
    await page.evaluate(() => { window.dispatchEvent(new Event('online')); });
    await page.evaluate(() => window.resolveFresh());
    await meeting.waitFor({ state: 'visible' });
    await page.getByText('Refresh temporarily unavailable', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, theme, scenario, visible: true, staleRefreshIgnored: true, failedRefreshRetained: true }));
    await page.close();
  }
} finally {
  await browser?.close();
  if (path.dirname(temp) === path.resolve(os.tmpdir()) && path.basename(temp).startsWith('meet-scheduling-')) {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
