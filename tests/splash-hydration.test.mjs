import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/components/layout/SplashScreen.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

function renderSplash(pathname, hostname, storage = new Map()) {
  const effects = [];
  let visible;
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: initial => {
      visible = initial;
      return [initial, value => { visible = value; }];
    },
    useRef: () => ({ current: null }),
    useLayoutEffect: effect => effects.push(effect),
    useEffect() {},
  };
  const context = {
    exports: {}, React: react,
    window: { location: { hostname }, sessionStorage: {
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    } },
    require: name => {
      if (name === 'react') return react;
      if (name === 'next/navigation') return { usePathname: () => pathname };
      if (name === 'framer-motion') return { AnimatePresence: 'presence', motion: { div: 'div', span: 'span' } };
      throw new Error(`Unexpected import ${name}`);
    },
  };
  vm.runInNewContext(compiled, context);
  const tree = context.exports.SplashScreen();
  return { tree, get visible() { return visible; }, mount: () => effects.forEach(effect => effect()) };
}

test('rewritten SupraSpace paths render the same hidden splash before hydration', () => {
  const server = renderSplash('/supraspace', 'space.suprah-app.com');
  const browser = renderSplash('/', 'space.suprah-app.com');
  assert.equal(server.visible, false);
  assert.equal(browser.visible, false);
  assert.equal(JSON.stringify(server.tree), JSON.stringify(browser.tree));
  browser.mount();
  assert.equal(browser.visible, false);
});

test('main app shows its first splash after mounting and skips repeat visits', () => {
  const storage = new Map();
  const first = renderSplash('/', 'www.suprah-app.com', storage);
  assert.equal(first.visible, false);
  first.mount();
  assert.equal(first.visible, true);
  const repeat = renderSplash('/', 'www.suprah-app.com', storage);
  repeat.mount();
  assert.equal(repeat.visible, false);
});

test('direct SupraSpace routes skip the splash on the main domain too', () => {
  const splash = renderSplash('/supraspace', 'www.suprah-app.com');
  splash.mount();
  assert.equal(splash.visible, false);
});
