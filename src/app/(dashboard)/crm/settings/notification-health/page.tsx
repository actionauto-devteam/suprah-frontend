"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft, Lock, BellRing, RefreshCw, Search, Send,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

function matchesSearch(u: { fullName: string; username: string }, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
}

interface CrmUserData {
  _id: string;
  fullName: string;
  role: string;
}

type DeviceStatus = "healthy" | "stale" | "never-confirmed" | "failing";

interface DeviceHealth {
  deviceHint: string;
  appSource: "main" | "supraspace" | null;
  endpointHost: string;
  createdAt: string;
  lastSuccessAt: string | null;
  failureCount: number;
  status: DeviceStatus;
}

interface UserHealth {
  userId: string;
  fullName: string;
  username: string;
  role: string;
  subscriptionCount: number;
  devices: DeviceHealth[];
}

const STATUS_META: Record<DeviceStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  healthy: { label: "Healthy", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  stale: { label: "Stale", icon: AlertTriangle, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  "never-confirmed": { label: "Never confirmed", icon: HelpCircle, className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  failing: { label: "Failing", icon: XCircle, className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
};

function fmtDate(d: string | null): string {
  if (!d) return "Never";
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function NotificationHealthPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [rows, setRows] = React.useState<UserHealth[] | null>(null);
  const [staleDays, setStaleDays] = React.useState(7);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [nudgingId, setNudgingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const init = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) {
        router.replace("/crm");
        return;
      }
      try {
        const res = await apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } });
        const data = res.data?.data || res.data;
        setUser(data);
        setToken(t);
      } catch {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        router.replace("/crm");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  const isAuthorized = user?.role === "admin" || user?.role === "manager";

  const fetchHealth = React.useCallback(async () => {
    if (!token) return;
    setFetching(true);
    setError(null);
    try {
      const res = await apiClient.get("/api/crm/timeproof/push/org-health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data;
      setRows(data?.users || []);
      setStaleDays(data?.staleDaysThreshold ?? 7);
    } catch {
      setError("Could not load push notification health data.");
    } finally {
      setFetching(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (isAuthorized && token) fetchHealth();
  }, [isAuthorized, token, fetchHealth]);

  const problemCount = React.useMemo(
    () => (rows || []).filter((u) => u.devices.some((d) => d.status !== "healthy")).length,
    [rows]
  );
  const noSubscriptionCount = React.useMemo(
    () => (rows || []).filter((u) => u.subscriptionCount === 0).length,
    [rows]
  );
  const filteredRows = React.useMemo(
    () => (rows || []).filter((u) => matchesSearch(u, search)),
    [rows, search]
  );

  const handleNudge = React.useCallback(async (targetUserId: string, targetName: string) => {
    if (!token) return;
    setNudgingId(targetUserId);
    try {
      await apiClient.post(`/api/crm/timeproof/push/nudge/${targetUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Reminder sent to ${targetName}.`);
    } catch {
      toast.error(`Could not send reminder to ${targetName}.`);
    } finally {
      setNudgingId(null);
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground/70 tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-background">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/settings")}
            className="h-9 w-9 p-0 rounded-xl border border-border/40 hover:bg-muted/50 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Notification Health</h1>
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
              Push subscription status across your team — who's actually receiving pushes
            </p>
          </div>
          {isAuthorized && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealth}
              disabled={fetching}
              className="h-9 rounded-xl border-border/50 text-xs font-semibold gap-2 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>

        {!isAuthorized ? (
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-muted-foreground/20" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground/80">Restricted</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                Notification health is only available to admins and managers.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/40 bg-card px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Total users</p>
                <p className="text-2xl font-bold mt-1">{rows?.length ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">No subscriptions</p>
                <p className="text-2xl font-bold mt-1 text-orange-600">{rows ? noSubscriptionCount : "—"}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">With flagged devices</p>
                <p className="text-2xl font-bold mt-1 text-rose-600">{rows ? problemCount : "—"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/30 bg-muted/10 px-4 sm:px-6 py-3.5">
              <div className="flex items-start gap-3">
                <BellRing className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                  <span className="font-semibold text-foreground/80">Stale</span> = no successful push in {staleDays}+ days despite having succeeded before.{" "}
                  <span className="font-semibold text-foreground/80">Never confirmed</span> = subscribed {staleDays}+ days ago, never once recorded a successful send — likely dead on arrival.{" "}
                  <span className="font-semibold text-foreground/80">Failing</span> = actively recording delivery failures right now.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600">
                {error}
              </div>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or username..."
                className="h-9 rounded-xl border-border/40 bg-background/60 pl-9 text-xs"
              />
            </div>

            <div className="space-y-3">
              {rows === null && !error && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              )}
              {rows?.length === 0 && (
                <p className="text-center text-xs text-muted-foreground/60 py-16">No active users found.</p>
              )}
              {rows && rows.length > 0 && filteredRows.length === 0 && (
                <p className="text-center text-xs text-muted-foreground/60 py-16">No users match "{search}".</p>
              )}
              {filteredRows.map((u) => (
                <div key={u.userId} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border/30">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{u.fullName}</p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">@{u.username} · {u.role}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.subscriptionCount === 0 ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-2 rounded-full border-orange-500/20 bg-orange-500/10 text-orange-600">
                          No subscriptions
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 px-2 rounded-full">
                          {u.subscriptionCount} device{u.subscriptionCount === 1 ? "" : "s"}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNudge(u.userId, u.fullName)}
                        disabled={nudgingId === u.userId}
                        className="h-7 rounded-lg border-border/50 text-[11px] font-semibold gap-1.5 px-2.5"
                        title="Remind this user to enable notifications"
                      >
                        {nudgingId === u.userId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        <span className="hidden sm:inline">Remind to enable</span>
                      </Button>
                    </div>
                  </div>
                  {u.devices.length > 0 && (
                    <div className="divide-y divide-border/20">
                      {u.devices.map((d, i) => {
                        const meta = STATUS_META[d.status];
                        const Icon = meta.icon;
                        return (
                          <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 sm:px-5 py-2.5 text-[11px]">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ${meta.className}`}>
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                            <span className="text-muted-foreground/70 font-mono">{d.deviceHint}</span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${d.appSource === "supraspace" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : d.appSource === "main" ? "bg-sky-500/10 text-sky-600 border-sky-500/20" : "bg-muted text-muted-foreground/60 border-border/40"}`}>
                              {d.appSource || "no appSource (legacy)"}
                            </span>
                            <span className="text-muted-foreground/40 font-mono">{d.endpointHost}</span>
                            <span className="text-muted-foreground/50 ml-auto">Last success: {fmtDate(d.lastSuccessAt)}</span>
                            <span className="text-muted-foreground/50">Created: {fmtDate(d.createdAt)}</span>
                            {d.failureCount > 0 && (
                              <span className="text-rose-500/80 font-semibold">{d.failureCount} recent failure{d.failureCount === 1 ? "" : "s"}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
