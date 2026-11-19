import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const webpack = require('next/dist/compiled/webpack/webpack').webpack;
const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(path.join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'notification-feeds-'));
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
    export const TestAuth = React.createContext(null);
    export const useAuth = () => React.useContext(TestAuth);
    export const useCrmToken = () => useAuth().crmToken;
    export const initializeSocket = () => window.testSocket;
    export const onSocketChange = () => () => {};
    export const dismissDeviceNotifications = () => {};
    export const playPingSound = () => { window.soundCount++; };
    export const playShiftAlertSound = playPingSound;
    export const resolveNotificationCategory = notice => notice.category || 'system';
  `);
  const popup = await fs.readFile(path.join(root, 'src/components/supraspace/ChatPopupManager.tsx'), 'utf8');
  const ast = ts.createSourceFile('popup.tsx', popup, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const memo = ast.statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(declaration => declaration.name.getText(ast) === 'PopupMessageContent'));
  assert.ok(memo);
  const fullSource = await fs.readFile(path.join(root, 'src/app/(chat)/supraspace/page.tsx'), 'utf8');
  const fullAst = ts.createSourceFile('page.tsx', fullSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const retryStatements = [];
  const visit = node => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration =>
      ['retryFailedSendActionRef', 'retryFailedSend'].includes(declaration.name.getText(fullAst)))) retryStatements.push(node.getText(fullAst));
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
      && node.expression.expression.getText(fullAst) === 'React.useLayoutEffect'
      && node.getText(fullAst).includes('retryFailedSendActionRef.current =')) retryStatements.push(node.getText(fullAst));
    ts.forEachChild(node, visit);
  };
  visit(fullAst);
  assert.equal(retryStatements.length, 3);
  await fs.writeFile(path.join(temp, 'entry.tsx'), `
    import * as React from 'react';
    import { createRoot } from 'react-dom/client';
    import { TestAuth } from './stubs';
    import { NotificationProvider, useNotifications } from ${JSON.stringify(path.join(root, 'src/context/NotificationContext.tsx'))};
    import { CrmNotificationProvider, useCrmNotificationContext } from ${JSON.stringify(path.join(root, 'src/context/CrmNotificationContext.tsx'))};
    import { MessageTimeline } from ${JSON.stringify(path.join(root, 'src/components/supraspace/messages/MessageTimeline.tsx'))};
    const listeners = new Map();
    window.testSocket = { on(event, handler) { const set = listeners.get(event) || new Set(); set.add(handler); listeners.set(event, set); },
      off(event, handler) { listeners.get(event)?.delete(handler); } };
    window.deliver = (event, payload) => listeners.get(event)?.forEach(handler => handler(payload));
    window.requests = []; window.soundCount = 0; window.parses = 0; window.hiddenFlag = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.hiddenFlag });
    window.fetch = url => new Promise(resolve => window.requests.push({ url, reply(data, status = 200) {
      resolve({ ok: status === 200, status, json: async () => ({ data }) });
    } }));
    const getToken = async () => 'main-token';
    const aliases = ['all'];
    const timelineMessages = [{ _id: 'history', createdAt: '2026-11-20T00:00:00Z', sender: { _id: 'sender' } }];
    const dateLabel = date => date.slice(0, 10), renderDateSeparator = () => null;
    window.timelineRenders = 0; window.retryBlocked = 0; window.retryAttempts = [];
    const renderContent = (message) => { window.parses++; return <span>{message.content}</span>; };
    ${memo.getText(ast)}
    function Probe() {
      const general = useNotifications(), crm = useCrmNotificationContext();
      window.refreshMain = general.fetchNotifications; window.refreshCrm = crm.fetchNotifications;
      const [draft, setDraft] = React.useState('');
      const inputTextRef = React.useRef(''), pendingFiles = [], pendingGif = null;
      const localAttachmentPreviewUrlsRef = React.useRef(new Set()), restoredFailedSendRef = React.useRef(null);
      const [, setFailedSends] = React.useState([]);
      const showUploadNotice = () => { window.retryBlocked++; };
      const handleSend = (_scheduledAt, item) => { window.retryAttempts.push({ draft: inputTextRef.current, id: item.id }); };
      ${retryStatements.join('\n')}
      const renderMessage = React.useCallback(() => {
        window.timelineRenders++;
        return <button id="retry" onClick={() => retryFailedSend({ id: 'failed', scheduledAt: null })}>Retry history message</button>;
      }, [retryFailedSend]);
      return <><output id="main">{JSON.stringify({ ids: general.notifications.map(n => n._id), unread: general.unreadCount, error: general.error })}</output>
        <output id="crm">{JSON.stringify({ ids: crm.notifications.map(n => n._id), unread: crm.unreadCount, error: crm.error })}</output>
        <input id="draft" value={draft} onChange={e => { inputTextRef.current = e.target.value; setDraft(e.target.value); }} />
        <MessageTimeline messages={timelineMessages} dateLabel={dateLabel} renderDateSeparator={renderDateSeparator} renderMessage={renderMessage} />
        <PopupMessageContent content="Unchanged rich message" type="text" isOwn={false} mentionAliases={aliases} /></>;
    }
    function App() {
      const [auth, setAuth] = React.useState({ isLoaded: true, isSignedIn: true, userId: 'user-a', orgId: 'org-a', crmToken: 'crm-a', getToken });
      window.changeAccount = signedIn => setAuth({ ...auth, isSignedIn: signedIn, userId: signedIn ? 'user-b' : null, crmToken: signedIn ? 'crm-b' : null });
      return <TestAuth.Provider value={auth}><NotificationProvider><CrmNotificationProvider><Probe /></CrmNotificationProvider></NotificationProvider></TestAuth.Provider>;
    }
    createRoot(document.getElementById('root')).render(<App />);
  `);
  const aliases = Object.fromEntries([
    '@/providers/AuthProvider', '@/hooks/useCrmToken', '@/lib/socket.client',
    '@/lib/web-push-subscription', '@/lib/notification-sound', '@/components/notifications/notification-utils',
  ].map(name => [name + '$', path.join(temp, 'stubs.tsx')]));
  await new Promise((resolve, reject) => {
    webpack({
      mode: 'development', devtool: false, entry: path.join(temp, 'entry.tsx'),
      plugins: [new webpack.DefinePlugin({ 'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('https://api.example.test') })],
      output: { path: temp, filename: 'bundle.js' },
      resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { ...aliases, '@': path.join(root, 'src') },
        modules: [path.join(root, 'node_modules'), 'node_modules'] },
      module: { rules: [{ test: /\.tsx?$/, use: path.join(temp, 'loader.cjs') }] },
    }, (error, stats) => error || stats.hasErrors()
      ? reject(error ?? new Error(stats.toString({ all: false, errors: true }))) : resolve());
  });
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  const page = await browser.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.clock.install();
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ path: path.join(temp, 'bundle.js') });
  await page.waitForFunction(() => window.requests?.length === 2);
  const state = async id => JSON.parse(await page.locator('#' + id).innerText());
  const count = () => page.evaluate(() => window.requests.length);
  await page.evaluate(() => window.requests.forEach(request => request.reply({ notifications: [], unreadCount: 0, total: 0 })));
  await page.waitForFunction(() => document.querySelector('#crm').textContent.includes('"unread":0'));
  await page.evaluate(() => {
    for (let i = 0; i < 25; i++) for (let repeat = 0; repeat < 2; repeat++) {
      window.deliver('crm:notification:new', { _id: 'crm-' + i, isRead: false, userId: 'crm-a', type: 'crm_message' });
      window.deliver('notification:new', { _id: 'main-' + i, isRead: false, userId: 'user-a', type: 'ping' });
    }
  });
  assert.equal((await state('crm')).unread, 25);
  await page.clock.runFor(300);
  assert.equal(await count(), 4);
  assert.equal(await page.evaluate(() => window.soundCount), 25);
  await page.evaluate(() => window.requests.slice(2).forEach(request => request.reply({ notifications: [], unreadCount: 25, total: 25 })));
  await page.locator('#draft').pressSequentially('typing without reparsing old messages');
  assert.equal(await page.evaluate(() => window.parses), 1);
  assert.equal(await page.evaluate(() => window.timelineRenders), 1);
  await page.locator('#retry').click();
  assert.equal(await page.evaluate(() => window.retryBlocked), 1);
  assert.equal(await page.evaluate(() => window.retryAttempts.length), 0);
  await page.locator('#draft').fill('');
  await page.locator('#retry').click();
  assert.deepEqual(await page.evaluate(() => window.retryAttempts), [{ draft: '', id: 'failed' }]);

  const stale = await count();
  await page.evaluate(() => { void window.refreshCrm({ limit: 0 }); void window.refreshCrm({ limit: 10 }); });
  await page.evaluate(index => window.requests[index + 1].reply({ notifications: [{ _id: 'latest', isRead: false }], unreadCount: 1, total: 1 }), stale);
  await page.waitForFunction(() => document.querySelector('#crm').textContent.includes('latest'));
  await page.evaluate(index => window.requests[index].reply({ notifications: [{ _id: 'stale' }], unreadCount: 999, total: 999 }), stale);
  assert.deepEqual((await state('crm')).ids, ['latest']);

  const pending = await count();
  await page.evaluate(() => { void window.refreshCrm(); window.changeAccount(true); });
  await page.waitForFunction(() => document.querySelector('#crm').textContent.includes('"unread":0'));
  await page.evaluate(index => window.requests[index].reply({ notifications: [{ _id: 'old-account' }], unreadCount: 999, total: 999 }), pending);
  assert.deepEqual((await state('crm')).ids, []);
  await page.clock.runFor(50);
  await page.waitForFunction(index => window.requests.length === index + 3, pending);
  await page.evaluate(index => window.requests.slice(index + 1).forEach(request => request.reply({
    notifications: [{ _id: 'to-delete', isRead: false, userId: request.url.includes('/crm/') ? 'crm-b' : 'user-b' }], unreadCount: 1, total: 1,
  })), pending);
  await page.waitForFunction(() => document.querySelector('#main').textContent.includes('to-delete'));
  await page.evaluate(() => { window.deliver('notification:deleted', { notificationId: 'to-delete' }); window.deliver('crm:notification:deleted', { notificationId: 'to-delete' }); });
  assert.deepEqual((await state('main')).ids, []);
  assert.deepEqual((await state('crm')).ids, []);

  const beforeHidden = await count();
  await page.evaluate(() => { window.hiddenFlag = true; document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(60_000);
  assert.equal(await count(), beforeHidden);
  await page.evaluate(() => { window.hiddenFlag = false; document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(50);
  assert.equal(await count(), beforeHidden + 2);
  await page.evaluate(index => window.requests.slice(index).forEach(request => request.reply({}, 500)), beforeHidden);
  await page.waitForFunction(() => document.querySelector('#crm').textContent.includes('Failed to load'));
  await page.clock.runFor(20_000);
  assert.equal(await count(), beforeHidden + 2);
  await page.clock.runFor(20_050);
  assert.equal(await count(), beforeHidden + 4);
  await page.evaluate(() => window.changeAccount(false));
  await page.waitForFunction(() => document.querySelector('#crm').textContent.includes('"unread":0'));
  await page.evaluate(index => window.requests.slice(index + 2).forEach(request => request.reply({
    notifications: [{ _id: 'signed-out-account' }], unreadCount: 999, total: 999,
  })), beforeHidden);
  assert.deepEqual((await state('crm')).ids, []);
  assert.deepEqual((await state('main')).ids, []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ burstEvents: 100, refreshRequests: 2, duplicateSoundPrevented: true,
    staleResponseIgnored: true, logoutProtected: true, crossClientDeletion: true, hiddenPollingPaused: true,
    backoffHonored: true, unchangedMessageParses: 1, unchangedTimelineRenders: 1, draftRetryGuardPreserved: true }));
} finally {
  await browser?.close();
  if (path.dirname(temp) === path.resolve(os.tmpdir()) && path.basename(temp).startsWith('notification-feeds-')) {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
