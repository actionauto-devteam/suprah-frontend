"use client";

import * as React from "react";
import { Activity, BarChart3, Loader2, TrendingUp, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTeamLeaderboard } from "@/hooks/useTeamPulse";
import type { TeamMember } from "@/hooks/useTeamPulse";

type Period = 'week' | 'month';
const PERIOD_LABELS: Record<Period, string> = { week: 'This Week', month: 'This Month' };

export function PerformanceTab({ members }: { members: TeamMember[] }) {
  const [period, setPeriod] = React.useState<Period>('month');
  const { data: leaderboard = [], isLoading } = useTeamLeaderboard(period);

  const totalActivities = leaderboard.reduce((s: number, e: any) => s + (e.activityCount || 0), 0);
  const avgScore = leaderboard.length
    ? Math.round(leaderboard.reduce((s: number, e: any) => s + (e.totalScore || 0), 0) / leaderboard.length)
    : 0;
  const topPerformer = leaderboard[0];

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-black">Performance</span>
        </div>
        <div className="flex gap-1 p-0.5 bg-muted/30 rounded-lg border border-border/30">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                period === p
                  ? "bg-background text-foreground shadow-sm border border-border/40 font-black"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border/30">
          {[
            { label: "Members", value: members.length, Icon: Users },
            { label: "Activities", value: totalActivities, Icon: Activity },
            { label: "Avg Score", value: avgScore, Icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-4 py-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</p>
              <p className="text-3xl font-black tabular-nums text-foreground leading-none mt-0.5">{s.value}</p>
              <s.Icon className="size-3 text-muted-foreground/30 mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center border border-dashed border-border/30 rounded-xl bg-muted/5">
          <BarChart3 className="size-9 text-muted-foreground/15 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No performance data</p>
          <p className="text-xs text-muted-foreground/50 mt-1 max-w-56">Activities are logged automatically when team members work in the CRM.</p>
        </div>
      ) : (
        <div className="space-y-3">

          {topPerformer && (
            <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200/30 dark:border-amber-800/30 bg-amber-500/5">
                <span className="text-base leading-none">🏆</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Top Performer</span>
                <span className="text-[10px] text-muted-foreground/50 ml-auto">{PERIOD_LABELS[period]}</span>
              </div>
              <div className="flex items-center gap-4 px-4 py-3.5">
                <Avatar className="size-11 ring-2 ring-amber-400/40 shrink-0">
                  <AvatarImage src={topPerformer.userAvatar} />
                  <AvatarFallback className="text-sm font-black">{(topPerformer.userName || "?")[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base leading-tight">{topPerformer.userName || "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">{topPerformer.activityCount} activities</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl font-black text-amber-500 tabular-nums leading-none">{topPerformer.totalScore ?? topPerformer.activityCount}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">pts</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Rankings</span>
              <span className="text-[9px] text-muted-foreground/30 ml-auto">{leaderboard.length} members</span>
            </div>
            <div className="divide-y divide-border/20">
              {leaderboard.map((entry: any, i: number) => {
                const memberData = members.find((m) => m.name === entry.userName);
                const maxScore = leaderboard[0]?.totalScore || 1;
                const score = entry.totalScore || entry.activityCount || 0;
                const barWidth = Math.round((score / maxScore) * 100);
                const isTop3 = i < 3;
                const rankColors = ["text-amber-500", "text-slate-400", "text-orange-500"];

                return (
                  <div
                    key={entry._id || i}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors",
                      i === 0 && "bg-amber-500/3",
                    )}
                  >
                    <span className={cn(
                      "text-xs font-black w-5 tabular-nums text-center shrink-0",
                      isTop3 ? rankColors[i] : "text-muted-foreground/30",
                    )}>
                      {i + 1}
                    </span>
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={entry.userAvatar || memberData?.avatar} />
                      <AvatarFallback className="text-xs font-bold">{(entry.userName || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate flex-1">{entry.userName || "Unknown"}</p>
                        <p className={cn(
                          "text-sm font-black tabular-nums shrink-0",
                          i === 0 ? "text-amber-500" : "text-foreground",
                        )}>
                          {score}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              i === 0 ? "bg-amber-500" : "bg-primary/50",
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">{entry.activityCount} acts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
