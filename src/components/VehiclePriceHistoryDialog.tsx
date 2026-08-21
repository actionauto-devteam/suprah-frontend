"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock3,
  DollarSign,
  History,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import type { Vehicle } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface PriceHistoryEntry {
  id: string;
  previousPrice: number | null;
  newPrice: number;
  changedAt: string;
  source: string;
  changedBy?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
}

interface PriceHistoryResponse {
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    stockNumber?: string;
    currentPrice: number;
    priceUpdatedAt?: string;
  };
  history: PriceHistoryEntry[];
}

interface VehiclePriceHistoryDialogProps {
  vehicle: Vehicle;
  triggerLabel: React.ReactNode;
  triggerClassName?: string;
  prefix?: React.ReactNode;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `$${value.toLocaleString()}`;
}

function formatDateTime(value?: string) {
  if (!value) return "Not tracked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  }).format(date);
}

function formatDate(value?: string) {
  if (!value) return "No price update recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  }).format(date);
}

export function VehiclePriceHistoryDialog({
  vehicle,
  triggerLabel,
  triggerClassName,
  prefix,
}: VehiclePriceHistoryDialogProps) {
  const { getToken } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  const loadHistory = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await apiClient.get(
        `/api/vehicles/${vehicle.id}/price-history`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        },
      );

      setData((response.data?.data ?? response.data) as PriceHistoryResponse);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load the pricing log.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, vehicle.id]);

  React.useEffect(() => {
    if (!open || data || loading || error) return;
    void loadHistory();
  }, [open, data, loading, error, loadHistory]);

  React.useEffect(() => {
    setData(null);
    setError(null);
    setExpanded(false);
  }, [vehicle.id]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
    };
  }, [open]);

  const history = data?.history ?? [];
  const visibleHistory = expanded ? history : history.slice(0, 6);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Vehicle pricing log"
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative border-b border-border/50 bg-card px-5 py-4 sm:px-6">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-primary/0" />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <History className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                        Suprah AI Inventory
                      </span>
                    </div>
                    <h2 className="truncate text-lg font-black text-foreground sm:text-xl">
                      Pricing Log
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                      {vehicle.trim ? ` · ${vehicle.trim}` : ""}
                      {vehicle.stockNumber ? ` · Stock #${vehicle.stockNumber}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close pricing log"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-muted/25 p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5 text-primary/70" />
                      Current Price
                    </div>
                    <p className="text-2xl font-black tabular-nums text-primary">
                      {money(data?.vehicle.currentPrice ?? vehicle.price)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-muted/25 p-4">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5 text-primary/70" />
                      Last Price Change Recorded
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {formatDate(
                        data?.vehicle.priceUpdatedAt || vehicle.priceUpdatedAt,
                      )}
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading pricing history…</p>
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                    <p className="text-sm font-semibold text-destructive">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadHistory()}
                      className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 px-3 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/15 px-5 py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/8 text-primary">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      No pricing history available
                    </p>
                    <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                      No recoverable price history was found for this vehicle.
                      Suprah AI restored historical price changes where audit
                      records were available, and any future price changes will be
                      recorded here automatically.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-foreground">
                          Price Change History
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {history.length} recorded{" "}
                          {history.length === 1 ? "change" : "changes"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
                      <span className="font-bold text-foreground">
                        About the recorded time:
                      </span>{" "}
                      For DealersCloud changes, this is when Suprah received and
                      recorded the price update. It may be later than the original
                      change time shown in DealersCloud. Times are displayed in
                      Mountain Time.
                    </div>

                    <div className="space-y-2">
                      {visibleHistory.map((entry) => {
                        const hasPrevious = entry.previousPrice !== null;
                        const delta = hasPrevious
                          ? entry.newPrice - (entry.previousPrice as number)
                          : 0;
                        const decreased = delta < 0;
                        const increased = delta > 0;

                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-border/50 bg-card p-3.5 sm:p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  {hasPrevious ? (
                                    <>
                                      <span className="text-sm font-semibold tabular-nums text-muted-foreground line-through">
                                        {money(entry.previousPrice)}
                                      </span>
                                      <span className="text-muted-foreground/40">→</span>
                                    </>
                                  ) : (
                                    <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                      Initial price
                                    </span>
                                  )}
                                  <span className="text-base font-black tabular-nums text-foreground">
                                    {money(entry.newPrice)}
                                  </span>

                                  {hasPrevious && delta !== 0 && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                                        decreased &&
                                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                        increased &&
                                          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                      )}
                                    >
                                      {decreased ? (
                                        <TrendingDown className="h-3 w-3" />
                                      ) : (
                                        <TrendingUp className="h-3 w-3" />
                                      )}
                                      {delta > 0 ? "+" : ""}
                                      {money(delta)}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3" />
                                    <span>
                                      <span className="font-semibold text-foreground/80">
                                        Recorded by Suprah:
                                      </span>{" "}
                                      {formatDateTime(entry.changedAt)}
                                    </span>
                                  </span>
                                  {entry.changedBy?.name && (
                                    <span className="flex items-center gap-1">
                                      <UserRound className="h-3 w-3" />
                                      {entry.changedBy.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                                {entry.source || "Suprah AI"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {history.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Show recent changes only
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Show all {history.length} changes
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-sm text-left transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          triggerClassName,
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Open pricing log for ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      >
        {prefix}
        {triggerLabel}
      </button>
      {modal}
    </>
  );
}