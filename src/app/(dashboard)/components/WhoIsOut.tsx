"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarOff } from "lucide-react";
import { isSameDay, isWithinInterval, parseISO, addDays } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTeamAbsences } from "@/hooks/useTeamPulse";
import { A } from "../team-pulse/_components/team-pulse-constants";
import { Panel, PanelSkeleton, ini } from "./DashboardPanel";

export function WhoIsOut() {
  const router = useRouter();
  const now = new Date();
  const { data: absences = [], isLoading } = useTeamAbsences(now.getFullYear(), now.getMonth() + 1);

  const todayList = React.useMemo(
    () => absences.filter((a) => a.status !== "rejected" && isSameDay(parseISO(a.date), now)),
    [absences],
  );
  const weekList = React.useMemo(() => {
    const weekEnd = addDays(now, 7);
    return absences.filter(
      (a) => a.status !== "rejected" && !isSameDay(parseISO(a.date), now) && isWithinInterval(parseISO(a.date), { start: now, end: weekEnd }),
    );
  }, [absences]);

  return (
    <Panel title="Who's Out" icon={CalendarOff} accent="text-amber-500" action="Team Calendar" onAction={() => router.push("/team-pulse?tab=calendar")}>
      {isLoading ? (
        <PanelSkeleton rows={3} />
      ) : todayList.length === 0 && weekList.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-6">Nobody's out today or this week.</p>
      ) : (
        <div className="space-y-4">
          {todayList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Today</p>
              {todayList.map((a) => (
                <div key={a._id} className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-background/40 px-2.5 py-2">
                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback className="bg-amber-600 text-white text-[9px] font-bold">{ini(a.userName)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{a.userName}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${A[a.type]?.pill}`}>
                    {A[a.type]?.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          {weekList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Later this week</p>
              {weekList.slice(0, 4).map((a) => (
                <div key={a._id} className="flex items-center gap-2.5 text-xs">
                  <span className={`size-1.5 rounded-full shrink-0 ${A[a.type]?.dot}`} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground/80">{a.userName}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground/45">
                    {parseISO(a.date).toLocaleDateString([], { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
