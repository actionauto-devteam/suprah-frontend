"use client";

import * as React from "react";
import { Loader2, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/utils";
import { ini } from "../../../components/DashboardPanel";
import { monthLabel } from "../../../components/EmployeeOfMonthWinnerCard";

interface LeaderboardEntry {
  employee: { _id: string; fullName: string; avatar?: string } | null;
  wins: number;
  lastWin: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function StatsLeaderboard({
  token,
  teamId,
}: {
  token: string;
  teamId?: string;
}) {
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    apiClient
      .get("/api/employee-of-month/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        params: teamId ? { teamId } : undefined,
      })
      .then((res) => {
        const data = res.data?.data || res.data;
        setLeaderboard(data?.leaderboard || []);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [token, teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground/50">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Trophy className="size-5 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground/50">No wins recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {leaderboard.map((entry, i) =>
        entry.employee ? (
          <div
            key={entry.employee._id}
            className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 p-2.5"
          >
            <span className="w-5 shrink-0 text-center text-sm">{MEDAL[i] || i + 1}</span>
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={resolveImageUrl(entry.employee.avatar)} />
              <AvatarFallback className="text-[10px] font-bold">{ini(entry.employee.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{entry.employee.fullName}</p>
              <p className="truncate text-[11px] text-muted-foreground/60">Last won {monthLabel(entry.lastWin)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-600">
              {entry.wins}×
            </span>
          </div>
        ) : null,
      )}
    </div>
  );
}
