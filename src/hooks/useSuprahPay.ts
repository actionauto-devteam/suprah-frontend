"use client";

/**
 * SuprahPay data for the dealership's screens (2026-11-21): its settings and
 * what the signed-in person may do, what Suprah owes the dealership, and its
 * Stripe payout account. The server checks every permission again; these only
 * decide what the screens show.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SuprahPaySettings {
  /** SuprahPay is turned on for the dealership (Action Auto Utah pilots it first). */
  enabled: boolean;
  /** The dealership's default sales tax rate, in percent. */
  defaultTaxRate: number;
  /** The largest amount a customer can pay at once. */
  maxPaymentAmount: number;
  /** Suprah's fee on customer payments, in percent. */
  feePercent: number;
  /** A dealership admin: can change these settings and set up the payout account. */
  canEdit: boolean;
  /** Admins and staff with Finance access: can send requests and invoices, cancel and refund. */
  canManagePayments: boolean;
}

export interface PayoutSummary {
  amount: number;
  paymentCount: number;
  heldCount: number;
}

export interface DealershipPayoutRecord {
  _id: string;
  amount: number;
  paymentsTotal: number;
  suprahFee: number;
  adjustments: number;
  paymentCount: number;
  status: "sending" | "sent" | "failed";
  cutoff: string;
  sentAt: string | null;
  createdAt: string;
}

export interface DealershipPayouts {
  payoutAccountConnected: boolean;
  payoutsStartAt: string | null;
  /** Everything Suprah owes the dealership now. */
  balance: PayoutSummary;
  /** Paid before this Monday (Utah time): this week's payout once approved. */
  thisWeek: PayoutSummary & { cutoff: string };
  history: DealershipPayoutRecord[];
}

export interface PayoutAccount {
  connected: boolean;
  ready?: boolean;
  needsMoreInfo?: boolean;
  detailsSubmitted?: boolean;
  needsReconnect?: boolean;
  error?: string;
}

const dataOf = <T,>(res: { data?: { data?: unknown } }) => res?.data?.data as T;

export function useSuprahPaySettings() {
  return useQuery({
    queryKey: ["suprahpay", "settings"],
    queryFn: async () => dataOf<SuprahPaySettings>(await apiClient.get("/api/payments/settings")),
    staleTime: 60_000,
  });
}

export function useDealershipPayouts(enabled = true) {
  return useQuery({
    queryKey: ["suprahpay", "payouts"],
    queryFn: async () => dataOf<DealershipPayouts>(await apiClient.get("/api/payments/payouts")),
    enabled,
    staleTime: 30_000,
  });
}

export function usePayoutAccount(enabled = true) {
  return useQuery({
    queryKey: ["suprahpay", "payout-account"],
    queryFn: async () => dataOf<PayoutAccount>(await apiClient.get("/api/payments/payout-account")),
    enabled,
    staleTime: 30_000,
  });
}

/** Refreshes every SuprahPay query after a change. */
export function useRefreshSuprahPay() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["suprahpay"] });
}
