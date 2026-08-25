"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users, Package, ChevronRight } from "lucide-react";
import { DashboardMetrics } from "@/hooks/useDashboardStats";

type LogisticsMode = "combined" | "drivers" | "loads";

interface LogisticsMonitorProps {
  data?: DashboardMetrics["logistics"];
  isLoading: boolean;
  /**
   * `combined` preserves the original standalone behavior.
   * The dashboard passes `drivers` / `loads` so each outer Panel contains only
   * the information named in its own header.
   */
  mode?: LogisticsMode;
  /**
   * When true, return content only. This avoids a Card-inside-Panel shell on
   * the main dashboard while keeping the old standalone card UI available.
   */
  embedded?: boolean;
}

const LOAD_STATUS_MAP = [
  { status: "Available", key: "Available", color: "bg-emerald-500" },
  { status: "In Route", key: "In Route", color: "bg-primary" },
  { status: "Dispatched", key: "Dispatched", color: "bg-indigo-500" },
  { status: "Delivered", key: "Delivered", color: "bg-emerald-600" },
  { status: "Cancelled", key: "Cancelled", color: "bg-destructive" },
] as const;

export function LogisticsMonitor({
  data,
  isLoading,
  mode = "combined",
  embedded = false,
}: LogisticsMonitorProps) {
  const router = useRouter();
  const drivers = data?.drivers || { active: 0, ready: 0 };

  // Backend canonical contract is `loads`. Keep `shipments` as a temporary
  // fallback for stale caches / rolling deployments.
  const loads = data?.loads ?? data?.shipments ?? {};

  const driverContent = (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3 text-center sm:p-4">
        <p className="text-2xl font-black tabular-nums text-emerald-500 sm:text-3xl">
          {isLoading ? "..." : drivers.active}
        </p>
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-500/70">
          Active
        </p>
      </div>
      <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-center sm:p-4">
        <p className="text-2xl font-black tabular-nums text-primary sm:text-3xl">
          {isLoading ? "..." : drivers.ready}
        </p>
        <p className="text-[10px] font-black uppercase tracking-wide text-primary/70">
          Total
        </p>
      </div>
    </div>
  );

  const loadContent = (
    <div className="space-y-2.5">
      {LOAD_STATUS_MAP.map((item) => (
        <div
          key={item.status}
          className="flex items-center justify-between rounded-lg px-1 py-0.5"
        >
          <div className="flex items-center gap-2.5">
            <span className={`size-2 shrink-0 rounded-full ${item.color}`} />
            <span className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
              {item.status}
            </span>
          </div>
          <span className="text-sm font-black tabular-nums">
            {isLoading ? "..." : loads[item.key] || 0}
          </span>
        </div>
      ))}

      <button
        type="button"
        onClick={() => router.push("/transportation")}
        className="mt-2 flex w-full items-center justify-between border-t border-border/20 pt-3 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
      >
        View all loads
        <ChevronRight className="size-3" />
      </button>
    </div>
  );

  if (embedded) {
    if (mode === "drivers") return driverContent;
    if (mode === "loads") return loadContent;

    return (
      <div className="space-y-5">
        {driverContent}
        <div className="border-t border-border/20 pt-4">{loadContent}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(mode === "combined" || mode === "drivers") && (
        <Card className="overflow-hidden border-border/40 bg-card/50 p-0 backdrop-blur-sm">
          <CardHeader className="border-b border-border/10 px-4 py-3.5 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-black">
              <Users className="size-4 text-primary" />
              Driver Status
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Fleet availability
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">{driverContent}</CardContent>
        </Card>
      )}

      {(mode === "combined" || mode === "loads") && (
        <Card className="overflow-hidden border-border/40 bg-card/50 p-0 backdrop-blur-sm">
          <CardHeader className="border-b border-border/10 px-4 py-3.5 sm:px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-black">
              <Package className="size-4 text-primary" />
              Load Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">{loadContent}</CardContent>
        </Card>
      )}
    </div>
  );
}