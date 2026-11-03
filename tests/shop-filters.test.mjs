import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { shopFiltersFromParams, shopPagingFromParams, shopQuery, shopQueryString, EMPTY_SHOP_FILTERS } = loadLib('shop-filters');

test("reads a Shop address, including the sidebar's shortcuts", () => {
  const filters = shopFiltersFromParams(new URLSearchParams('sortBy=recent&sortOrder=desc&make=Toyota&year=2021&minPrice=abc&model=all'));
  assert.deepEqual(filters, { search: '', sortBy: 'recent', sortOrder: 'desc', make: 'Toyota', year: 2021 });
});

test('leaves out filters the marketplace no longer uses', () => {
  const filters = shopFiltersFromParams(new URLSearchParams('status=In+Transit&priceUpdated=last7&highDemand=true'));
  assert.deepEqual(filters, EMPTY_SHOP_FILTERS);
  assert.deepEqual(shopQuery(filters, 1, 12), { page: '1', limit: '12' });
});

test('keeps the page and page size sensible', () => {
  assert.deepEqual(shopPagingFromParams(new URLSearchParams('page=3&limit=24')), { page: 3, limit: 24 });
  assert.deepEqual(shopPagingFromParams(new URLSearchParams('page=-2&limit=99999')), { page: 1, limit: 100 });
  assert.deepEqual(shopPagingFromParams(new URLSearchParams('')), { page: 1, limit: 12 });
});

test('sends only filled-in filters, and the same order every time', () => {
  const query = shopQueryString({ search: ' camry ', make: 'Toyota', maxPrice: 30000, sortBy: 'price', sortOrder: 'asc' }, 2, 12);
  assert.equal(query, 'page=2&limit=12&search=camry&make=Toyota&maxPrice=30000&sortBy=price&sortOrder=asc');
});
