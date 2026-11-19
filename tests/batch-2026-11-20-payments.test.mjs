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

// ── Card disputes (chargebacks) ─────────────────────────────────────────────
const refunds = loadLib('payment-refunds');

test('a disputed payment counts until the bank decides; a lost one is left out like a refund', () => {
  const paid = { status: 'succeeded', amount: 25 };
  assert.equal(refunds.keptAmount({ ...paid, disputeStatus: 'open', disputedAmount: 25 }), 25);
  assert.equal(refunds.keptAmount({ ...paid, disputeStatus: 'won', disputedAmount: 25 }), 25);
  assert.equal(refunds.keptAmount({ ...paid, disputeStatus: 'lost', disputedAmount: 25 }), 0);
  assert.equal(refunds.keptAmount({ ...paid, refundedAmount: 10, disputeStatus: 'lost', disputedAmount: 15 }), 0);
  assert.equal(refunds.keptAmount({ ...paid, refundedAmount: 10 }), 15);
  assert.equal(refunds.disputeLabel({ ...paid, disputeStatus: 'open' }), 'Disputed');
  assert.equal(refunds.disputeLabel({ ...paid, disputeStatus: 'lost' }), 'Dispute lost');
  assert.equal(refunds.disputeLabel({ ...paid, disputeStatus: 'won' }), null);
});

test('Payments, the CRM dashboard and billing reports show and count disputes', () => {
  const page = read('app/(dashboard)/billing/payments/page.tsx');
  assert.equal((page.match(/dispute=\{disputeLabel\(payment\)\}/g) ?? []).length, 2);
  assert.match(page, /\.\.\.\(payment\.disputeStatus \? \[\{ label: "Dispute", val: disputeText\(payment\) \}\] : \[\]\)/);
  assert.match(page, /const refundable = disputeLabel\(payment\) \? 0 : notRefunded\(payment\);/);
  assert.match(page, /It still counts in revenue while the bank reviews it\./);

  const dashboard = read('app/(dashboard)/components/RevenueIntelligence.tsx');
  assert.match(dashboard, /const dispute = disputeLabel\(payment\);/);

  const reports = read('components/reports/finance/shared/billing-report-utils.ts');
  assert.match(reports, /sum \+ keptAmount\(\{ \.\.\.payment, status: "succeeded" \}\)/);
});
