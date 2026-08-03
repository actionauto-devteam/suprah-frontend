import { Payment } from "@/types/billing";
import { DriverPayout } from "@/types/driver-payout";

export interface BillingSummary {
  revenueCollected: number;
  pendingRevenue: number;
  failedPaymentValue: number;
  refundedAmount: number;
  paidDriverCosts: number;
  pendingDriverCosts: number;
  netPosition: number;
  paymentSuccessRate: number;
  driverCostRatio: number;
  averageInvoice: number;
  successfulPaymentCount: number;
}

export interface StatusSummaryItem {
  status: string;
  count: number;
  amount: number;
  percentage: number;
}

/**
 * Converts API statuses into a consistent lowercase format.
 */
export function normalizeStatus(status?: string): string {
  return String(status || "unknown")
    .trim()
    .toLowerCase();
}

/**
 * Creates the main financial summary used by Preview, PDF, and Excel.
 */
export function getBillingSummary(
  payments: Payment[],
  payouts: DriverPayout[],
): BillingSummary {
  const succeededPayments = payments.filter(
    (payment) => normalizeStatus(payment.status) === "succeeded",
  );

  const revenueCollected = succeededPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const pendingRevenue = payments
    .filter((payment) =>
      ["pending", "processing"].includes(
        normalizeStatus(payment.status),
      ),
    )
    .reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

  const failedPaymentValue = payments
  .filter(
    (payment) =>
      normalizeStatus(payment.status) === "failed",
  )
  .reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const refundedAmount = payments
    .filter(
      (payment) =>
        normalizeStatus(payment.status) === "refunded",
    )
    .reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

  const paidDriverCosts = payouts
    .filter(
      (payout) => normalizeStatus(payout.status) === "paid",
    )
    .reduce(
      (sum, payout) => sum + Number(payout.amount || 0),
      0,
    );

  const pendingDriverCosts = payouts
    .filter((payout) =>
      ["pending", "processing"].includes(
        normalizeStatus(payout.status),
      ),
    )
    .reduce(
      (sum, payout) => sum + Number(payout.amount || 0),
      0,
    );

  const netPosition = revenueCollected - paidDriverCosts;

  const averageInvoice =
    succeededPayments.length > 0
      ? revenueCollected / succeededPayments.length
      : 0;

  const paymentSuccessRate =
    payments.length > 0
      ? (succeededPayments.length / payments.length) * 100
      : 0;

  const driverCostRatio =
    revenueCollected > 0
      ? (paidDriverCosts / revenueCollected) * 100
      : 0;

  return {
  revenueCollected,
  pendingRevenue,
  failedPaymentValue,
  refundedAmount,
  paidDriverCosts,
  pendingDriverCosts,
  netPosition,
  paymentSuccessRate,
  driverCostRatio,
  averageInvoice,
  successfulPaymentCount: succeededPayments.length,
};
}

/**
 * Creates the status breakdown shown in the payment analysis table.
 */
export function buildPaymentStatusSummary(
  payments: Payment[],
): StatusSummaryItem[] {
  const statuses = [
    "succeeded",
    "pending",
    "processing",
    "failed",
    "refunded",
    "cancelled",
  ];

  const totalAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  return statuses.map((status) => {
    const matchingPayments = payments.filter(
      (payment) =>
        normalizeStatus(payment.status) === status,
    );

    const amount = matchingPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    return {
      status,
      count: matchingPayments.length,
      amount,
      percentage:
        totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    };
  });
}

/**
 * Creates the status breakdown shown in the driver payout cards.
 */
export function buildPayoutStatusSummary(
  payouts: DriverPayout[],
): StatusSummaryItem[] {
  const statuses = [
    "paid",
    "pending",
    "processing",
    "failed",
  ];

  const totalAmount = payouts.reduce(
    (sum, payout) => sum + Number(payout.amount || 0),
    0,
  );

  return statuses.map((status) => {
    const matchingPayouts = payouts.filter(
      (payout) =>
        normalizeStatus(payout.status) === status,
    );

    const amount = matchingPayouts.reduce(
      (sum, payout) => sum + Number(payout.amount || 0),
      0,
    );

    return {
      status,
      count: matchingPayouts.length,
      amount,
      percentage:
        totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    };
  });
}

/**
 * Returns payments sorted from newest to oldest.
 */
export function sortPayments(
  payments: Payment[],
): Payment[] {
  return [...payments].sort((first, second) => {
    const firstDate = new Date(
      first.paidAt || first.createdAt || 0,
    ).getTime();

    const secondDate = new Date(
      second.paidAt || second.createdAt || 0,
    ).getTime();

    return secondDate - firstDate;
  });
}

/**
 * Returns payouts sorted from newest to oldest.
 */
export function sortPayouts(
  payouts: DriverPayout[],
): DriverPayout[] {
  return [...payouts].sort((first, second) => {
    const firstDate = new Date(
      first.paidAt || first.createdAt || 0,
    ).getTime();

    const secondDate = new Date(
      second.paidAt || second.createdAt || 0,
    ).getTime();

    return secondDate - firstDate;
  });
}