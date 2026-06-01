"use client";

import * as React from "react";
import { Activity, Loader2, Trophy, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import type { TeamMember } from "@/hooks/useTeamPulse";
import { useTeamLeaderboard } from "@/hooks/useTeamPulse";
import { S } from "./team-pulse-constants";
import DayPulsePage from "@/components/DayPulsePage";

type LBPeriod = "today" | "week" | "month";
const PERIOD_LABELS: Record<LBPeriod, string> = { today: "Today", week: "This Week", month: "This Month" };

function LeaderboardView() {
  const [period, setPeriod] = React.useState<LBPeriod>("week");
  const { data: entries = [], isLoading } = useTeamLeaderboard(period);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-0.5 bg-muted/30 rounded-lg border border-border/30 w-fit">
        {(Object.entries(PERIOD_LABELS) as [LBPeriod, string][]).map(([p, label]) => (
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

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center border border-dashed border-border/30 rounded-xl bg-muted/5">
          <Trophy className="size-9 text-muted-foreground/15 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No activity data yet</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Start logging activities to see the leaderboard</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
            <Trophy className="size-3.5 text-amber-500 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Leaderboard</span>
            <span className="text-[9px] text-muted-foreground/30 ml-auto">{PERIOD_LABELS[period]}</span>
          </div>
          <div className="divide-y divide-border/20">
            {entries.map((entry: any, i: number) => {
              const maxScore = entries[0]?.totalScore || 1;
              const score = entry.totalScore ?? entry.activityCount ?? 0;
              const barPct = Math.round((score / maxScore) * 100);
              const rankColors = ["text-amber-500", "text-slate-400", "text-orange-500"];
              const isTop3 = i < 3;

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
                    <AvatarImage src={entry.userAvatar} />
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
                          className={cn("h-full rounded-full transition-all duration-700", i === 0 ? "bg-amber-500" : "bg-primary/50")}
                          style={{ width: `${barPct}%` }}
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
      )}
    </div>
  );
}

export function DayPulseTab({
  members,
  onMemberClick,
}: {
  members: TeamMember[];
  onMemberClick: (id: string) => void;
}) {
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);
  const [token, setToken] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<"daypulse" | "active" | "leaderboard">("daypulse");

  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) { setLoading(false); return; }
    apiClient
      .get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => {
        setCurrentUser(res.data?.data || res.data);
        setToken(t);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeMembers = members.filter((m) => m.onlineStatus !== "offline");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  const subTabs = [
    { key: "daypulse" as const, Icon: Activity, label: "Day Pulse" },
    { key: "active" as const, Icon: Users, label: "Active Now", count: activeMembers.length },
    { key: "leaderboard" as const, Icon: Trophy, label: "Leaderboard" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-0 border-b border-border/40 overflow-x-auto no-scrollbar">
        {subTabs.map(({ key, Icon, label, count }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 border-b-2",
              view === key
                ? "border-primary text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn("size-3.5 shrink-0", view === key ? "text-primary" : "text-muted-foreground/50")} />
            {label}
            {count !== undefined && count > 0 && (
              <span className={cn(
                "text-[9px] font-black px-1 py-px rounded min-w-4 text-center leading-none tabular-nums",
                view === key ? "bg-primary/12 text-primary" : "bg-muted-foreground/10 text-muted-foreground/60",
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === "daypulse" && (
        <div>
          {currentUser && token ? (
            <DayPulsePage currentUser={currentUser} token={token} />
          ) : (
            <div className="flex flex-col items-center py-16 text-center border border-dashed border-border/30 rounded-xl bg-muted/5">
              <Activity className="size-8 text-muted-foreground/15 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">Sign in to view Day Pulse reports</p>
            </div>
          )}
        </div>
      )}

      {view === "active" && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Active Now</span>
            <span className="text-[10px] font-black text-primary tabular-nums ml-auto">{activeMembers.length}</span>
          </div>
          {activeMembers.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Users className="size-8 text-muted-foreground/15 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No active members right now</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {activeMembers.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center gap-3 pl-0 pr-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer group overflow-hidden"
                  onClick={() => onMemberClick(m._id)}
                >
                  <div className={cn("w-0.5 self-stretch shrink-0", S.dot[m.onlineStatus ?? "offline"])} />
                  <div className="relative shrink-0 ml-3">
                    <Avatar className="size-9">
                      <AvatarImage src={m.avatar} />
                      <AvatarFallback className="text-xs font-bold">
                        {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background", S.dot[m.onlineStatus ?? "offline"])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">{m.customStatus || m.personalInfo?.department || m.role}</p>
                  </div>
                  <Badge className={cn("text-[10px] px-2 py-0.5 capitalize border shrink-0", S.badge[m.onlineStatus ?? "offline"])}>
                    {S.label[m.onlineStatus ?? "offline"]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "leaderboard" && <LeaderboardView />}
    </div>
  );
}
