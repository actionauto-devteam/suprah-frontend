import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Run the actual page components with controlled hooks, API responses and timers.
// This verifies transitions; camera permissions and browser media still need device QA.
function roomHarness(guest = false) {
  const relative = guest ? '../src/app/(dashboard)/meet/[code]/page.tsx'
    : '../src/app/(dashboard)/crm/suprah-meet/room/[code]/page.tsx';
  const compiled = ts.transpileModule(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  let cursor = 0, dirty = true, tree, nextTimer = 0, requestCount = 0;
  const cells = [], effects = [], timers = new Map(), storage = new Map(), joins = [];
  let admission = guest ? { admitted: true, live: false, guestToken: 'pass', title: 'Call' }
    : { notStarted: true, title: 'Call' };
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
      return [cells[i], (value) => {
        const next = typeof value === 'function' ? value(cells[i]) : value;
        if (!Object.is(next, cells[i])) { cells[i] = next; dirty = true; }
      }];
    },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!cells[i] || !same(cells[i].deps, deps)) {
        effects.push(() => { cells[i]?.cleanup?.(); cells[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const meet = { phase: 'idle', tiles: [], roster: {}, chatMessages: [], reactions: [], meeting: null,
    join: async (code, options) => { joins.push({ code, options }); meet.phase = 'joining'; dirty = true; },
  };
  const ctx = { meet, activeCode: null, open: (code, options) => {
    joins.push({ code, options }); ctx.activeCode = code; meet.phase = 'joining'; dirty = true;
  } };
  const api = {
    async post(url) {
      requestCount++;
      if (admission instanceof Error) throw admission;
      return { data: { data: admission } };
    },
    async get() { return { data: { data: { participants: [] } } }; },
  };
  const symbols = new Proxy({}, { get: (_t, name) => name });
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const require = (name) => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'next/navigation') return { useParams: () => ({ code: 'MEET-1234' }), useRouter: () => ({ push() {} }) };
    if (name === '@/lib/api-client') return { apiClient: api };
    if (name === '@/lib/utils') return { cn: () => '', resolveImageUrl: (s) => s };
    if (name === '@/lib/meet-layout') return { orderMeetPeople: () => [], pickMeetStage: () => ({ mode: 'grid' }), splitMeetPeople: () => ({}) };
    if (name === '@/hooks/useSuprahMeet') return { useSuprahMeet: () => ({ ...meet }), MEET_SCENES: [] };
    if (name.endsWith('/MeetSessionProvider')) return { useMeetSession: () => ctx };
    return symbols;
  };
  const setTimer = (fn, delay, repeat) => { const id = ++nextTimer; timers.set(id, { fn, delay, repeat }); return id; };
  const clearTimer = (id) => timers.delete(id);
  const listeners = new Map();
  const events = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) };
  const browserStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const fakeWindow = { ...events, innerWidth: 390, setInterval: (fn, delay) => setTimer(fn, delay, true), clearInterval: clearTimer };
  const module = { exports: {} };
  const component = guest ? 'SuprahMeetGuestRoom' : 'SuprahMeetRoom';
  new Function('require', 'module', 'exports', 'window', 'document', 'localStorage', 'sessionStorage',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', compiled + `\nexports.TestRoom = ${component};`)(
    require, module, module.exports, fakeWindow, { ...events, visibilityState: 'visible' }, browserStorage, browserStorage,
    (fn, delay) => setTimer(fn, delay, false), clearTimer, (fn, delay) => setTimer(fn, delay, true), clearTimer);
  const render = () => { cursor = 0; dirty = false; tree = module.exports.TestRoom({ code: 'MEET-1234' }); effects.splice(0).forEach((fn) => fn()); };
  const flush = async () => {
    for (let i = 0; i < 30; i++) { if (dirty) render(); await Promise.resolve(); }
    assert.equal(dirty, false, 'the room settles without a render loop');
    return tree;
  };
  const nodes = (node = tree) => !node || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap((child) => nodes(child)) : [node, ...nodes(node.props?.children ?? null)];
  const text = (node = tree) => node == null ? '' : typeof node !== 'object' ? String(node)
    : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children ?? null);
  const poll = async () => {
    for (const [id, timer] of [...timers]) {
      if (timer.delay < 2000 || timer.delay > 3500) continue;
      if (!timer.repeat) timers.delete(id);
      timer.fn();
    }
    await flush();
  };
  const start = async () => {
    await flush();
    if (guest) {
      nodes().find((node) => node.type === 'input').props.onChange({ target: { value: 'Guest visitor' } });
      await flush();
      nodes().find((node) => node.type === 'Button' && /Ask to join/.test(text(node))).props.onClick();
      await flush();
    }
  };
  return { flush, start, poll, nodes, text, joins, listeners,
    setAdmission: (value) => { admission = value; }, requests: () => requestCount,
    prepare: async (choices) => { nodes().find((node) => node.type === 'MeetPreJoin').props.onJoin(choices); await flush(); },
  };
}

for (const guest of [false, true]) {
  const label = guest ? 'guest' : 'signed-in attendee';
  test(`${label} prepares before waiting, then enters automatically with the saved choices once`, async () => {
    const room = roomHarness(guest);
    await room.start();
    assert.ok(room.nodes().some((node) => node.type === 'MeetPreJoin'));
    assert.equal(room.joins.length, 0);
    await room.prepare({ mic: true, camera: false });
    assert.match(room.text(), /Waiting/);
    assert.equal(room.joins.length, 0);
    room.setAdmission(guest ? { admitted: true, live: true, guestToken: 'pass' } : { admitted: true });
    await room.poll();
    assert.equal(room.joins.length, 1);
    assert.equal(room.joins[0].options.startMic, true);
    assert.equal(room.joins[0].options.startCam, false);
    await room.poll();
    assert.equal(room.joins.length, 1);
  });
  test(`${label} polling survives rerenders, reconnects, and a transient API failure`, async () => {
    const room = roomHarness(guest);
    await room.start();
    await room.prepare({ mic: false, camera: false });
    room.setAdmission(new Error('offline'));
    await room.poll();
    assert.equal(room.joins.length, 0);
    assert.match(room.text(), /Waiting/);
    room.setAdmission(guest ? { admitted: true, live: true, guestToken: 'pass' } : { admitted: true });
    room.listeners.get('online')?.();
    await room.flush();
    assert.equal(room.joins.length, 1);
  });
  test(`${label} sees a closure reason instead of auto-joining an expired meeting`, async () => {
    const room = roomHarness(guest);
    await room.start();
    await room.prepare({ mic: false, camera: false });
    room.setAdmission({ ended: true, endedReason: 'Nobody joined within one hour.' });
    await room.poll();
    assert.equal(room.joins.length, 0);
    assert.match(room.text(), /Nobody joined within one hour/);
  });
}

for (const guest of [false, true]) {
  test(`${guest ? 'guest' : 'signed-in attendee'} never joins a declined private-room request`, async () => {
    const room = roomHarness(guest);
    await room.start();
    await room.prepare({ mic: false, camera: false });
    room.setAdmission({ denied: true });
    await room.poll();
    assert.equal(room.joins.length, 0);
    assert.match(room.text(), /declined|didn/);
  });
}

for (const guest of [false, true]) {
  test(`${guest ? 'guest' : 'signed-in attendee'} still requires preparation when the room opens during device check`, async () => {
    const room = roomHarness(guest);
    await room.start();
    room.setAdmission(guest ? { admitted: true, live: true, guestToken: 'pass' } : { admitted: true });
    await room.poll();
    assert.ok(room.nodes().some((node) => node.type === 'MeetPreJoin'));
    assert.equal(room.joins.length, 0);
    await room.prepare({ mic: false, camera: true });
    assert.equal(room.joins.length, 1);
    assert.equal(room.joins[0].options.startCam, true);
  });
}

test('an invalid or deleted signed-in meeting exits polling with a useful error and a back button', async () => {
  const room = roomHarness();
  const failure = Object.assign(new Error('not found'), { response: { status: 404, data: { message: 'Meeting not found.' } } });
  room.setAdmission(failure);
  await room.start();
  assert.match(room.text(), /Meeting not found/);
  assert.match(room.text(), /Back to Suprah Meet/);
  const requests = room.requests();
  await room.poll();
  assert.equal(room.requests(), requests);
  assert.equal(room.joins.length, 0);
});
