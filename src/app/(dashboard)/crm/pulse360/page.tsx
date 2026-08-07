"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  Send,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import {
  BAND_META,
  WORK_STATE_META,
  PRIORITY_META,
  formatRelative,
  type PulseOverview,
  type PulseSignal,
  type PulseHealth,
  type PulseAlert,
  type PulseNextAction,
} from "@/lib/pulse360";
import { PulseRing, PulseComponentBreakdown, PulseTrendline } from "@/components/crm/pulse360/PulseRing";
import { usePulse360 } from "@/lib/pulse360-store";

/**
 * Suprah Pulse360 — operations dashboard.
 *
 * Two audiences on one page. An employee sees their own pulse and what to do
 * next. An admin or manager additionally sees the org rollup, the department
 * grid, and every individual's health with a timeline drawer.
 *
 * Ordering choice worth noting: the workforce grid sorts worst-first by
 * default. A dashboard that opens on the highest scores is decorative; the
 * whole point is to put the person who needs help at the top of the screen.
 */

interface CrmMe {
  _id: string;
  fullName: string;
  role: string;
  department?: string;
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneText =
    tone === "good"
      ? "text-emerald-500"
      : tone === "warn"
        ? "text-amber-500"
        : tone === "bad"
          ? "text-red-500"
          : "text-foreground";

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/25" />
      </div>
      <p className={cn("mt-2 font-mono text-3xl font-black tabular-nums tracking-tight", toneText)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs font-medium text-muted-foreground/50">{sub}</p>}
    </div>
  );
}

function UserDrawer({
  userId,
  onClose,
  canManage,
}: {
  userId: string;
  onClose: () => void;
  canManage: boolean;
}) {
  const [loading, setLoading] = React.useState(true);
  const [health, setHealth] = React.useState<PulseHealth | null>(null);
  const [alerts, setAlerts] = React.useState<PulseAlert[]>([]);
  const [nextActions, setNextActions] = React.useState<PulseNextAction[]>([]);
  const [timeline, setTimeline] = React.useState<PulseSignal[]>([]);
  const [nudge, setNudge] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const authConfig = React.useCallback(() => {
    const token = localStorage.getItem("crm_token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiClient.get(`/api/crm/pulse360/users/${userId}/health`, authConfig()),
      apiClient.get(`/api/crm/pulse360/users/${userId}/timeline?limit=60`, authConfig()),
    ])
      .then(([healthRes, timelineRes]) => {
        if (cancelled) return;
        const data = healthRes.data?.data ?? healthRes.data;
        setHealth(data?.health ?? null);
        setAlerts(data?.alerts ?? []);
        setNextActions(data?.nextActions ?? []);
        setTimeline((timelineRes.data?.data ?? timelineRes.data)?.signals ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load that person's pulse");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, authConfig]);

  const sendNudge = async () => {
    if (!nudge.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/api/crm/pulse360/users/${userId}/nudge`, { message: nudge.trim() }, authConfig());
      toast.success("Nudge sent — it will pop up wherever they are in the app");
      setNudge("");
    } catch {
      toast.error("Could not send that nudge");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-200 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border/40 bg-background shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/30 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={health?.avatar} />
              <AvatarFallback className="text-sm font-bold">{health?.fullName?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight">{health?.fullName ?? "Loading…"}</p>
              <p className="truncate text-sm text-muted-foreground/60">
                {health?.department ?? "No department"} · {health?.role ?? ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition hover:bg-muted/50 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : !health ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <Gauge className="h-8 w-8 text-muted-foreground/25" />
            <p className="mt-2 text-base font-bold">No pulse data yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Their score appears after the next evaluation sweep.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="flex items-center gap-5">
              <PulseRing
                score={health.score}
                band={health.band}
                components={health.components}
                size={140}
                live={health.workState === "working"}
              />
              <div className="min-w-0 flex-1 space-y-3">
                <PulseComponentBreakdown components={health.components} />
                <PulseTrendline trend={health.trend} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">Open</p>
                <p className="mt-0.5 font-mono text-xl font-black tabular-nums">{health.stats.openTasks}</p>
              </div>
              <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">Overdue</p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-xl font-black tabular-nums",
                    health.stats.overdueTasks > 0 ? "text-red-500" : "text-emerald-500"
                  )}
                >
                  {health.stats.overdueTasks}
                </p>
              </div>
              <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">Done 14d</p>
                <p className="mt-0.5 font-mono text-xl font-black tabular-nums text-emerald-500">
                  {health.stats.completedInWindow}
                </p>
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  Open alerts
                </p>
                {alerts.map((alert) => {
                  const meta = PRIORITY_META[alert.priority] ?? PRIORITY_META.information;
                  return (
                    <div
                      key={alert._id}
                      className={cn("rounded-xl border px-3 py-2.5", meta.pill)}
                    >
                      <p className={cn("text-[11px] font-black uppercase tracking-widest", meta.text)}>{meta.label}</p>
                      <p className="mt-0.5 text-sm font-bold text-foreground">{alert.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground/70">{alert.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {nextActions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  Recommended next
                </p>
                {nextActions.map((action) => (
                  <div key={action.taskId} className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-foreground">{action.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground/60">{action.why}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                Activity timeline
              </p>
              <div className="space-y-0">
                {timeline.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground/50">
                    Nothing recorded in this window.
                  </p>
                ) : (
                  timeline.map((signal, index) => (
                    <div key={signal._id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            signal.passive ? "bg-muted-foreground/25" : "bg-violet-500"
                          )}
                        />
                        {index < timeline.length - 1 && <span className="w-px flex-1 bg-border/40" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-3">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold",
                            signal.passive ? "text-muted-foreground/50" : "text-foreground/85"
                          )}
                        >
                          {signal.title}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/35">
                          {signal.module} · {formatRelative(signal.occurredAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {canManage && health && (
          <div className="shrink-0 space-y-2 border-t border-border/30 bg-muted/10 px-5 py-4">
            <label htmlFor="pulse-nudge" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              Ask for an update
            </label>
            <div className="flex gap-2">
              <input
                id="pulse-nudge"
                value={nudge}
                onChange={(e) => setNudge(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) void sendNudge();
                }}
                placeholder="What do you need from them?"
                className="h-10 flex-1 rounded-xl border border-border/40 bg-background px-3 text-sm outline-none transition focus:border-violet-500/50"
              />
              <Button
                onClick={sendNudge}
                disabled={sending || !nudge.trim()}
                className="h-10 shrink-0 gap-1.5 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white hover:bg-violet-500"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pulse360Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { health: myHealth, alerts: myAlerts, nextActions } = usePulse360();

  const [me, setMe] = React.useState<CrmMe | null>(null);
  const [overview, setOverview] = React.useState<PulseOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [evaluating, setEvaluating] = React.useState(false);

  const [department, setDepartment] = React.useState(searchParams.get("department") ?? "all");
  const [workState, setWorkState] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<string | null>(searchParams.get("user"));

  const authConfig = React.useCallback(() => {
    const token = localStorage.getItem("crm_token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  const canManage = !!me && ["admin", "manager"].includes(me.role);

  React.useEffect(() => {
    const token = localStorage.getItem("crm_token");
    if (!token) {
      router.replace("/crm");
      return;
    }
    apiClient
      .get("/api/crm/me", authConfig())
      .then((res) => setMe(res.data?.data ?? res.data))
      .catch(() => router.replace("/crm"));
  }, [router, authConfig]);

  const loadOverview = React.useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (department !== "all") params.set("department", department);
      if (workState !== "all") params.set("workState", workState);

      const res = await apiClient.get(`/api/crm/pulse360/overview?${params.toString()}`, authConfig());
      setOverview(res.data?.data ?? res.data);
    } catch {
      toast.error("Could not load the operations overview");
    } finally {
      setLoading(false);
    }
  }, [canManage, department, workState, authConfig]);

  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // Live org room. The server verifies the role before honouring the join, so
  // a non-manager asking simply gets denied.
  React.useEffect(() => {
    if (!canManage) return;
    const token = localStorage.getItem("crm_token");
    if (!token) return;

    const socket = initializeSocket(token);
    socket.emit("pulse:join", { token });

    const onOverview = (payload: PulseOverview) => setOverview(payload);
    const onHealth = () => void loadOverview();

    socket.on("pulse:overview", onOverview);
    socket.on("pulse:health:org", onHealth);

    return () => {
      socket.off("pulse:overview", onOverview);
      socket.off("pulse:health:org", onHealth);
      socket.emit("pulse:leave", {});
    };
  }, [canManage, loadOverview]);

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      await apiClient.post("/api/crm/pulse360/evaluate", {}, authConfig());
      toast.success("Evaluation running — results will stream in");
    } catch {
      toast.error("Could not start the evaluation");
    } finally {
      setEvaluating(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    if (!overview) return [];
    const term = search.trim().toLowerCase();
    if (!term) return overview.users;
    return overview.users.filter(
      (u) => u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }, [overview, search]);

  const departments = React.useMemo(
    () => ["all", ...(overview?.departments.map((d) => d.department) ?? [])],
    [overview]
  );

  if (loading && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/dashboard")}
            className="h-9 w-9 shrink-0 rounded-xl border border-border/40 p-0 hover:bg-muted/50"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-xl font-black tracking-tight sm:text-2xl">
              <Gauge className="h-5 w-5 text-violet-500" />
              Suprah Pulse360
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground/60">
              Operational health across every department
            </p>
          </div>
          {canManage && (
            <Button
              onClick={runEvaluation}
              disabled={evaluating}
              size="sm"
              className="ml-auto h-9 shrink-0 gap-1.5 rounded-xl border border-border/40 bg-card text-sm font-bold text-muted-foreground hover:bg-muted/50"
            >
              {evaluating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Re-evaluate now</span>
            </Button>
          )}
        </div>

        {/* My pulse — everyone sees this */}
        {myHealth && (
          <div className="rounded-2xl border border-border/40 bg-card/50 p-5 backdrop-blur-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <PulseRing
                score={myHealth.score}
                band={myHealth.band}
                components={myHealth.components}
                size={160}
                live={myHealth.workState === "working"}
              />

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-widest",
                      WORK_STATE_META[myHealth.workState].text,
                      "border-border/40 bg-muted/20"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", WORK_STATE_META[myHealth.workState].dot)} />
                    {WORK_STATE_META[myHealth.workState].label}
                  </span>
                  {myHealth.delta !== 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-bold",
                        myHealth.delta > 0 ? "text-emerald-500" : "text-orange-500"
                      )}
                    >
                      {myHealth.delta > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {myHealth.delta > 0 ? "+" : ""}
                      {myHealth.delta} since last check
                    </span>
                  )}
                </div>

                <PulseComponentBreakdown components={myHealth.components} />
              </div>

              <div className="w-full space-y-2 sm:w-64">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  Do this next
                </p>
                {nextActions.length === 0 ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-4 text-center">
                    <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500/60" />
                    <p className="mt-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      Nothing outstanding
                    </p>
                  </div>
                ) : (
                  nextActions.slice(0, 3).map((action) => (
                    <button
                      key={action.taskId}
                      onClick={() => router.push(action.url)}
                      className="w-full rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5 text-left transition hover:border-violet-500/30 hover:bg-violet-500/5"
                    >
                      <p className="truncate text-sm font-bold text-foreground">{action.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/60">{action.why}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {!canManage ? (
          <div className="rounded-2xl border border-border/30 bg-muted/10 px-5 py-4">
            <p className="text-sm font-semibold text-muted-foreground/70">
              Department and org-wide analytics are available to admins and managers.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border/40 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : !overview ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/40 py-16 text-center">
            <AlertTriangle className="h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-muted-foreground/70">Could not load the operations overview</p>
            <Button
              onClick={() => void loadOverview()}
              size="sm"
              className="h-8 gap-1.5 rounded-xl border border-border/40 bg-card text-xs font-bold text-muted-foreground hover:bg-muted/50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Org totals */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Monitored" value={overview.totals.monitored} icon={Users} />
              <StatTile
                label="Working"
                value={overview.totals.working}
                sub={`${overview.totals.onBreak} on break`}
                icon={Activity}
                tone="good"
              />
              <StatTile
                label="Idle"
                value={overview.totals.idle}
                sub="on shift, no activity"
                icon={Clock}
                tone={overview.totals.idle > 0 ? "warn" : "default"}
              />
              <StatTile
                label="Overdue"
                value={overview.totals.overdueTasks}
                sub={`${overview.totals.withOverdue} people`}
                icon={AlertTriangle}
                tone={overview.totals.overdueTasks > 0 ? "bad" : "good"}
              />
              <StatTile
                label="At risk"
                value={overview.totals.atRisk}
                sub="score below 55"
                icon={TrendingDown}
                tone={overview.totals.atRisk > 0 ? "warn" : "good"}
              />
              <StatTile
                label="Avg score"
                value={overview.totals.averageScore}
                sub={`${overview.openAlerts} open alerts`}
                icon={Gauge}
                tone={overview.totals.averageScore >= 70 ? "good" : "warn"}
              />
            </div>

            {/* Bottlenecks — the "look here first" panel */}
            {overview.bottlenecks.length > 0 && (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500/70">
                  Needs attention first
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {overview.bottlenecks.map((item) => (
                    <button
                      key={item.userId}
                      onClick={() => setSelectedUser(item.userId)}
                      className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/60 px-3 py-2.5 text-left transition hover:bg-card"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={item.avatar} />
                        <AvatarFallback className="text-xs font-bold">{item.fullName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{item.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground/60">{item.reason}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-base font-black tabular-nums",
                          BAND_META[item.band].text
                        )}
                      >
                        {item.score}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Departments */}
            <div className="rounded-2xl border border-border/40 bg-card/50">
              <div className="flex items-center gap-2 border-b border-border/30 px-5 py-3.5">
                <Building2 className="h-4 w-4 text-muted-foreground/40" />
                <p className="text-sm font-black tracking-tight">Departments</p>
                <p className="ml-auto text-xs text-muted-foreground/40">Weakest first</p>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {overview.departments.map((dept) => (
                  <button
                    key={dept.department}
                    onClick={() => setDepartment(dept.department)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition",
                      department === dept.department
                        ? "border-violet-500/40 bg-violet-500/5"
                        : "border-border/30 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold capitalize">{dept.department}</p>
                      <span className={cn("font-mono text-base font-black tabular-nums", BAND_META[dept.band].text)}>
                        {dept.averageScore}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground/60">
                      <span>{dept.headcount} people</span>
                      <span>{dept.working} working</span>
                      {dept.overdueTasks > 0 && (
                        <span className="font-bold text-red-500">{dept.overdueTasks} overdue</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Workforce grid */}
            <div className="rounded-2xl border border-border/40 bg-card/50">
              <div className="flex flex-wrap items-center gap-2 border-b border-border/30 px-5 py-3.5">
                <Users className="h-4 w-4 text-muted-foreground/40" />
                <p className="text-sm font-black tracking-tight">Workforce</p>

                <div className="relative ml-auto">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find someone"
                    aria-label="Search the workforce"
                    className="h-8 w-40 rounded-lg border border-border/40 bg-background pl-7 pr-2 text-sm outline-none transition focus:border-violet-500/50 sm:w-52"
                  />
                </div>

                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  aria-label="Filter by department"
                  className="h-8 rounded-lg border border-border/40 bg-background px-2 text-sm font-semibold outline-none"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d === "all" ? "All departments" : d}
                    </option>
                  ))}
                </select>

                <select
                  value={workState}
                  onChange={(e) => setWorkState(e.target.value)}
                  aria-label="Filter by state"
                  className="h-8 rounded-lg border border-border/40 bg-background px-2 text-sm font-semibold outline-none"
                >
                  <option value="all">Any state</option>
                  <option value="working">Working</option>
                  <option value="idle">Idle</option>
                  <option value="on_break">On break</option>
                  <option value="off_shift">Off shift</option>
                </select>
              </div>

              <div className="divide-y divide-border/20">
                {filteredUsers.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground/50">
                    Nobody matches those filters.
                  </p>
                ) : (
                  filteredUsers.map((user) => {
                    const bandMeta = BAND_META[user.band];
                    const stateMeta = WORK_STATE_META[user.workState];
                    return (
                      <button
                        key={user.userId}
                        onClick={() => setSelectedUser(user.userId)}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-muted/30"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-sm font-bold">{user.fullName[0]}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{user.fullName}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className={cn("flex items-center gap-1 text-xs font-semibold", stateMeta.text)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", stateMeta.dot)} />
                              {stateMeta.label}
                            </span>
                            <span className="truncate text-xs capitalize text-muted-foreground/50">
                              {user.department ?? "—"}
                            </span>
                          </div>
                        </div>

                        <div className="hidden shrink-0 items-center gap-4 sm:flex">
                          <div className="text-right">
                            <p className="font-mono text-sm font-bold tabular-nums">{user.stats.openTasks}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Open</p>
                          </div>
                          <div className="text-right">
                            <p
                              className={cn(
                                "font-mono text-sm font-bold tabular-nums",
                                user.stats.overdueTasks > 0 ? "text-red-500" : "text-muted-foreground/50"
                              )}
                            >
                              {user.stats.overdueTasks}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Late</p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className={cn("font-mono text-lg font-black tabular-nums", bandMeta.text)}>
                            {user.score}
                          </span>
                          <span
                            className={cn(
                              "hidden rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-wider sm:inline-block",
                              bandMeta.pill,
                              bandMeta.text
                            )}
                          >
                            {bandMeta.label}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <UserDrawer userId={selectedUser} canManage={canManage} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
