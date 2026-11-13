import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a TypeScript file the same way the other tests do, following its
// relative and "@/..." imports (icon and type imports become empty objects).
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const candidates = [file, `${file}.ts`, `${file}.tsx`];
  const filename = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const cjs = { exports: {} };
  const require = (id) => {
    if (id.startsWith('@/components/')) return {};
    if (id.startsWith('@/')) return load(path.join(SRC, id.slice(2)));
    if (id.startsWith('.')) return load(path.join(path.dirname(filename), id));
    return {};
  };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, require, cjs);
  return cjs.exports;
}

const { shownInApp, IN_DEVELOPMENT_SECTIONS } = load(path.join(SRC, 'lib/customer-in-development'));
const { customerAppNav, customerNav } = load(path.join(SRC, 'components/layout/mobile-nav-config'));

test('sections still in development are left out inside the app, with their sub-pages', () => {
  const unfinished = Object.keys(IN_DEVELOPMENT_SECTIONS);
  assert.ok(unfinished.length > 0);
  for (const section of unfinished) {
    assert.equal(shownInApp(section), false, section);
    assert.equal(shownInApp(`${section}/anything?x=1`), false, section);
  }
  for (const ready of ['/customer', '/customer/shop', '/customer/saved', '/customer/shipments', '/customer/settings']) {
    assert.equal(shownInApp(ready), true, ready);
  }
});

test("the app's bottom bar offers only finished sections; the website keeps its own", () => {
  assert.deepEqual(customerAppNav.map((item) => item.href), ['/customer', '/customer/shipments', '/customer/shop', '/customer/saved']);
  for (const item of customerAppNav) assert.equal(shownInApp(item.href), true, item.href);
  assert.ok(customerNav.some((item) => !shownInApp(item.href)), 'the website bar still has sections in development');
});

test("the website's bottom bar has My Shipments where Refer was (2026-11-13)", () => {
  assert.deepEqual(customerNav.map((item) => item.label), ['Home', 'Rewards', 'Shop', 'Wallet', 'Shipments']);
  assert.equal(customerNav.at(-1).href, '/customer/shipments');
  assert.ok(!customerNav.some((item) => item.href === '/customer/refer'));
});
