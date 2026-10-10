import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright');
const origin = process.env.RECORDING_PREVIEW_URL || 'http://127.0.0.1:3011';
const screenshots = process.env.RECORDING_SCREENSHOTS;
const permissions = ['view', 'download', 'share', 'review', 'control', 'delete'];
const staff = [
  { id: '1', kind: 'crm', name: 'Alex Morgan', email: 'alex@example.com', role: 'manager', department: 'Sales' },
  { id: '2', kind: 'crm', name: 'Blair Taylor', email: 'blair@example.com', role: 'employee', department: 'Quality' },
  { id: '3', kind: 'crm', name: 'Casey Rivera', email: 'casey@example.com', role: 'employee', department: 'Service' },
  { id: '4', kind: 'crm', name: 'Drew Jordan', email: 'drew@example.com', role: 'manager', department: 'Operations' },
  { id: '5', kind: 'main', name: 'Emery Quinn', email: 'emery@example.com', role: 'employee', department: 'Sales' },
  { id: '6', kind: 'crm', name: 'Finley Avery', email: 'finley@example.com', role: 'employee', department: 'Quality' },
  { id: '7', kind: 'main', name: 'Gray A Very Long Employee Name That Still Must Fit', email: 'gray@example.com', role: 'employee', department: 'Title and Licensing' },
  ...Array.from({ length: 48 }, (_, index) => ({ id: `team-${index}`, kind: 'crm', name: `Team member ${String(index).padStart(2, '0')}`, email: `team${index}@example.com`, role: 'employee', department: 'Reception' })),
];
const baseGrants = [
  { principalId: '1', principalKind: 'crm', permissions },
  { principalId: '2', principalKind: 'crm', permissions: ['view', 'review', 'download', 'share'] },
  { principalId: '3', principalKind: 'crm', permissions: ['view'] },
  { principalId: '4', principalKind: 'crm', permissions: ['view', 'review', 'download', 'share', 'control'] },
  { principalId: '5', principalKind: 'main', permissions: ['control'] },
  { principalId: '6', principalKind: 'crm', permissions: [] },
];
async function fits(page, locator, label) {
  const bounds = await locator.boundingBox();
  const viewport = page.viewportSize();
  assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, label);
}
async function screenshot(page, name) {
  if (!screenshots) return;
  fs.mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: !name.endsWith('-custom') && !name.endsWith('-grant'), animations: 'disabled' });
}
async function swipeEmployeeList(context, list, direction) {
  const bounds = await list.boundingBox();
  assert(bounds);
  const session = await context.newCDPSession(list.page());
  const x = Math.round(bounds.x + bounds.width / 2);
  const start = bounds.y + bounds.height * (direction === 'down' ? 0.8 : 0.2);
  const end = bounds.y + bounds.height * (direction === 'down' ? 0.2 : 0.8);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start + (end - start) * step / 8 }] });
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [label, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844], ['narrow', 320, 740]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let grants = structuredClone(baseGrants);
      let puts = 0; let gets = 0; let fail = false; let delay = 0; let lastInput;
      await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': '*' };
        if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
        if (url.pathname.endsWith('/recording-settings')) {
          gets++;
          await route.fulfill({ json: { data: { staff, permissions, grants, policies: [] } }, headers });
        } else if (url.pathname.endsWith('/recording-grants')) {
          puts++; lastInput = request.postDataJSON();
          if (delay) await new Promise(resolve => setTimeout(resolve, delay));
          if (fail) { await route.fulfill({ status: 503, json: { message: 'Unable to save access. Please try again.' }, headers }); return; }
          grants = grants.filter(g => g.principalId !== lastInput.principalId || g.principalKind !== lastInput.principalKind);
          grants.push(lastInput);
          await route.fulfill({ json: { data: { saved: true } }, headers });
        } else throw new Error(`Unexpected API request: ${url.pathname}`);
      });
      await page.goto(`${origin}/crm/settings/call-recording`);
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
      const section = page.getByRole('region', { name: 'Recording Permissions' });
      await section.getByText('5 employees with recording access', { exact: true }).waitFor();
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      assert.equal(await section.locator('article').count(), 5);
      assert.equal(await section.getByRole('checkbox').count(), 0);
      assert.equal(await section.getByText('Finley Avery', { exact: true }).count(), 0);
      const search = section.getByRole('textbox', { name: 'Search employees with recording access' });
      for (const [query, total] of [['Quality', 1], ['casey@', 1], ['manager', 2], ['not here', 0]]) {
        await search.fill(query); assert.equal(await section.locator('article').count(), total);
      }
      await search.fill('');
      for (const level of ['Viewer', 'QA/Reviewer', 'Full Access', 'Custom']) {
        await section.getByRole('combobox', { name: 'Access Level filter' }).selectOption(level);
        assert.equal(await section.locator('article').count(), level === 'Custom' ? 2 : 1);
      }
      await section.getByRole('combobox', { name: 'Access Level filter' }).selectOption('all');
      assert.equal(await section.getByRole('combobox', { name: 'Access Level filter' }).locator('option[value="Manager"]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${label} list overflow`);
      await screenshot(page, `permissions-${label}-list`);
      async function edit(name) {
        await section.getByRole('button', { name: `Access options for ${name}`, exact: true }).click();
        await fits(page, page.getByRole('menu'), `${label} menu overflow`);
        await page.getByRole('menuitem', { name: 'Edit access', exact: true }).click();
        await page.getByRole('dialog', { name: /^Edit access -/ }).waitFor();
        return page.getByRole('dialog', { name: /^Edit access -/ });
      }
      let dialog = await edit('Blair Taylor');
      assert.equal(await dialog.getByRole('radio', { name: /^QA\/Reviewer/ }).isChecked(), true);
      assert.equal(await dialog.getByRole('radio', { name: /^Manager/ }).count(), 0);
      await dialog.getByRole('radio', { name: /^Full Access/ }).check();
      assert.equal(puts, 0);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      dialog = await edit('Drew Jordan');
      assert.equal(await dialog.getByRole('radio', { name: 'Custom', exact: true }).isChecked(), true);
      assert.equal(await dialog.getByRole('checkbox').count(), 6);
      assert.equal(await dialog.getByRole('checkbox', { name: 'Pause / Resume recording', exact: true }).isChecked(), true);
      assert.equal(await dialog.getByRole('checkbox', { name: 'Delete recordings Sensitive', exact: true }).isChecked(), false);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      dialog = await edit('Emery Quinn');
      assert.equal(await dialog.getByRole('radio', { name: /^Custom/ }).isChecked(), true);
      assert.equal(await dialog.getByRole('checkbox', { name: 'Listen to recordings', exact: true }).isChecked(), false);
      assert.equal(await dialog.getByRole('checkbox', { name: 'Pause / Resume recording', exact: true }).isChecked(), true);
      await dialog.getByRole('checkbox', { name: 'Download recordings', exact: true }).check();
      const customToggle = dialog.getByRole('button', { name: 'Custom permissions', exact: true });
      for (let index = 0; index < 3; index++) {
        await customToggle.click();
        assert.equal(await customToggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await dialog.getByRole('checkbox').count(), 0);
        assert.equal(await dialog.getByRole('radio', { name: 'Custom', exact: true }).isChecked(), true);
        await customToggle.press('Enter');
        assert.equal(await customToggle.getAttribute('aria-expanded'), 'true');
        assert.equal(await dialog.getByRole('checkbox', { name: 'Download recordings', exact: true }).isChecked(), true);
        assert.equal(await dialog.getByRole('checkbox', { name: 'Pause / Resume recording', exact: true }).isChecked(), true);
      }
      assert.equal(puts, 0);
      await dialog.getByRole('checkbox', { name: 'Delete recordings Sensitive', exact: true }).scrollIntoViewIfNeeded();
      await fits(page, dialog.getByRole('checkbox', { name: 'Delete recordings Sensitive', exact: true }), `${label} custom permission scrolling`);
      await fits(page, dialog, `${label} custom dialog overflow`);
      await fits(page, dialog.getByRole('button', { name: 'Save access', exact: true }), `${label} sticky save overflow`);
      await screenshot(page, `permissions-${label}-custom`);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await section.getByRole('button', { name: 'Grant Access', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Grant Recording Access', exact: true });
      await dialog.getByRole('combobox', { name: 'Select employee' }).click();
      const employeeList = page.locator('[data-slot="command-list"]');
      const dialogBody = page.locator('[data-slot="dialog-content"] form > div').first();
      const dialogScroll = await dialogBody.evaluate(element => element.scrollTop);
      await employeeList.hover();
      await page.mouse.wheel(0, 400);
      await page.waitForFunction(() => document.querySelector('[data-slot="command-list"]').scrollTop > 0, null, { timeout: 2000 });
      const scrolledDown = await employeeList.evaluate(element => element.scrollTop);
      await page.mouse.wheel(0, -400);
      await page.waitForFunction(previous => document.querySelector('[data-slot="command-list"]').scrollTop < previous, scrolledDown, { timeout: 2000 });
      assert.equal(await dialogBody.evaluate(element => element.scrollTop), dialogScroll, 'employee scrolling must not scroll the access form');
      if (width < 600) {
        const beforeTouch = await employeeList.evaluate(element => element.scrollTop);
        await swipeEmployeeList(context, employeeList, 'down');
        await page.waitForFunction(previous => document.querySelector('[data-slot="command-list"]').scrollTop > previous, beforeTouch, { timeout: 2000 });
        const touchDown = await employeeList.evaluate(element => element.scrollTop);
        await swipeEmployeeList(context, employeeList, 'up');
        await page.waitForFunction(previous => document.querySelector('[data-slot="command-list"]').scrollTop < previous, touchDown, { timeout: 2000 });
      }
      await fits(page, page.locator('[data-slot="popover-content"][data-state="open"]'), `${label} long employee list overflow`);
      await screenshot(page, `permissions-${label}-employee-picker`);
      await page.keyboard.press('Escape');
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('combobox', { name: 'Select employee' }).getAttribute('aria-expanded'), 'false');
      await dialog.getByRole('combobox', { name: 'Select employee' }).click();
      const employeeSearch = page.getByRole('combobox', { name: 'Search employees to grant access' });
      await employeeSearch.fill('quality');
      await fits(page, page.locator('[data-slot="popover-content"][data-state="open"]'), `${label} employee selector overflow`);
      assert.equal(await page.getByRole('option').count(), 1);
      assert.equal(await page.getByRole('option').getByText('Blair Taylor').count(), 0);
      await page.getByRole('option').filter({ hasText: 'Finley Avery' }).click();
      await dialog.getByRole('radio', { name: /^Custom/ }).check();
      await dialog.getByRole('checkbox', { name: 'Download recordings', exact: true }).check();
      assert.equal(puts, 0);
      fail = true; delay = 300;
      const initialGets = gets;
      await dialog.getByRole('button', { name: 'Save access', exact: true }).click();
      await dialog.getByRole('button', { name: 'Saving...', exact: true }).waitFor();
      assert.equal(await dialog.getByRole('button', { name: 'Saving...', exact: true }).isDisabled(), true);
      await page.keyboard.press('Escape');
      await dialog.getByRole('alert').waitFor();
      assert.match(await dialog.getByRole('alert').innerText(), /Please try again/);
      assert.equal(await dialog.getByRole('checkbox', { name: 'Download recordings', exact: true }).isChecked(), true);
      assert.equal(puts, 1);
      fail = false;
      await dialog.getByRole('button', { name: 'Save access', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await section.getByText('6 employees with recording access', { exact: true }).waitFor();
      assert.equal(puts, 2);
      assert.equal(gets, initialGets, 'save must update cache without a settings refetch');
      assert.deepEqual(lastInput.permissions, ['view', 'download']);
      dialog = await edit('Finley Avery');
      assert.equal(await dialog.getByRole('radio', { name: /^Custom/ }).isChecked(), true);
      await dialog.getByRole('radio', { name: /^Viewer/ }).check();
      await dialog.getByRole('button', { name: 'Save access', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(puts, 3);
      dialog = await edit('Finley Avery');
      assert.equal(await dialog.getByRole('radio', { name: /^Viewer/ }).isChecked(), true);
      await dialog.getByRole('button', { name: 'Remove recording access', exact: true }).click();
      const confirm = page.getByRole('alertdialog');
      await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(puts, 3);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await section.getByRole('button', { name: 'Access options for Finley Avery', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Remove access', exact: true }).click();
      fail = true;
      await confirm.getByRole('button', { name: 'Remove access', exact: true }).click();
      await confirm.getByRole('alert').waitFor();
      assert.equal(puts, 4);
      fail = false;
      await confirm.getByRole('button', { name: 'Remove access', exact: true }).click();
      await confirm.waitFor({ state: 'hidden' });
      await section.getByText('5 employees with recording access', { exact: true }).waitFor();
      assert.deepEqual(lastInput.permissions, []);
      assert.equal(puts, 5);
      assert.equal(await section.getByText('Finley Avery', { exact: true }).count(), 0);
      await section.getByRole('button', { name: 'Grant Access', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Grant Recording Access', exact: true });
      await dialog.getByRole('combobox', { name: 'Select employee' }).click();
      await page.getByRole('combobox', { name: 'Search employees to grant access' }).fill('licensing');
      await page.getByRole('option').filter({ hasText: 'Gray' }).click();
      await fits(page, dialog, `${label} long employee name overflow`);
      await fits(page, dialog.getByRole('button', { name: 'Save access', exact: true }), `${label} grant footer overflow`);
      await screenshot(page, `permissions-${label}-grant`);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.getByRole('button', { name: 'Add policy', exact: true }).click();
      assert.equal(await page.getByRole('switch', { name: 'Recording enabled' }).isChecked(), false);
      assert.equal(await page.getByRole('spinbutton', { name: 'Retention (calendar months)' }).inputValue(), '6');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      results.push({ viewport: label, width, access: 'search/filter/grant/edit/custom/remove/retry passed; Manager absent; old grants preserved', scrolling: width < 600 ? 'wheel and touch up/down passed' : 'wheel up/down passed', custom: 'repeated click/keyboard collapse preserves selections', mutations: puts, cache: 'no permission-save refetch', layout: 'no overflow; internal dialog scroll and visible footer' });
      await context.close();
    }
    process.stdout.write(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });
