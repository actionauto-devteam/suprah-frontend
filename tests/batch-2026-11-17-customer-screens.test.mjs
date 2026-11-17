import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Batch C (2026-11-17): every customer screen shows its text in full, at 11px
// or larger, and nothing scrolls sideways on a phone.
const src = fileURLToPath(new URL('../src/', import.meta.url));
const read = (rel) => fs.readFileSync(path.join(src, rel), 'utf8');

function files(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(src, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(rel));
    else if (entry.name.endsWith('.tsx')) out.push(rel);
  }
  return out;
}

const customerFiles = [...files('app/(customer)'), ...files('components/customer')];

test('customer screens: no text cut off with "…"', () => {
  for (const rel of customerFiles) {
    const source = read(rel);
    assert.doesNotMatch(source, /["'`\s]truncate["'`\s]/, rel);
    assert.doesNotMatch(source, /line-clamp-\d/, rel);
    assert.doesNotMatch(source, /text-ellipsis/, rel);
  }
});

test('customer screens: no text under 11px', () => {
  for (const rel of customerFiles) {
    assert.doesNotMatch(read(rel), /text-\[(?:7|8|9|10)(?:\.5)?px\]/, rel);
  }
});

test('customer screens: nothing scrolls sideways', () => {
  for (const rel of customerFiles) {
    assert.doesNotMatch(read(rel), /overflow-x-(?:auto|scroll)/, rel);
  }
});

test('Compare: label rows on phones, the label column on larger screens', () => {
  const page = read('app/(customer)/customer/compare/page.tsx');
  assert.match(page, /grid-cols-\[repeat\(var\(--compare-cols\),minmax\(0,1fr\)\)\] sm:grid-cols-\[180px_repeat\(var\(--compare-cols\),minmax\(0,1fr\)\)\]/);
  assert.match(page, /"col-span-full px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border\/30 sm:col-span-1 sm:py-2\.5"/);
  assert.doesNotMatch(page, /min-w-140/);
  assert.equal(page.match(/h-auto min-h-8 w-full gap-1\.5 whitespace-normal/g)?.length, 3, 'all three buttons wrap their words');
});

test('Membership: the tier table only where it fits', () => {
  const page = read('app/(customer)/customer/membership/page.tsx');
  assert.match(page, /<div className="space-y-3 lg:hidden">/);
  assert.match(page, /hidden overflow-hidden rounded-\[14px\] border border-border bg-card lg:block/);
  assert.match(page, /<table className="w-full table-fixed text-sm">/);
  assert.doesNotMatch(page, /min-w-200/);
});

test('Compare tray: photos on phones, names and empty slots from sm up', () => {
  const tray = read('components/customer/ComparisonTray.tsx');
  assert.match(tray, /<div className="hidden min-w-0 sm:block">/);
  assert.match(tray, /className="hidden shrink-0 h-13 w-37 items-center justify-center rounded-xl border border-dashed/);
  assert.match(tray, /flex min-w-0 flex-1 basis-full flex-wrap items-center gap-1\.5 sm:basis-0 sm:gap-2/);
});

test('wrapped text keeps room between its lines', () => {
  for (const rel of customerFiles) {
    const source = read(rel);
    assert.doesNotMatch(source, /leading-none[^"]*break-words \[overflow-wrap:anywhere\]|break-words \[overflow-wrap:anywhere\][^"]*leading-none/, rel);
  }
});
