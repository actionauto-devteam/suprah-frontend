"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  Clock,
  Info,
  Loader2,
  ShieldAlert,
  Stamp,
  TrendingDown,
  UserRoundSearch,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_META, formatRelative, type PulseAlert } from "@/lib/pulse360";
import {
  usePulse360,
  acknowledgeAlert,
  snoozeAlert,
  dismissPopup,
} from "@/lib/pulse360-store";

/**
 * Suprah Pulse360 — global alert popup.
 *
 * Mounted once in (dashboard)/layout.tsx. Because the store is a module-level
 * singleton with no provider, this component is the only thing that needs to
 * exist for alerts to appear on every route in the platform.
 *
 * Design intent: this interrupts someone mid-task, so it earns the interruption
 * by being specific. Every popup answers four things in order — what happened,
 * why it fired, what to do, and one button that takes you there. No generic
 * "you have a new notification".
 */

const ICONS: Record<string, LucideIcon> = {
  Info,
  Bell,
  Stamp,
  Clock,
  Activity,
  AlertTriangle,
  UserRoundSearch,
  CalendarClock,
  ShieldAlert,
  TrendingDown,
};

const SNOOZE_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "Rest of day", minutes: 480 },
];

function PulseAlertCard({ alert, onClose }: { alert: PulseAlert; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | "ack" | "go" | "snooze">(null);
  const [snoozeOpen, setSnoozeOpen] = React.useState(false);

  const meta = PRIORITY_META[alert.priority] ?? PRIORITY_META.information;
  const Icon = ICONS[meta.icon] ?? Info;
  const isCritical = alert.severity >= 90;

  const handleGo = async () => {
    setBusy("go");
    // Acknowledging on the way through is the honest behaviour: the user is
    // acting on it, so it should not still be sitting in their queue.
    await acknowledgeAlert(alert._id);
    onClose();
    if (alert.actionUrl) router.push(alert.actionUrl);
  };

  const handleAck = async () => {
    setBusy("ack");
    await acknowledgeAlert(alert._id);
    onClose();
  };

  const handleSnooze = async (minutes: number) => {
    setBusy("snooze");
    await snoozeAlert(alert._id, minutes);
    onClose();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`pulse-alert-title-${alert._id}`}
      aria-describedby={`pulse-alert-reason-${alert._id}`}
      className={cn(
        "relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/50",
        "bg-card/95 shadow-2xl ring-1 backdrop-blur-xl",
        meta.ring
      )}
      style={{ animation: "slideUp 0.22s ease-out" }}
    >
      {/* Priority spine — the fastest read in the whole component */}
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.bar)} aria-hidden />

      <div className="flex items-start gap-3 border-b border-border/30 px-5 py-4 pl-6">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            meta.pill
          )}
        >
          <Icon className={cn("h-4 w-4", meta.text)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                meta.pill,
                meta.text
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  meta.dot,
                  isCritical && "animate-pulse motion-reduce:animate-none"
                )}
              />
              {meta.label}
            </span>
            {alert.occurrences > 1 && (
              <span className="rounded-full border border-border/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {alert.occurrences}× since {formatRelative(alert.firstFiredAt)}
              </span>
            )}
          </div>
          <p
            id={`pulse-alert-title-${alert._id}`}
            className="mt-1.5 text-sm font-black leading-snug tracking-tight text-foreground"
          >
            {alert.title}
          </p>
        </div>

        {!isCritical && (
          <button
            onClick={onClose}
            aria-label="Dismiss for now"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-3 px-5 py-4 pl-6">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            Why this fired
          </p>
          <p
            id={`pulse-alert-reason-${alert._id}`}
            className="mt-1 text-xs leading-relaxed text-muted-foreground/80"
          >
            {alert.reason}
          </p>
        </div>

        <div className="rounded-xl border border-border/30 bg-muted/20 px-3.5 py-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            What to do
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground/85">
            {alert.recommendedAction}
          </p>
        </div>

        {isCritical && (
          <p className="text-[10px] font-semibold text-red-500/70">
            Critical alerts stay open until the underlying item is dealt with.
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-border/30 bg-muted/10 px-5 py-4 pl-6">
        {alert.actionUrl && (
          <button
            onClick={handleGo}
            disabled={!!busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:-translate-y-0.5 hover:bg-violet-500 active:translate-y-0 disabled:opacity-50 motion-reduce:transform-none"
          >
            {busy === "go" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {alert.actionLabel || "Take me there"}
                <ArrowRight className="h-4 w-4 opacity-70" />
              </>
            )}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAck}
            disabled={!!busy}
            className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-card text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
          >
            {busy === "ack" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Got it
          </button>

          <div className="relative">
            <button
              onClick={() => setSnoozeOpen((v) => !v)}
              disabled={!!busy}
              aria-expanded={snoozeOpen}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-card text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
            >
              <Clock className="h-3.5 w-3.5" />
              Snooze
            </button>

            {snoozeOpen && (
              <div className="absolute bottom-[calc(100%+0.35rem)] right-0 z-20 w-36 overflow-hidden rounded-xl border border-border/50 bg-card shadow-xl">
                {SNOOZE_OPTIONS.map((option) => (
                  <button
                    key={option.minutes}
                    onClick={() => handleSnooze(option.minutes)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    {option.label}
                    {isCritical && option.minutes > 60 && (
                      <span className="text-[8px] uppercase text-red-500/60">capped</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Pulse360Popup() {
  const { popupQueue, enabled } = usePulse360();
  const current = popupQueue[0];

  // Escape closes anything that isn't critical.
  React.useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && current.severity < 90) dismissPopup(current._id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current]);

  if (!enabled || !current) return null;

  const isCritical = current.severity >= 90;

  return (
    <div className="fixed inset-0 z-250 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!isCritical) dismissPopup(current._id);
        }}
        aria-hidden
      />
      <PulseAlertCard alert={current} onClose={() => dismissPopup(current._id)} />

      {popupQueue.length > 1 && (
        <span className="pointer-events-none absolute bottom-6 z-10 rounded-full border border-border/40 bg-card/90 px-3 py-1 text-[10px] font-bold text-muted-foreground/70 backdrop-blur sm:bottom-8">
          {popupQueue.length - 1} more waiting
        </span>
      )}
    </div>
  );
}

export default Pulse360Popup;
