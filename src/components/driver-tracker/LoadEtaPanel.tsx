"use client";

import * as React from "react";
import { Clock, Gauge, TrafficCone, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableLoadEta, LoadEtaAudience } from "@/lib/api/load-eta";
import { useLoadEta, type LoadEtaState } from "@/hooks/useLoadEta";

/*
 * Arrival time at a load's next stop: live traffic and truck routes from
 * Amazon Location, adjusted for how the driver has been moving. Shown on the
 * Driver Tracker, the Transportation load page and the Driver Page. Nothing is
 * shown while arrival times are switched off or for loads without a trip.
 */

const TIME_ZONE = "America/Denver";
/** After a failed refresh, the last arrival time stays up for this long. */
const KEEP_LAST_MS = 10 * 60_000;

const dayKey = (ms: number) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

function formatArrival(arrivalMs: number, nowMs: number) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(arrivalMs);
  if (dayKey(arrivalMs) === dayKey(nowMs)) return time;
  if (dayKey(arrivalMs) === dayKey(nowMs + 24 * 60 * 60_000)) return `Tomorrow ${time}`;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short", month: "short", day: "numeric" }).format(arrivalMs);
  return `${day}, ${time}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} d ${hours % 24} h` : `${days} d`;
}

const formatClock = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

const formatDeadlineDay = (day: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${day}T00:00:00Z`));

const TRAFFIC_STYLE = {
  light: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  moderate: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  heavy: "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300",
} as const;

const DEADLINE = {
  on_time: { label: "On time", style: TRAFFIC_STYLE.light },
  at_risk: { label: "At risk", style: TRAFFIC_STYLE.moderate },
  late: { label: "Late", style: TRAFFIC_STYLE.heavy },
} as const;

const DRIVER_MESSAGES: Record<string, string> = {
  no_driver_position: "Share your location to see your arrival time.",
  no_destination: "This stop couldn't be found on the map, so no arrival time yet.",
  unavailable: "Your arrival time couldn't be worked out right now. It will try again shortly.",
};

function useNow(intervalMs = 30_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

type Variant = "card" | "compact" | "line";

interface SummaryProps {
  state: LoadEtaState | null;
  audience: LoadEtaAudience;
  /** "card": a full box. "compact": a smaller box. "line": one line. */
  variant?: Variant;
  className?: string;
}

/** Shows an arrival time already fetched with useLoadEta. */
export function LoadEtaSummary({ state, audience, variant = "card", className }: SummaryProps) {
  const now = useNow();
  if (!state?.eta) return null;
  const { eta, lastAvailable } = state;
  if (!eta.available && (eta.reason === "eta_off" || eta.reason === "not_tracked")) return null;

  const shown: AvailableLoadEta | null = eta.available
    ? eta
    : lastAvailable && now - Date.parse(lastAvailable.computedAt) < KEEP_LAST_MS
      ? lastAvailable
      : null;

  if (!shown) {
    if (eta.available) return null;
    const message = audience === "driver" ? DRIVER_MESSAGES[eta.reason] ?? eta.message : eta.message;
    return (
      <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
        <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{message}</span>
      </p>
    );
  }

  const arrivalMs = Date.parse(shown.arrivalAt);
  const remaining = Math.max(0, (arrivalMs - now) / 1000);
  const arrival = formatArrival(arrivalMs, now);
  const miles = shown.distanceMeters / 1609.344;
  const milesText = miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles).toLocaleString("en-US")} mi`;
  const stopLabel = shown.stop === "pickup" ? "pickup" : "delivery";

  if (variant === "line") {
    return (
      <p className={cn("flex items-start gap-1.5 text-xs", className)}>
        <Clock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 break-words">
          <span className="font-semibold">Arrives {arrival}</span>
          <span className="text-muted-foreground"> · in {formatDuration(remaining)} · {shown.traffic.level} traffic</span>
          {shown.deadline && shown.deadline.status !== "on_time" && (
            <span className={shown.deadline.status === "late" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"}>
              {" "}· {DEADLINE[shown.deadline.status].label}
            </span>
          )}
        </span>
      </p>
    );
  }

  const trafficDelay = Math.round(shown.traffic.delaySeconds / 60);
  const pace = Math.round(shown.paceAdjustmentSeconds / 60);
  const speed = shown.driver.stoppedMinutes != null
    ? audience === "driver"
      ? `You've been stopped ${shown.driver.stoppedMinutes} min`
      : `Stopped ${shown.driver.stoppedMinutes} min`
    : shown.driver.speedMph != null
      ? `${audience === "driver" ? "You're driving" : "Driving"} ${shown.driver.speedMph} mph`
      : null;
  const compact = variant === "compact";

  return (
    <div
      role="group"
      aria-label={`Arrival time at ${stopLabel}`}
      className={cn("min-w-0 rounded-lg border border-border/60 bg-background/45", compact ? "p-2.5" : "p-3", className)}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Clock className="size-3.5 text-primary" aria-hidden="true" />
        {audience === "driver" ? "Your arrival" : "Arrival"} · {shown.stop === "pickup" ? "Pickup" : "Delivery"}
      </p>
      <p className={cn("mt-1.5 font-bold leading-tight", compact ? "text-base" : "text-lg")}>{arrival}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        in {formatDuration(remaining)} · {milesText} to go
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", TRAFFIC_STYLE[shown.traffic.level])}>
          <TrafficCone className="size-3" aria-hidden="true" />
          {shown.traffic.level === "light" ? "Light" : shown.traffic.level === "moderate" ? "Moderate" : "Heavy"} traffic
          {trafficDelay > 0 ? ` · +${trafficDelay} min` : ""}
        </span>
        {shown.deadline && (
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", DEADLINE[shown.deadline.status].style)}>
            {DEADLINE[shown.deadline.status].label} for {formatDeadlineDay(shown.deadline.day)} {stopLabel}
          </span>
        )}
      </div>

      {(shown.traffic.comparedWithUsual === "worse" || shown.traffic.comparedWithUsual === "better") && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {shown.traffic.comparedWithUsual === "worse" ? "Traffic is heavier than usual for this time of day." : "Traffic is lighter than usual for this time of day."}
        </p>
      )}

      {(speed || pace !== 0) && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Gauge className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {speed}
            {speed && pace !== 0 ? " · " : ""}
            {pace !== 0 ? `${pace > 0 ? "+" : "−"}${Math.abs(pace)} min for ${audience === "driver" ? "your" : "the driver's"} recent pace` : ""}
          </span>
        </p>
      )}

      {shown.driver.positionStale && (
        <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-300">
          Based on {audience === "driver" ? "your" : "the driver's"} location from {shown.driver.positionAgeMinutes} min ago.
        </p>
      )}

      {shown.incidents.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {shown.incidents.map((incident, index) => (
            <li key={`${index}-${incident.description}`} className="flex items-start gap-1.5">
              <TriangleAlert
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  incident.severity === "Critical" || incident.severity === "High" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{incident.description}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {eta.available
          ? `Live traffic, truck routes · updated ${formatClock(shown.computedAt)}`
          : `Couldn't refresh · showing the time from ${formatClock(shown.computedAt)}`}
      </p>
    </div>
  );
}

interface PanelProps {
  loadId: string | null | undefined;
  audience: LoadEtaAudience;
  /** Skip asking when the person can't see this load's trip anyway. */
  enabled?: boolean;
  variant?: Variant;
  className?: string;
}

/** Fetches (every 2 minutes while on screen) and shows a load's arrival time. */
export function LoadEtaPanel({ loadId, audience, enabled = true, variant, className }: PanelProps) {
  const state = useLoadEta(loadId, audience, enabled);
  return <LoadEtaSummary state={state} audience={audience} variant={variant} className={className} />;
}
