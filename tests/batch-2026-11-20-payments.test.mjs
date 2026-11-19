import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Suprah Pay batch 3 (2026-11-20), one section per fix.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

// ── Leaving Stripe's payment page ───────────────────────────────────────────
test("an invoice left on Stripe's page can be paid again and goes back under To pay", () => {
  const page = read('app/(customer)/customer/payments/page.tsx');
  assert.match(page, /const payable = inv\.status === "pending" \|\| inv\.status === "failed" \|\| inv\.status === "processing";/);
  assert.match(page, /processing: \{ label: "Payment started"/);
  assert.match(page, /const invoiceId = params\.get\("invoice"\);/);
  assert.match(page, /apiClient\.post\(`\/api\/payments\/\$\{encodeURIComponent\(invoiceId\)\}\/left-checkout`\)/);
  assert.match(page, /Your invoice is back under To pay whenever you're ready\./);
  // A refused Pay (for example: already paid) refreshes the list.
  assert.match(page, /userErrorMessage\(e, "start this payment"\) \}\);\n\s+setPayingId\(null\);\n\s+\/\/ .*\n\s+refetch\(\);/);
});
