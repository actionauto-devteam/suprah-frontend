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


export async function generateLoadReportPdf(
  loads: Load[],
  monthLabel: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const summary = buildLoadSummary(loads);

  const generatedAt = new Date();
  const generatedAtLabel = generatedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  const contentWidth = right - left;

  const drawReportHeader = (subtitle?: string) => {
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(left, 10, 8, 8, 1.5, 1.5, "F");

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("AA", left + 4, 15.4, { align: "center" });

    doc.setTextColor(20, 26, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Action Auto Utah", left + 12, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(95, 107, 122);
    doc.text(subtitle || "Load Management Report", left + 12, 18.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(33, 41, 54);
    doc.text("Logistics Report", right, 13.8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(95, 107, 122);
    doc.text(`Period: ${monthLabel}`, right, 17.8, { align: "right" });

    doc.setDrawColor(218, 225, 235);
    doc.setLineWidth(0.2);
    doc.line(left, 22.5, right, 22.5);
  };

  const drawSectionTitle = (title: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text(title, left, y);
    const lineStart = left + doc.getTextWidth(title) + 3;
    doc.setDrawColor(224, 230, 238);
    doc.line(lineStart, y - 0.8, right, y - 0.8);
  };

  drawReportHeader();

  // Summary block
  const summaryTitleY = 31;
  drawSectionTitle("Global Performance", summaryTitleY);

  const stats = [
    { label: "Total Loads", value: String(summary.total) },
    { label: "Delivered", value: String(summary.delivered) },
    {
      label: "In Transit",
      value: String(summary.inTransit),
    },
    { label: "Posted", value: String(summary.posted) },
    { label: "Revenue", value: fmtCurrency(summary.totalRate) },
    { label: "Efficiency", value: `${summary.onTimeRate}%` },
  ];

  const cardGap = 4;
  const cardW = (contentWidth - cardGap * (stats.length - 1)) / stats.length;
  const cardY = 34;
  const cardH = 16;
  stats.forEach((stat, i) => {
    const x = left + i * (cardW + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(223, 231, 241);
    doc.roundedRect(x, cardY, cardW, cardH, 1.8, 1.8, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(107, 114, 128);
    doc.text(stat.label, x + 3, cardY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 132, 96);
    doc.text(stat.value, x + 3, cardY + 12);
  });

  // Loads table section
  const shipmentsTitleY = cardY + cardH + 10;
  drawSectionTitle("Detailed Load Ledger", shipmentsTitleY);

  if (loads.length === 0) {
    const emptyY = shipmentsTitleY + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(223, 231, 241);
    doc.roundedRect(left, emptyY, contentWidth, 42, 2, 2, "FD");

    doc.setTextColor(170, 180, 195);
    doc.setFontSize(18);
    doc.text("📭", pageWidth / 2, emptyY + 18, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(87, 96, 110);
    doc.text("No load data available", pageWidth / 2, emptyY + 27, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(126, 137, 154);
    doc.text(
      "Logistics data will appear here once loads are assigned.",
      pageWidth / 2,
      emptyY + 33,
      { align: "center" },
    );
  } else {
    autoTable(doc, {
      startY: shipmentsTitleY + 3,
      showHead: "everyPage",
      rowPageBreak: "avoid",
      pageBreak: "auto",
      head: [
        [
          "Load #",
          "Status",
          "Contact",
          "Vehicle",
          "VIN",
          "Origin",
          "Destination",
          "Trailer",
          "Carrier Pay",
          "Driver",
        ],
      ],
      body: loads.map((l) => [
        l.loadNumber || "—",
        l.status,
        loadCustomer(l),
        loadVehicle(l),
        loadVin(l),
        l.pickupLocation?.city || "—",
        l.deliveryLocation?.city || "—",
        loadTransportType(l),
        fmtCurrency(loadRate(l)),
        driverName(l),
      ]),
      margin: {
        top: 31,
        left,
        right,
        bottom: 18,
      },
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 2.6, right: 2.8, bottom: 2.6, left: 2.8 },
        minCellHeight: 7,
        overflow: "linebreak",
        valign: "middle",
        textColor: [36, 44, 56],
        lineColor: [226, 232, 240],
        lineWidth: 0.12,
      },
      headStyles: {
        fillColor: [16, 132, 96],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: { fillColor: [247, 250, 248] },
      bodyStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 23 },
        1: { cellWidth: 19 },
        2: { cellWidth: 29 },
        3: { cellWidth: 30 },
        4: { cellWidth: 23 },
        5: { cellWidth: 28 },
        6: { cellWidth: 28 },
        7: { cellWidth: 18 },
        8: { cellWidth: 22, halign: "right" },
        9: { cellWidth: 28 },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawReportHeader("Detailed Load Ledger • Continued");
          drawSectionTitle("Detailed Load Ledger", 28);
        }
      },
    });
  }

  // The downloaded Unified Load Report intentionally contains only the
  // report summary and the complete detailed load ledger. The ledger may
  // continue across multiple pages depending on the selected period.
  // Extra analytics pages were removed because they duplicated or derived
  // information that was not part of the visible Unified Load preview.

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 8.5;

    doc.setDrawColor(224, 230, 238);
    doc.setLineWidth(0.2);
    doc.line(left, footerY - 3.7, right, footerY - 3.7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(115, 125, 141);
    doc.text("Action Auto Utah · Unified Load Report", left, footerY);
    doc.text(`Generated ${generatedAtLabel}`, pageWidth / 2, footerY, {
      align: "center",
    });
    doc.text(`Page ${i} of ${totalPages}`, right, footerY, { align: "right" });
  }

  return doc.output("blob");
}

export async function generateQuoteReportPdf(
  quotes: Quote[],
  monthLabel: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const summary = buildQuoteSummary(quotes);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;

  const drawQuoteHeader = (subtitle = "Quotes & Drafts Report") => {
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, pageWidth, 22, "F");

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ACTION AUTO UTAH", left, 10);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, left, 17);

    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Period: ${monthLabel}`, left, 29);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-US", {
        dateStyle: "long",
        timeZone: "America/Denver",
      } as Intl.DateTimeFormatOptions)}`,
      left,
      35,
    );
    doc.setTextColor(0);
  };

  drawQuoteHeader();

  const stats = [
    { label: "Total Quotes", value: String(summary.total) },
    { label: "Booked", value: String(summary.booked) },
    { label: "Conversion", value: `${summary.conversionRate}%` },
    { label: "Pending", value: String(summary.pending) },
    { label: "Total Value", value: fmtCurrency(summary.totalRate) },
    { label: "Avg Rate", value: fmtCurrency(summary.avgRate) },
  ];
  const boxW = 46,
    boxH = 14,
    startX = 14,
    startY = 41;
  stats.forEach((stat, i) => {
    const x = startX + (i % 6) * (boxW + 2);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(x, startY, boxW, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(245, 158, 11);
    doc.text(stat.value, x + boxW / 2, startY + 6.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(stat.label, x + boxW / 2, startY + 11.5, { align: "center" });
  });
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("All Quotes & Drafts", 14, 63);

  autoTable(doc, {
    startY: 66,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
    head: [
      [
        "Customer",
        "Vehicle",
        "From",
        "To",
        "Miles",
        "Rate",
        "ETA",
        "Type",
        "Units",
        "Status",
      ],
    ],
    body:
      quotes.length > 0
        ? quotes.map((q) => [
          quoteCustomer(q),
          quoteVehicle(q),
          quoteFromAddr(q),
          quoteToAddr(q),
          fmtNumber(q.miles || 0),
          fmtCurrency(q.rate || 0),
          quoteEta(q),
          quoteTransportType(q),
          String(q.units || 1),
          q.status,
        ])
        : [["No quotes this period", "", "", "", "", "", "", "", "", ""]],
    margin: { top: 42, left, right: 14, bottom: 18 },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.8,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [245, 158, 11],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawQuoteHeader("Quotes & Drafts Report • Continued");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text("All Quotes & Drafts", left, 40);
      }
    },
  });


  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const footerY = pageHeight - 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(left, footerY - 4, right, footerY - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Action Auto Utah · Quotes & Drafts Report", left, footerY);
    doc.text(`Page ${page} of ${totalPages}`, right, footerY, {
      align: "right",
    });
  }

  return doc.output("blob");
}

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

function LoadPreview({ loads }: { loads: Load[] }) {
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
                      <TableHead className="text-xs font-semibold w-25">
                        Load #
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-22.5">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-27.5">
                        Customer
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-30">
                        Vehicle
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-30">
                        VIN
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-22.5">
                        Origin
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-22.5">
                        Destination
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-17.5">
                        Type
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-20">
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
                        <TableCell className="font-mono text-[11px] text-foreground">
                          {l.loadNumber || "—"}
                        </TableCell>
                        <TableCell>
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
                        <TableCell className="text-muted-foreground truncate max-w-30">
                          {loadVehicle(l)}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {loadVin(l)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.pickupLocation?.city || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {l.deliveryLocation?.city || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {loadTransportType(l)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
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

function QuotePreview({ quotes }: { quotes: Quote[] }) {
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
                      <TableHead className="text-xs font-semibold w-17.5">
                        Miles
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-20">
                        Rate
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-15">
                        ETA
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-17.5">
                        Type
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-12.5">
                        Units
                      </TableHead>
                      <TableHead className="text-xs font-semibold w-20">
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
                        <TableCell className="text-muted-foreground truncate max-w-30">
                          {quoteVehicle(q)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quoteFromAddr(q)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quoteToAddr(q)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmtNumber(q.miles || 0)}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {fmtCurrency(q.rate || 0)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quoteEta(q)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {quoteTransportType(q)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {q.units || 1}
                        </TableCell>
                        <TableCell>
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
          {isLoad ? (
            <LoadPreview loads={loads} />
          ) : (
            <QuotePreview quotes={quotes} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}