import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync(new URL('../src/components/suprah-meet/MeetSessionProvider.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness() {
  let cursor = 0, dirty = true, context, pathname = '/crm/suprah-meet';
  const cells = [], effects = [], joins = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial;
      return [cells[i], value => { const next = typeof value === 'function' ? value(cells[i]) : value;
        if (!Object.is(next, cells[i])) { cells[i] = next; dirty = true; } }]; },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) {
      cells[i]?.cleanup?.(); cells[i] = { deps }; effects.push(() => { cells[i].cleanup = fn(); }); } },
    useLayoutEffect(fn, deps) { return react.useEffect(fn, deps); },
  };
  let releaseReset;
  const meet = { phase: 'idle', meeting: null, error: null, endedReason: null,
    async reset() { if (releaseReset) await releaseReset.promise; if (['ended', 'error'].includes(meet.phase)) {
      meet.phase = 'idle'; meet.meeting = null; meet.error = null; meet.endedReason = null; dirty = true; } },
    async join(code, options) { joins.push({ code, options }); meet.phase = 'in'; meet.meeting = { code, title: code }; dirty = true; },
  };
  const module = { exports: {} };
  const element = (type, props) => ({ type, props });
  new Function('require', 'module', 'exports', source)(name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'next/navigation') return { usePathname: () => pathname };
    if (name === '@/hooks/useSuprahMeet') return { useSuprahMeet: () => ({ ...meet }) };
    return new Proxy({}, { get: () => () => null });
  }, module, module.exports);
  const flush = async () => {
    for (let i = 0; i < 30; i++) {
      if (dirty) { cursor = 0; dirty = false; context = module.exports.MeetSessionProvider({ children: null }).props.value; effects.splice(0).forEach(fn => fn()); }
      await Promise.resolve();
    }
    assert.equal(dirty, false);
    return context;
  };
  return { flush, joins, get: () => context,
    navigate(path) { pathname = path; dirty = true; },
    end() { meet.phase = 'ended'; meet.endedReason = 'Earlier meeting ended'; dirty = true; },
    blockReset() { let resolve; const promise = new Promise(done => { resolve = done; }); releaseReset = { promise }; return () => { releaseReset = null; resolve(); }; },
  };
}

test('the host can finish one room, return to the lobby, and open the next with saved device choices', async () => {
  const app = harness(); await app.flush();
  app.navigate('/crm/suprah-meet/room/MEET-1234');
  app.get().open('MEET-1234'); await app.flush();
  app.end(); await app.flush();
  assert.equal(app.get().meet.phase, 'ended');
  app.navigate('/crm/suprah-meet'); await app.flush();
  assert.equal(app.get().activeCode, null);
  assert.equal(app.get().meet.phase, 'idle');
  assert.equal(app.get().meet.meeting, null);
  app.navigate('/crm/suprah-meet/room/MEET-5678');
  app.get().open('MEET-5678', { startMic: true, startCam: false }); await app.flush();
  assert.equal(app.get().meet.phase, 'in');
  assert.equal(app.get().meet.meeting.code, 'MEET-5678');
  assert.deepEqual(app.joins[1], { code: 'MEET-5678', options: { startMic: true, startCam: false } });
});

test('navigating directly from an ended room to another room releases the old session', async () => {
  const app = harness(); await app.flush();
  app.navigate('/crm/suprah-meet/room/MEET-1234'); app.get().open('MEET-1234'); await app.flush();
  app.end(); await app.flush();
  app.navigate('/crm/suprah-meet/room/MEET-5678'); await app.flush();
  assert.equal(app.get().activeCode, null);
  assert.equal(app.get().meet.phase, 'idle');
});

test('a slow reset reserves the next room once and cannot interrupt an active Mini Meet', async () => {
  const app = harness(); await app.flush();
  const release = app.blockReset();
  app.get().open('MEET-1234'); app.get().open('MEET-1234'); app.get().open('MEET-5678');
  await app.flush(); assert.equal(app.joins.length, 0);
  release(); await app.flush(); assert.equal(app.joins.length, 1);
  app.get().close(); app.get().open('MEET-5678'); await app.flush();
  assert.equal(app.get().activeCode, 'MEET-1234');
  assert.equal(app.joins.length, 1);
});
