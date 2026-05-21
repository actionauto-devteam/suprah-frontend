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

interface LogisticsMonitorProps {
  data?: DashboardMetrics["logistics"];
  isLoading: boolean;
}

const SHIPMENT_STATUS_MAP = [
  { status: "Available", key: "Available", color: "bg-emerald-500" },
  { status: "In Route", key: "In Route", color: "bg-primary" },
  { status: "Dispatched", key: "Dispatched", color: "bg-indigo-500" },
  { status: "Delivered", key: "Delivered", color: "bg-emerald-600" },
  { status: "Cancelled", key: "Cancelled", color: "bg-destructive" },
];

export function LogisticsMonitor({ data, isLoading }: LogisticsMonitorProps) {
  const router = useRouter();
  const drivers = data?.drivers || { active: 0, ready: 0 };
  const shipments = data?.shipments || {};

  return (
    <div className="space-y-6">
      {/* Driver Availability Heatmap */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden p-0">
        <CardHeader className="h-24! py-5! px-6! border-b! border-border/10! flex! flex-col! justify-center! gap-1!">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Driver Status
          </CardTitle>
          <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Fleet Availability
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-center">
              <p className="text-3xl font-black text-emerald-500 tabular-nums">
                {isLoading ? "..." : drivers.active}
              </p>
              <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">
                Active
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
              <p className="text-3xl font-black text-primary tabular-nums">
                {isLoading ? "..." : drivers.ready}
              </p>
              <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">
                Ready
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Pipeline */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden p-0">
        <CardHeader className="py-4 border-b border-border/10">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Load Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {SHIPMENT_STATUS_MAP.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between group cursor-default"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
                />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight group-hover:text-foreground transition-colors">
                  {item.status}
                </span>
              </div>
              <span className="text-xs font-black tabular-nums">
                {isLoading ? "..." : shipments[item.key] || 0}
              </span>
            </div>
          ))}

          <button
            type="button"
            onClick={() => router.push("/transportation")}
            className="w-full pt-3 mt-3 border-t border-border/10 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary hover:underline cursor-pointer group"
          >
            View All Loads
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
