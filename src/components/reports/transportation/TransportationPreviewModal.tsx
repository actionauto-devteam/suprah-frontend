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
  Package,
  MapPin,
  Truck,
  DollarSign,
  X,
} from "lucide-react";
import { Quote } from "@/types/transportation";
import { Load } from "@/types/load";
import ReportAnalyticsPanel from "@/components/reports/analytics/ReportAnalyticsPanel";
import {
  buildLoadSummary,
  buildQuoteSummary,
  fmtCurrency,
  fmtNumber,
  loadCustomer,
  loadVehicle,
  loadVin,
  loadRate,
  loadTransportType,
  driverName,
  quoteCustomer,
  quoteVehicle,
  quoteFromAddr,
  quoteToAddr,
  quoteEta,
  quoteTransportType,
} from "@/lib/transportation-reports";


interface TransportationPreviewModalProps {
  open: boolean;
  onClose: () => void;
  reportType: "load" | "quote";
  loads: Load[];
  quotes: Quote[];
  monthLabel: string;
  isDownloading: boolean;
  onDownload: (format: "pdf" | "xlsx") => void;
}


export {
  generateLoadReportPdf,
  generateQuoteReportPdf,
} from "./pdf-generators";

// ─── Modal Component ──────────────────────────────────────────────────────────

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

function quoteStatusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "booked")
    return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (s === "accepted")
    return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  if (s === "pending")
    return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (s === "rejected")
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

function LoadPreview({
  loads,
  periodLabel,
}: {
  loads: Load[];
  periodLabel?: string;
}) {
  const summary = buildLoadSummary(loads);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2.5">
        <StatCard
          label="Total Loads"
          value={summary.total}
          accent="border-border"
          icon={<Package className="size-3.5" />}
        />
        <StatCard
          label="Delivered"
          value={summary.delivered}
          accent="border-l-2 border-l-emerald-500 border-t-border border-r-border border-b-border"
          icon={<CheckCircle2 className="size-3.5 text-emerald-500" />}
        />
        <StatCard
          label="In Transit"
          value={summary.inTransit}
          accent="border-l-2 border-l-blue-500 border-t-border border-r-border border-b-border"
          icon={<Truck className="size-3.5 text-blue-500" />}
        />
        <StatCard
          label="Pending"
          value={summary.posted}
          accent="border-l-2 border-l-amber-500 border-t-border border-r-border border-b-border"
          icon={<Clock className="size-3.5 text-amber-500" />}
        />
        <StatCard
          label="Revenue"
          value={fmtCurrency(summary.totalRate)}
          accent="border-l-2 border-l-violet-500 border-t-border border-r-border border-b-border"
          icon={<DollarSign className="size-3.5 text-violet-500" />}
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Cancelled
          </p>
          <p className="text-sm font-bold text-red-600 dark:text-red-400">
            {summary.cancelled}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Avg Rate
          </p>
          <p className="text-sm font-bold text-foreground">
            {fmtCurrency(summary.avgRate)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Total Miles
          </p>
          <p className="text-sm font-bold text-foreground">
            {fmtNumber(summary.totalMiles)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Avg Delivery
          </p>
          <p className="text-sm font-bold text-foreground">
            {summary.avgDeliveryDays > 0
              ? `${summary.avgDeliveryDays.toFixed(1)}d`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Success Rate
          </p>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {summary.onTimeRate}%
          </p>
        </div>
      </div>

      <ReportAnalyticsPanel
        reportId="load-report"
        loads={loads}
        periodContext={{ label: periodLabel }}
        compact
      />

      <div>
        <SectionLabel>Load Details</SectionLabel>
        {loads.length === 0 ? (
          <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
            No loads this period.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-105">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className="w-25 text-center text-xs font-semibold">
                        Load #
                      </TableHead>
                      <TableHead className="w-22.5 text-center text-xs font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-27.5">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-30">
                        Vehicle
                      </TableHead>
                      <TableHead className="w-30 text-center text-xs font-semibold">
                        VIN
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-22.5">
                        Origin
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-22.5">
                        Destination
                      </TableHead>
                      <TableHead className="w-17.5 text-center text-xs font-semibold">
                        Type
                      </TableHead>
                      <TableHead className="w-20 text-right text-xs font-semibold">
                        Rate
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-25">
                        Driver
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loads.map((l) => (
                      <TableRow
                        key={l._id}
                        className="text-xs hover:bg-muted/30"
                      >
                        <TableCell className="text-center font-mono text-[11px] text-foreground">
                          {l.loadNumber || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${statusBadgeClass(l.status)}`}
                          >
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {loadCustomer(l)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-muted-foreground">
                          {loadVehicle(l)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-[10px] text-muted-foreground">
                          {loadVin(l)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.pickupLocation?.city || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.deliveryLocation?.city || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px]">
                            {loadTransportType(l)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {fmtCurrency(loadRate(l))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {driverName(l)}
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

function QuotePreview({
  quotes,
  periodLabel,
}: {
  quotes: Quote[];
  periodLabel?: string;
}) {
  const summary = buildQuoteSummary(quotes);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2.5">
        <StatCard
          label="Total Quotes"
          value={summary.total}
          accent="border-border"
          icon={<FileText className="size-3.5" />}
        />
        <StatCard
          label="Booked"
          value={summary.booked}
          accent="border-l-2 border-l-emerald-500 border-t-border border-r-border border-b-border"
          icon={<CheckCircle2 className="size-3.5 text-emerald-500" />}
        />
        <StatCard
          label="Pending"
          value={summary.pending}
          accent="border-l-2 border-l-amber-500 border-t-border border-r-border border-b-border"
          icon={<Clock className="size-3.5 text-amber-500" />}
        />
        <StatCard
          label="Conversion"
          value={`${summary.conversionRate}%`}
          accent="border-l-2 border-l-blue-500 border-t-border border-r-border border-b-border"
          icon={<TrendingUp className="size-3.5 text-blue-500" />}
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Avg Rate
          </p>
          <p className="text-sm font-bold text-foreground">
            {fmtCurrency(summary.avgRate)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Total Value
          </p>
          <p className="text-sm font-bold text-foreground">
            {fmtCurrency(summary.totalRate)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Total Miles
          </p>
          <p className="text-sm font-bold text-foreground">
            {fmtNumber(summary.totalMiles)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Enclosed
          </p>
          <p className="text-sm font-bold text-foreground">
            {summary.enclosedCount}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground font-medium">
            Inoperable
          </p>
          <p className="text-sm font-bold text-foreground">
            {summary.inoperableCount}
          </p>
        </div>
      </div>

      <ReportAnalyticsPanel
        reportId="quote-report"
        quotes={quotes}
        periodContext={{ label: periodLabel }}
        compact
      />

      <div>
        <SectionLabel>Quote Details</SectionLabel>
        {quotes.length === 0 ? (
          <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
            No quotes this period.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-105">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className="text-xs font-semibold w-27.5">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-30">
                        Vehicle
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-25">
                        From
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-25">
                        To
                      </TableHead>
                      <TableHead className="w-17.5 text-right text-xs font-semibold">
                        Miles
                      </TableHead>
                      <TableHead className="w-20 text-right text-xs font-semibold">
                        Rate
                      </TableHead>
                      <TableHead className="w-15 text-center text-xs font-semibold">
                        ETA
                      </TableHead>
                      <TableHead className="w-17.5 text-center text-xs font-semibold">
                        Type
                      </TableHead>
                      <TableHead className="w-12.5 text-center text-xs font-semibold">
                        Units
                      </TableHead>
                      <TableHead className="w-20 text-center text-xs font-semibold">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((q) => (
                      <TableRow
                        key={q._id}
                        className="text-xs hover:bg-muted/30"
                      >
                        <TableCell className="font-medium text-foreground">
                          {quoteCustomer(q)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-muted-foreground">
                          {quoteVehicle(q)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quoteFromAddr(q)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quoteToAddr(q)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtNumber(q.miles || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {fmtCurrency(q.rate || 0)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {quoteEta(q)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px]">
                            {quoteTransportType(q)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {q.units || 1}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium capitalize ${quoteStatusBadgeClass(q.status)}`}
                          >
                            {q.status}
                          </Badge>
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

export function TransportationPreviewModal({
  open,
  onClose,
  reportType,
  loads,
  quotes,
  monthLabel,
  isDownloading,
  onDownload,
}: TransportationPreviewModalProps) {
  const isLoad = reportType === "load";
  const title = isLoad ? "Load Report" : "Quotes & Drafts Report";
  const accentColor = isLoad
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";

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
              className={`size-10 rounded-lg flex items-center justify-center border shrink-0 ${isLoad
                  ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800"
                }`}
            >
              {isLoad ? (
                <Truck className={`size-4.5 ${accentColor}`} />
              ) : (
                <MapPin className={`size-4.5 ${accentColor}`} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight break-words">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 break-words">
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
          {isLoad ? (
            <LoadPreview loads={loads} periodLabel={monthLabel} />
          ) : (
            <QuotePreview quotes={quotes} periodLabel={monthLabel} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}