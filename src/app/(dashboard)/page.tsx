"use client";

import * as React from "react";
import { Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRouter } from "next/navigation";

// Modular Insight Components
import { StatHero } from "./components/StatHero";
import { LeaderboardPro } from "./components/LeaderboardPro";
import { LogisticsMonitor } from "./components/LogisticsMonitor";
import { RevenueIntelligence } from "./components/RevenueIntelligence";
import { OperationalHealth } from "./components/OperationalHealth";

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-500",
  idle: "bg-yellow-400",
  do_not_disturb: "bg-red-600",
  offline: "bg-muted-foreground/40",
};

export default function Dashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [revenuePeriod, setRevenuePeriod] = React.useState<string>("1Y");
  const [leaderboardMonth, setLeaderboardMonth] = React.useState<string>("Mar");

  // Drag-to-scroll for the active reps strip
  const repsScrollRef = React.useRef<HTMLDivElement>(null);
  const dragState = React.useRef({ active: false, startX: 0, scrollLeft: 0, hasDragged: false });

  // Non-passive wheel listener — always prevents page scroll when hovering the strip
  React.useEffect(() => {
    const el = repsScrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY + e.deltaX;
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  function onRepsDragStart(e: React.MouseEvent) {
    dragState.current = { active: true, startX: e.pageX, scrollLeft: repsScrollRef.current?.scrollLeft ?? 0, hasDragged: false };
    if (repsScrollRef.current) repsScrollRef.current.style.cursor = "grabbing";
  }
  function onRepsDragMove(e: React.MouseEvent) {
    if (!dragState.current.active || !repsScrollRef.current) return;
    const dx = e.pageX - dragState.current.startX;
    if (Math.abs(dx) > 4) {
      dragState.current.hasDragged = true;
      repsScrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
    }
  }
  function onRepsDragEnd() {
    dragState.current.active = false;
    if (repsScrollRef.current) repsScrollRef.current.style.cursor = "grab";
    // Reset hasDragged after the click event fires so next click always works
    setTimeout(() => { dragState.current.hasDragged = false; }, 0);
  }

  const {
    data: metrics,
    isLoading,
    error,
  } = useDashboardStats(revenuePeriod, leaderboardMonth);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center p-8 border border-destructive/20 bg-destructive/5 rounded-3xl backdrop-blur-sm">
          <p className="text-destructive font-black tracking-tight text-lg mb-2">
            Intelligence Stream Offline
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            We encountered a secure protocol error while fetching your metrics.
          </p>
          <Button
            variant="outline"
            className="border-destructive/20 hover:bg-destructive/10"
            onClick={() => window.location.reload()}
          >
            Re-establish Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 container mx-auto min-h-screen pb-12 animate-in fade-in duration-700">
      {/* ── Header Layer ────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase px-2 py-0.5"
            >
              Command Intelligence
            </Badge>
            <div className="size-1 rounded-full bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Clock className="size-3" />
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
              <span className="text-primary/60 font-black tabular-nums">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Dealership <span className="text-primary">Intelligence</span> Center
          </h1>
        </div>

        {/* Team Pulse — messenger-style active reps strip */}
        <div className="flex items-center gap-3 bg-card/40 py-2 px-3 rounded-2xl border border-border/20 backdrop-blur-md min-w-0 max-w-xs lg:max-w-sm">
          <button
            onClick={() => router.push("/team-pulse")}
            className="flex items-center gap-1.5 shrink-0 group"
          >
            <Activity className="size-3.5 text-primary group-hover:text-primary/80 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 group-hover:text-primary/60 transition-colors whitespace-nowrap">
              Team Pulse
            </span>
          </button>
          <div className="w-px h-5 bg-border/40 shrink-0" />
          <TooltipProvider delayDuration={200}>
            <div
              ref={repsScrollRef}
              className="flex gap-2.5 overflow-x-auto no-scrollbar select-none"
              style={{ cursor: "grab" }}
              onMouseDown={onRepsDragStart}
              onMouseMove={onRepsDragMove}
              onMouseUp={onRepsDragEnd}
              onMouseLeave={onRepsDragEnd}
            >
              {metrics?.activeReps?.map((rep: any, idx: number) => (
                <Tooltip key={rep._id ?? `${rep.name}-${idx}`}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { if (!dragState.current.hasDragged) router.push("/team-pulse"); }}
                      className="flex flex-col items-center gap-0.5 shrink-0 group"
                    >
                      <div className="relative">
                        <Avatar className="size-8 border-2 border-background shadow-sm transition-transform group-hover:scale-110 group-hover:-translate-y-0.5">
                          <AvatarImage src={rep.avatar} />
                          <AvatarFallback className="text-[10px] bg-muted font-bold">
                            {rep.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${STATUS_DOT[rep.onlineStatus] ?? STATUS_DOT.offline}`}
                        />
                      </div>
                      <span className="text-[9px] font-semibold text-muted-foreground/70 max-w-10 truncate leading-tight">
                        {rep.name.split(" ")[0]}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-semibold">{rep.name}</p>
                    <p className="capitalize text-muted-foreground">{(rep.onlineStatus ?? "offline").replace(/_/g, " ")}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* ── Key Performance Layer (Phase 1 Deep Intelligence) ─────────────── */}
      <StatHero metrics={metrics} isLoading={isLoading} />

      {/* ── Operational Dynamics (Leaderboard & Logistics) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-8">
          <LeaderboardPro />
        </div>
        <div className="lg:col-span-4 h-full">
          <LogisticsMonitor data={metrics?.logistics} isLoading={isLoading} />
        </div>
      </div>

      {/* ── Financial Trajectory Layer ───────────────────────────────────── */}
      <RevenueIntelligence
        trajectory={metrics?.revenueTrajectory || []}
        livePayments={metrics?.livePayments || []}
        period={revenuePeriod}
        onPeriodChange={setRevenuePeriod}
        isLoading={isLoading}
      />

      {/* ── Efficiency & Pipeline Health ─────────────────────────────────── */}
      <OperationalHealth metrics={metrics} isLoading={isLoading} />
    </div>
  );
}

function Select({
  children,
  defaultValue,
}: {
  children: React.ReactNode;
  defaultValue: string;
}) {
  return <div className="flex items-center">{children}</div>;
}
