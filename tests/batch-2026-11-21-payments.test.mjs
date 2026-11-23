import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// SuprahPay decisions batch (2026-11-21), one section per change.
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

// ── The wallet: what Suprah owes the dealership; no Wise, Send or Receive ──
test('the SuprahPay wallet shows what Suprah owes the dealership, without the business wallet parts', () => {
  const card = read('components/billing/BalanceCard.tsx');
  assert.match(card, /Owed to your dealership/);
  for (const gone of ['label="Receive"', 'label="Link Wise"', 'label="Send"', 'onLinkWise', 'onSend', 'onReceive']) {
    assert.ok(!card.includes(gone), `still mentions ${gone}`);
  }
  const page = read('app/(dashboard)/billing/page.tsx');
  for (const gone of ['LinkedAccountPanel', 'useLinkedAccount', 'SendModal', 'CashInModal', 'WALLET_WISE_ENABLED']) {
    assert.ok(!page.includes(gone), `overview still uses ${gone}`);
  }
  assert.match(page, /useDealershipPayouts\(\)/);
  assert.match(page, /balance=\{payouts\?\.balance\.amount \?\? 0\}/);
  assert.match(page, /SuprahPay is coming soon for your dealership/);
  assert.match(page, /<SuprahPaySettingsPanel/);
  assert.match(page, /Payouts from Suprah/);
});

test('SuprahPay settings: admins change the tax rate and set up the payout account on Stripe’s own page', () => {
  const panel = read('components/billing/SuprahPaySettingsPanel.tsx');
  assert.match(panel, /apiClient\.put\("\/api\/payments\/settings", \{ defaultTaxRate: rate \}\)/);
  assert.match(panel, /apiClient\.post\("\/api\/payments\/payout-account\/connect"\)/);
  // Only a Stripe https address is opened.
  assert.match(panel, /url\.startsWith\("https:\/\/"\)/);
  assert.match(panel, /\{settings\.canEdit \? \(/);
  assert.match(panel, /Card processing fees are paid by Suprah\./);
});

// ── Customers: which dealership, what it's for, refund timing ──────────────
const purpose = loadLib('payment-purpose');

test('customers see which dealership each invoice is from, what it is for, and how long a refund takes', () => {
  assert.equal(purpose.paymentPurposeLabel('car_deposit'), 'Deposit to hold a car');
  assert.equal(purpose.paymentPurposeLabel('other'), null);
  assert.equal(purpose.paymentPurposeLabel(undefined), null);
  const page = read('app/(customer)/customer/payments/page.tsx');
  assert.match(page, /`From \$\{inv\.dealershipName\}`/);
  assert.match(page, /It can take 5–10 business days to show on your card\./);
  assert.match(page, />SuprahPay</);
});

// ── Finance access: who can send, cancel and refund ─────────────────────────
test('dealership admins give or remove Finance access on the Members page, next to Dispatcher access', () => {
  const members = read('components/settings/org-members-settings.tsx');
  assert.match(members, /\/members\/\$\{userId\}\/finance-access/);
  assert.match(members, /hasFinanceAccess: Boolean\(m\.hasFinanceAccess\)/);
  assert.match(members, /SuprahPay: Finance Access/);
  assert.match(members, /aria-label=\{`SuprahPay access for \$\{member\.fullName\}`\}/);
});

test('Send, Cancel and Refund show only for admins and staff with Finance access; others see why', () => {
  const payments = read('app/(dashboard)/billing/payments/page.tsx');
  assert.match(payments, /const canManage = !!suprahPay\?\.canManagePayments;/);
  assert.match(payments, /\{canSend && \(payment\.status === "pending" \|\| payment\.status === "failed"\) && \(/);
  assert.match(payments, /\{canManage && refundable > 0 && !confirmRefund && \(/);
  assert.match(payments, /\{canManage && \(payment\.status === "pending" \|\| payment\.status === "processing"\) && \(/);
  assert.match(payments, /need Finance access from your dealership&apos;s admin/);
  const awaiting = read('app/(dashboard)/billing/awaiting-payment/page.tsx');
  assert.match(awaiting, /const canSend = !!suprahPay\?\.canManagePayments && !!suprahPay\?\.enabled;/);
  assert.match(awaiting, /Needs Finance access/);
});

test('Leads → Request Payment needs SuprahPay on and Finance access, and asks what the payment is for', () => {
  const leads = read('components/LeadsTab.tsx');
  assert.match(leads, /if \(suprahPay && !suprahPay\.enabled\) \{/);
  assert.match(leads, /if \(suprahPay && !suprahPay\.canManagePayments\) \{/);
  assert.match(leads, /<PaymentField label="What it's for">/);
  assert.match(leads, /purpose: paymentForm\.purpose \|\| "other",/);
  assert.deepEqual(purpose.PAYMENT_PURPOSES.map((p) => p.value), ['shipping', 'car_deposit', 'aftermarket', 'service', 'down_payment', 'other']);
});

test('Aftermarket invoices: Create invoice follows the same rules and starts with the default sales tax', () => {
  const tab = read('components/AftermarketInquiriesTab.tsx');
  assert.match(tab, /Sending invoices needs Finance access/);
  assert.match(tab, /SuprahPay is coming soon for your dealership/);
  const form = read('components/billing/InvoiceBuilder.tsx');
  assert.match(form, /if \(!taxTouched\.current && suprahPay && suprahPay\.defaultTaxRate > 0\) setTaxRate\(String\(suprahPay\.defaultTaxRate\)\);/);
  assert.match(form, /onChange=\{\(e\) => \{ taxTouched\.current = true; setTaxRate\(e\.target\.value\); \}\}/);
});

// ── Admin → SuprahPay (super admins) ───────────────────────────────────────
test('super admins set the fee and limit, switch SuprahPay per dealership, and send each weekly payout after confirming', () => {
  const page = read('app/(admin)/admin/suprahpay/page.tsx');
  for (const endpoint of ['/api/admin/suprahpay/settings', '/api/admin/suprahpay/dealerships', '/api/admin/suprahpay/payouts']) {
    assert.ok(page.includes(endpoint), endpoint);
  }
  // The exact amount the super admin saw is what the server must still find.
  assert.match(page, /\/send`, \{ amount: row\.amount \}\)/);
  assert.match(page, /`Send \$\{formatCurrency\(row\.amount\)\} to \$\{row\.name\}\?`/);
  assert.match(page, /Turn SuprahPay off for \$\{row\.name\}\?/);
  assert.match(page, /aria-label=\{`SuprahPay for \$\{row\.name\}`\}/);
  assert.match(page, /\/check`\)/);
  // Lists stack instead of scrolling sideways on phones.
  assert.doesNotMatch(page, /<Table\b|overflow-x-auto/);
  assert.match(read('components/admin-sidebar.tsx'), /\{ title: "SuprahPay", url: "\/admin\/suprahpay", icon: Wallet \}/);
});

// ─── Review fixes (2026-11-23) ─────────────────────────────────────────────
test('SuprahPay screen data is kept per person and dealership, so switching never shows the last one', () => {
  const hooks = read('hooks/useSuprahPay.ts');
  assert.match(hooks, /const \{ userId, orgId \} = useAuth\(\);/);
  assert.match(hooks, /const \{ impersonatedOrgId \} = adminStore\.useStore\(\);/);
  for (const key of ['settings', 'payouts', 'payout-account']) {
    assert.ok(hooks.includes(`queryKey: ["suprahpay", scope, "${key}"]`), key);
  }
  // A refresh after a change still reaches every SuprahPay query.
  assert.match(hooks, /invalidateQueries\(\{ queryKey: \["suprahpay"\] \}\)/);
});

test('an archived dealership that is still owed money is labelled on the payouts list', () => {
  const page = read('app/(admin)/admin/suprahpay/page.tsx');
  assert.match(page, /archived\?: boolean/);
  assert.match(page, /\{row\.archived && <Badge variant="secondary">Archived<\/Badge>\}/);
});
