"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { fmtTimeMDT, todayStrMDT } from "@/lib/timezone";
import {
  X, Building2, Navigation, Pause, Play, Power, MapPinOff, Crosshair,
  BatteryFull, BatteryLow, Gauge, History, Clock, MapPin, Loader2, Smartphone, Monitor,
  Car, Anchor, Map as MapIcon, ChevronDown, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TeamMember } from "@/hooks/useTeamPulse";
import {
  useMyLocatorStatus, useSetLocationConsent, usePlaces,
  type ActiveEmployeeLocation, type Place, type LocationHistoryPoint, type TimeAtPlaceEntry,
} from "@/hooks/useLocator";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { RouteReplayMap } from "./TripRouteMap";
import {
  sharingMeta, DepartmentBadge, signalMeta,
  isNotablyStationary, stationaryMinutes, formatStationaryDuration,
} from "./LocatorMapLegend";
import { haversineMi, haversineM, formatDistanceMi } from "@/lib/geo";

function sharingDuration(sinceIso?: string) {
  if (!sinceIso) return "";
  try {
    const ms = Date.now() - new Date(sinceIso).getTime();
    const totalMin = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  } catch {
    return "";
  }
}

/** First place whose geofence radius contains this point — mirrors the backend's own
 * findNearestPlace matching order, so a breadcrumb row's "at {place}" label agrees with
 * what the live map/geofence events would have said at that moment. */
function placeForCoords(coords: { lat: number; lng: number }, places: Place[]): Place | undefined {
  return places.find((p) => haversineM(coords, p.coords) <= p.radiusM);
}

const SEGMENTS_PAGE_SIZE = 20;
const MOVING_SPEED_MPH = 3;
const MOVING_DRIFT_M = 45;
const MIN_SEGMENT_MIN = 2;

/** Turns a raw breadcrumb list into the kind of summary a person actually wants to read —
 * distance covered and top speed — instead of just a point count. */
function summarizeHistory(history: LocationHistoryPoint[]) {
  let distanceMi = 0;
  let maxSpeed = 0;
  for (let i = 0; i < history.length; i++) {
    const speed = history[i].speedMph;
    if (typeof speed === "number" && speed > maxSpeed) maxSpeed = speed;
    if (i > 0) distanceMi += haversineMi(history[i - 1].coords, history[i].coords);
  }
  return { distanceMi, maxSpeed, pointCount: history.length };
}

interface HistorySegment {
  kind: "moving" | "stationary";
  startAt: string;
  endAt: string;
  durationMin: number;
  place?: Place;
  distanceMi?: number;
  topSpeedMph?: number;
}

/** Collapses the raw 30s-interval breadcrumb trail into readable arrive/leave/drive
 * segments — a flat list of a hundred near-identical pings reads as noise, while "Drove
 * 2.3mi in 6m" / "At Suprah Lot for 32m" reads as an actual timeline of what happened.
 * A point counts as "moving" off its own reported speed when available, falling back to
 * distance drift from the previous point when the device didn't report one. Short blips
 * (under MIN_SEGMENT_MIN) get folded into the segment before them instead of showing up
 * as their own noisy one-line entries. */
function buildHistorySegments(history: LocationHistoryPoint[], places: Place[]): HistorySegment[] {
  if (history.length === 0) return [];

  const isMoving = (prev: LocationHistoryPoint | undefined, cur: LocationHistoryPoint): boolean => {
    if (typeof cur.speedMph === "number") return cur.speedMph > MOVING_SPEED_MPH;
    if (!prev) return false;
    return haversineM(prev.coords, cur.coords) > MOVING_DRIFT_M;
  };

  const raw: HistorySegment[] = [];
  let segStart = 0;
  let kind: HistorySegment["kind"] = isMoving(undefined, history[0]) ? "moving" : "stationary";

  const finalizeSegment = (endIdx: number) => {
    const startPt = history[segStart];
    const endPt = history[endIdx];
    const durationMin = Math.max(1, Math.round((new Date(endPt.recordedAt).getTime() - new Date(startPt.recordedAt).getTime()) / 60000));
    if (kind === "stationary") {
      raw.push({ kind, startAt: startPt.recordedAt, endAt: endPt.recordedAt, durationMin, place: placeForCoords(startPt.coords, places) });
      return;
    }
    let distanceMi = 0;
    let topSpeedMph = 0;
    for (let i = segStart; i <= endIdx; i++) {
      if (i > segStart) distanceMi += haversineMi(history[i - 1].coords, history[i].coords);
      const s = history[i].speedMph;
      if (typeof s === "number" && s > topSpeedMph) topSpeedMph = s;
    }
    raw.push({ kind, startAt: startPt.recordedAt, endAt: endPt.recordedAt, durationMin, distanceMi, topSpeedMph });
  };

  for (let i = 1; i < history.length; i++) {
    const nextKind = isMoving(history[i - 1], history[i]) ? "moving" : "stationary";
    if (nextKind !== kind) {
      finalizeSegment(i - 1);
      segStart = i;
      kind = nextKind;
    }
  }
  finalizeSegment(history.length - 1);

  // Fold blips shorter than MIN_SEGMENT_MIN into whichever neighbor is longer, so a single
  // red-light stop doesn't split one drive into three noisy rows.
  const merged: HistorySegment[] = [];
  for (const seg of raw) {
    const prev = merged[merged.length - 1];
    if (seg.durationMin < MIN_SEGMENT_MIN && prev) {
      prev.endAt = seg.endAt;
      prev.durationMin += seg.durationMin;
      if (prev.kind === "moving" && seg.kind === "moving") {
        prev.distanceMi = (prev.distanceMi ?? 0) + (seg.distanceMi ?? 0);
        prev.topSpeedMph = Math.max(prev.topSpeedMph ?? 0, seg.topSpeedMph ?? 0);
      }
      continue;
    }
    merged.push({ ...seg });
  }
  return merged.reverse(); // newest first
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function initialsOf(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

interface Props {
  isSelf: boolean;
  hasExplicitSelection: boolean;
  loc?: ActiveEmployeeLocation;
  member?: TeamMember;
  place?: Place;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  history: LocationHistoryPoint[];
  historyLoading: boolean;
  report: TimeAtPlaceEntry[];
  isAdmin?: boolean;
  onClose: () => void;
  onLocate?: () => void;
}

/**
 * Always-visible right-rail panel. Defaults to showing YOUR own location +
 * sharing controls; clicking another roster/map avatar swaps it to their
 * (read-only) info. Closing returns to your own info.
 */
export function LocationInfoPanel({
  isSelf, hasExplicitSelection, loc, member, place, from, to, setFrom, setTo,
  history, historyLoading, report, isAdmin, onClose, onLocate,
}: Props) {
  const { data: myStatus } = useMyLocatorStatus();
  const { mutate: setConsent, isPending: consentPending } = useSetLocationConsent();
  const { data: places = [] } = usePlaces();
  const consentGranted = !!myStatus?.locationConsent?.granted;
  const [segmentsVisibleCount, setSegmentsVisibleCount] = React.useState(SEGMENTS_PAGE_SIZE);
  const [routeMapOpen, setRouteMapOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);

  // Reset pagination whenever the underlying range/history changes so an old "load more" state
  // from a previous person/date-range doesn't linger.
  React.useEffect(() => {
    setSegmentsVisibleCount(SEGMENTS_PAGE_SIZE);
  }, [history]);
  const {
    sharingState: myRuntimeState, pauseManually, resumeSharing, busy: sharingBusy,
    awaitingFirstFix, error: sharingError,
  } = useLocationSharing({
    eligible: consentGranted,
    onBreak: !!myStatus?.isOnBreak,
  });

  // Surface the acquire-GPS success/failure that used to happen silently — this is the
  // "clicked share, nothing seemed to happen" gap the acquisition window used to hide.
  const wasAwaitingFix = React.useRef(false);
  React.useEffect(() => {
    if (wasAwaitingFix.current && !awaitingFirstFix) {
      if (myRuntimeState === "sharing") toast.success("You're live on the map!");
      else if (sharingError) toast.error(sharingError);
    }
    wasAwaitingFix.current = awaitingFirstFix;
  }, [awaitingFirstFix, myRuntimeState, sharingError]);

  const name = isSelf ? "My Location" : (loc?.userName ?? member?.name ?? "Employee");
  const avatar = isSelf ? undefined : (loc?.userAvatar ?? member?.avatar);
  const jobTitle = isSelf ? undefined : (loc?.jobTitle ?? member?.personalInfo?.jobTitle);

  const effectiveState = isSelf ? myRuntimeState : (loc?.sharingState ?? "off_duty");
  const meta = sharingMeta(effectiveState);
  const sharing = effectiveState === "sharing";
  const isPaused = effectiveState === "paused_manual" || effectiveState === "paused_break";
  // A 3rd status on top of Sharing/Not Sharing: sharing that's currently driven by an active
  // TimeProof shift rather than your own manual toggle. While this is true, Beacon's own
  // Pause/Stop are read-only — TimeProof owns turning it off (either its own Stop Sharing
  // button, or automatically when the shift ends/breaks) — so the two surfaces never fight
  // over who's in control. The moment the shift ends or you go on break, control returns to
  // Beacon automatically; there's always a working way to stop it from TimeProof itself, so
  // this can never become the "no way out" trap the always-locked version used to be.
  const isShiftGoverned = isSelf && sharing && !!myStatus?.isOnShift && !myStatus?.isOnBreak;
  // Not sharing right now but we still have their last known coords (never cleared on
  // stop) — show that as a Life360-style "last seen" instead of just a flat "Not Sharing".
  const isLastSeen = !isSelf && effectiveState === "off_duty" && !!loc?.coords;
  const WhereIcon = sharing ? (place ? Building2 : Navigation) : isLastSeen ? Clock : effectiveState === "declined_permission" ? MapPinOff : Pause;
  const where = sharing
    ? place
      ? `At ${place.name}`
      : typeof loc?.speedMph === "number" && loc.speedMph > 3
        ? `On the move · ${loc.speedMph} mph`
        : "Sharing location"
    : isLastSeen
      ? `Last seen ${timeAgo(loc?.lastSeenAt)}`
      : meta.label;
  const distanceMi = !isSelf && loc?.coords && myStatus?.coords ? haversineMi(myStatus.coords, loc.coords) : null;

  function startSharing() {
    // No success toast here — consent being granted just unlocks the GPS watch, it doesn't mean
    // anyone can see you yet. The real "you're live" toast fires once `awaitingFirstFix` clears
    // below, after an actual position has been sent.
    setConsent(
      { granted: true, deviceHint: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined },
      { onError: () => toast.error("Could not update location sharing") },
    );
  }

  function stopSharing() {
    setConsent(
      { granted: false },
      {
        onSuccess: () => toast.message("Location sharing turned off"),
        onError: () => toast.error("Could not update location sharing"),
      },
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-primary/20 bg-card overflow-hidden shadow-sm h-full flex flex-col"
    >
      {/* header */}
      <div className="flex items-start gap-2.5 p-3.5 border-b border-border/40 bg-primary/3 shrink-0">
        <div className="relative shrink-0">
          {isSelf ? (
            <div className={cn(
              "relative flex items-center justify-center size-11 rounded-xl",
              sharing ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-muted/70 border border-border/40",
            )}>
              {sharing && <span className="absolute inset-0 rounded-xl bg-emerald-500/20 animate-ping" />}
              <Navigation className={cn("size-5 relative", sharing ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
            </div>
          ) : avatar ? (
            <img src={avatar} alt={name} className="size-11 rounded-xl object-cover" />
          ) : (
            <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary">
              {initialsOf(name)}
            </div>
          )}
          {!isSelf && <span className={cn("absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-card", meta.color)} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black truncate">{name}</p>
            {!isSelf && <DepartmentBadge department={member?.personalInfo?.department} />}
            {!isSelf && sharing && (
              place ? (
                <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded uppercase tracking-wide shrink-0">On-Site</span>
              ) : (
                <span className="text-[8px] font-black text-muted-foreground/60 bg-muted/50 border border-border/30 px-1 rounded uppercase tracking-wide shrink-0">Off-Site</span>
              )
            )}
          </div>
          {jobTitle && <p className="text-[11px] text-muted-foreground/60 truncate">{jobTitle}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex size-2 shrink-0">
              {meta.pulse && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-50", meta.color)} />}
              <span className={cn("relative inline-flex size-2 rounded-full", meta.color)} />
            </span>
            <WhereIcon className="size-3 text-muted-foreground/70 shrink-0" />
            <span className="text-[11px] font-bold truncate" style={place ? { color: place.color || undefined } : undefined}>{where}</span>
            {isShiftGoverned && (
              <span className="text-[8px] font-black text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1 rounded uppercase tracking-wide shrink-0">
                Via Shift
              </span>
            )}
          </div>
        </div>

        {isSelf ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {!consentGranted ? (
              <ShareToggleButton icon={MapPin} pending={consentPending} onClick={startSharing} title="Share my location" />
            ) : awaitingFirstFix ? (
              <>
                <ShareToggleButton icon={Loader2} pending iconClassName="animate-spin" title="Getting your location…" />
                <StopButton pending={consentPending} onClick={stopSharing} />
              </>
            ) : isShiftGoverned ? (
              <ShareToggleButton icon={Lock} disabled title="Controlled by your active TimeProof shift — stop it there, or it turns off automatically when your shift ends" />
            ) : isPaused ? (
              <>
                <ShareToggleButton icon={Play} pending={sharingBusy} onClick={resumeSharing} variant="resume" title="Resume sharing" />
                <StopButton pending={consentPending || sharingBusy} onClick={stopSharing} />
              </>
            ) : (
              <>
                <ShareToggleButton icon={Pause} pending={sharingBusy} onClick={pauseManually} title="Pause sharing" />
                <StopButton pending={consentPending || sharingBusy} onClick={stopSharing} />
              </>
            )}
          </div>
        ) : hasExplicitSelection && (
          <button onClick={onClose} title="Back to my location" className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* short status description */}
      <AnimatePresence mode="wait">
        <motion.p
          key={isShiftGoverned ? "shift-governed" : meta.description}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="px-3.5 pt-2 text-[10px] text-muted-foreground/60 leading-snug shrink-0"
        >
          {isShiftGoverned
            ? "Sharing because your shift is active — stop it from TimeProof, or it turns off automatically when your shift ends."
            : meta.description}
        </motion.p>
      </AnimatePresence>

      {/* scrollable body: mini status line + Show on map + stat chips + history — fills
          remaining height so the card bottom lines up with the map */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-1">
        {loc && (
          <div className="px-3.5 pt-2.5 space-y-2">
            <p className="text-[9px] font-semibold text-muted-foreground/50">
              Updated {timeAgo(loc.lastSeenAt) || "—"}
              {sharing && loc.sharingSince && <> · Sharing for {sharingDuration(loc.sharingSince)}</>}
            </p>

            {loc.coords && onLocate && (
              <button
                onClick={onLocate}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary px-2.5 py-1.5 text-[10px] font-bold hover:bg-primary/15 transition-colors"
              >
                <Crosshair className="size-3" /> Show on map
              </button>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              {distanceMi !== null && (
                <Chip icon={MapPin} label="Distance" value={formatDistanceMi(distanceMi)} />
              )}
              {typeof loc.speedMph === "number" && <Chip icon={Gauge} label="Speed" value={`${loc.speedMph} mph`} />}
              {typeof loc.batteryLevel === "number" && (
                <Chip
                  icon={loc.batteryLevel <= 20 ? BatteryLow : BatteryFull}
                  label="Battery"
                  value={`${loc.batteryLevel}%${loc.isCharging ? " ⚡" : ""}`}
                  danger={loc.batteryLevel <= 20}
                />
              )}
              {(() => {
                const signal = signalMeta(loc);
                return <Chip icon={signal.icon} label="Signal" value={signal.label} iconClassName={signal.className} />;
              })()}
              {loc.deviceType && (
                <Chip icon={loc.deviceType === "mobile" ? Smartphone : Monitor} label="Device" value={loc.deviceType === "mobile" ? "Phone" : "Computer"} />
              )}
              {/* Only counts while actually sharing — otherwise this kept showing "stayed put"
                  off a stale last-known anchor from before sharing stopped. */}
              {sharing && isNotablyStationary(loc) && (
                <Chip icon={Anchor} label="Stayed Put" value={formatStationaryDuration(stationaryMinutes(loc)!)} />
              )}
            </div>
          </div>
        )}

        <div className="px-3.5 pb-3.5 pt-3 space-y-2.5 border-t border-border/30">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center gap-1.5"
          >
            <div className="flex items-center justify-center size-5 rounded-md bg-primary/10 shrink-0">
              <History className="size-3 text-primary/70" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Location History</span>
            {!historyOpen && history.length > 0 && (
              <span className="text-[9px] text-muted-foreground/40 font-semibold">{history.length} points</span>
            )}
            <ChevronDown className={cn("size-3 text-muted-foreground/50 ml-auto transition-transform", historyOpen && "rotate-180")} />
          </button>

          {historyOpen && (
          <>
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { label: "Today", from: todayStrMDT(), to: todayStrMDT() },
              { label: "Yesterday", from: todayStrMDT(-1), to: todayStrMDT(-1) },
              { label: "This Week", from: todayStrMDT(-6), to: todayStrMDT() },
            ] as const).map((preset) => {
              const active = from === preset.from && to === preset.to;
              return (
                <button
                  key={preset.label}
                  onClick={() => { setFrom(preset.from); setTo(preset.to); }}
                  className={cn(
                    "text-[9px] font-semibold px-2 py-1 rounded-full border transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/40 text-muted-foreground/60 hover:border-border hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 text-[10px] px-2" />
            <span className="text-[9px] text-muted-foreground/50">→</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-7 text-[10px] px-2" />
          </div>

          {historyLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 py-1">No breadcrumb points for this range.</p>
          ) : (
            <>
              {(() => {
                const summary = summarizeHistory(history);
                return (
                  <p className="text-[9px] text-muted-foreground/50">
                    <span className="font-bold text-foreground">{summary.pointCount}</span> points ·{" "}
                    {formatDistanceMi(summary.distanceMi)}
                    {summary.maxSpeed > 0 && <> · top {summary.maxSpeed} mph</>}
                  </p>
                );
              })()}
              <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground/50">
                <span>{fmtTimeMDT(history[0].recordedAt)} → {fmtTimeMDT(history[history.length - 1].recordedAt)}</span>
                {history.length > 1 && (
                  <button
                    onClick={() => setRouteMapOpen(true)}
                    className="flex items-center gap-1 font-bold text-primary hover:text-primary/80 shrink-0"
                  >
                    <MapIcon className="size-3" /> Replay route
                  </button>
                )}
              </div>

              {/* Fixed-height so a long history never stretches this panel taller than the
                  live map next to it — it scrolls internally instead. Segments (arrive/leave/
                  drive), not raw pings — a hundred near-identical 30s pings reads as noise,
                  "Drove 2.3mi in 6m" / "At Suprah Lot for 32m" reads as an actual timeline. */}
              {(() => {
                const segments = buildHistorySegments(history, places);
                const visible = segments.slice(0, segmentsVisibleCount);
                return (
                  <div className="rounded-xl border border-border/30 bg-muted/10 max-h-64 overflow-y-auto p-2.5">
                    {visible.map((seg, i) => {
                      const SegIcon = seg.kind === "moving" ? Car : seg.place ? Building2 : Anchor;
                      const label = seg.kind === "moving" ? "On the move" : seg.place ? `At ${seg.place.name}` : "Stopped";
                      const dotColor = seg.kind === "moving" ? "bg-blue-500" : seg.place ? "bg-primary" : "bg-muted-foreground/40";
                      const isLast = i === visible.length - 1;
                      return (
                        <div key={`${seg.startAt}-${i}`} className="flex gap-2.5">
                          <div className="flex flex-col items-center">
                            <span className={cn("mt-1 size-2 rounded-full shrink-0", dotColor)} />
                            {!isLast && <span className="w-px flex-1 bg-border/40 my-0.5" />}
                          </div>
                          <div className={cn("flex-1 min-w-0", !isLast && "pb-3")}>
                            <div className="flex items-center gap-1.5">
                              <SegIcon className="size-3 text-muted-foreground/50 shrink-0" />
                              <span
                                className="text-[10.5px] font-bold truncate"
                                style={seg.place?.color ? { color: seg.place.color } : undefined}
                              >
                                {label}
                              </span>
                              <span className="text-[9px] text-muted-foreground/40 shrink-0 ml-auto">{formatStationaryDuration(seg.durationMin)}</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                              {fmtTimeMDT(seg.startAt)}{seg.startAt !== seg.endAt ? ` – ${fmtTimeMDT(seg.endAt)}` : ""}
                              {seg.kind === "moving" && typeof seg.distanceMi === "number" && seg.distanceMi > 0.05 && (
                                <> · {formatDistanceMi(seg.distanceMi)}{seg.topSpeedMph ? ` · top ${seg.topSpeedMph} mph` : ""}</>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {segments.length > segmentsVisibleCount && (
                      <button
                        onClick={() => setSegmentsVisibleCount((n) => n + SEGMENTS_PAGE_SIZE)}
                        className="w-full text-center text-[9px] font-bold text-primary py-1.5 mt-1 hover:bg-muted/30 rounded-md"
                      >
                        Show {Math.min(SEGMENTS_PAGE_SIZE, segments.length - segmentsVisibleCount)} more
                      </button>
                    )}
                  </div>
                );
              })()}
            </>
          )}

          {isAdmin && report.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Time at Place</p>
              <div className="rounded-lg border border-border/40 divide-y divide-border/30">
                {report.map((r) => (
                  <div key={`${r.userId}-${r.placeId}`} className="flex items-center justify-between px-2.5 py-1.5 text-[10px]">
                    <span className="flex items-center gap-1.5 font-semibold truncate">
                      <MapPin className="size-3 text-muted-foreground/50 shrink-0" /> {r.placeName}
                    </span>
                    <span className="text-muted-foreground/60 tabular-nums shrink-0">
                      {r.visits}× · {r.totalMin >= 60 ? `${Math.floor(r.totalMin / 60)}h ${Math.round(r.totalMin % 60)}m` : `${Math.round(r.totalMin)}m`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
          )}

          <Dialog open={routeMapOpen} onOpenChange={setRouteMapOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-sm font-black flex items-center gap-1.5">
                  <MapIcon className="size-4" /> {name}&apos;s Route
                </DialogTitle>
                <DialogDescription className="sr-only">Breadcrumb route replay map for the selected date range</DialogDescription>
              </DialogHeader>
              <RouteReplayMap route={history} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );
}

function ShareToggleButton({
  icon: Icon, pending, disabled, onClick, title, variant, iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  pending?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
  variant?: "resume";
  iconClassName?: string;
}) {
  return (
    <Button
      size="icon"
      variant={variant === "resume" ? "default" : "outline"}
      disabled={pending || disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "size-9 shrink-0",
        variant === "resume" && "bg-emerald-600 hover:bg-emerald-700 text-white",
      )}
    >
      <Icon className={cn("size-4", pending && "animate-spin", iconClassName)} />
    </Button>
  );
}

function StopButton({
  pending, onClick,
}: {
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="icon"
      variant="outline"
      disabled={pending}
      onClick={onClick}
      title="Stop sharing"
      className="size-9 shrink-0 border-border/50 text-muted-foreground hover:text-foreground"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
    </Button>
  );
}

function Chip({
  icon: Icon, label, value, danger, iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  danger?: boolean;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/40 border border-border/25 px-2.5 py-2 min-w-0">
      <div className={cn("flex items-center justify-center size-6 rounded-lg shrink-0", danger ? "bg-red-500/10" : "bg-primary/8")}>
        <Icon className={cn("size-3.5", iconClassName ?? (danger ? "text-red-500" : "text-primary/70"))} />
      </div>
      <div className="leading-tight min-w-0">
        <p className="text-[7px] uppercase tracking-wide text-muted-foreground/50 font-bold">{label}</p>
        <p className={cn("text-[10.5px] font-bold tabular-nums truncate", danger && "text-red-500")}>{value}</p>
      </div>
    </div>
  );
}
