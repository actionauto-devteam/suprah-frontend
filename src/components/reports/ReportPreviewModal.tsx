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
  ChevronDown,
  FileSpreadsheet,
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
  onDownload: (format: "pdf" | "xlsx") => void
}


type ExportFormat = "pdf" | "xlsx";

function PreviewDownloadMenu({
  isDownloading,
  onDownload,
}: {
  isDownloading: boolean;
  onDownload: (format: ExportFormat) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectFormat = (format: ExportFormat) => {
    setOpen(false);
    onDownload(format);
  };

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5 text-xs font-medium"
        onClick={() => setOpen((current) => !current)}
        disabled={isDownloading}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isDownloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        <span className="hidden xs:inline">
          {isDownloading ? "Generating" : "Download"}
        </span>
        <span className="xs:hidden">
          {isDownloading ? "Generating" : "Download"}
        </span>
        {!isDownloading && <ChevronDown className="size-3.5" />}
      </Button>

      {open && !isDownloading && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => selectFormat("pdf")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
          >
            <FileText className="size-4 text-red-500" />
            Download PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => selectFormat("xlsx")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Download Excel
          </button>
        </div>
      )}
    </div>
  );
}


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
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-105">
                <Table className="min-w-[900px]">
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
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-105">
                <Table className="min-w-[760px]">
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
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-105">
                <Table className="min-w-[760px]">
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
  const title = isDriver ? "Driver Performance" : "Billings & Revenue";
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
        overlayClassName="bg-black/65 backdrop-blur-sm"
        className="w-[96vw] max-w-300 sm:max-w-[min(96vw,1200px)] p-0 gap-0 overflow-hidden max-h-[92dvh] min-h-[62dvh] flex flex-col rounded-2xl border-border/60 bg-background/95 shadow-2xl"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`size-10 rounded-lg flex items-center justify-center border shrink-0 ${isDriver
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
                : "bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800"
                }`}
            >
              <FileText className={`size-4.5 ${accentColor}`} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight truncate">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {monthLabel}
                <span className="mx-1.5 opacity-40">·</span>
                Preview before download
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto sm:mt-0.5">
            <PreviewDownloadMenu
              isDownloading={isDownloading}
              onDownload={onDownload}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close report preview"
              onClick={onClose}
              className="size-9 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 flex-1">
          {isDriver
            ? <DriverPreview loads={loads} />
            : <BillingPreview payments={payments} payouts={payouts} />
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}