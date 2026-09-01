"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Settings, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmUser } from "@/hooks/useCrmUser";
import { CurrentWinnersGrid } from "./_components/CurrentWinnersGrid";
import { HistoryList } from "./_components/HistoryList";
import { StatsLeaderboard } from "./_components/StatsLeaderboard";
import { TeamsManager } from "./_components/TeamsManager";

export default function EmployeeOfMonthPage() {
  const router = useRouter();
  const { user, token, isLoading } = useCrmUser();
  const isAdmin = user?.role === "admin";
  const [teamsManagerOpen, setTeamsManagerOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-semibold text-muted-foreground/80">Sign in to view Employee of the Month</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-9 w-9 shrink-0 rounded-xl border border-border/40 p-0 hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 truncate text-lg font-black tracking-tight sm:text-xl">
              <Star className="size-5 shrink-0 text-amber-500" />
              Employee of the Month
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
              Recognition across every team, with a full history of past winners.
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTeamsManagerOpen(true)}
              className="shrink-0 gap-1.5"
            >
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Manage Teams</span>
            </Button>
          )}
        </div>

        <section className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-md sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground/60">
            Current winners
          </h2>
          <CurrentWinnersGrid key={refreshKey} token={token} isAdmin={isAdmin} />
        </section>

        <section className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-md sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground/60">Leaderboard</h2>
          <StatsLeaderboard key={refreshKey} token={token} />
        </section>

        <section className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-md sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground/60">History</h2>
          <HistoryList
            key={refreshKey}
            token={token}
            isAdmin={isAdmin}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        </section>

        <p className="px-1 text-center text-[11px] text-muted-foreground/50">
          Comparing rankings across dealerships is coming in a future update.
        </p>
      </main>

      {isAdmin && (
        <TeamsManager
          open={teamsManagerOpen}
          onOpenChange={setTeamsManagerOpen}
          token={token}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
