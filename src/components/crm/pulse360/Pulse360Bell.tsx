"use client";

import * as React from "react";
import { HeaderDrawer } from "@/components/layout/HeaderDrawer";
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
 *
 * The dropdown is PORTALLED to document.body and positioned `fixed`, not
 * `absolute`. The CRM shell wraps content in `h-dvh overflow-hidden` and the
 * header itself uses `backdrop-blur`, both of which create clipping/containing
 * contexts — an absolutely-positioned child gets cut off by them (the panel
 * appears but is clipped). Rendering into a portal at the body escapes every
 * ancestor's overflow, and a measured anchor keeps it pinned under the button.
 */

export function Pulse360Bell({ className, open: controlledOpen, onOpenChange }: { className?: string; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const router = useRouter();
  const { alerts, health, ready, enabled } = usePulse360();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [clearing, setClearing] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  if (!enabled) return null;

  const live = alerts.filter((a) => a.status !== "snoozed");
  const critical = live.filter((a) => a.severity >= 90).length;
  const band = health ? BAND_META[health.band] : null;

  const handleClearAll = async () => {
    setClearing(true);
    await acknowledgeAll();
    setClearing(false);
  };

  const panel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
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
  );

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-label={`Pulse360, ${live.length} open alert${live.length === 1 ? "" : "s"}`}
        aria-expanded={open}
        aria-controls="pulse360-drawer"
        className="relative flex h-9 items-center gap-1.5 rounded-xl border border-border/40 px-2.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <Gauge className="h-4 w-4" />
        {health && (
          <span className={cn("font-mono text-[11px] font-black tabular-nums", band?.text)}>
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

      <HeaderDrawer id="pulse360-drawer" title="Pulse360" open={open} onOpenChange={setOpen} triggerRef={buttonRef}>{panel}</HeaderDrawer>
    </div>
  );
}

export default Pulse360Bell;