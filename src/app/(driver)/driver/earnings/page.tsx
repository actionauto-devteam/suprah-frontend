"use client";

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { DriverPayout } from "@/types/driver-payout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  ArrowRight,
  XCircle,
  TrendingUp,
  TriangleAlert,
  RefreshCw,
} from "lucide-react";
import { formatScheduleDate } from "@/utils/calendar.utils";
import { Button } from "@/components/ui/button";
import { userErrorMessage } from "@/lib/user-error";
import { EARNINGS_LOADS_URL, earningsLoadsFrom } from "@/lib/driver-earnings";

type TransactionRow =
  | { kind: "payout"; data: DriverPayout; sortDate: string }
  | { kind: "load"; data: any; sortDate: string };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function PayoutStatusBadge({ status }: { status: DriverPayout["status"] }) {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    paid: {
      color: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="size-3" />,
      label: "Paid",
    },
    processing: {
      color: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: <Loader2 className="size-3 animate-spin" />,
      label: "Processing",
    },
    pending: {
      color: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      icon: <Clock className="size-3" />,
      label: "Pending",
    },
    failed: {
      color: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      icon: <XCircle className="size-3" />,
      label: "Failed",
    },
  };
  const c = map[status] ?? map.pending;
  return (
    <Badge variant="outline" className={`gap-1 ${c.color}`}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

export default function DriverEarningsPage() {
  const { getToken } = useAuth();
  // The server's Earnings view (counts and loads waiting for pay); see driver-earnings.
  const [loadsData, setLoadsData] = React.useState<unknown>(null);
  const [payouts, setPayouts] = React.useState<DriverPayout[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [loadsRes, payoutsRes] = await Promise.all([
          apiClient.get(EARNINGS_LOADS_URL, { headers }),
          apiClient.get("/api/driver-payouts/my-payouts", { headers }),
        ]);
        if (cancelled) return;
        setLoadsData(loadsRes.data?.data ?? null);
        setPayouts(payoutsRes.data?.data || []);
        setLoadError(null);
      } catch (err) {
        // Say so instead of showing zeros that look real.
        if (!cancelled) setLoadError(userErrorMessage(err, "load your earnings"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, attempt]);

  const retry = () => {
    setIsLoading(true);
    setLoadError(null);
    setAttempt((value) => value + 1);
  };

  // Stats
  const totalEarned = React.useMemo(
    () =>
      payouts
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0),
    [payouts]
  );

  const paidLoadIds = React.useMemo(() => {
    const ids = new Set<string>();
    payouts
      .filter((p) => p.status === "paid" || p.status === "processing")
      .forEach((p) => {
        const id =
          typeof p.loadId === "object"
            ? (p.loadId as any)._id
            : p.loadId;
        if (id) ids.add(id);
      });
    return ids;
  }, [payouts]);

  const earnings = React.useMemo(
    () => earningsLoadsFrom<any>(loadsData, paidLoadIds),
    [loadsData, paidLoadIds]
  );
  const unpaidCompletedLoads = earnings.unpaidLoads;

  // Combined and sorted transaction list
  const transactions = React.useMemo<TransactionRow[]>(() => {
    const rows: TransactionRow[] = [
      ...payouts.map((p) => ({
        kind: "payout" as const,
        data: p,
        sortDate: p.paidAt || p.createdAt,
      })),
      ...unpaidCompletedLoads.map((l) => ({
        kind: "load" as const,
        data: l,
        sortDate: l.dates?.deliveryDeadline || l.deliveredAt || l.delivered || l.createdAt,
      })),
    ];
    return rows.sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
    );
  }, [payouts, unpaidCompletedLoads]);

  return (
    <div className="driver-page mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div className="driver-simple-header">
        <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
        <p className="text-muted-foreground text-sm">
          Your payout history and completed loads.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <Card role="alert" className="rounded-2xl border-border/80 bg-card shadow-sm ring-1 ring-border/20">
          <CardContent className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-sm">
              <TriangleAlert className="size-7 text-amber-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-black">We couldn&apos;t load your earnings</h3>
            <p className="mt-2 max-w-sm break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {loadError}
            </p>
            <Button
              type="button"
              onClick={retry}
              className="mt-6 h-11 gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-6 font-bold text-white shadow-sm hover:bg-emerald-500"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats row */}
          <div className="driver-metrics grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <DollarSign className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(totalEarned)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Clock className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{earnings.unpaidCount}</p>
                    <p className="text-xs text-muted-foreground">Pending Payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Package className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{earnings.completedCount}</p>
                    <p className="text-xs text-muted-foreground">Completed Loads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <DollarSign className="size-8 mb-2 opacity-50" />
                  <p className="text-sm">No transactions yet</p>
                  <p className="text-xs mt-1">
                    Completed loads and payouts will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((row) => {
                    if (row.kind === "payout") {
                      const p = row.data;
                      const load =
                        typeof p.loadId === "object" ? (p.loadId as any) : null;
                      return (
                        <div
                          key={`payout-${p._id}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-medium">
                                {p.payoutNumber ||
                                  load?.loadNumber ||
                                  "—"}
                              </span>
                              <PayoutStatusBadge status={p.status} />
                            </div>
                            {load && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="size-3 shrink-0" />
                                <span className="whitespace-normal break-words [overflow-wrap:anywhere]">
                                  {load.pickupLocation?.city || load.origin || "Unknown"}
                                </span>
                                <ArrowRight className="size-3 shrink-0" />
                                <span className="whitespace-normal break-words [overflow-wrap:anywhere]">
                                  {load.deliveryLocation?.city || load.destination || "Unknown"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p
                              className={`font-bold ${p.status === "paid"
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-foreground"
                                }`}
                            >
                              {formatCurrency(p.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(row.sortDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Unpaid completed load row
                    const l = row.data;
                    return (
                      <div
                        key={`load-${l._id}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium">
                              {l.loadNumber || l.trackingNumber || "—"}
                            </span>
                            <Badge
                              variant="outline"
                              className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1"
                            >
                              <Clock className="size-3" />
                              Awaiting Payment
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="whitespace-normal break-words [overflow-wrap:anywhere]">
                              {l.pickupLocation?.city || l.origin || "Unknown"}
                            </span>
                            <ArrowRight className="size-3 shrink-0" />
                            <span className="whitespace-normal break-words [overflow-wrap:anywhere]">
                              {l.deliveryLocation?.city || l.destination || "Unknown"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          {(l.pricing?.carrierPayAmount ?? l.carrierPayAmount) != null && (
                            <p className="font-bold text-foreground">
                              {formatCurrency(l.pricing?.carrierPayAmount ?? l.carrierPayAmount)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {l.dates?.deliveryDeadline
                              ? formatScheduleDate(l.dates.deliveryDeadline)
                              : new Date(l.deliveredAt || l.delivered || l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {earnings.unpaidCount > earnings.unpaidLoads.length && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing your newest {earnings.unpaidLoads.length} of {earnings.unpaidCount} loads waiting for pay.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}