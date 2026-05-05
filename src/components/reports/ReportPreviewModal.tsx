"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { Payment } from "@/types/billing";
import { DriverPayout } from "@/types/driver-payout";
import { Load } from "@/types/load";
import {
  loadCustomer,
  loadVehicle,
  loadRoute,
  fmtDate,
  driverName,
} from "@/lib/transportation-reports";

interface ReportPreviewModalProps {
  open: boolean
  onClose: () => void
  reportType: "driver" | "billing"
  loads: Load[]
  payments: Payment[]
  payouts: DriverPayout[]
  monthLabel: string
  isDownloading: boolean
  onDownload: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "delivered")
    return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (s === "in-transit" || s === "picked up")
    return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  if (s === "posted" || s === "assigned" || s === "accepted")
    return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (s === "cancelled")
    return "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
  return "bg-muted text-muted-foreground border-border";
}

function paymentBadgeClass(status: string) {
  if (status === "succeeded")
    return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (status === "pending" || status === "processing")
    return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (status === "failed" || status === "cancelled")
    return "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
  return "bg-muted text-muted-foreground border-border";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`flex-1 min-w-27.5 rounded-lg border bg-card px-4 py-3 ${accent}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <span className="opacity-60">{icon}</span>
      </div>
      <p className="text-xl font-bold text-foreground leading-none">{value}</p>
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ── Driver Preview ────────────────────────────────────────────────────────────

function DriverPreview({ loads }: { loads: Load[] }) {
  const assigned = loads.filter(s => s.assignedDriverId != null)
  const delivered = assigned.filter(s => s.status === "Delivered").length
  const pendingApproval = assigned.filter(
    (s) => s.proofOfDelivery?.submittedAt && !s.proofOfDelivery?.confirmedAt,
  ).length;
  const approved = assigned.filter(
    (s) => !!s.proofOfDelivery?.confirmedAt,
  ).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex flex-wrap gap-2.5">
        <StatCard
          label="Assigned Loads"
          value={assigned.length}
          accent="border-border"
          icon={<FileText className="size-3.5" />}
        />
        <StatCard
          label="Delivered"
          value={delivered}
          accent="border-l-2 border-l-emerald-500 border-t-border border-r-border border-b-border"
          icon={<TrendingUp className="size-3.5 text-emerald-500" />}
        />
        <StatCard
          label="Pending Approval"
          value={pendingApproval}
          accent="border-l-2 border-l-amber-500 border-t-border border-r-border border-b-border"
          icon={<Clock className="size-3.5 text-amber-500" />}
        />
        <StatCard
          label="Dealer Approved"
          value={approved}
          accent="border-l-2 border-l-blue-500 border-t-border border-r-border border-b-border"
          icon={<CheckCircle2 className="size-3.5 text-blue-500" />}
        />
      </div>

      {/* Table */}
      <div>
        <SectionLabel>Load Details</SectionLabel>
        {assigned.length === 0 ? (
          <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
            No loads assigned this period.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-y-auto max-h-85">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="text-xs font-semibold w-40">
                      Driver
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-37.5">
                      Vehicle
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-37.5">
                      Customer
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Route
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-22.5">
                      Delivered
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-25">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-22.5">
                      Approval
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.map((s) => (
                    <TableRow key={s._id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {driverName(s)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loadVehicle(s)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loadCustomer(s)}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-block max-w-50 truncate text-muted-foreground"
                          title={loadRoute(s)}
                        >
                          {loadRoute(s)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {fmtDate(s.deliveredAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${statusBadgeClass(s.status)}`}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.proofOfDelivery?.confirmedAt ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Approved
                          </span>
                        ) : s.proofOfDelivery?.submittedAt ? (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            Pending
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Billing Preview ───────────────────────────────────────────────────────────

function BillingPreview({
  payments,
  payouts,
}: {
  payments: Payment[];
  payouts: DriverPayout[];
}) {
  const revenue = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingIn = payments
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);
  const paidOut = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingOut = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex flex-wrap gap-2.5">
        <StatCard
          label="Revenue Collected"
          value={formatCurrency(revenue)}
          accent="border-l-2 border-l-emerald-500 border-t-border border-r-border border-b-border"
          icon={<TrendingUp className="size-3.5 text-emerald-500" />}
        />
        <StatCard
          label="Pending Payments"
          value={formatCurrency(pendingIn)}
          accent="border-l-2 border-l-amber-500 border-t-border border-r-border border-b-border"
          icon={<Clock className="size-3.5 text-amber-500" />}
        />
        <StatCard
          label="Paid to Drivers"
          value={formatCurrency(paidOut)}
          accent="border-l-2 border-l-blue-500 border-t-border border-r-border border-b-border"
          icon={<CheckCircle2 className="size-3.5 text-blue-500" />}
        />
        <StatCard
          label="Pending Payouts"
          value={formatCurrency(pendingOut)}
          accent="border-border"
          icon={<Clock className="size-3.5" />}
        />
      </div>

      {/* Customer Payments */}
      <div>
        <SectionLabel>Customer Payments to Dealer</SectionLabel>
        {payments.length === 0 ? (
          <div className="rounded-lg border border-border py-8 text-center text-sm text-muted-foreground">
            No payments recorded this period.
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card/30 p-2 sm:p-3">
            <div className="overflow-y-auto overflow-x-auto max-h-87.5 rounded-md">
              <Table className="w-full table-auto min-w-160 md:min-w-0">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <TableRow className="bg-transparent hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">
                      Customer
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Description
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p._id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {p.customerName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="block truncate max-w-50" title={p.description}>
                          {p.description}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${paymentBadgeClass(p.status)}`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {fmtDate(p.paidAt || p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Driver Payouts */}
      <div>
        <SectionLabel>Driver Payouts from Dealer</SectionLabel>
        {payouts.length === 0 ? (
          <div className="rounded-lg border border-border py-8 text-center text-sm text-muted-foreground">
            No driver payouts recorded this period.
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card/30 p-2 sm:p-3">
            <div className="overflow-y-auto overflow-x-auto max-h-87.5 rounded-md">
              <Table className="w-full table-auto min-w-160 md:min-w-0">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <TableRow className="bg-transparent hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">
                      Driver
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Description
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p._id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {p.driverName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="block truncate max-w-50" title={p.description || "—"}>
                          {p.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${paymentBadgeClass(p.status)}`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {fmtDate(p.paidAt || p.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function ReportPreviewModal({
  open,
  onClose,
  reportType,
  loads,
  payments,
  payouts,
  monthLabel,
  isDownloading,
  onDownload,
}: ReportPreviewModalProps) {
  const isDriver = reportType === "driver";
  const title = isDriver ? "Driver Reports" : "Billing Report";
  const accentColor = isDriver
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-violet-600 dark:text-violet-400";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-300 p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col rounded-2xl"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start gap-3">
            <div
              className={`size-10 rounded-lg flex items-center justify-center border ${isDriver
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
                : "bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800"
                }`}
            >
              <FileText className={`size-4.5 ${accentColor}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {monthLabel}
                <span className="mx-1.5 opacity-40">·</span>
                Preview before download
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <Button
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={onDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close report preview"
              onClick={onClose}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex-1">
          {isDriver
            ? <DriverPreview loads={loads} />
            : <BillingPreview payments={payments} payouts={payouts} />
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}
