import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// SuprahPay batch 3 (2026-11-20), one section per fix.
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

// ── SuprahPay wallet: says where its numbers come from; Wise in development ──
test('the wallet card says where each number comes from', () => {
  const card = read('components/billing/BalanceCard.tsx');
  assert.match(card, /label: "Card payments received"/);
  assert.match(card, /label: "Pending invoices", value: String\(/);
  assert.match(card, /\{balanceNote && \(/);
  assert.match(card, /label="Link Wise" sub=\{wiseInDevelopment \? "In development" : "Connect account"\}/);
  assert.match(card, /label="Send" sub=\{wiseInDevelopment \? "In development" : "Transfer"\}/);
});

test('Link Wise and Send say they are in development while the wallet moves to Stripe', () => {
  const wallet = read('app/(dashboard)/billing/page.tsx');
  assert.match(wallet, /const WALLET_WISE_ENABLED = false;/);
  assert.match(wallet, /toast\.info\("Send is still in development"/);
  assert.match(wallet, /toast\.info\("Link Wise is still in development"/);
  assert.match(wallet, /linked\.connected \? "From your linked Wise account" : "The wallet balance is still in development"/);
  assert.match(wallet, /<LinkedAccountPanel style=\{\{ marginBottom: 0 \}\} inDevelopment=\{!WALLET_WISE_ENABLED\} \/>/);
  const panel = read('components/billing/LinkedAccountIntegration.tsx');
  assert.match(panel, /disabled=\{busy \|\| inDevelopment\}/);
  assert.match(panel, /Linking Wise is still in development/);
});

// ── Link Wise code clean-up (no visible change) ─────────────────────────────
test('the Link Wise files use proper types instead of any', () => {
  for (const rel of ['components/billing/LinkedAccountIntegration.tsx', 'lib/linkedAccountApi.ts']) {
    assert.doesNotMatch(read(rel), /: any\b|as any\b/, rel);
  }
});

// ── Phone and readability pass on the remaining SuprahPay screens ──────────
test('the remaining SuprahPay screens never cut text off or scroll sideways', () => {
  for (const rel of [
    'app/(dashboard)/billing/page.tsx',
    'components/billing/BalanceCard.tsx',
    'components/billing/LinkedAccountIntegration.tsx',
    'app/(dashboard)/billing/my-payments/page.tsx',
    'app/(admin)/admin/payouts/page.tsx',
    'app/(dashboard)/billing/driver-payouts/page.tsx',
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /textOverflow|\btruncate\b|text-ellipsis/, `${rel}: cut-off text`);
    assert.doesNotMatch(src, /overflowX|overflow-x-auto|minWidth: \d{3}/, `${rel}: sideways scrolling`);
    assert.doesNotMatch(src, /text-\[(7|8|9|10)px\]|fontSize: (7|8|9|10)(\.\d)?[,} ]/, `${rel}: text under 11px`);
  }
});

test('My payments stacks on phones; Admin Payouts shows a card per request on phones', () => {
  const mine = read('app/(dashboard)/billing/my-payments/page.tsx');
  assert.match(mine, /const ROW_GRID =\n\s+"grid grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(mine, /className="hidden md:grid"/);
  for (const cell of ['invoice', 'customer', 'amount', 'status', 'date', 'action']) {
    assert.match(mine, new RegExp(`className=\{CELL\.${cell}\}`), cell);
  }
  const admin = read('app/(admin)/admin/payouts/page.tsx');
  assert.match(admin, /<ul className="divide-y divide-border md:hidden">/);
  assert.match(admin, /<div className="hidden md:block">\n\s+<Table>/);
  assert.match(admin, /aria-label=\{`Reject \$\{w\.user\.name\}'s withdrawal`\}/);
  const card = read('components/billing/BalanceCard.tsx');
  assert.match(card, /flexWrap: "wrap", gap: 10, marginBottom: 16/);
  assert.match(card, /repeat\(auto-fit, minmax\(104px, 1fr\)\)/);
});

// ── Clearer invoices: Qty × Price = Amount, discounts, note to customer ─────
const invoice = loadLib('invoice-lines');

test('invoice lines read Qty × Price = Amount, and a discount reads −$', () => {
  assert.equal(invoice.invoiceMoney(1234.5), '$1,234.50');
  assert.equal(invoice.invoiceMoney(-5), '−$5.00');
  assert.equal(invoice.savedLineDetail({ kind: 'product', quantity: 2, unitPrice: 20, lineTotal: 40 }), '2 × $20.00');
  assert.equal(invoice.savedLineDetail({ kind: 'fee', quantity: 1.5, unitPrice: 10, lineTotal: 15 }), '1.5 × $10.00');
  assert.equal(invoice.savedLineDetail({ kind: 'discount', quantity: 1, unitPrice: 5, lineTotal: -5 }), 'Discount');
});

test('the form works out Subtotal, Discount, Tax and Total due the way the server does', () => {
  const lines = [
    { label: 'Carwash package', kind: 'product', quantity: '2', price: '20' },
    { label: 'Service fee', kind: 'fee', quantity: '1', price: '$5.00' },
    { label: 'Loyalty discount', kind: 'discount', quantity: '1', price: '5' },
  ];
  const amounts = lines.map(invoice.draftLineAmount);
  assert.deepEqual(amounts, [40, 5, -5]);
  // Tax is on the total after the discount: 10% of $40.00.
  assert.deepEqual(invoice.invoiceTotals(amounts, 10), { itemsTotal: 45, discountTotal: 5, tax: 4, total: 44 });
  // A discount is sent as 1 × its amount; the server takes it off.
  assert.deepEqual(invoice.draftLineToSend(lines[2]), { label: 'Loyalty discount', kind: 'discount', quantity: 1, unitPrice: 5 });
});

test('a line that is not ready says what to fix', () => {
  const ok = { label: 'Wash', kind: 'product', quantity: '1', price: '0' };
  assert.equal(invoice.draftLineProblem(ok, 0), null);
  assert.equal(invoice.draftLineProblem({ ...ok, label: ' ' }, 0), 'Line 1: add a description.');
  assert.equal(invoice.draftLineProblem({ ...ok, quantity: '0' }, 1), 'Line 2: enter a quantity of 1 or more.');
  assert.equal(invoice.draftLineProblem({ ...ok, price: 'abc' }, 0), 'Line 1: enter the price for one.');
  assert.equal(invoice.draftLineProblem({ ...ok, kind: 'discount', price: '' }, 2), 'Line 3: enter the discount amount.');
  assert.ok(Number.isNaN(invoice.typedNumber('-5')));
});

test('the Create invoice form uses invoice wording, SuprahPay styling and a note to the customer', () => {
  const form = read('components/billing/InvoiceBuilder.tsx');
  for (const words of ['>Description<', '>Qty<', '>Price<', '>Amount<', 'Total due', 'Bill to', 'Note to customer (optional)',
    'Shown to the customer on their invoice in SuprahPay.', '"Add item"', '"Add fee"', '"Add discount"', 'aria-label="Close"']) {
    assert.ok(form.includes(words), `missing ${words}`);
  }
  assert.match(form, /from "@\/components\/billing\/ui"/);
  assert.match(form, /customerNote: note\.trim\(\) \|\| undefined/);
  assert.doesNotMatch(form, /"charge"/); // no separate Charge type to pick
  const tab = read('components/AftermarketInquiriesTab.tsx');
  assert.match(tab, /import \{ InvoiceBuilder \} from "@\/components\/billing\/InvoiceBuilder";/);
  assert.doesNotMatch(tab, /\["product", "fee", "charge", "discount"\] as const\)\.map/);
});

test('customers and staff read the same lines; the note to the customer is shown, internal notes stay internal', () => {
  const customer = read('app/(customer)/customer/payments/page.tsx');
  assert.match(customer, /savedLineDetail\(li\)/);
  assert.match(customer, /invoiceMoney\(li\.lineTotal\)/);
  assert.match(customer, /Note from the dealership/);
  assert.doesNotMatch(customer, /\.notes\b/);
  const staff = read('app/(dashboard)/billing/payments/page.tsx');
  assert.match(staff, /Invoice lines/);
  assert.match(staff, /label: "Note to customer", val: payment\.customerNote/);
  assert.match(staff, /label: "Internal notes", val: payment\.notes/);
});
