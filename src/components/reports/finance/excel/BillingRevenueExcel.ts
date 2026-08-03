import { buildReportAnalyticsModel } from "@/components/reports/analytics/report-analytics-data";
import type { Payment } from "@/types/billing";
import type { DriverPayout } from "@/types/driver-payout";
import type { ReportExportContextInput } from "@/components/reports/export/report-export-context";
import { normalizeReportExportContext } from "@/components/reports/export/report-export-context";
import { payoutLoadNumber, payoutRoute } from "@/components/reports/export/report-export-formatters";
import {
  getBillingSummary,
  sortPayments,
  sortPayouts,
} from "@/components/reports/finance/shared/billing-report-utils";
import {
  appendStandardWorkbookSheets,
  createDataSheet,
  createReportAnalyticsSheet,
  type ExcelColumn,
  type SummaryMetric,
  writeWorkbookBlob,
} from "@/components/reports/crm/shared/report-excel-utils";

export async function generateBillingRevenueExcel(
  payments: Payment[],
  payouts: DriverPayout[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const context = normalizeReportExportContext(contextInput, {
    reportId: "billing-report",
    title: "Billings & Revenue",
    description:
      "Customer payment activity, payment outcomes, driver payout costs, and revenue after completed driver costs.",
    recordCount: payments.length + payouts.length,
    sectionCounts: {
      "Customer Payment Records": payments.length,
      "Driver Payout Records": payouts.length,
    },
  });
  const summary = getBillingSummary(payments, payouts);
  const sortedPayments = sortPayments(payments);
  const sortedPayouts = sortPayouts(payouts);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "billing-report",
    periodContext: { label: context.periodLabel },
    payments,
    payouts,
  });

  const paymentColumns: ExcelColumn<Payment>[] = [
    { label: "Invoice", width: 20, value: (payment) => payment.invoiceNumber },
    { label: "Customer", width: 28, value: (payment) => payment.customerName },
    { label: "Customer Email", width: 34, value: (payment) => payment.customerEmail },
    { label: "Customer Phone", width: 20, value: (payment) => payment.customerPhone },
    { label: "Description", width: 52, value: (payment) => payment.description },
    { label: "Source", width: 16, value: (payment) => payment.source },
    { label: "Method", width: 20, value: (payment) => payment.paymentMethod },
    { label: "Amount", width: 16, value: (payment) => payment.amount, type: "currency", align: "right" },
    { label: "Subtotal", width: 16, value: (payment) => payment.subtotal, type: "currency", align: "right" },
    { label: "Tax Amount", width: 16, value: (payment) => payment.taxAmount, type: "currency", align: "right" },
    { label: "Currency", width: 12, value: (payment) => payment.currency },
    { label: "Status", width: 16, value: (payment) => payment.status, type: "status", align: "center" },
    { label: "Paid At", width: 20, value: (payment) => payment.paidAt, type: "datetime" },
    { label: "Due Date", width: 20, value: (payment) => payment.dueDate, type: "datetime" },
    { label: "Failure Reason", width: 38, value: (payment) => payment.failureReason },
    { label: "Notes", width: 44, value: (payment) => payment.notes },
    { label: "Quote ID", width: 24, value: (payment) => payment.quoteId },
    { label: "Load ID", width: 24, value: (payment) => payment.loadId || payment.shipmentId },
    { label: "Created", width: 20, value: (payment) => payment.createdAt, type: "datetime" },
    { label: "Updated", width: 20, value: (payment) => payment.updatedAt, type: "datetime" },
  ];

  const payoutColumns: ExcelColumn<DriverPayout>[] = [
    { label: "Payout #", width: 20, value: (payout) => payout.payoutNumber },
    { label: "Driver", width: 28, value: (payout) => payout.driverName },
    { label: "Driver Email", width: 34, value: (payout) => payout.driverEmail },
    { label: "Load", width: 22, value: payoutLoadNumber },
    { label: "Route", width: 38, value: payoutRoute },
    { label: "Description", width: 52, value: (payout) => payout.description },
    { label: "Amount", width: 16, value: (payout) => payout.amount, type: "currency", align: "right" },
    { label: "Currency", width: 12, value: (payout) => payout.currency },
    { label: "Status", width: 16, value: (payout) => payout.status, type: "status", align: "center" },
    { label: "Paid At", width: 20, value: (payout) => payout.paidAt, type: "datetime" },
    { label: "Failure Reason", width: 38, value: (payout) => payout.failureReason },
    { label: "Notes", width: 44, value: (payout) => payout.notes },
    { label: "Stripe Transfer ID", width: 30, value: (payout) => payout.stripeTransferId },
    { label: "Created", width: 20, value: (payout) => payout.createdAt, type: "datetime" },
    { label: "Updated", width: 20, value: (payout) => payout.updatedAt, type: "datetime" },
  ];

  const metrics: SummaryMetric[] = [
    { label: "Customer Payment Records", value: payments.length, type: "number", description: "All filtered customer payment records." },
    { label: "Successful Payments", value: summary.successfulPaymentCount, type: "number", description: "Payments marked Succeeded." },
    { label: "Revenue Collected", value: summary.revenueCollected, type: "currency", description: "Value of succeeded customer payments." },
    { label: "Pending Revenue", value: summary.pendingRevenue, type: "currency", description: "Value of pending and processing payments." },
    { label: "Failed Payment Value", value: summary.failedPaymentValue, type: "currency", description: "Value of failed payment attempts." },
    { label: "Refunded Invoice Value", value: summary.refundedAmount, type: "currency", description: "Original value of refunded payment records." },
    { label: "Paid Driver Costs", value: summary.paidDriverCosts, type: "currency", description: "Value of payouts marked Paid." },
    { label: "Pending Driver Costs", value: summary.pendingDriverCosts, type: "currency", description: "Value of pending and processing payouts." },
    { label: "Revenue After Driver Costs", value: summary.netPosition, type: "currency", description: "Collected revenue less paid driver costs." },
    { label: "Average Successful Invoice", value: summary.averageInvoice, type: "currency", description: "Average value of succeeded payment records." },
    { label: "Payment Success Rate", value: summary.paymentSuccessRate / 100, type: "percentage", description: "Succeeded payments compared with all filtered payments." },
    { label: "Driver Cost Ratio", value: summary.driverCostRatio / 100, type: "percentage", description: "Paid driver costs compared with collected revenue." },
  ];

  appendStandardWorkbookSheets({
    XLSX,
    workbook,
    context,
    summaryMetrics: metrics,
    detailSheet: createDataSheet(XLSX, sortedPayments, paymentColumns, "No customer payment records match the selected filters."),
    analyticsSheet: createReportAnalyticsSheet(XLSX, analyticsModel),
    extraSheets: [
      {
        name: "Driver Payouts",
        sheet: createDataSheet(XLSX, sortedPayouts, payoutColumns, "No driver payout records match the selected filters."),
      },
    ],
  });
  return writeWorkbookBlob(XLSX, workbook);
}
