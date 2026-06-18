"use client";

import * as React from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Car, CheckCircle2, RefreshCw, Loader2, Gauge, ShoppingBag,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VehicleRecord {
  _id: string;
  year?: number | string;
  make?: string;
  model?: string;
  vin?: string;
  stockNumber?: string;
  status: "sold" | "test-driven" | "available";
  sold: boolean;
  soldAt?: string;
  testDriven: boolean;
  testDriveCount: number;
  appointmentCount: number;
  lastTestDriveAt?: string;
  lastActivityAt?: string;
}

interface Summary {
  total: number;
  sold: number;
  testDriven: number;
  available: number;
}

const PAGE_SIZES = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

// Shared card + glassy header recipe — matches the dashboard panels exactly.
const CARD =
  "rounded-2xl border border-border/60 bg-card " +
  "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] " +
  "ring-1 ring-black/[0.015] dark:ring-white/[0.02]";

const PANEL_HEADER =
  "flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border/60 " +
  "bg-gradient-to-b from-muted/40 to-muted/10 " +
  "backdrop-blur supports-[backdrop-filter]:bg-card/50";

const FIELD =
  "h-8 rounded-lg border border-border bg-muted/40 px-2 text-[12px] text-foreground " +
  "outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20";

const VEHICLE_STATUS_BADGE: Record<string, string> = {
  sold:           "bg-green-500/10 text-green-700 border-green-500/25 dark:text-green-400",
  "test-driven":  "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  available:      "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
};

const STATUS_LABEL: Record<string, string> = {
  sold: "Sold",
  "test-driven": "Test Driven",
  available: "Available",
};

function VehicleStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border",
        VEHICLE_STATUS_BADGE[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// Build a compact page list with ellipses: 1 … 4 5 [6] 7 8 … 20
function getPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

export function VehicleHistory({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const { getToken } = useAuth();
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "sold" | "test-driven" | "available"
  >("all");

  // ── Pagination state (client-side over the fetched set) ──────────────────────
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);

  const getHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["vehicle-history", statusFilter, startDate, endDate],
    queryFn: async () => {
      const h = await getHeaders();
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const r = await apiClient.get(
        "/api/appointments/dashboard/vehicle-history",
        { ...h, params },
      );
      return r.data?.data ?? r.data;
    },
    staleTime: 30_000,
  });

  const vehicles: VehicleRecord[] = data?.vehicles ?? [];
  const summary: Summary = data?.summary ?? {
    total: 0, sold: 0, testDriven: 0, available: 0,
  };

  // Derived pagination values
  const pageCount = Math.max(1, Math.ceil(vehicles.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIdx = (currentPage - 1) * pageSize;
  const pageVehicles = vehicles.slice(startIdx, startIdx + pageSize);
  const rangeFrom = vehicles.length === 0 ? 0 : startIdx + 1;
  const rangeTo = Math.min(startIdx + pageSize, vehicles.length);

  // Snap back to page 1 whenever the result set changes (filters, range, refetch).
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, startDate, endDate, pageSize, vehicles.length]);

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), pageCount));

  return (
    <div className={cn(CARD, "overflow-hidden")}>
      {/* Section header */}
      <div className={PANEL_HEADER}>
        <div className="flex items-center gap-2.5 text-[12.5px] font-semibold text-foreground/80">
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Car size={13} strokeWidth={2} />
          </span>
          <span>Vehicle History</span>
          {!isLoading && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {summary.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={cn(FIELD, "w-32 cursor-pointer appearance-none pr-6")}
          >
            <option value="all">All Vehicles</option>
            <option value="sold">Sold</option>
            <option value="test-driven">Test Driven</option>
            <option value="available">Available</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={12} strokeWidth={2} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      {!isLoading && summary.total > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/10 px-5 py-2.5 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/25 bg-green-500/10 px-2 py-0.5 font-semibold text-green-700 dark:text-green-400">
            <ShoppingBag size={11} strokeWidth={2} /> {summary.sold} Sold
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-400">
            <Gauge size={11} strokeWidth={2} /> {summary.testDriven} Test Driven
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-400">
            <CheckCircle2 size={11} strokeWidth={2} /> {summary.available} Available
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-b border-destructive/20 bg-destructive/8 px-5 py-2.5 text-[12px] text-destructive">
          {error instanceof Error ? error.message : "Couldn't load vehicle history. Try refreshing."}
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Loader2 size={22} strokeWidth={2} className="animate-spin text-primary" />
          <p className="text-sm">Loading vehicle history…</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-muted to-muted/40 text-muted-foreground shadow-inner">
            <Car size={22} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[14.5px] font-semibold text-foreground/80">No vehicle records</p>
            <p className="mt-0.5 max-w-xs text-[13px]">
              Test-drive and sale activity will show up here as it happens.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin]">
            <table className="w-full min-w-200 table-fixed border-collapse">
              <thead className="sticky top-0 z-10 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/65">
                <tr className="border-b border-border">
                  {[
                    ["Vehicle",     "26%"],
                    ["VIN / Stock", "18%"],
                    ["Status",      "13%"],
                    ["Test Drives", "12%"],
                    ["Appointments","13%"],
                    ["Last Activity","18%"],
                  ].map(([label, width]) => (
                    <th
                      key={label}
                      style={{ width }}
                      className="whitespace-nowrap px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageVehicles.map((v) => (
                  <tr
                    key={v._id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-primary/[0.035]"
                  >
                    <td className="px-3.5 py-3 align-middle">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                        <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        <span className="truncate">
                          {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown vehicle"}
                        </span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <div className="truncate font-mono text-[11.5px] tabular-nums text-foreground/80">
                        {v.vin || "—"}
                      </div>
                      {v.stockNumber && (
                        <div className="font-mono text-[11px] text-muted-foreground">#{v.stockNumber}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <VehicleStatusBadge status={v.status} />
                      {v.sold && v.soldAt && (
                        <div className="mt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
                          {format(new Date(v.soldAt), "MMM d, yyyy")}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <span className="font-mono text-[13px] font-medium tabular-nums">
                        {v.testDriveCount}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                        {v.appointmentCount}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 align-middle">
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {v.lastActivityAt
                          ? format(new Date(v.lastActivityAt), "MMM d, yyyy · HH:mm")
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination footer ── */}
          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Range + page size */}
            <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
              <span>
                Showing{" "}
                <strong className="font-semibold tabular-nums text-foreground/70">{rangeFrom}–{rangeTo}</strong>{" "}
                of <strong className="font-semibold tabular-nums text-foreground/70">{vehicles.length}</strong>
              </span>
              <span className="hidden text-border sm:inline">·</span>
              <label className="flex items-center gap-1.5">
                <span className="hidden sm:inline">Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={cn(FIELD, "cursor-pointer appearance-none pr-6")}
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Page controls */}
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} strokeWidth={2} />
                </button>

                {getPageItems(currentPage, pageCount).map((item, i) =>
                  item === "…" ? (
                    <span key={`gap-${i}`} className="select-none px-1.5 text-[12px] text-muted-foreground/60">…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      aria-current={item === currentPage ? "page" : undefined}
                      className={cn(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[12px] font-medium tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        item === currentPage
                          ? "border-primary/40 bg-gradient-to-b from-primary/15 to-primary/10 text-primary font-semibold shadow-sm"
                          : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default VehicleHistory;