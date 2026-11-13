import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Report tables on phones (2026-11-13): a row becomes a card of "Column:
// value" lines when the table wouldn't fit, the Columns menu opens above the
// page, and nothing scrolls sideways.
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const { reportTableLayout, reportTableMinWidth, DEFAULT_REPORT_COLUMN_WIDTH } = load(path.join(SRC, 'lib/report-table-layout'));

test('a table needs the width of its columns (150 each unless set)', () => {
  assert.equal(DEFAULT_REPORT_COLUMN_WIDTH, 150);
  assert.equal(reportTableMinWidth([{ width: 200 }, {}, { width: 120 }]), 470);
  assert.equal(reportTableMinWidth([]), 0);
});

test('the table when every column fits, cards when the screen is narrower', () => {
  assert.equal(reportTableLayout(1200, 1000), 'table');
  assert.equal(reportTableLayout(1000, 1000), 'table');
  assert.equal(reportTableLayout(360, 1000), 'cards');
  assert.equal(reportTableLayout(0, 500), 'cards');
  assert.equal(reportTableLayout(Number.NaN, 500), 'cards');
});

test('the report sections never scroll sideways and the Columns menu is not cut off', () => {
  const source = fs.readFileSync(path.join(SRC, 'components/reports/workspace/ReportWorkspacePreview.tsx'), 'utf8');
  assert.doesNotMatch(source, /overflow-x-(auto|scroll)/);
  assert.match(source, /<Popover open=\{columnsOpen\} onOpenChange=\{setColumnsOpen\}>/);
  assert.match(source, /max-h-\[min\(24rem,var\(--radix-popover-content-available-height\)\)\]/);
  assert.match(source, /layout === "cards"/);
  const workspace = fs.readFileSync(path.join(SRC, 'components/reports/workspace/ReportWorkspace.tsx'), 'utf8');
  assert.match(workspace, /pt-4 pb-16 sm:px-4 md:pb-4/);
});
