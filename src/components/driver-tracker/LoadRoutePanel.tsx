"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Gauge, Route, Ruler, TrafficCone, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableLoadRoute, LoadRouteAudience } from "@/lib/api/load-route";
import { useLoadRoute, type LoadRouteState } from "@/hooks/useLoadRoute";
import { shownRoute } from "@/lib/load-route-lines";
import { formatRigHeight, formatRigLength } from "@/lib/rig-size";
import { EQUIPMENT_PAGE_PATH } from "@/lib/trailer-setup";

/*
 * Arrival time at a load's next stop along the best truck route, with live
 * traffic from Amazon Location, adjusted for how the driver has been moving.
 * Shown on the Driver Tracker, the Transportation load page and the Driver
 * Page. Nothing is shown while routes are switched off or for loads without a
 * trip.
 */

const TIME_ZONE = "America/Denver";

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

function formatMiles(meters: number) {
  const miles = meters / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles).toLocaleString("en-US")} mi`;
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

/** How far off a rough location may be: "500 ft", "0.9 mi". */
function formatAccuracy(meters: number) {
  if (meters < 800) return `${Math.max(50, Math.round((meters * 3.28084) / 50) * 50)} ft`;
  return formatMiles(meters);
}

/** "a and b", "a, b and c". */
function listOf(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const DRIVER_MESSAGES: Record<string, string> = {
  no_driver_position: "Share your location to see your route and arrival time.",
  no_destination: "This stop couldn't be found on the map, so no route yet.",
  unavailable: "Your route couldn't be worked out right now. It will try again shortly.",
};

const WARNING_TEXT = "text-amber-800 dark:text-amber-300";

/** Which rig size the route was planned for, and what the driver still needs to add. */
function RigSizeNote({ truck, audience }: { truck: NonNullable<AvailableLoadRoute["truck"]>; audience: LoadRouteAudience }) {
  const size = `${formatRigHeight(truck.heightInches)} tall, ${formatRigLength(truck.lengthFeet)} long`;
  const missing = [!truck.fromEquipment.height && "height", !truck.fromEquipment.length && "length"].filter(Boolean) as string[];
  const standard = missing.length === 2 ? "standard " : "";
  const parts = missing.join(" and ");
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
      <Ruler className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">
        {missing.length === 0 && (audience === "driver" ? `Planned for your ${size} rig.` : `Planned for the driver's ${size} rig.`)}
        {missing.length > 0 && audience === "driver" && (
          <>
            Planned for a {standard}{size} rig. Add your rig&apos;s {parts} on the{" "}
            <Link href={EQUIPMENT_PAGE_PATH} className="font-semibold text-primary underline underline-offset-2">Equipment page</Link>{" "}
            so routes fit your rig.
          </>
        )}
        {missing.length > 0 && audience === "staff" &&
          `Planned for a ${standard}${size} rig. The driver hasn't added their rig's ${parts} yet.`}
      </span>
    </p>
  );
}

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
  state: LoadRouteState | null;
  audience: LoadRouteAudience;
  /** "card": a full box. "compact": a smaller box. "line": one line. */
  variant?: Variant;
  className?: string;
}

/** Shows a route already fetched with useLoadRoute. */
export function LoadRouteSummary({ state, audience, variant = "card", className }: SummaryProps) {
  const now = useNow();
  if (!state?.route) return null;
  const { route } = state;
  if (!route.available && (route.reason === "routes_off" || route.reason === "not_tracked")) return null;

  const shown = shownRoute(state, now);
  if (!shown) {
    if (route.available) return null;
    const message = audience === "driver" ? DRIVER_MESSAGES[route.reason] ?? route.message : route.message;
    // No route is safe for the truck: a warning, not a "please wait".
    const unsafe = route.reason === "no_safe_route";
    const Icon = unsafe ? TriangleAlert : Clock;
    return (
      <p
        role={unsafe ? "alert" : undefined}
        className={cn("flex items-start gap-1.5 text-xs", unsafe ? WARNING_TEXT : "text-muted-foreground", className)}
      >
        <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{message}</span>
      </p>
    );
  }

  const arrivalMs = Date.parse(shown.arrivalAt);
  const remaining = Math.max(0, (arrivalMs - now) / 1000);
  const arrival = formatArrival(arrivalMs, now);
  const stopLabel = shown.stop === "pickup" ? "pickup" : "delivery";
  const restOfTrip = shown.route?.later ?? null;
  const safety = shown.safety;
  const needsCheck = safety?.status === "check";

  if (variant === "line") {
    return (
      <p className={cn("flex items-start gap-1.5 text-xs", className)}>
        <Clock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 break-words">
          <span className="font-semibold">Arrives at {stopLabel} {arrival}</span>
          <span className="text-muted-foreground"> · in {formatDuration(remaining)} · {shown.traffic.level} traffic</span>
          {shown.deadline && shown.deadline.status !== "on_time" && (
            <span className={shown.deadline.status === "late" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"}>
              {" "}· {DEADLINE[shown.deadline.status].label}
            </span>
          )}
          {needsCheck && <span className="text-amber-700 dark:text-amber-300"> · Check route for truck limits</span>}
        </span>
      </p>
    );
  }

  const whose = audience === "driver" ? "your" : "the driver's";
  const checkIn = audience === "driver" ? "Check it in your truck navigation app before you drive." : "The driver should check it in a truck navigation app.";
  const planIn = audience === "driver" ? "Plan that part in your truck navigation app." : "The driver should plan that part in a truck navigation app.";
  const approximate = shown.driver.positionApproximate && shown.driver.positionAccuracyMeters != null
    ? formatAccuracy(shown.driver.positionAccuracyMeters)
    : null;

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
        in {formatDuration(remaining)} · {formatMiles(shown.distanceMeters)} to go
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

      {needsCheck && safety && (safety.limits.length > 0 || safety.restOfTripUnsafe) && (
        <div role="alert" className={cn("mt-2 space-y-1 rounded-md border px-2 py-1.5 text-xs", TRAFFIC_STYLE.moderate)}>
          {safety.limits.length > 0 && (
            <p className="flex items-start gap-1.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                This route may pass {listOf(safety.limits)}. {checkIn}
              </span>
            </p>
          )}
          {safety.restOfTripUnsafe && (
            <p className="flex items-start gap-1.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                No safe truck route was found from the pickup to the delivery
                {safety.restOfTripLimits.length > 0 ? ` (it would pass ${listOf(safety.restOfTripLimits)})` : ""}. {planIn}
              </span>
            </p>
          )}
        </div>
      )}

      {(shown.traffic.comparedWithUsual === "worse" || shown.traffic.comparedWithUsual === "better") && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {shown.traffic.comparedWithUsual === "worse" ? "Traffic is heavier than usual for this time of day." : "Traffic is lighter than usual for this time of day."}
        </p>
      )}

      {restOfTrip && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Route className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            Then about {formatDuration(restOfTrip.durationSeconds)} of driving ({formatMiles(restOfTrip.distanceMeters)}) from the pickup to the delivery.
          </span>
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

      {(shown.driver.positionStale || approximate) && (
        <p className={cn("mt-1.5 text-xs", WARNING_TEXT)}>
          Based on {whose} {approximate ? "approximate " : ""}location
          {shown.driver.positionStale ? ` from ${shown.driver.positionAgeMinutes} min ago` : ""}
          {approximate ? ` (within about ${approximate})` : ""}.
          {approximate && audience === "driver" ? " Your route updates once your phone has a precise location." : ""}
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

      {shown.truck && <RigSizeNote truck={shown.truck} audience={audience} />}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {route.available
          ? `${shown.optimizedFor === "shortest" ? "Shortest" : "Fastest"} truck route with live traffic · updated ${formatClock(shown.computedAt)}`
          : `Couldn't refresh · showing the route from ${formatClock(shown.computedAt)}`}
      </p>
    </div>
  );
}

interface PanelProps {
  loadId: string | null | undefined;
  audience: LoadRouteAudience;
  /** Skip asking when the person can't see this load's trip anyway. */
  enabled?: boolean;
  /** Asks again as soon as this changes (for example the load's status). */
  refreshKey?: string;
  variant?: Variant;
  className?: string;
}

/** Fetches (every minute while on screen) and shows a load's route and arrival time. */
export function LoadRoutePanel({ loadId, audience, enabled = true, refreshKey, variant, className }: PanelProps) {
  const state = useLoadRoute(loadId, audience, enabled, refreshKey);
  return <LoadRouteSummary state={state} audience={audience} variant={variant} className={className} />;
}
