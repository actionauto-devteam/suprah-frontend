"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { fmtTimeMDT } from "@/lib/timezone";
import {
  X, Building2, Navigation, Pause, Play, Power, MapPinOff, Crosshair,
  BatteryFull, BatteryLow, Wifi, WifiOff, Gauge, History, Clock, MapPin, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/hooks/useTeamPulse";
import {
  useMyLocatorStatus, useSetLocationConsent,
  type ActiveEmployeeLocation, type Place, type LocationHistoryPoint, type TimeAtPlaceEntry,
} from "@/hooks/useLocator";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { sharingMeta } from "./LocatorMapLegend";

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
  const consentGranted = !!myStatus?.locationConsent?.granted;
  const { sharingState: myRuntimeState, pauseManually, resumeSharing } = useLocationSharing({
    eligible: consentGranted,
    onBreak: false,
  });

  const name = isSelf ? "My Location" : (loc?.userName ?? member?.name ?? "Employee");
  const avatar = isSelf ? undefined : (loc?.userAvatar ?? member?.avatar);
  const jobTitle = isSelf ? undefined : (loc?.jobTitle ?? member?.personalInfo?.jobTitle);

  const effectiveState = isSelf ? myRuntimeState : (loc?.sharingState ?? "off_duty");
  const meta = sharingMeta(effectiveState);
  const sharing = effectiveState === "sharing";
  const isPaused = effectiveState === "paused_manual" || effectiveState === "paused_break";
  const WhereIcon = sharing ? (place ? Building2 : Navigation) : effectiveState === "declined_permission" ? MapPinOff : Pause;
  const where = sharing
    ? place
      ? `At ${place.name}`
      : typeof loc?.speedMph === "number" && loc.speedMph > 3
        ? `On the move · ${loc.speedMph} mph`
        : "Sharing location"
    : meta.label;

  function startSharing() {
    setConsent(
      { granted: true, deviceHint: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : undefined },
      {
        onSuccess: () => toast.success("You're now sharing your location"),
        onError: () => toast.error("Could not update location sharing"),
      },
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
            {!isSelf && loc?.employmentLocationType === "onsite" && (
              <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded uppercase tracking-wide shrink-0">On-Site</span>
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
          </div>
        </div>

        {hasExplicitSelection && !isSelf && (
          <button onClick={onClose} title="Back to my location" className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* short status description */}
      <AnimatePresence mode="wait">
        <motion.p
          key={meta.description}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="px-3.5 pt-2 text-[10px] text-muted-foreground/60 leading-snug shrink-0"
        >
          {meta.description}
        </motion.p>
      </AnimatePresence>

      {/* sharing controls — only for "me" */}
      {isSelf && (
        <div className="flex items-center gap-1.5 px-3.5 pt-2.5 shrink-0">
          {!consentGranted ? (
            <Button size="sm" disabled={consentPending} onClick={startSharing} className="h-8 flex-1 text-[11px] font-bold gap-1.5">
              {consentPending ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
              Share my location
            </Button>
          ) : isPaused ? (
            <>
              <Button size="sm" onClick={resumeSharing} className="h-8 flex-1 text-[11px] font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Play className="size-3.5" /> Resume
              </Button>
              <Button size="sm" variant="outline" disabled={consentPending} onClick={stopSharing} className="h-8 text-[11px] font-bold gap-1.5 border-border/50">
                {consentPending ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={pauseManually} className="h-8 flex-1 text-[11px] font-bold gap-1.5 border-border/50">
                <Pause className="size-3.5" /> Pause
              </Button>
              <Button size="sm" variant="outline" disabled={consentPending} onClick={stopSharing} className="h-8 text-[11px] font-bold gap-1.5 border-border/50 text-muted-foreground hover:text-foreground">
                {consentPending ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
              </Button>
            </>
          )}
        </div>
      )}

      {/* scrollable body: stat chips + history — fills remaining height so the ​card bottom lines up with the map */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-1">
        {loc && (
          <div className="grid grid-cols-2 gap-1.5 p-3.5">
            <Chip icon={Clock} label="Updated" value={timeAgo(loc.lastSeenAt) || "—"} />
            {typeof loc.speedMph === "number" && <Chip icon={Gauge} label="Speed" value={`${loc.speedMph} mph`} />}
            {typeof loc.batteryLevel === "number" && (
              <Chip
                icon={loc.batteryLevel <= 20 ? BatteryLow : BatteryFull}
                label="Battery"
                value={`${loc.batteryLevel}%${loc.isCharging ? " ⚡" : ""}`}
                danger={loc.batteryLevel <= 20}
              />
            )}
            <Chip icon={loc.connectivity === "offline" ? WifiOff : Wifi} label="Signal" value={loc.connectivity === "offline" ? "Offline" : "Online"} />
            {loc.coords && onLocate && (
              <button
                onClick={onLocate}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary px-2.5 py-1.5 text-[10px] font-bold hover:bg-primary/15 transition-colors"
              >
                <Crosshair className="size-3" /> Show on map
              </button>
            )}
          </div>
        )}

        <div className="px-3.5 pb-3.5 pt-1 space-y-2">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            <History className="size-3" /> Location History
          </span>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 text-[10px] px-2" />
            <span className="text-[9px] text-muted-foreground/50">→</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-7 text-[10px] px-2" />
          </div>

          {historyLoading ? (
            <div className="h-7 rounded-lg bg-muted animate-pulse" />
          ) : history.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50">No breadcrumb points for this range.</p>
          ) : (
            <p className="text-[10px] text-muted-foreground/70 leading-snug">
              <span className="font-bold text-foreground">{history.length}</span> points ·{" "}
              {fmtTimeMDT(history[0].recordedAt)} → {fmtTimeMDT(history[history.length - 1].recordedAt)}
              <br />
              <span className="text-muted-foreground/50">Shown as the blue trail on the map.</span>
            </p>
          )}

          {isAdmin && report.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Time at Place</p>
              <div className="rounded-lg border border-border/40 divide-y divide-border/30">
                {report.map((r) => (
                  <div key={`${r.userId}-${r.placeId}`} className="flex items-center justify-between px-2 py-1.5 text-[10px]">
                    <span className="font-semibold truncate">{r.placeName}</span>
                    <span className="text-muted-foreground/60 tabular-nums shrink-0">{r.visits}× · {Math.round(r.totalMin)}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Chip({
  icon: Icon, label, value, danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 border border-border/30 px-2 py-1.5 min-w-0">
      <Icon className={cn("size-3 shrink-0", danger ? "text-red-500" : "text-muted-foreground/60")} />
      <div className="leading-tight min-w-0">
        <p className="text-[7px] uppercase tracking-wide text-muted-foreground/50 font-bold">{label}</p>
        <p className={cn("text-[10px] font-bold tabular-nums truncate", danger && "text-red-500")}>{value}</p>
      </div>
    </div>
  );
}
