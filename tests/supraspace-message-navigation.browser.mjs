import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const engines = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href : 'playwright');
const source = fs.readFileSync(new URL('../src/lib/supraspace-message-navigation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import .*;$/gm, '').replace(/export /g, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const browser = await engines[process.env.PLAYWRIGHT_BROWSER || 'chromium'].launch({ headless: true });
try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(`<div id="chat" style="height:400px;overflow:auto;scroll-behavior:smooth">
      <div id="earlier" style="height:1200px"></div><div id="target" style="min-height:1600px;background:purple;color:white">
      <div style="height:1250px">Long formatted message</div><b>needle</b><i> match</i>
      </div><div style="height:1000px"></div></div>`);
    await page.addScriptTag({ content: compiled });
    const result = await page.evaluate(async () => {
      const chat = document.getElementById('chat');
      const target = document.getElementById('target');
      const beforeHtml = target.innerHTML;
      window.cleanupReveal = revealSupraSpaceMessage(target, chat, 'needle match');
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const visible = () => {
        const rect = target.querySelector('b').getBoundingClientRect();
        const bounds = chat.getBoundingClientRect();
        return rect.top >= bounds.top && rect.bottom <= bounds.bottom;
      };
      const first = visible();
      const highlighted = CSS.highlights.has('ss4-search-match');
      document.getElementById('earlier').style.height = '1800px';
      await new Promise(resolve => setTimeout(resolve, 100));
      const shifted = visible();
      chat.dispatchEvent(new WheelEvent('wheel'));
      chat.scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('earlier').style.height = '2000px';
      await new Promise(resolve => setTimeout(resolve, 100));
      const released = chat.scrollTop === 0;
      const excerpt = supraSpaceSearchExcerpt('prefix '.repeat(500) + 'NEEDLE match end', 'needle match');
      const literal = supraSpaceSearchExcerpt('Symbols [test].* end', '[test].*');
      const requests = [];
      const loaded = await loadSupraSpaceMessageTarget(async (path, params) => {
        requests.push({ path, params });
        return { data: { data: params?.history ? { _id: 'exact', createdAt: '2026-10-29T00:00:00.000Z' } : params ? [{ _id: 'older', createdAt: '2026-01-01' }] : { _id: 'exact', createdAt: '2026-10-29T00:00:00.000Z' } } };
      }, 'conversation', 'exact', [{ _id: 'exact', createdAt: '2026-10-29T00:00:00.000Z' }]);
      return { first, shifted, highlighted, released, intact: target.innerHTML === beforeHtml,
        excerpt, literal, requests, ids: loaded.messages.map(message => message._id) };
    });
    assert.equal(result.first, true, 'matching text near the end of a long message is visible');
    assert.equal(result.shifted, true, 'late media above the target cannot displace it');
    assert.equal(result.highlighted, true, 'rich text receives a non-destructive search highlight');
    assert.equal(result.intact, true, 'React-owned rich message DOM stays intact');
    assert.equal(result.released, true, 'user scroll releases the destination hold');
    assert.equal(result.excerpt.find(part => part.match)?.text, 'NEEDLE match');
    assert.ok(result.excerpt.map(part => part.text).join('').length < 400);
    assert.equal(result.literal.find(part => part.match)?.text, '[test].*');
    assert.deepEqual(result.ids, ['older', 'exact']);
    assert.equal(result.requests[0].path, '/api/supraspace/conversations/conversation/messages/exact');
    assert.equal(result.requests[1].params.beforeId, 'exact', 'same-time messages use the exact cursor');
    await page.close();
  }
  const historyPage = await browser.newPage();
  await historyPage.addScriptTag({ content: compiled });
  const history = await historyPage.evaluate(async () => {
    const data = Array.from({ length: 351 }, (_, index) => ({ _id: String(index).padStart(24, '0'), createdAt: '2026-10-29T00:00:00.000Z' }));
    const get = async (_path, params) => ({ data: { data: params?.history ? data[40]
      : data.filter(message => !params.beforeId || message._id < params.beforeId).slice(-params.limit) } });
    const loaded = await loadSupraSpaceMessageTarget(get, 'conversation', data[40]._id, data.slice(-40));
    let current = true;
    let calls = 0;
    let cancelled = false;
    try {
      await loadSupraSpaceMessageTarget(async (path, params) => {
        calls++;
        if (calls === 3) current = false;
        return get(path, params);
      }, 'conversation', data[40]._id, data.slice(-40), () => current);
    } catch { cancelled = true; }
    return { ids: loaded.messages.map(message => message._id), hasOlder: loaded.hasOlder, cancelled, calls };
  });
  assert.equal(history.ids.length, 350, 'the fetched window bridges every intervening message to the cached newest row');
  assert.equal(history.ids[0], '0'.padStart(24, '0'));
  assert.equal(history.ids.at(-1), '349'.padStart(24, '0'));
  assert.equal(history.hasOlder, false);
  assert.equal(history.cancelled, true, 'superseded jumps stop history pagination');
  assert.equal(history.calls, 3);
  await historyPage.close();
  const page = await browser.newPage();
  page.on('pageerror', error => console.error('Browser error:', error.message));
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: 'window.process = {env:{NODE_ENV:"development"}}; window.modules = {}; window.require = name => window.modules[name];' });
  for (const [name, file] of [
    ['react', 'react/cjs/react.development.js'],
    ['scheduler', 'scheduler/cjs/scheduler.development.js'],
    ['react-dom', 'react-dom/cjs/react-dom.development.js'],
    ['react-dom/client', 'react-dom/cjs/react-dom-client.development.js'],
  ]) {
    const code = fs.readFileSync(new URL(`../node_modules/${file}`, import.meta.url), 'utf8');
    await page.addScriptTag({ content: `(function(){const module={exports:{}};const exports=module.exports;${code}\nwindow.modules[${JSON.stringify(name)}]=module.exports;})();` });
  }
  const hookSource = fs.readFileSync(new URL('../src/components/supraspace/useMessageSearch.ts', import.meta.url), 'utf8');
  const hook = ts.transpileModule(hookSource.replace(/^import .*;$/gm, '').replace(/export /g, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  await page.addScriptTag({ content: `
    const React = require('react');
    window.requests = [];
    const apiClient = {get: (path, config) => new Promise((resolve,reject) => requests.push({path,config,resolve,reject}))};
    ${hook}
    const root = require('react-dom/client').createRoot(document.getElementById('root'));
    function Harness({query}) {window.search = useMessageSearch('token', query, 'conversation'); return null;}
    window.renderSearch = query => root.render(React.createElement(Harness, {query}));
    renderSearch('old');
  ` });
  await page.waitForFunction(() => requests.length === 1);
  await page.evaluate(() => renderSearch('new'));
  await page.waitForFunction(() => requests.length === 2);
  await page.evaluate(() => requests[1].resolve({ data: { data: [{ _id: 'new' }], nextCursor: { before: '2026-10-29', beforeId: 'new' } } }));
  await page.waitForFunction(() => search.results[0]?._id === 'new' && !search.searching);
  await page.evaluate(() => requests[0].resolve({ data: { data: [{ _id: 'stale' }] } }));
  await page.waitForTimeout(50);
  assert.deepEqual(await page.evaluate(() => search.results.map(message => message._id)), ['new'], 'late responses cannot replace the current query');
  await page.evaluate(() => { search.loadMore(); search.loadMore(); });
  assert.equal(await page.evaluate(() => requests.length), 3, 'duplicate pagination clicks send only one request');
  assert.equal(await page.evaluate(() => requests[2].config.params.beforeId), 'new');
  await page.evaluate(() => requests[2].reject(new Error('network')));
  await page.waitForFunction(() => search.error && !search.searching);
  assert.deepEqual(await page.evaluate(() => search.results.map(message => message._id)), ['new'], 'failed pagination preserves existing results');
  await page.evaluate(() => search.loadMore());
  assert.equal(await page.evaluate(() => requests.length), 4);
  await page.evaluate(() => requests[3].resolve({ data: { data: [{ _id: 'new' }, { _id: 'older' }], nextCursor: null } }));
  await page.waitForFunction(() => search.results.length === 2);
  assert.deepEqual(await page.evaluate(() => search.results.map(message => message._id)), ['new', 'older'], 'pages append and deduplicate');
  assert.equal(await page.evaluate(() => search.hasMore), false);
  // Mount the actual full-page and Mini navigation handlers with real React
  // commits. Only the surrounding app providers and network are substituted.
  const fullSource = fs.readFileSync(new URL('../src/app/(chat)/supraspace/page.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const miniSource = fs.readFileSync(new URL('../src/components/supraspace/ChatPopupManager.tsx', import.meta.url), 'utf8');
  const fullEffect = fullSource.slice(fullSource.indexOf('  React.useLayoutEffect(() => {\n    const target = pendingNotificationTargetRef.current;'), fullSource.indexOf('\n  const targetUserId'));
  const fullJump = fullSource.slice(fullSource.indexOf('  const jumpToMessage = React.useCallback('), fullSource.indexOf('\n  const togglePinConv'));
  const fullLatest = fullSource.slice(fullSource.indexOf('  const scrollToLatest = React.useCallback('), fullSource.indexOf('\n  const lockConversationOpenToBottom'));
  assert.ok(fullEffect.includes('loadSupraSpaceMessageTarget'), 'mount the actual full-page navigation effect');
  const miniHandlers = miniSource.slice(miniSource.indexOf('  const popupMessagesRef = React.useRef(messages);'), miniSource.indexOf('\n  const stageFiles'));
  const merger = fs.readFileSync(new URL('../src/components/supraspace/messages/message-state.ts', import.meta.url), 'utf8');
  const harness = `
    ${source.replace(/^import .*;$/gm, '').replace(/export /g, '')}
    ${merger.replace(/^import .*;$/gm, '').replace(/export /g, '')}
    const toast = {error: message => {window.navigationErrors.push(message)}};
    window.navigationErrors = [];
    window.fixtures = Array.from({length:241}, (_,i) => ({_id:String(i).padStart(24,'0'),createdAt:'2026-10-29T00:00:00.000Z',content:'Message '+i}));
    window.blockedId = null;
    apiClient.get = async (path, config) => {
      const params = config?.params;
      if (params && !params.history) return {data:{data: fixtures.filter(message => !params.beforeId || message._id < params.beforeId).slice(-params.limit)}};
      const id = path.split('/').at(-1);
      if (id === window.blockedId) await new Promise(resolve => {window.releaseBlocked = resolve});
      const message = fixtures.find(message => message._id === id);
      if (!message) throw new Error('Not found');
      return {data:{data:message}};
    };
    function FullHarness() {
      const [activeId,setActiveId] = React.useState('full');
      const activeIdRef = React.useRef(activeId); activeIdRef.current=activeId;
      const [msgs,setMsgs] = React.useState({full:fixtures.slice(101,141)});
      const msgsRef=React.useRef(msgs); msgsRef.current=msgs;
      const [hasMore,setHasMore]=React.useState({full:true});
      const [messageTargetRequest,setMessageTargetRequest]=React.useState(0);
      const [messageTargetLoading,setMessageTargetLoading]=React.useState(null);
      const pendingNotificationTargetRef=React.useRef(null);
      const notificationTargetFetchesRef=React.useRef(new Set());
      const messageRevealCleanupRef=React.useRef(null);
      const pendingScrollRestoreRef=React.useRef(null);
      const suppressAutoScrollOnceRef=React.useRef(false);
      const tokenRef=React.useRef('token');
      const messageScrollRef=React.useRef(null);
      const loadingMsgs=false,loadingOlderMessages=false;
      const forceScrollToBottomRef=React.useRef(null),openBottomLockUntilRef=React.useRef(0);
      const setShowJumpToLatest=()=>{};
      ${fullLatest}
      const cancelOpenBottomLock=React.useCallback(()=>{},[]);
      const setPinnedModalOpen=()=>{},setShowInfo=()=>{};
      ${fullEffect}
      ${fullJump}
      window.fullNav={jump:jumpToMessage,latest:scrollToLatest,setActiveId,msgs,activeId,loading:messageTargetLoading,hasMore};
      return React.createElement('div',{id:'full-chat',ref:messageScrollRef,style:{height:300,overflow:'auto'}},(msgs[activeId]||[]).map(message=>React.createElement('div',{id:'ss4-msg-'+message._id,key:message._id,style:{height:100}},message.content)));
    }
    function MiniHarness({id}) {
      const conv=React.useMemo(()=>({_id:id}),[id]),crmToken='token',isMinimized=false,loading=false;
      const [messages,setMessages]=React.useState(fixtures.slice(101,141));
      const bottomRef=React.useRef(null);
      ${miniHandlers}
      React.useEffect(()=>{if(!popupNavigatingRef.current)bottomRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);
      window.miniNav[id]={jump:jumpToPopupRepliedMessage,messages,loading:popupTargetLoading};
      return React.createElement('div',{id,style:{height:220,overflow:'auto'}},messages.map(message=>React.createElement('div',{'data-popup-bubble-id':message._id,key:message._id,style:{height:100}},message.content)),React.createElement('div',{ref:bottomRef}));
    }
    window.miniNav={};
    root.render(React.createElement(React.Fragment,null,React.createElement(FullHarness),React.createElement(MiniHarness,{id:'mini-one'}),React.createElement(MiniHarness,{id:'mini-two'})));
  `;
  await page.addScriptTag({ content: ts.transpileModule(harness, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText });
  await page.waitForFunction(() => window.fullNav && window.miniNav['mini-one']);
  const id = number => String(number).padStart(24, '0');
  await page.evaluate(target => fullNav.jump(target), id(40));
  await page.waitForFunction(target => fullNav.msgs.full.some(message => message._id === target) && !fullNav.loading, id(40), { timeout: 5000 }).catch(async error => {
    console.error(await page.evaluate(() => ({ count: fullNav.msgs.full.length, loading: fullNav.loading, errors: navigationErrors })));
    throw error;
  });
  assert.equal(await page.evaluate(() => fullNav.msgs.full.length), 141, 'full-page jump retains all intervening history');
  const visibleTarget = async (containerId, target, mini = false) => page.evaluate(({ containerId, target, mini }) => {
    const container = document.getElementById(containerId);
    const node = mini ? container.querySelector('[data-popup-bubble-id="'+target+'"]') : document.getElementById('ss4-msg-'+target);
    const row = node?.getBoundingClientRect(), bounds = container.getBoundingClientRect();
    return !!row && row.top >= bounds.top && row.bottom <= bounds.bottom;
  }, { containerId, target, mini });
  assert.equal(await visibleTarget('full-chat', id(40)), true);
  await page.evaluate(target => { window.blockedId=target; fullNav.jump(target); }, id(220));
  await page.waitForFunction(() => !!window.releaseBlocked);
  await page.evaluate(target => fullNav.jump(target), id(110));
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => fullNav.loading), null, 'cached reselect clears the obsolete loading indicator');
  assert.equal(await visibleTarget('full-chat', id(110)), true, 'cached reselect does not wait on a different pending jump');
  await page.evaluate(() => releaseBlocked());
  await page.waitForTimeout(80);
  assert.equal(await visibleTarget('full-chat', id(110)), true, 'late superseded request cannot steal the destination');
  await page.evaluate(target => { window.releaseBlocked=null; window.blockedId=target; fullNav.jump(target); }, id(230));
  await page.waitForFunction(() => !!window.releaseBlocked);
  await page.evaluate(() => fullNav.setActiveId('other'));
  await page.waitForFunction(() => fullNav.activeId === 'other');
  await page.evaluate(() => releaseBlocked());
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(target => fullNav.msgs.full.some(message => message._id === target), id(230)), false, 'leaving the conversation cancels its pending jump');
  await page.evaluate(() => { window.blockedId=null; fullNav.setActiveId('full'); });
  await page.waitForFunction(() => fullNav.activeId === 'full');
  await page.evaluate(target => fullNav.jump(target), id(200));
  await page.waitForFunction(() => fullNav.msgs.full.length === 201 && !fullNav.loading);
  assert.equal(await visibleTarget('full-chat', id(200)), true, 'newer search hits beyond stale cache also bridge history');
  await page.evaluate(target => { window.releaseBlocked=null; window.blockedId=target; fullNav.jump(target); }, id(235));
  await page.waitForFunction(() => !!window.releaseBlocked);
  await page.evaluate(() => fullNav.latest('auto'));
  await page.evaluate(() => releaseBlocked());
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(target => fullNav.msgs.full.some(message => message._id === target), id(235)), false, 'Jump to latest cancels a pending distant jump');
  await page.evaluate(target => { window.blockedId=null; miniNav['mini-one'].jump(target); }, id(40));
  await page.waitForFunction(() => miniNav['mini-one'].messages.length === 141 && !miniNav['mini-one'].loading);
  assert.equal(await visibleTarget('mini-one', id(40), true), true);
  assert.equal(await page.evaluate(() => miniNav['mini-two'].messages.length), 40, 'another popup is not modified');
  await page.evaluate(target => miniNav['mini-two'].jump(target), id(110));
  await page.waitForTimeout(80);
  assert.equal(await visibleTarget('mini-two', id(110), true), true, 'cached Mini jump resolves inside its own popup');
  assert.equal(await visibleTarget('mini-one', id(40), true), true, 'second popup cannot move the first popup');
  assert.deepEqual(await page.evaluate(() => navigationErrors), []);
  const modalSource = fs.readFileSync(new URL('../src/components/supraspace/MessageSearchModal.tsx', import.meta.url), 'utf8');
  const modalHarness = `
    const createPortal = require('react-dom').createPortal;
    const getSupraSpaceMessagePreviewText = content => content || '';
    ${modalSource.replace(/^import .*;$/gm, '').replace(/export /g, '')}
    fixtures[240].content = 'prefix '.repeat(500) + 'needle match';
    apiClient.get = async () => ({data:{data:[fixtures[240]],nextCursor:null}});
    function ModalHarness() {
      const [open,setOpen] = React.useState(true);
      return open ? React.createElement(MessageSearchModal,{conversationId:'mini',token:'token',onClose:()=>setOpen(false),onSelect:(message,query)=>{window.selectedSearch={id:message._id,query};setOpen(false);}}) : null;
    }
    root.render(React.createElement(ModalHarness));
  `;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addScriptTag({ content: ts.transpileModule(modalHarness, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, jsx: ts.JsxEmit.React } }).outputText });
  await page.getByRole('searchbox', { name: 'Search messages' }).fill('needle match');
  await page.waitForFunction(() => !!document.querySelector('[role="dialog"] mark'));
  assert.equal(await page.locator('[role="dialog"] mark').innerText(), 'needle match');
  const bounds = await page.getByRole('dialog').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390, 'Mini search modal fits a phone viewport');
  await page.getByRole('button').filter({ hasText: 'needle match' }).click();
  await page.waitForFunction(() => !!window.selectedSearch);
  assert.deepEqual(await page.evaluate(() => selectedSearch), { id: id(240), query: 'needle match' });
  assert.equal(await page.getByRole('dialog').count(), 0, 'choosing the Mini result dismisses the search overlay');
  await page.close();
  console.log('Message navigation and search browser checks passed: desktop/mobile, long rich text, layout shifts, highlight, exact-ID loading, stale responses, pagination, retry.');
} finally { await browser.close(); }
