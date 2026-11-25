import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// SuprahPay batch 6 (2026-11-23): Payment details as a drawer or pop-up, one
// "awaiting payment" rule, tax on Leads requests, the Awaiting payment page on
// phones, refunds told, and totals that never make numbers up.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const payments = read('app/(dashboard)/billing/payments/page.tsx');

test('Payment details: a drawer beside the list on computers, a pop-up in the middle on phones and tablets', () => {
  // Laptop width and up, the same point where the header drawers sit beside the page.
  assert.match(payments, /window\.matchMedia\("\(min-width: 1024px\)"\)/);
  // Computers: same size and place as Notifications, no dark layer, the list keeps room.
  assert.match(payments, /id="payment-details-drawer"/);
  assert.match(payments, /className="fixed inset-y-0 right-0 z-\[60\] w-\[340px\] xl:w-\[380px\] motion-reduce:animate-none"/);
  assert.match(payments, /className=\{selected \? "lg:pr-\[340px\] xl:pr-\[380px\]" : undefined\}/);
  // Phones and tablets: centered, fits the screen (notch and home bar clear), scrolls inside.
  assert.match(payments, /className="fixed inset-0 z-\[65\] flex items-center justify-center"/);
  assert.match(payments, /max\(12px, env\(safe-area-inset-top\)\)/);
  assert.match(payments, /className="relative w-full max-w-\[480px\] motion-reduce:animate-none"/);
  assert.match(payments, /role="dialog"\n\s+aria-modal="true"\n\s+aria-labelledby="payment-details-title"\n\s+onKeyDown=\{keepFocusInside\}/);
  assert.match(payments, /maxHeight: "100%",\n\s+overflowY: "auto",/);
  // The old full-screen layer that blocked the list is gone.
  assert.doesNotMatch(payments, /zIndex: 900/);
  assert.doesNotMatch(payments, /width: "min\(100vw, clamp\(320px, 30vw, 440px\)\)"/);
});

test('Payment details: one drawer at a time, without changing the shared staff layout', () => {
  assert.match(payments, /const HEADER_DRAWER_IDS = \["notification-drawer", "suprahspace-drawer"\];/);
  assert.match(payments, /button\[aria-expanded="true"\]\[aria-controls\]/);
  assert.match(payments, /attributeFilter: \["aria-expanded"\]/);
  // Opening a payment closes Notifications / SuprahSpace the way their own button does...
  assert.match(payments, /for \(const button of openHeaderDrawerButtons\(\)\) button\.click\(\);\n\s+setSelected\(payment\);/);
  // ...and opening one of those closes Payment details.
  assert.match(payments, /if \(headerDrawerOpen\) setSelected\(null\);/);
  assert.match(payments, /onSelect=\{\(\) => openPayment\(payment\)\}/);
  // Focus starts on Close and goes back to the payment row afterwards.
  assert.match(payments, /closeRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(payments, /requestAnimationFrame\(\(\) => opener\.focus\(\{ preventScroll: true \}\)\)/);
  const layout = read('app/(dashboard)/layout.tsx');
  assert.doesNotMatch(layout, /payment-details/);
});

test('Payment details: the actions box shows only when it has something in it', () => {
  assert.match(payments, /const isAwaitingPayment = \(status: Payment\["status"\]\) =>\n\s+status === "pending" \|\| status === "failed" \|\| status === "processing";/);
  assert.match(payments, /const showFinanceNote = !!suprahPay && !canManage && \(awaiting \|\| refundable > 0\);/);
  assert.match(payments, /const hasActions = showFinanceNote \|\| showSend \|\| showRefund \|\| showCancel;/);
  assert.match(payments, /\{hasActions && \(\n\s+<div/);
  assert.doesNotMatch(payments, /\{suprahPay && !canManage && \(/);
});

test('Payment details: "Created from CRM lead <id>" opens the lead instead of showing its id', () => {
  assert.match(payments, /const match = \/\\bCRM lead \(\[a-f0-9\]\{24\}\)\\b\/i\.exec\(notes\);/);
  assert.match(payments, /href=\{`\/crm\/leads\?leadId=\$\{match\[1\]\}`\}/);
  assert.match(payments, />\n\s+Open lead\n\s+<\/Link>/);
  // The Leads page itself (others' code) is unchanged: it already opens ?leadId= and checks access.
  const leads = read('components/LeadsTab.tsx');
  assert.match(leads, /const leadId = params\.get\("leadId"\);/);
});

test('Leads Request Payment has a Tax box that starts at the dealership default (decision B7)', () => {
  const leads = read('components/LeadsTab.tsx');
  assert.match(leads, /taxRate: suprahPay \? String\(suprahPay\.defaultTaxRate \?\? 0\) : "",/);
  assert.match(leads, /<PaymentField label="Tax \(%\)">/);
  assert.match(leads, /<PaymentField label="Amount before tax \(USD\)" required>/);
  // One item for the amount with the tax rate; the server adds the tax and the total.
  assert.match(leads, /lineItems: \[\{ label: description\.slice\(0, 200\), kind: "product", quantity: 1, unitPrice: amount \}\],\n\s+taxRate: tax\.rate,/);
  assert.match(leads, /setPaymentError\("Enter a tax rate from 0% to 100%, or 0 for no tax\."\);/);
  // What the customer pays, said plainly.
  assert.match(leads, /`The customer pays \$\{formatCurrency\(taxPreview\.total\)\}/);
  assert.match(leads, /plus your dealership's default sales tax\./);
});

test('Awaiting payment: no sideways scrolling or "…" on phones, and payment-started invoices are listed', () => {
  const page = read('app/(dashboard)/billing/awaiting-payment/page.tsx');
  assert.doesNotMatch(page, /overflowX: "auto"/);
  assert.doesNotMatch(page, /minWidth: 600/);
  assert.doesNotMatch(page, /textOverflow: "ellipsis"/);
  assert.match(page, /const WRAP: React\.CSSProperties = \{ whiteSpace: "normal", overflowWrap: "anywhere" \};/);
  assert.match(page, /className=\{ROW_GRID\}/);
  assert.match(page, /flexWrap: "wrap",/);
  assert.match(page, /\(\["all", "pending", "processing", "failed"\] as AwaitingStatus\[\]\)/);
  // A request that didn't go out says why, under its row.
  assert.match(page, /id=\{`request-error-\$\{payment\._id\}`\}/);
  assert.match(page, /"The request wasn't sent\. Check your connection and try again\."/);
});

test('the SuprahPay overview never shows made-up totals, and counts every invoice still waiting', () => {
  const overview = read('app/(dashboard)/billing/page.tsx');
  assert.doesNotMatch(overview, /buildStatsFromPayments/);
  assert.match(overview, /setStatsError\(!freshStats\);/);
  assert.match(overview, /The payment totals couldn&apos;t be loaded/);
  assert.match(overview, /setPendingCount\(pendingRes\.status === "fulfilled" \? loadedPending\.length : 0\);/);
  assert.match(overview, /\(stats\?\.byStatus\?\.pending\?\.count \?\? 0\) \+ \(failed\?\.count \?\? 0\) \+ \(stats\?\.byStatus\?\.processing\?\.count \?\? 0\)/);
  const card = read('components/billing/BalanceCard.tsx');
  assert.match(card, /const unavailable = !isLoading && !stats;/);
});

test('the customer SuprahPay page checks again only while a payment is going through', () => {
  const customer = read('app/(customer)/customer/payments/page.tsx');
  assert.match(customer, /const paying = d\?\.payments\?\.some\(\(p\) => p\.status === "processing"\);\n\s+return paying \? 8_000 : false;/);
  assert.doesNotMatch(customer, /p\.status === "pending" \|\| p\.status === "processing"\);\n\s+return active/);
});

test('the refund notice is a known notification type that opens SuprahPay', () => {
  const types = read('types/notification.ts');
  assert.match(types, /\| 'payment_refunded'/);
  const utils = read('components/notifications/notification-utils.ts');
  assert.match(utils, /payment_refunded: \{ icon: CreditCard,/);
  assert.match(utils, /payment_refunded: 'Refund',/);
  assert.equal(utils.split("payment_refunded: '/customer/payments'").length - 1, 2, 'staff and customer routes');
});

// ── Batch 7: a new or replaced payout account is held until a super admin confirms it ──
test('super admins see why a payout is held and confirm the payout account they checked', () => {
  const admin = read('app/(admin)/admin/suprahpay/page.tsx');
  assert.match(admin, /new: "New payout account: payouts are on hold until you confirm it\."/);
  assert.match(admin, /replaced: "Payout account replaced: payouts are on hold until you confirm the new one\."/);
  assert.match(admin, /bank_changed: "Bank details changed in Stripe: payouts are on hold until you confirm them\."/);
  // A held dealership gets Confirm account instead of Send.
  assert.match(admin, /const hold = row\.payoutAccountConnected \? row\.payoutAccountHold : null/);
  assert.match(admin, /\{hold \? \(\n\s+<Button size="sm" variant="outline"[^\n]*onClick=\{\(\) => confirmAccount\(row\)\}>/);
  // It shows the bank and business to check with the dealership, then confirms the bank that was shown.
  assert.match(admin, /\/payout-account`\),/);
  assert.match(admin, /Check these details with the dealership \(for example, call their admin\) before you confirm\./);
  assert.match(admin, /\{ bankId: check\.bank\?\.id \?\? null \},/);
  assert.match(admin, /isn't ready yet`/);
});

test("the dealership's screens say Suprah is checking a new payout account", () => {
  const hook = read('hooks/useSuprahPay.ts');
  assert.match(hook, /awaitingConfirmation\?: boolean;/);
  const panel = read('components/billing/SuprahPaySettingsPanel.tsx');
  assert.match(panel, /if \(account\.ready && account\.awaitingConfirmation\) \{\n\s+return \{ text: "Set up: Suprah is checking it before your payouts start", tone: T\.textSub \};/);
  const overview = read('app/(dashboard)/billing/page.tsx');
  assert.match(overview, /const accountReady = !!accountQuery\.data\?\.ready && !accountQuery\.data\?\.awaitingConfirmation;/);
  assert.match(overview, /"Payout account: Suprah is checking it"/);
});
