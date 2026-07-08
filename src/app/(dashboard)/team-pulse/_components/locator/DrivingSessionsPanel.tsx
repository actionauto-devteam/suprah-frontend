"use client";

import * as React from "react";
import { differenceInSeconds } from "date-fns";
import { fmtTimeMDT, MDT_TZ } from "@/lib/timezone";
import { Car, TriangleAlert, ShieldCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDrivingSessions, useRespondToIncident, type DrivingSession } from "@/hooks/useLocator";

const INCIDENT_RESPONSE_WINDOW_S = 60;

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
  const needsResponse = isMe && session.possibleIncident && session.possibleIncident.confirmed === undefined;

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
          <p className="text-xs font-black tabular-nums">{Math.round(session.topSpeedMph ?? 0)} mph</p>
          <p className="text-[9px] text-muted-foreground/50">top speed</p>
        </div>
        <ChevronDown className={cn("size-3.5 text-muted-foreground/40 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="grid grid-cols-3 gap-2 pl-11">
          <div className="text-center p-2 rounded-lg bg-muted/40">
            <p className="text-xs font-black tabular-nums">{(session.distanceMi ?? 0).toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground/50">miles</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/40">
            <p className="text-xs font-black tabular-nums">{session.harshBrakingEvents}</p>
            <p className="text-[9px] text-muted-foreground/50">harsh brakes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/40">
            <p className="text-xs font-black capitalize">{session.status}</p>
            <p className="text-[9px] text-muted-foreground/50">status</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function DrivingSessionsPanel({ myUserId }: { myUserId?: string }) {
  const { data: sessions = [], isLoading } = useDrivingSessions({});

  return (
    <div className="space-y-3">
      <p className="text-[9px] text-muted-foreground/40 -mt-1">From test-drive appointments only</p>

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
            <SessionRow key={session._id} session={session} isMe={session.userId === myUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
