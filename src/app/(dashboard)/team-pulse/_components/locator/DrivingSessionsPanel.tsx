"use client";

import * as React from "react";
import { differenceInSeconds } from "date-fns";
import { fmtTimeMDT, MDT_TZ } from "@/lib/timezone";
import { Car, TriangleAlert, ShieldCheck, ShieldAlert, ChevronDown, Gauge, Route, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useDrivingSessions, useRespondToIncident,
  type DrivingSession,
} from "@/hooks/useLocator";
import { TripRouteMap } from "./TripRouteMap";

const INCIDENT_RESPONSE_WINDOW_S = 60;

/** Flat point deductions per infraction — simple and explainable, not per-mile normalized
 * (a 0.2-mile test drive with one harsh brake shouldn't score worse than a 20-mile one). */
function sessionScore(s: DrivingSession): number {
  const score = 100 - (s.harshBrakingEvents ?? 0) * 8 - (s.speedingEvents ?? 0) * 6;
  return Math.max(0, Math.min(100, score));
}

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

interface DriverSummary {
  userId: string;
  userName: string;
  sessionCount: number;
  totalDistance: number;
  totalHarsh: number;
  totalSpeeding: number;
  avgScore: number;
}

function summarizeDrivers(sessions: DrivingSession[]): DriverSummary[] {
  const byDriver = new Map<string, DriverSummary & { scoreSum: number }>();
  for (const s of sessions) {
    const entry = byDriver.get(s.userId) ?? {
      userId: s.userId, userName: s.userName, sessionCount: 0,
      totalDistance: 0, totalHarsh: 0, totalSpeeding: 0, avgScore: 0, scoreSum: 0,
    };
    entry.sessionCount += 1;
    entry.totalDistance += s.distanceMi ?? 0;
    entry.totalHarsh += s.harshBrakingEvents ?? 0;
    entry.totalSpeeding += s.speedingEvents ?? 0;
    entry.scoreSum += sessionScore(s);
    byDriver.set(s.userId, entry);
  }
  return Array.from(byDriver.values())
    .map((d) => ({ ...d, avgScore: Math.round(d.scoreSum / d.sessionCount) }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

function DriverSafetyCard({ driver }: { driver: DriverSummary }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card">
      <div className="flex flex-col items-center justify-center size-12 rounded-lg bg-muted/50 shrink-0">
        <p className={cn("text-lg font-black tabular-nums leading-none", scoreColor(driver.avgScore))}>{driver.avgScore}</p>
        <p className="text-[7px] font-black uppercase tracking-wide text-muted-foreground/50">score</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{driver.userName}</p>
        <p className="text-[10px] text-muted-foreground/60">
          {driver.sessionCount} drive{driver.sessionCount === 1 ? "" : "s"} · {driver.totalDistance.toFixed(1)} mi
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0 text-[9px] text-muted-foreground/60">
        {driver.totalHarsh > 0 && (
          <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-3" /> {driver.totalHarsh}
          </span>
        )}
        {driver.totalSpeeding > 0 && (
          <span className="flex items-center gap-0.5 font-bold text-red-600 dark:text-red-400">
            <Gauge className="size-3" /> {driver.totalSpeeding}
          </span>
        )}
      </div>
    </div>
  );
}

function IncidentBanner({ session }: { session: DrivingSession }) {
  const { mutate, isPending } = useRespondToIncident();
  const [secondsLeft, setSecondsLeft] = React.useState(INCIDENT_RESPONSE_WINDOW_S);

  React.useEffect(() => {
    if (!session.possibleIncident) return;
    const tick = () => {
      const elapsed = differenceInSeconds(new Date(), new Date(session.possibleIncident!.detectedAt));
      setSecondsLeft(Math.max(0, INCIDENT_RESPONSE_WINDOW_S - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.possibleIncident]);

  // Admins are already push-notified the instant a possible incident is detected (server-side,
  // at detection time) — this banner is just the driver-facing "are you okay?" confirmation and
  // deliberately doesn't escalate anywhere further if left unanswered.
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
      <TriangleAlert className="size-4 text-orange-600 dark:text-orange-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-orange-700 dark:text-orange-400">Are you okay?</p>
        <p className="text-[10px] text-muted-foreground/70">
          Sudden deceleration detected — please confirm{secondsLeft > 0 ? ` (${secondsLeft}s)` : ""}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => mutate({ id: session._id, confirmed: false })} className="h-7 text-[10px] font-bold">
        <ShieldCheck className="size-3 mr-1" />
        I&apos;m OK
      </Button>
      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => mutate({ id: session._id, confirmed: true })} className="h-7 text-[10px] font-bold">
        Need Help
      </Button>
    </div>
  );
}

function SessionRow({ session, isMe }: { session: DrivingSession; isMe: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [routeOpen, setRouteOpen] = React.useState(false);
  const needsResponse = isMe && session.possibleIncident && session.possibleIncident.confirmed === undefined;
  const score = sessionScore(session);

  return (
    <div className="p-3 space-y-2">
      {needsResponse && <IncidentBanner session={session} />}
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 text-left">
        <div className={cn(
          "flex items-center justify-center size-8 rounded-lg shrink-0",
          session.status === "active" ? "bg-blue-500/10" : "bg-muted/60",
        )}>
          <Car className={cn("size-4", session.status === "active" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/50")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold truncate">{session.userName}</p>
            {session.status === "active" && (
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase">Live</span>
            )}
            {session.possibleIncident && (
              <TriangleAlert className="size-3 text-orange-500 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ }) + ', ' + fmtTimeMDT(session.startedAt)}
            {session.endedAt && ` – ${fmtTimeMDT(session.endedAt)}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-xs font-black tabular-nums", scoreColor(score))}>{score}</p>
          <p className="text-[9px] text-muted-foreground/50">safety score</p>
        </div>
        <ChevronDown className={cn("size-3.5 text-muted-foreground/40 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-2 pl-11">
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-xs font-black tabular-nums">{Math.round(session.topSpeedMph ?? 0)}</p>
              <p className="text-[9px] text-muted-foreground/50">top mph</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-xs font-black tabular-nums">{(session.distanceMi ?? 0).toFixed(1)}</p>
              <p className="text-[9px] text-muted-foreground/50">miles</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-xs font-black tabular-nums">{session.harshBrakingEvents}</p>
              <p className="text-[9px] text-muted-foreground/50">harsh brakes</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-xs font-black tabular-nums">{session.speedingEvents ?? 0}</p>
              <p className="text-[9px] text-muted-foreground/50">speeding</p>
            </div>
          </div>
          <Button
            size="sm" variant="outline" onClick={() => setRouteOpen(true)}
            className="w-full h-7 text-[10px] font-bold gap-1.5"
          >
            <Route className="size-3" /> View Route
          </Button>
        </div>
      )}

      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-1.5">
              <MapIcon className="size-4" /> {session.userName}'s Route
            </DialogTitle>
          </DialogHeader>
          <TripRouteMap sessionId={session._id} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DrivingSessionsPanel({ myUserId }: { myUserId?: string }) {
  const { data: sessions = [], isLoading } = useDrivingSessions({});
  const driverSummaries = React.useMemo(() => summarizeDrivers(sessions), [sessions]);

  return (
    <div className="space-y-3">
      <p className="text-[9px] text-muted-foreground/40 -mt-1">From test-drive appointments only</p>

      {driverSummaries.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            <ShieldAlert className="size-3" /> Driver Safety
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {driverSummaries.map((d) => <DriverSafetyCard key={d.userId} driver={d} />)}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground/40">
          <Car className="size-8" />
          <p className="text-xs">No test-drive sessions yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
          {sessions.map((session) => (
            <SessionRow
              key={session._id}
              session={session}
              isMe={session.userId === myUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
