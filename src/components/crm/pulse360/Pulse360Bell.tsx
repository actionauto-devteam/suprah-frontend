"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, CheckCheck, Gauge, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_META, BAND_META, formatRelative } from "@/lib/pulse360";
import { usePulse360, acknowledgeAll, acknowledgeAlert } from "@/lib/pulse360-store";

/**
 * Suprah Pulse360 — header bell.
 *
 * Drop next to NotificationBell in CrmHeader (or the dashboard header). Reads
 * the same singleton store as the popup, so the count is always consistent
 * with what the modal is showing — no second fetch, no drift.
 */

export function Pulse360Bell({ className }: { className?: string }) {
  const router = useRouter();
  const { alerts, health, ready, enabled } = usePulse360();
  const [open, setOpen] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!enabled) return null;

  const live = alerts.filter((a) => a.status !== "snoozed");
  const critical = live.filter((a) => a.severity >= 90).length;
  const band = health ? BAND_META[health.band] : null;

  const handleClearAll = async () => {
    setClearing(true);
    await acknowledgeAll();
    setClearing(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Pulse360, ${live.length} open alert${live.length === 1 ? "" : "s"}`}
        aria-expanded={open}
        className="relative flex h-9 items-center gap-1.5 rounded-xl border border-border/40 px-2.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <Gauge className="h-4 w-4" />
        {health && (
          <span
            className={cn("font-mono text-[11px] font-black tabular-nums", band?.text)}
          >
            {health.score}
          </span>
        )}
        {live.length > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white",
              critical > 0 ? "bg-red-500 animate-pulse motion-reduce:animate-none" : "bg-violet-500"
            )}
          >
            {live.length > 9 ? "9+" : live.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[120] w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-border/40 bg-background/98 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight">Pulse360</p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {ready
                  ? live.length === 0
                    ? "Nothing needs you right now"
                    : `${live.length} item${live.length === 1 ? "" : "s"} need attention`
                  : "Checking…"}
              </p>
            </div>
            {live.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="flex shrink-0 items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-bold text-violet-500 transition hover:bg-violet-500/15 disabled:opacity-50"
              >
                {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Clear
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {live.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Activity className="mx-auto h-7 w-7 text-emerald-500/40" />
                <p className="mt-2 text-sm font-bold text-foreground">You're clear</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deadlines and assignments are all on track.
                </p>
              </div>
            ) : (
              live.map((alert) => {
                const meta = PRIORITY_META[alert.priority] ?? PRIORITY_META.information;
                return (
                  <div
                    key={alert._id}
                    className="group flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-muted/50"
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)} aria-hidden />
                    <button
                      onClick={() => {
                        setOpen(false);
                        if (alert.actionUrl) router.push(alert.actionUrl);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-bold text-foreground">{alert.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/70">
                        {alert.reason}
                      </p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">
                        {meta.label} · {formatRelative(alert.lastFiredAt)}
                      </p>
                    </button>
                    {alert.severity < 90 && (
                      <button
                        onClick={() => void acknowledgeAlert(alert._id)}
                        aria-label="Mark as handled"
                        className="mt-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground/30 opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              router.push("/crm/pulse360");
            }}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border/30 px-4 py-3 text-[11px] font-bold text-violet-500 transition hover:bg-violet-500/5"
          >
            Open Pulse360
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Pulse360Bell;
