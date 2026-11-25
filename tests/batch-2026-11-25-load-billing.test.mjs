import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { billingInputProblem, billingInputToSend, EMPTY_BILLING_INPUT } from '../src/lib/load-billing.ts';

// SuprahPay batch 8 (2026-11-25): who pays for a load's shipping, Bills from
// Suprah, driver payouts after the shipping is paid, and COP/COD cash.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

test('Create Load checks who pays the same way as the server', () => {
  const customer = { ...EMPTY_BILLING_INPUT, billTo: 'customer', customerName: 'Pat Lee', customerEmail: 'pat@example.com' };
  assert.match(billingInputProblem(EMPTY_BILLING_INPUT, 500), /a customer or your dealership/);
  assert.match(billingInputProblem({ ...EMPTY_BILLING_INPUT, billTo: 'dealership' }, null), /driver's pay first/);
  assert.equal(billingInputProblem({ ...EMPTY_BILLING_INPUT, billTo: 'dealership' }, 500), null);
  assert.match(billingInputProblem({ ...customer, customerEmail: 'nope' }, 500), /email/);
  assert.match(billingInputProblem(customer, 500), /shipping price/);
  assert.match(billingInputProblem({ ...customer, shippingPrice: '499.99' }, 500), /can't be more than the customer's shipping price/);
  assert.match(billingInputProblem({ ...customer, shippingPrice: '10.005' }, 5), /dollars and cents/);
  assert.equal(billingInputProblem({ ...customer, shippingPrice: '650' }, 500), null);
  // Cash to the driver needs no price: the driver collects their pay.
  assert.equal(billingInputProblem({ ...customer, method: 'cod' }, 500), null);

  assert.deepEqual(billingInputToSend({ ...EMPTY_BILLING_INPUT, billTo: 'dealership', method: 'cod' }), { billTo: 'dealership', method: 'suprahpay' });
  assert.deepEqual(billingInputToSend({ ...customer, shippingPrice: ' 650 ' }), {
    billTo: 'customer', method: 'suprahpay', customerName: 'Pat Lee', customerEmail: 'pat@example.com', shippingPrice: 650,
  });
  assert.deepEqual(billingInputToSend({ ...customer, method: 'cop', shippingPrice: '650' }), {
    billTo: 'customer', method: 'cop', customerName: 'Pat Lee', customerEmail: 'pat@example.com',
  });
});

test('Create Load asks who pays only when SuprahPay is on, and cash is all or nothing', () => {
  const form = read('components/create-load/LoadFormLayout.tsx');
  assert.match(form, /const billingOn = !isEdit && !!suprahPaySettings\.data\?\.enabled/);
  assert.match(form, /\.\.\.\(billingOn && pricing\.isPricingEnabled !== false \? \{ billing: billingInputToSend\(billingInput\) \} : \{\}\)/);
  // The partial COP/COD amount and balance are hidden once who pays is chosen.
  assert.match(form, /hideCash=\{billingManaged\}/);
  assert.match(form, /\{!hideCash && \(<>\n\s+<label className="block min-w-0">\n\s+<span[^>]*>\n\s+COP \/ COD \(USD\)/);
  // Pricing skipped: settled outside Suprah.
  assert.match(form, /settled outside Suprah: your staff pay the driver directly/);
  const api = read('lib/api/loads.ts');
  assert.match(api, /\.\.\.\(payload\.billing \? \{ billing: payload\.billing \} : \{\}\)/);
});

test('The load page shows who pays, the invoice, the cash and whether the driver can be paid', () => {
  const page = read('app/(dashboard)/transportation/load/[id]/page.tsx');
  assert.match(page, /<LoadBillingCard\n\s+load=\{load\}/);
  const card = read('components/transportation/LoadBillingCard.tsx');
  assert.match(card, /apiClient\.put\(`\/api\/loads\/\$\{encodeURIComponent\(load\._id\)\}\/billing`, body\)/);
  assert.match(card, /Pricing was skipped, so this load is settled outside Suprah: your staff pay the driver directly\./);
  assert.match(card, /Choose who pays/);
  // Switching between SuprahPay and cash only until it's paid or the cash is confirmed.
  // Sending or cancelling invoices: admins and Finance access only (B4).
  assert.match(card, /const canManage = !!settings\.data\?\.canManagePayments/);
  assert.match(card, /const canSwitch = canManage && !!billing\?\.billTo && billing\.billTo === "customer" && !outside && !cancelled && !paid && !cashSettled/);
  assert.match(card, /Your dealership&apos;s admins and staff with Finance access can choose it\./);
  assert.doesNotMatch(card, /\btruncate\b/);
});

test('Bills from Suprah: listed for the dealership, paid by card by admins and Finance access', () => {
  const card = read('components/billing/SuprahBillsCard.tsx');
  assert.match(card, /queryKey: \["suprahpay", scope, "suprah-bills"\]/);
  assert.match(card, /apiClient\.post\(`\/api\/payments\/suprah-bills\/\$\{encodeURIComponent\(bill\._id\)\}\/pay`\)/);
  assert.match(card, /\{canPay && AWAITING\.has\(bill\.status\) && \(/);
  assert.match(card, /\{ left: status === "left" \}/);
  const overview = read('app/(dashboard)/billing/page.tsx');
  assert.match(overview, /<SuprahBillsCard canPay=\{!!settings\.canManagePayments\} \/>/);
});

test('Driver payouts are live: the carrier pay once the shipping is paid, with the reason when not', () => {
  const detail = read('app/(dashboard)/billing/driver-payouts/[id]/page.tsx');
  const list = read('app/(dashboard)/billing/driver-payouts/page.tsx');
  for (const page of [detail, list]) {
    assert.doesNotMatch(page, /still being built|still in development|PAYOUT_IN_DEVELOPMENT_MESSAGE/);
    assert.doesNotMatch(page, /\btruncate\b/);
  }
  assert.match(detail, /await apiClient\.post\("\/api\/driver-payouts", \{\n\s+loadId: load\._id,\n\s+driverId,\n\s+amount: driverPay\.amount,/);
  assert.match(detail, /Choose who pays on the load page/);
  // No typed amount: the driver is paid the load's carrier pay.
  assert.doesNotMatch(detail, /id="payout-amount"/);
  assert.match(list, /s\.driverPay\.message/);
});

test('COP/COD: the driver confirms the cash, the customer confirms paying', () => {
  const driverCard = read('components/driver/DriverCashCard.tsx');
  assert.match(driverCard, /apiClient\.post\(`\/api\/driver-tracking\/loads\/\$\{encodeURIComponent\(load\._id\)\}\/cash`, \{ received \}\)/);
  assert.match(driverCard, /cop: \["Picked Up", "In-Transit", "Delivered"\],\n\s+cod: \["Delivered"\],/);
  assert.match(read('app/(driver)/driver/loads/[id]/page.tsx'), /<DriverCashCard load=\{data\} onChanged=\{\(\) => void fetchDetail\(\)\} \/>/);
  const customer = read('components/customer/CustomerCashPayments.tsx');
  assert.match(customer, /apiClient\.get\("\/api\/quote-requests\/cash-payments"\)/);
  assert.match(customer, /apiClient\.post\(`\/api\/quote-requests\/cash-payments\/\$\{encodeURIComponent\(shipment\.loadId\)\}`\)/);
  assert.match(read('app/(customer)/customer/shipments/page.tsx'), /<CustomerCashPayments \/>/);
});

test("A booked shipment's SuprahPay invoice can't be cancelled by the customer", () => {
  const payments = read('app/(customer)/customer/payments/page.tsx');
  assert.match(payments, /const cancellable = inv\.billedTo !== "customer" && \(/);
});

test('Payment started shows as soon as Pay is pressed, and coming back to SuprahPay puts unpaid ones back to due', () => {
  const payments = read('app/(customer)/customer/payments/page.tsx');
  assert.match(payments, /const shownStatus = paying \? "processing" : inv\.status;/);
  assert.match(payments, /await apiClient\.post\("\/api\/payments\/checkout-return"\)/);
  const cash = read('components/customer/CustomerCashPayments.tsx');
  assert.match(cash, /couldn&apos;t be loaded\. Refresh to try again\./);
});

test('Cash to the driver is one choice, then at pickup (COP) or on delivery (COD)', () => {
  const fields = read('components/transportation/LoadBillingFields.tsx');
  assert.match(fields, /title="Cash to the driver \(COP\/COD\)"/);
  assert.match(fields, /When does the customer pay the driver\?/);
  assert.match(fields, /\{method === "cop" \? "At pickup \(COP\)" : "On delivery \(COD\)"\}/);
  assert.doesNotMatch(fields, /\["suprahpay", "cop", "cod"\] as LoadBillingMethod\[\]\)\.map/);
  const card = read('components/transportation/LoadBillingCard.tsx');
  assert.match(card, /Switch to cash to the driver \(COP\/COD\)/);
  assert.doesNotMatch(card, /Switch to cash at pickup|Switch to cash on delivery/);
});

test("Create Load's review shows who pays instead of the old partial cash amount", () => {
  const review = read('components/create-load/ReviewSection.tsx');
  assert.match(review, /\{whoPays \? \(\n\s+<Row label="Who pays" value=\{whoPays\} \/>/);
  const form = read('components/create-load/LoadFormLayout.tsx');
  assert.match(form, /whoPays=\{whoPaysLine\}/);
  assert.match(form, /cash to the driver \$\{billingInput\.method === "cop" \? "at pickup \(COP\)" : "on delivery \(COD\)"\}/);
});
