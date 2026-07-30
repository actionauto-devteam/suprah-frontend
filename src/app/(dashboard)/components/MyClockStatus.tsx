"use client";

import * as React from "react";
import { Clock, Play, Pause, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Panel, PanelSkeleton } from "./DashboardPanel";

interface ShiftState {
  isOnShift: boolean;
  isOnBreak: boolean;
  wallClockRenderedSeconds: number;
}

function fmtHours(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Glance-only clock status — the full Timeproof Clock page remains the
 * source of truth for actually clocking in/out. Auth mirrors that page's own
 * dual-mode split: a stored `crm_token` means this org uses CRM-token auth
 * for Timeproof, otherwise the main app token (already auto-attached by
 * apiClient) applies.
 */
export function MyClockStatus() {
  const router = useRouter();
  const [state, setState] = React.useState<ShiftState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    const crmToken = typeof window !== "undefined" ? localStorage.getItem("crm_token") : null;
    try {
      const res = crmToken
        ? await apiClient.get("/api/crm/timeproof/shift-state", { headers: { Authorization: `Bearer ${crmToken}` }, signal })
        : await apiClient.get("/api/timeclock/shift-state", { signal });
      const d = res.data?.data;
      if (d) {
        setState({
          isOnShift: !!d.isOnShift,
          isOnBreak: !!d.isOnBreak,
          wallClockRenderedSeconds: d.wallClockRenderedSeconds ?? 0,
        });
        setFailed(false);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const id = setInterval(() => load(), 30_000);
    return () => { controller.abort(); clearInterval(id); };
  }, [load]);

  const statusLabel = !state ? "Off clock" : state.isOnBreak ? "On break" : state.isOnShift ? "On shift" : "Off clock";
  const StatusIcon = !state ? Square : state.isOnBreak ? Pause : state.isOnShift ? Play : Square;
  const statusTone = !state
    ? "text-muted-foreground/60 bg-muted/40 border-border/30"
    : state.isOnBreak
      ? "text-amber-600 bg-amber-500/10 border-amber-500/25"
      : state.isOnShift
        ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/25"
        : "text-muted-foreground/60 bg-muted/40 border-border/30";

  return (
    <Panel title="My Clock" icon={Clock} accent="text-emerald-500" action="Open Timeproof" onAction={() => router.push("/crm/timeproof-clock")}>
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : failed ? (
        <p className="text-xs text-muted-foreground/60 text-center py-6">Clock status unavailable right now.</p>
      ) : (
        <div className="space-y-3">
          <div className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 ${statusTone}`}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background/40">
              <StatusIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black tracking-tight">{statusLabel}</p>
              <p className="text-[10px] font-medium opacity-70">
                {state ? `${fmtHours(state.wallClockRenderedSeconds)} tracked today` : "No activity yet today"}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/crm/timeproof-clock")}
            className="w-full rounded-xl border border-border/30 bg-background/40 py-2 text-[11px] font-bold text-muted-foreground/70 hover:border-emerald-500/30 hover:text-emerald-600 transition-colors"
          >
            {state?.isOnShift ? "Manage shift" : "Clock in"}
          </button>
        </div>
      )}
    </Panel>
  );
}
