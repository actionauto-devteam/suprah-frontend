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
