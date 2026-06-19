"use client";

import * as React from "react";
import {
  Clock,
  Activity,
  Users,
  Car,
  Truck,
  CreditCard,
  BarChart2,
  Settings,
  Calendar,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useRouter } from "next/navigation";

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

const QUICK_NAV = [
  { label: "CRM", href: "/crm", icon: Users },
  { label: "Appointments", href: "/crm/appointments", icon: Calendar },
  { label: "Inventory", href: "/inventory", icon: Car },
  { label: "Logistics", href: "/transportation", icon: Truck },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Reports", href: "/reports", icon: BarChart2 },
  { label: "Fleet", href: "/driver-tracker", icon: Package },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Dashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [revenuePeriod, setRevenuePeriod] = React.useState<string>("1Y");
  const [leaderboardMonth, setLeaderboardMonth] = React.useState<string>("Mar");

  const repsScrollRef = React.useRef<HTMLDivElement>(null);
  const dragState = React.useRef({ active: false, startX: 0, scrollLeft: 0, hasDragged: false });

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
    setTimeout(() => { dragState.current.hasDragged = false; }, 0);
  }

  const { data: metrics, isLoading, error } = useDashboardStats(revenuePeriod, leaderboardMonth);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      // min-h-full (relative to the scrolling `main`) instead of min-h-svh
      // so the error state fills the container without using viewport units.
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="text-center p-8 border border-destructive/20 bg-destructive/5 rounded-3xl backdrop-blur-sm max-w-sm w-full">
          <p className="text-destructive font-black tracking-tight text-lg mb-2">
            System Down
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Metrics failed to load. Check your connection and try again.
          </p>
          <Button
            variant="outline"
            className="border-destructive/20 hover:bg-destructive/10"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    // min-h-full = 100% of the scrolling `main` (which has a definite h-dvh),
    // NOT min-h-screen (100vh). Using viewport units here forced the page to be
    // a full window tall regardless of `main`, which made the document scroll on
    // top of `main`'s scroll — the source of the second scrollbar.
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 container mx-auto min-h-full pb-28 md:pb-12 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase px-2 py-0.5"
              >
                HQ
              </Badge>
              <div className="size-1 rounded-full bg-border" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                <Clock className="size-3 shrink-0" />
                <span className="whitespace-nowrap">
                  {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Denver" })}
                </span>
                <span className="text-primary/70 font-black tabular-nums whitespace-nowrap">
                  {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Denver" })}
                  <span className="text-[8px] text-muted-foreground/50 font-bold ml-0.5">MST</span>
                </span>
                <span className="text-[9px] text-muted-foreground/35 font-medium normal-case tracking-normal whitespace-nowrap">
                  ({currentTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true })} local)
                </span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              Operations <span className="text-primary">Command</span>
            </h1>
          </div>

          {/* Team Pulse strip */}
          <div className="flex items-center gap-3 bg-card/40 py-2 px-3 rounded-2xl border border-border/20 backdrop-blur-md min-w-0 w-full sm:w-auto sm:max-w-xs">
            <button
              onClick={() => router.push("/team-pulse")}
              className="flex items-center gap-1.5 shrink-0 group"
            >
              <Activity className="size-3.5 text-primary group-hover:text-primary/80 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 group-hover:text-primary/60 transition-colors whitespace-nowrap">
                Live
              </span>
            </button>
            <div className="w-px h-5 bg-border/40 shrink-0" />
            <TooltipProvider delayDuration={200}>
              <div
                ref={repsScrollRef}
                className="flex gap-2.5 overflow-x-auto no-scrollbar select-none flex-1"
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
                          <Avatar className="size-7 border-2 border-background shadow-sm transition-transform group-hover:scale-110 group-hover:-translate-y-0.5">
                            <AvatarImage src={rep.avatar} />
                            <AvatarFallback className="text-[9px] bg-muted font-bold">
                              {rep.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`absolute bottom-0 right-0 size-2 rounded-full border-2 border-background ${STATUS_DOT[rep.onlineStatus] ?? STATUS_DOT.offline}`} />
                        </div>
                        <span className="text-[8px] font-semibold text-muted-foreground/70 max-w-9 truncate leading-tight">
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

        {/* ── Quick Nav ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0 pb-0.5">
          {QUICK_NAV.map((item) => (
            <button
              key={item.href + item.label}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-card/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary active:scale-95 transition-all text-[11px] font-black uppercase tracking-wide text-muted-foreground whitespace-nowrap shrink-0"
            >
              <item.icon className="size-3.5 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Stats ────────────────────────────────────────────────────────── */}
      <StatHero metrics={metrics} isLoading={isLoading} />

      {/* ── Leaderboard & Logistics ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        <div className="lg:col-span-8">
          <LeaderboardPro />
        </div>
        <div className="lg:col-span-4 h-full">
          <LogisticsMonitor data={metrics?.logistics} isLoading={isLoading} />
        </div>
      </div>

      {/* ── Revenue ──────────────────────────────────────────────────────────── */}
      <RevenueIntelligence
        trajectory={metrics?.revenueTrajectory || []}
        livePayments={metrics?.livePayments || []}
        period={revenuePeriod}
        onPeriodChange={setRevenuePeriod}
        isLoading={isLoading}
      />

      {/* ── Pipeline Health ───────────────────────────────────────────────── */}
      <OperationalHealth metrics={metrics} isLoading={isLoading} />
    </div>
  );
}