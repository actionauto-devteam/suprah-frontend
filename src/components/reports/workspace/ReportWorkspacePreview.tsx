"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Payment } from "@/types/billing";
import type { DriverPayout } from "@/types/driver-payout";
import type { Lead } from "@/types/lead";
import type { Load } from "@/types/load";
import type { ReportId } from "@/types/report-filters";
import type { ReportColumnPreferences } from "@/lib/report-filter-query";
import { getLoadReportRate } from "@/lib/report-filter-engine";
import type { Quote } from "@/types/transportation";
import { formatCurrency } from "@/utils/format";

interface ReportWorkspacePreviewProps {
  reportId: ReportId;
  loads: Load[];
  quotes: Quote[];
  leads: Lead[];
  payments: Payment[];
  payouts: DriverPayout[];
  columnPreferences: ReportColumnPreferences;
  onColumnPreferencesChange: (preferences: ReportColumnPreferences) => void;
}

interface Column<T> {
  id: string;
  label: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  /** Preferred table-column width in pixels. */
  width?: number;
  /** Keep short values such as dates on one line. */
  noWrap?: boolean;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function safeText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function driverName(load: Load): string {
  const assigned = load.assignedDriverId;
  if (!assigned) return "Unassigned";
  if (typeof assigned === "string") return assigned;
  return assigned.name ?? assigned.email ?? assigned._id;
}

function loadCustomer(load: Load): string {
  const location = load.pickupLocation;
  return (
    location.companyName ||
    location.contactName ||
    [location.firstName, location.lastName].filter(Boolean).join(" ") ||
    location.email ||
    "—"
  );
}

function loadVehicle(load: Load): string {
  const vehicle = load.vehicles?.[0];
  if (!vehicle) return "—";
  return (
    [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
    vehicle.vin ||
    "—"
  );
}

function quoteCustomer(quote: Quote): string {
  return [quote.firstName, quote.lastName].filter(Boolean).join(" ") || "—";
}

function quoteVehicle(quote: Quote): string {
  if (quote.vehicleName) return quote.vehicleName;
  if (quote.vehicleId) {
    return [quote.vehicleId.year, quote.vehicleId.make, quote.vehicleId.modelName]
      .filter(Boolean)
      .join(" ");
  }
  return quote.vin || "—";
}

function leadVehicle(lead: Lead): string {
  return [lead.vehicle?.year, lead.vehicle?.make, lead.vehicle?.model]
    .filter(Boolean)
    .join(" ") || "—";
}

function alignmentClass(align: Column<unknown>["align"]): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function PaginatedTable<T>({
  sectionId,
  title,
  rows,
  columns,
  rowKey,
  emptyMessage,
  columnPreferences,
  onColumnPreferencesChange,
}: {
  sectionId: string;
  title: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  emptyMessage: string;
  columnPreferences: ReportColumnPreferences;
  onColumnPreferencesChange: (preferences: ReportColumnPreferences) => void;
}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const columnsMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [rows]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        columnsMenuRef.current &&
        !columnsMenuRef.current.contains(event.target as Node)
      ) {
        setColumnsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const allColumnIds = React.useMemo(
    () => columns.map((column) => column.id),
    [columns],
  );
  const selectedColumnIds = React.useMemo(() => {
    const configured = columnPreferences[sectionId];
    if (!configured || configured.length === 0) return allColumnIds;

    const valid = configured.filter((columnId) =>
      allColumnIds.includes(columnId),
    );
    return valid.length > 0 ? valid : allColumnIds;
  }, [allColumnIds, columnPreferences, sectionId]);
  const visibleColumns = React.useMemo(
    () => columns.filter((column) => selectedColumnIds.includes(column.id)),
    [columns, selectedColumnIds],
  );

  const setVisibleColumns = (columnIds: string[]) => {
    const unique = Array.from(new Set(columnIds)).filter((columnId) =>
      allColumnIds.includes(columnId),
    );
    if (unique.length === 0) return;

    const next = { ...columnPreferences };
    if (
      unique.length === allColumnIds.length &&
      allColumnIds.every((columnId) => unique.includes(columnId))
    ) {
      delete next[sectionId];
    } else {
      next[sectionId] = unique;
    }
    onColumnPreferencesChange(next);
  };

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const start = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, rows.length);
  const tableMinWidth = visibleColumns.reduce(
    (total, column) => total + (column.width ?? 150),
    0,
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-foreground sm:text-base">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Showing {start}–{end} of {rows.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div ref={columnsMenuRef} className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setColumnsOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={columnsOpen}
            >
              <Columns3 className="size-3.5" />
              Columns
              <ChevronDown className="size-3.5" />
            </Button>

            {columnsOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => setVisibleColumns(allColumnIds)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span>Show all columns</span>
                  {selectedColumnIds.length === allColumnIds.length && (
                    <Check className="size-4 text-primary" />
                  )}
                </button>
                <div className="my-1 h-px bg-border" />
                <div className="max-h-64 overflow-y-auto">
                  {columns.map((column) => {
                    const active = selectedColumnIds.includes(column.id);
                    return (
                      <button
                        key={column.id}
                        type="button"
                        disabled={active && selectedColumnIds.length === 1}
                        onClick={() =>
                          setVisibleColumns(
                            active
                              ? selectedColumnIds.filter(
                                  (columnId) => columnId !== column.id,
                                )
                              : [...selectedColumnIds, column.id],
                          )
                        }
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>{column.label}</span>
                        {active && <Check className="size-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
              <SelectItem value="100">100 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <Table
          className="table-fixed"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                style={{ width: `${column.width ?? 150}px` }}
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={`whitespace-nowrap ${alignmentClass(column.align as Column<unknown>["align"])}`}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row, index) => (
                <TableRow key={rowKey(row, index)}>
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={`align-top text-sm ${
                        column.noWrap
                          ? "whitespace-nowrap"
                          : "whitespace-normal break-words [overflow-wrap:anywhere]"
                      } ${alignmentClass(column.align as Column<unknown>["align"])}`}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Page {safePage} of {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={safePage >= pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

const loadColumns: Column<Load>[] = [
  { id: "load", label: "Load #", align: "center", noWrap: true, render: (row) => safeText(row.loadNumber) },
  { id: "status", label: "Status", align: "center", render: (row) => row.status },
  { id: "customer", label: "Customer", render: loadCustomer },
  { id: "vehicle", label: "Vehicle", render: loadVehicle },
  {
    id: "origin",
    label: "Origin",
    render: (row) =>
      [row.pickupLocation?.city, row.pickupLocation?.state]
        .filter(Boolean)
        .join(", ") || "—",
  },
  {
    id: "destination",
    label: "Destination",
    render: (row) =>
      [row.deliveryLocation?.city, row.deliveryLocation?.state]
        .filter(Boolean)
        .join(", ") || "—",
  },
  {
    id: "miles",
    label: "Miles",
    align: "right",
    render: (row) => Number(row.pricing?.miles ?? 0).toLocaleString(),
  },
  {
    id: "carrierPay",
    label: "Load Rate",
    align: "right",
    render: (row) => formatCurrency(getLoadReportRate(row)),
  },
  { id: "driver", label: "Driver", render: driverName },
  { id: "created", label: "Created", align: "center", noWrap: true, render: (row) => formatDate(row.createdAt) },
];

const quoteColumns: Column<Quote>[] = [
  { id: "customer", label: "Customer", render: quoteCustomer },
  { id: "vehicle", label: "Vehicle", render: quoteVehicle },
  { id: "from", label: "From", render: (row) => safeText(row.fromAddress) },
  { id: "to", label: "To", render: (row) => safeText(row.toAddress) },
  {
    id: "miles",
    label: "Miles",
    align: "right",
    render: (row) => Number(row.miles ?? 0).toLocaleString(),
  },
  {
    id: "rate",
    label: "Rate",
    align: "right",
    render: (row) => formatCurrency(Number(row.rate ?? 0)),
  },
  { id: "units", label: "Units", align: "center", render: (row) => row.units },
  { id: "status", label: "Status", align: "center", render: (row) => row.status },
  { id: "created", label: "Created", align: "center", noWrap: true, render: (row) => formatDate(row.createdAt) },
];

const leadColumns: Column<Lead>[] = [
  {
    id: "customer",
    label: "Customer",
    width: 180,
    render: (row) =>
      [row.firstName, row.lastName].filter(Boolean).join(" ") || "—",
  },
  {
    id: "contact",
    label: "Contact",
    width: 240,
    render: (row) => (
      <div className="min-w-0 space-y-0.5">
        <p className="break-all">{safeText(row.email)}</p>
        <p className="break-all text-xs text-muted-foreground">
          {safeText(row.phone)}
        </p>
      </div>
    ),
  },
  {
    id: "source",
    label: "Source",
    width: 150,
    align: "center",
    render: (row) => safeText(row.source),
  },
  { id: "status", label: "Status", width: 140, align: "center", render: (row) => row.status },
  { id: "vehicle", label: "Vehicle", width: 210, render: leadVehicle },
  {
    id: "subject",
    label: "Subject",
    width: 360,
    render: (row) => (
      <span className="block whitespace-normal break-words [overflow-wrap:anywhere]">
        {safeText(row.subject)}
      </span>
    ),
  },
  {
    id: "created",
    label: "Created",
    width: 140,
    align: "center",
    noWrap: true,
    render: (row) => formatDate(row.createdAt),
  },
];

const driverLoadColumns: Column<Load>[] = [
  { id: "driver", label: "Driver", render: driverName },
  { id: "load", label: "Load #", align: "center", noWrap: true, render: (row) => safeText(row.loadNumber) },
  { id: "vehicle", label: "Vehicle", render: loadVehicle },
  {
    id: "route",
    label: "Route",
    render: (row) =>
      `${row.pickupLocation?.city ?? "—"}, ${row.pickupLocation?.state ?? "—"} → ${row.deliveryLocation?.city ?? "—"}, ${row.deliveryLocation?.state ?? "—"}`,
  },
  { id: "status", label: "Status", align: "center", render: (row) => row.status },
  {
    id: "miles",
    label: "Miles",
    align: "right",
    render: (row) => Number(row.pricing?.miles ?? 0).toLocaleString(),
  },
  { id: "delivered", label: "Delivered", align: "center", noWrap: true, render: (row) => formatDate(row.deliveredAt) },
  {
    id: "pod",
    label: "POD",
    align: "center",
    render: (row) =>
      row.proofOfDelivery?.confirmedAt
        ? "Approved"
        : row.proofOfDelivery?.submittedAt
          ? "Pending"
          : "Not submitted",
  },
];

const paymentColumns: Column<Payment>[] = [
  { id: "invoice", label: "Invoice", align: "center", noWrap: true, render: (row) => safeText(row.invoiceNumber) },
  { id: "customer", label: "Customer", render: (row) => safeText(row.customerName) },
  { id: "description", label: "Description", render: (row) => safeText(row.description) },
  { id: "method", label: "Method", align: "center", render: (row) => safeText(row.paymentMethod) },
  { id: "source", label: "Source", align: "center", render: (row) => safeText(row.source) },
  {
    id: "amount",
    label: "Amount",
    align: "right",
    render: (row) => formatCurrency(Number(row.amount ?? 0)),
  },
  { id: "status", label: "Status", align: "center", render: (row) => row.status },
  { id: "paid", label: "Paid", align: "center", noWrap: true, render: (row) => formatDate(row.paidAt) },
];

const payoutColumns: Column<DriverPayout>[] = [
  { id: "payout", label: "Payout #", align: "center", noWrap: true, render: (row) => safeText(row.payoutNumber) },
  { id: "driver", label: "Driver", render: (row) => safeText(row.driverName) },
  {
    id: "load",
    label: "Load",
    align: "center",
    noWrap: true,
    render: (row) =>
      typeof row.loadId === "object"
        ? safeText(row.loadId.loadNumber ?? row.loadId.trackingNumber)
        : safeText(row.loadId),
  },
  { id: "description", label: "Description", render: (row) => safeText(row.description) },
  {
    id: "amount",
    label: "Amount",
    align: "right",
    render: (row) => formatCurrency(Number(row.amount ?? 0)),
  },
  { id: "status", label: "Status", align: "center", render: (row) => row.status },
  { id: "paid", label: "Paid", align: "center", noWrap: true, render: (row) => formatDate(row.paidAt) },
];

export default function ReportWorkspacePreview({
  reportId,
  loads,
  quotes,
  leads,
  payments,
  payouts,
  columnPreferences,
  onColumnPreferencesChange,
}: ReportWorkspacePreviewProps) {
  if (reportId === "load-report") {
    return (
      <PaginatedTable
        sectionId="loads"
        title="Load Details"
        rows={loads}
        columns={loadColumns}
        rowKey={(row) => row._id}
        emptyMessage="No loads match the current filters."
        columnPreferences={columnPreferences}
        onColumnPreferencesChange={onColumnPreferencesChange}
      />
    );
  }

  if (reportId === "quote-report") {
    return (
      <PaginatedTable
        sectionId="quotes"
        title="Quote Details"
        rows={quotes}
        columns={quoteColumns}
        rowKey={(row) => row._id}
        emptyMessage="No quotes match the current filters."
        columnPreferences={columnPreferences}
        onColumnPreferencesChange={onColumnPreferencesChange}
      />
    );
  }

  if (reportId === "lead-status-report" || reportId === "lead-source-report") {
    return (
      <PaginatedTable
        sectionId="leads"
        title="Lead Details"
        rows={leads}
        columns={leadColumns}
        rowKey={(row) => row._id}
        emptyMessage="No leads match the current filters."
        columnPreferences={columnPreferences}
        onColumnPreferencesChange={onColumnPreferencesChange}
      />
    );
  }

  if (reportId === "driver-report") {
    return (
      <div className="space-y-4">
        <PaginatedTable
        sectionId="driver-loads"
          title="Driver Load Activity"
          rows={loads.filter((load) => Boolean(load.assignedDriverId))}
          columns={driverLoadColumns}
          rowKey={(row) => row._id}
          emptyMessage="No driver load activity matches the current filters."
          columnPreferences={columnPreferences}
          onColumnPreferencesChange={onColumnPreferencesChange}
        />
        <PaginatedTable
        sectionId="driver-settlements"
          title="Driver Settlements"
          rows={payouts}
          columns={payoutColumns}
          rowKey={(row) => row._id}
          emptyMessage="No driver settlements match the current filters."
          columnPreferences={columnPreferences}
          onColumnPreferencesChange={onColumnPreferencesChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PaginatedTable
        sectionId="payments"
        title="Customer Payments"
        rows={payments}
        columns={paymentColumns}
        rowKey={(row) => row._id}
        emptyMessage="No payments match the current filters."
        columnPreferences={columnPreferences}
        onColumnPreferencesChange={onColumnPreferencesChange}
      />
      <PaginatedTable
        sectionId="billing-payouts"
        title="Driver Payouts"
        rows={payouts}
        columns={payoutColumns}
        rowKey={(row) => row._id}
        emptyMessage="No payouts match the current filters."
        columnPreferences={columnPreferences}
        onColumnPreferencesChange={onColumnPreferencesChange}
      />
    </div>
  );
}