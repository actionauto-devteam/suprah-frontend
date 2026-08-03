"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DriverPayout } from "@/types/driver-payout";
import { Payment } from "@/types/billing";
import { fmtDate } from "@/lib/transportation-reports";
import { formatCurrency } from "@/utils/format";
import ReportAnalyticsPanel from "@/components/reports/analytics/ReportAnalyticsPanel";
import {
  buildPaymentStatusSummary,
  buildPayoutStatusSummary,
  getBillingSummary,
  normalizeStatus,
  sortPayments,
  sortPayouts,
} from "../shared/billing-report-utils";


interface BillingRevenuePreviewProps {
  payments: Payment[];
  payouts: DriverPayout[];
  periodLabel?: string;
}

interface SummaryCardProps {
  label: string;
  value: string | number;
  description?: string;
  accent: string;
  icon: React.ReactNode;
}

function SummaryCard({
  label,
  value,
  description,
  accent,
  icon,
}: SummaryCardProps) {
  return (
    <div
      className={`rounded-xl border bg-card px-4 py-4 shadow-sm ${accent}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-muted-foreground">
          {label}
        </p>

        <span className="shrink-0 opacity-70">{icon}</span>
      </div>

      <p className="text-xl font-bold leading-none text-foreground">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>

      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function paymentBadgeClass(status: string) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "succeeded") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "processing"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
  }

  if (normalizedStatus === "refunded") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
  }

  if (
    normalizedStatus === "failed" ||
    normalizedStatus === "cancelled"
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function payoutBadgeClass(status: string) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "processing"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
  }

  if (normalizedStatus === "failed") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

export function BillingRevenuePreview({
  payments,
  payouts,
  periodLabel,
}: BillingRevenuePreviewProps) {
  const summary = React.useMemo(
    () => getBillingSummary(payments, payouts),
    [payments, payouts],
  );

  // The parent workspace already supplies the filtered records. Re-filtering
  // here would silently apply a second current-month filter and make the
  // summary disagree with the visible detail tables.
  const sortedPayments = React.useMemo(
    () => sortPayments(payments),
    [payments],
  );

  const sortedPayouts = React.useMemo(
    () => sortPayouts(payouts),
    [payouts],
  );

  const paymentStatusSummary = React.useMemo(
    () => buildPaymentStatusSummary(payments),
    [payments],
  );

  const payoutStatusSummary = React.useMemo(
    () => buildPayoutStatusSummary(payouts),
    [payouts],
  );

  return (
    <div className="space-y-7">
      <section>
        <SectionLabel>Executive Summary</SectionLabel>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Revenue Collected"
            value={formatCurrency(summary.revenueCollected)}
            description={`${summary.successfulPaymentCount} successful payment${
              summary.successfulPaymentCount === 1 ? "" : "s"
            }`}
            accent="border-l-2 border-l-emerald-500"
            icon={
              <TrendingUp className="size-4 text-emerald-500" />
            }
          />

          <SummaryCard
            label="Pending Revenue"
            value={formatCurrency(summary.pendingRevenue)}
            description="Pending and processing payments"
            accent="border-l-2 border-l-amber-500"
            icon={<Clock className="size-4 text-amber-500" />}
          />

          <SummaryCard
            label="Failed Payment Value"
            value={formatCurrency(summary.failedPaymentValue)}
            description="Failed payment attempts"
            accent="border-l-2 border-l-red-500"
            icon={<AlertCircle className="size-4 text-red-500" />}
          />

          <SummaryCard
            label="Refunded Invoice Value"
            value={formatCurrency(summary.refundedAmount)}
            description="Original value of refunded invoices"
            accent="border-l-2 border-l-blue-500"
            icon={
              <RefreshCcw className="size-4 text-blue-500" />
            }
          />

          <SummaryCard
            label="Paid Driver Costs"
            value={formatCurrency(summary.paidDriverCosts)}
            description={`${formatCurrency(
              summary.pendingDriverCosts,
            )} pending driver costs`}
            accent="border-l-2 border-l-violet-500"
            icon={
              <DollarSign className="size-4 text-violet-500" />
            }
          />

          <SummaryCard
            label="Revenue After Driver Costs"
            value={formatCurrency(summary.netPosition)}
            description="Collected revenue less paid driver costs"
            accent={
              summary.netPosition >= 0
                ? "border-l-2 border-l-emerald-500"
                : "border-l-2 border-l-red-500"
            }
            icon={
              summary.netPosition >= 0 ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <AlertCircle className="size-4 text-red-500" />
              )
            }
          />

          <SummaryCard
            label="Average Successful Invoice"
            value={formatCurrency(summary.averageInvoice)}
            description={`${summary.paymentSuccessRate.toFixed(
              1,
            )}% payment success rate`}
            accent="border-l-2 border-l-sky-500"
            icon={
              <DollarSign className="size-4 text-sky-500" />
            }
          />
        </div>
      </section>

      <ReportAnalyticsPanel
        reportId="billing-report"
        payments={payments}
        payouts={payouts}
        periodContext={{ label: periodLabel }}
        compact
      />

      <section>
        <SectionLabel>Payment Status Breakdown</SectionLabel>

        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="text-center text-xs font-semibold">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-semibold">
                  Transactions
                </TableHead>
                <TableHead className="text-right text-xs font-semibold">
                  Amount
                </TableHead>
                <TableHead className="text-right text-xs font-semibold">
                  Share
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paymentStatusSummary.map((item) => (
                <TableRow key={item.status} className="text-xs">
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${paymentBadgeClass(
                        item.status,
                      )}`}
                    >
                      {formatStatus(item.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {item.count}
                  </TableCell>

                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.amount)}
                  </TableCell>

                  <TableCell className="text-right text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionLabel>Driver Payout Status</SectionLabel>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {payoutStatusSummary.map((item) => (
            <div
              key={item.status}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium ${payoutBadgeClass(
                    item.status,
                  )}`}
                >
                  {formatStatus(item.status)}
                </Badge>

                <span className="text-xs text-muted-foreground">
                  {item.count}
                </span>
              </div>

              <p className="text-lg font-bold text-foreground">
                {formatCurrency(item.amount)}
              </p>

              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.percentage.toFixed(1)}% of payout value
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Customer Payments</SectionLabel>

        {sortedPayments.length === 0 ? (
          <div className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground">
            No payments recorded during this period.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto">
                <Table className="min-w-[1050px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-center text-xs font-semibold">
                        Invoice
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Description
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        Amount
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Method
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sortedPayments.map((payment) => (
                      <TableRow
                        key={payment._id}
                        className="text-xs hover:bg-muted/30"
                      >
                        <TableCell className="text-center font-medium">
                          {payment.invoiceNumber || "—"}
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {payment.customerName || "Unknown"}
                            </p>

                            <p className="text-[10px] text-muted-foreground">
                              {payment.customerEmail || "—"}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          <span
                            className="block max-w-[360px] whitespace-normal break-words"
                            title={payment.description || "—"}
                          >
                            {payment.description || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right font-semibold">
                          {formatCurrency(
                            Number(payment.amount || 0),
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${paymentBadgeClass(
                              payment.status,
                            )}`}
                          >
                            {formatStatus(payment.status)}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center text-muted-foreground">
                          {payment.paymentMethod || "—"}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-center text-muted-foreground">
                          {fmtDate(
                            payment.paidAt || payment.createdAt,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Driver Payouts</SectionLabel>

        {sortedPayouts.length === 0 ? (
          <div className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground">
            No driver payouts recorded during this period.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <div className="max-h-[420px] overflow-y-auto">
                <Table className="min-w-[900px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-center text-xs font-semibold">
                        Payout
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Driver
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Description
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold">
                        Amount
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-center text-xs font-semibold">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sortedPayouts.map((payout) => (
                      <TableRow
                        key={payout._id}
                        className="text-xs hover:bg-muted/30"
                      >
                        <TableCell className="text-center font-medium">
                          {payout.payoutNumber || "—"}
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {payout.driverName || "Unknown"}
                            </p>

                            <p className="text-[10px] text-muted-foreground">
                              {payout.driverEmail || "—"}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          <span
                            className="block max-w-[380px] whitespace-normal break-words"
                            title={payout.description || "—"}
                          >
                            {payout.description || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right font-semibold">
                          {formatCurrency(
                            Number(payout.amount || 0),
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${payoutBadgeClass(
                              payout.status,
                            )}`}
                          >
                            {formatStatus(payout.status)}
                          </Badge>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-center text-muted-foreground">
                          {fmtDate(
                            payout.paidAt || payout.createdAt,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Financial Insights</SectionLabel>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] text-muted-foreground">
              Payment Success Rate
            </p>

            <p className="mt-1 text-lg font-bold text-foreground">
              {summary.paymentSuccessRate.toFixed(1)}%
            </p>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Successful payments compared to all processed invoices.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] text-muted-foreground">
              Driver Cost Ratio
            </p>

            <p className="mt-1 text-lg font-bold text-foreground">
              {summary.driverCostRatio.toFixed(1)}%
            </p>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Percentage of collected revenue allocated to driver payouts.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] text-muted-foreground">
              Average Successful Invoice
            </p>

            <p className="mt-1 text-lg font-bold text-foreground">
              {formatCurrency(summary.averageInvoice)}
            </p>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Average value of completed customer payments.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] text-muted-foreground">
              Failed Payment Value
            </p>

            <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.failedPaymentValue)}
            </p>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Total value of failed payment attempts.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] text-muted-foreground">
              Pending Driver Costs
            </p>

            <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(summary.pendingDriverCosts)}
            </p>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Driver payouts still awaiting completion.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] text-muted-foreground">
              Revenue After Driver Costs
            </p>

            <p
              className={`mt-1 text-lg font-bold ${
                summary.netPosition >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(summary.netPosition)}
            </p>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Remaining revenue after completed driver payouts.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}