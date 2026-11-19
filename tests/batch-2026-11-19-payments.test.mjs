import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Suprah Pay fixes (2026-11-19), one section per fix.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

// ── Payments are staff-only ─────────────────────────────────────────────────
const garageOverview = read('components/customer/garage/OverviewTab.tsx');

test("My Garage's Payments Due counts only the customer's own unpaid invoices", () => {
  assert.match(garageOverview, /apiClient\.get\("\/api\/payments\/my-payments"\)/);
  assert.match(garageOverview, /d\?\.stats\?\.pendingCount/);
  // The staff list (every customer's invoices) is no longer read here.
  assert.doesNotMatch(garageOverview, /apiClient\.get\("\/api\/payments",/);
});

test('no customer screen reads the staff payment list', () => {
  for (const rel of [
    'components/customer/garage/OverviewTab.tsx',
    'app/(customer)/customer/payments/page.tsx',
  ]) {
    assert.doesNotMatch(read(rel), /["'`]\/api\/payments["'`?]/, rel);
  }
});

// ── Refunds ask first and partial refunds show as partial ──────────────────
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const refunds = loadLib('payment-refunds');
const staffPayments = read('app/(dashboard)/billing/payments/page.tsx');
const customerPayments = read('app/(customer)/customer/payments/page.tsx');
const billingReport = read('components/reports/finance/shared/billing-report-utils.ts');

test('refund amounts: refunded so far, what is left, and partly refunded', () => {
  const paid = { status: 'succeeded', amount: 100 };
  assert.equal(refunds.refundedSoFar(paid), 0);
  assert.equal(refunds.notRefunded(paid), 100);
  assert.equal(refunds.isPartlyRefunded(paid), false);

  const partly = { status: 'succeeded', amount: 100, refundedAmount: 25.5 };
  assert.equal(refunds.refundedSoFar(partly), 25.5);
  assert.equal(refunds.notRefunded(partly), 74.5);
  assert.equal(refunds.isPartlyRefunded(partly), true);

  // A full refund from before refundedAmount existed counts the whole amount.
  assert.equal(refunds.refundedSoFar({ status: 'refunded', amount: 80 }), 80);
  assert.equal(refunds.notRefunded({ status: 'refunded', amount: 80 }), 0);
  assert.equal(refunds.isPartlyRefunded({ status: 'refunded', amount: 80, refundedAmount: 80 }), false);
  // Nothing can be refunded on an unpaid payment.
  assert.equal(refunds.notRefunded({ status: 'pending', amount: 50 }), 0);
});

test('the Refund button only opens a confirmation; the refund is sent from it', () => {
  const button = staffPayments.indexOf('onClick={() => setConfirmRefund(true)}');
  const confirm = staffPayments.indexOf('role="alertdialog"');
  const call = staffPayments.indexOf('/refund`');
  assert.ok(button > 0 && confirm > 0 && call > 0);
  // The one refund call sits inside the confirmation box, before the button.
  assert.equal(staffPayments.indexOf('/refund`', call + 1), -1);
  assert.ok(confirm < call && call < button);
  assert.match(staffPayments, /Refund \{formatCurrency\(refundable\)\} to \{payment\.customerName\}\?/);
  assert.match(staffPayments, /This can&apos;t be undone\./);
  assert.match(staffPayments, /Keep payment/);
  assert.match(staffPayments, /<DetailDrawer\n\s+key=\{selected\._id\}/);
});

test('partly refunded payments are labelled and counted as such', () => {
  // Since 2026-11-20 a dispute label comes first, then "Partly refunded".
  assert.match(staffPayments, /else if \(partlyRefunded\) \{\n\s+cfg = map\.refunded;\n\s+label = "Partly refunded";/);
  assert.equal((staffPayments.match(/partlyRefunded=\{isPartlyRefunded\(payment\)\}/g) || []).length, 2);
  assert.match(staffPayments, /label: "Refunded",/);
  assert.match(customerPayments, /refunded to you/);
  // Since 2026-11-20 revenue is the money kept (a lost dispute is left out too).
  assert.match(billingReport, /keptAmount\(\{ \.\.\.payment, status: "succeeded" \}\)/);
  assert.match(billingReport, /refundedSoFar\(\{ \.\.\.payment, status: normalizeStatus\(payment\.status\) \}\)/);
});

// ── Driver payout account status and failed payouts ─────────────────────────
function loadTypes(name) {
  const filename = fileURLToPath(new URL(`../src/types/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}
const { payoutAccountReady } = loadTypes('driver-payout');
const driverSettings = read('app/(driver)/driver/settings/page.tsx');
const staffPayouts = read('app/(dashboard)/billing/driver-payouts/page.tsx');

test("a finished payout account shows ready even though card charges stay off", () => {
  assert.equal(payoutAccountReady({ connected: true, ready: true, chargesEnabled: false }), true);
  assert.equal(payoutAccountReady({ connected: true, ready: false, payoutsEnabled: true, detailsSubmitted: true }), false);
  // An older server without "ready": bank payouts on and details sent.
  assert.equal(payoutAccountReady({ connected: true, chargesEnabled: false, payoutsEnabled: true, detailsSubmitted: true }), true);
  assert.equal(payoutAccountReady({ connected: true, payoutsEnabled: false, detailsSubmitted: true }), false);
  assert.equal(payoutAccountReady({ connected: false }), false);
  assert.equal(payoutAccountReady(null), false);
});

test('the driver settings card no longer waits for card charges', () => {
  assert.doesNotMatch(driverSettings, /chargesEnabled/);
  assert.match(driverSettings, /const payoutReady = payoutAccountReady\(connectStatus\)/);
  assert.match(driverSettings, /Stripe is checking your details/);
  assert.match(driverSettings, /Tap Complete Setup to finish\./);
});

test('staff payout history fits phones and says why a payout failed', () => {
  assert.doesNotMatch(staffPayouts, /min-w-\[480px\]/);
  assert.doesNotMatch(staffPayouts, /text-\[10px\]/);
  assert.match(staffPayouts, /Why it failed: \{p\.failureReason\}/);
  assert.match(staffPayouts, /sm:contents/);
});

// ── Link Wise says so when Wise isn't set up ────────────────────────────────
test('Link Wise shows a message instead of opening a Wise error page', () => {
  const api = read('lib/linkedAccountApi.ts');
  assert.match(api, /Promise<\{ authUrl: string \| null; message\?: string \}>/);
  const linked = read('components/billing/LinkedAccountIntegration.tsx');
  assert.match(linked, /connect: \(p: LinkedProvider\) => Promise<string \| null>/);
  assert.match(linked, /if \(authUrl\) \{\n\s+window\.location\.href = authUrl;/);
  assert.match(linked, /<p role="alert"/);
  const wallet = read('app/(dashboard)/billing/page.tsx');
  assert.match(wallet, /const problem = await linked\.connect\("wise"\);\n\s+if \(problem\) toast\.error\("Wise can't be linked yet", \{ description: problem \}\);/);
});

test("the website no longer carries a Wise client pointing at Wise's retired test site", () => {
  assert.equal(fs.existsSync(fileURLToPath(new URL('../src/lib/wise-client.ts', import.meta.url))), false);
});

// ── Receive is "still in development" until the real payment page exists ────
test('Receive explains it is in development instead of showing a link that 404s', () => {
  const wallet = read('app/(dashboard)/billing/page.tsx');
  assert.match(wallet, /toast\.info\("Receive is still in development", \{\n\s+description: RECEIVE_IN_DEVELOPMENT_MESSAGE,/);
  assert.match(wallet, /use Request Payment on a lead\./);
  assert.doesNotMatch(wallet, /ReceiveModal|"receive"/);
  assert.equal(fs.existsSync(fileURLToPath(new URL('../src/components/billing/ReceiveModal.tsx', import.meta.url))), false);
  assert.match(read('components/billing/BalanceCard.tsx'), /label="Receive" sub="In development"/);
});

// ── Payments Due opens Suprah Pay at "To pay" ───────────────────────────────
test('Payments Due opens Suprah Pay scrolled to the "To pay" list', () => {
  assert.match(read('components/customer/garage/OverviewTab.tsx'), /href: "\/customer\/payments#to-pay"/);
  const page = read('app/(customer)/customer/payments/page.tsx');
  assert.match(page, /<section id="to-pay" ref=\{toPayRef\} aria-labelledby="to-pay-heading"/);
  assert.match(page, /<p id="to-pay-heading" tabIndex=\{-1\}/);
  assert.match(page, /window\.location\.hash !== "#to-pay"/);
  assert.match(page, /prefers-reduced-motion: reduce/);
});

// ── CRM dashboard: refunded payments ───────────────────────────────────────
const revenueCards = read('app/(dashboard)/components/RevenueIntelligence.tsx');

test('the live payments list labels every status, including partly refunded', () => {
  assert.match(revenueCards, /if \(isPartlyRefunded\(payment\)\) return \{ label: "Partly refunded"/);
  for (const label of ['Paid', 'Processing', 'Pending', 'Failed', 'Refunded', 'Cancelled']) {
    assert.match(revenueCards, new RegExp(`label: "${label}"`), label);
  }
  // Pending, refunded and cancelled payments no longer fall through to "Failed".
  assert.doesNotMatch(revenueCards, /: "Failed"\}/);
});

test('the revenue cards wrap long text and have nothing under 11px', () => {
  assert.doesNotMatch(revenueCards, /\btruncate\b/);
  assert.doesNotMatch(revenueCards, /text-\[(7|8|9|10)px\]/);
  assert.doesNotMatch(revenueCards, /fontSize: (7|8|9|10),/);
});

// ── Staff Payments page: phones, wrapping, Revenue Trend ───────────────────
test('Revenue Trend shows the last 6 months from the server totals, 0 for missing months', () => {
  const now = new Date('2026-02-15T10:00:00Z');
  const trend = refunds.revenueTrend(
    [{ year: 2025, month: 12, revenue: 1200.5 }, { year: 2026, month: 2, revenue: 74.5 }],
    now,
  );
  assert.deepEqual(trend.map((m) => m.label), ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']);
  assert.deepEqual(trend.map((m) => m.value), [0, 0, 0, 1200.5, 0, 74.5]);
  // An older server without the totals still draws an empty chart.
  assert.deepEqual(refunds.revenueTrend(undefined, now).map((m) => m.value), [0, 0, 0, 0, 0, 0]);
  // The chart no longer adds up the payments on screen.
  assert.match(staffPayments, /revenueTrend\(stats\?\.monthlyRevenue, new Date\(\)\)/);
  assert.doesNotMatch(staffPayments, /months\[idx\]\.value \+= payment\.amount/);
});

test('the Payments page fits phones: cards, wrapping text, no sideways scrolling', () => {
  assert.doesNotMatch(staffPayments, /textOverflow: "ellipsis"/);
  assert.doesNotMatch(staffPayments, /overflowX: "auto"/);
  assert.doesNotMatch(staffPayments, /minWidth: 520/);
  assert.doesNotMatch(staffPayments, /fontSize: (7|8|9|10),/);
  // Phones: one card per payment; computers: the table with column titles.
  assert.match(staffPayments, /const ROW_SHAPE = "rounded-xl border border-border sm:rounded-none sm:border-0 sm:border-b"/);
  assert.match(staffPayments, /\$\{ROW_GRID\} hidden px-4 py-2\.5 sm:grid/);
  // Status filters wrap; rows and icon buttons can be used with a keyboard or screen reader.
  assert.match(staffPayments, /aria-label="Filter by status"[\s\S]{0,80}flexWrap: "wrap"/);
  assert.match(staffPayments, /<button\n\s+type="button"\n\s+onClick=\{onSelect\}/);
  for (const label of ['Refresh payments', 'Close payment details', 'Close filters', 'Dismiss', 'Search payments']) {
    assert.match(staffPayments, new RegExp(`aria-label="${label}"`), label);
  }
  // Toasts stay inside the screen on narrow phones.
  assert.match(staffPayments, /maxWidth: "min\(340px, 100%\)"/);
});

// ── Suprah Pay screens: no loose `any` types ───────────────────────────────
test('the Suprah Pay screens have no `any` types', () => {
  for (const rel of [
    'app/(customer)/customer/payments/page.tsx',
    'components/customer/garage/OverviewTab.tsx',
    'app/(dashboard)/billing/page.tsx',
    'app/(dashboard)/billing/payments/page.tsx',
    'app/(dashboard)/billing/driver-payouts/page.tsx',
    'app/(driver)/driver/settings/page.tsx',
    'app/(admin)/admin/payouts/page.tsx',
  ]) {
    assert.doesNotMatch(read(rel), /:\s*any\b|\bas any\b|<any>|any\[\]/, rel);
  }
});
