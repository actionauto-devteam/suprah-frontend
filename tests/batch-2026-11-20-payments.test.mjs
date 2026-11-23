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
});

test('Link Wise and Send are not offered (decision A1); the Wise panel stays switched off if it is used again', () => {
  const wallet = read('app/(dashboard)/billing/page.tsx');
  assert.doesNotMatch(wallet, /LinkedAccountPanel|Link Wise|Send is still in development/);
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

// ── Create invoice feedback (2026-11-23): highlighted boxes and SuprahPay notices ──
test('every box that stops a line is found, and server messages point at their box', () => {
  const blank = { label: ' ', kind: 'product', quantity: '0', price: '' };
  assert.deepEqual(invoice.draftLineIssues(blank, 1).map((issue) => issue.field), ['label', 'quantity', 'price']);
  assert.equal(invoice.draftLineProblem(blank, 1), 'Line 2: add a description.');
  assert.deepEqual(invoice.draftLineIssues({ label: 'Promo', kind: 'discount', quantity: '1', price: '0' }, 0), [
    { field: 'price', message: 'Line 1: enter the discount amount.' },
  ]);
  assert.deepEqual(invoice.draftLineIssues({ label: 'Bundle', kind: 'product', quantity: '1', price: '0' }, 0), []);

  // The server's own wording (aftermarket invoice and payment limit checks).
  const key = invoice.invoiceIssueKeyForServerMessage;
  assert.equal(key('Line 3: enter a price of $0 or more.'), 'line-2-price');
  assert.equal(key('Line 1: enter a quantity greater than 0.'), 'line-0-quantity');
  assert.equal(key('Line 2: keep the description under 200 characters.'), 'line-1-label');
  assert.equal(key('Enter a tax rate from 0% to 100%.'), 'tax');
  assert.equal(key('Enter a valid due date.'), 'due');
  assert.equal(key('Keep the note to the customer under 1000 characters.'), 'note');
  assert.equal(key("This is more than SuprahPay's limit of $5,000.00 for one payment. Split it into smaller payments, or contact Suprah."), 'total');
  assert.equal(key('The invoice total must be more than $0.'), 'total');
  assert.equal(key('Add at least one item to the invoice.'), 'items');
  assert.equal(key('Sending invoices needs Finance access. Ask your dealership admin.'), null);
});

test('Create invoice highlights what to fix and shows SuprahPay notices for sent and not sent', () => {
  const form = read('components/billing/InvoiceBuilder.tsx');
  // Send can always be pressed (not while sending), so pressing it shows what's missing.
  assert.match(form, /<PrimaryButton type="button" onClick=\{submit\} disabled=\{submitting\}/);
  assert.doesNotMatch(form, /disabled=\{!canSend\}/);
  // Each box can be highlighted, with its reason read out.
  assert.match(form, /\{ hasError: true, "aria-invalid": true as const, "aria-describedby": errorId\(key\) \}/);
  for (const box of ['line-${i}-label', 'line-${i}-quantity', 'line-${i}-price']) {
    assert.ok(form.includes(`{...invalidProps(\`${box}\`)}`), `missing highlight for ${box}`);
  }
  for (const box of ['tax', 'due']) assert.ok(form.includes(`{...invalidProps("${box}")}`), `missing highlight for ${box}`);
  assert.match(form, /aria-invalid=\{issues\.has\("note"\) \|\| undefined\}/);
  assert.match(form, /border: `1px solid \$\{issues\.has\("total"\) \? T\.danger : T\.brandBorder\}`/);
  // Pressing Send moves to the first box to fix; a server refusal highlights its box.
  assert.match(form, /goToIssue\(keys\[0\]\);/);
  assert.match(form, /const key = invoiceIssueKeyForServerMessage\(message\);/);
  assert.match(form, /el\.focus\(\{ preventScroll: true \}\);/);
  // The payment limit is checked before sending.
  assert.match(form, /totals\.total > paymentLimit/);
  // SuprahPay notices.
  assert.match(form, /suprahPayToast\.success\(/);
  assert.match(form, /was notified and can pay \$\{invoiceMoney\(totals\.total\)\} in SuprahPay\./);
  assert.equal(form.match(/suprahPayToast\.error\(\s*"Invoice not sent"/g)?.length, 2, 'form problems and server refusals');

  const notice = read('components/billing/SuprahPayToast.tsx');
  assert.match(notice, /toast\.custom\(/);
  assert.match(notice, /<Wordmark size=\{12\} \/>/);
  assert.match(notice, /aria-label="Dismiss notification"/);
  assert.match(notice, /background: T\.surface/, 'follows light and dark mode');
});
