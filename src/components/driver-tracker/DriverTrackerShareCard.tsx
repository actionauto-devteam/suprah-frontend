"use client";

import * as React from "react";
import { Navigation2, Radio, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DriverStatus } from "@/types/driver-tracking";

interface DriverTrackerShareCardProps {
  shareStatus: DriverStatus;
  onStatusChange: (status: DriverStatus) => void;
  isSharing: boolean;
  isStarting?: boolean;
  onToggleSharing: () => void;
  lastShareAt: string | null;
  shareError: string | null;
  hasActiveLoad?: boolean;
}

const STATUS_CONFIG: Array<{ key: DriverStatus; label: string; color: string; needsLoad?: boolean }> = [
  { key: "on-route", label: "On Route", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20", needsLoad: true },
  { key: "idle", label: "Idle", color: "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20" },
  { key: "waiting", label: "Waiting", color: "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20" },
  { key: "on-break", label: "On Break", color: "bg-slate-500/10 text-slate-600 border-slate-200 hover:bg-slate-500/20" },
];

export function DriverTrackerShareCard({
  shareStatus,
  onStatusChange,
  isSharing,
  isStarting = false,
  onToggleSharing,
  lastShareAt,
  shareError,
  hasActiveLoad = false,
}: DriverTrackerShareCardProps) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 p-0 gap-0 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Radio className="size-24" />
      </div>
      <CardHeader className="py-4 px-5 border-b border-border/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`size-8 rounded-lg flex items-center justify-center ${
                isSharing
                  ? "bg-emerald-500/10"
                  : isStarting
                    ? "bg-amber-500/10"
                    : "bg-muted/60"
              }`}
            >
              {isSharing ? (
                <Wifi className="size-4 text-emerald-500" />
              ) : isStarting ? (
                <Wifi className="size-4 text-amber-500 animate-pulse" />
              ) : (
                <WifiOff className="size-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Driver GPS</CardTitle>
              <p className="text-[10px] text-muted-foreground/60 font-medium">Live location broadcast</p>
            </div>
          </div>
          {(isSharing || isStarting) && (
            <Badge
              className={
                isSharing
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50 text-[10px] font-bold gap-1.5 animate-pulse"
                  : "bg-amber-500/10 text-amber-600 border-amber-200/50 text-[10px] font-bold gap-1.5"
              }
            >
              <span
                className={`size-1.5 rounded-full ${
                  isSharing ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {isSharing ? "LIVE" : "CONNECTING"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-1.5 sm:gap-1.5">
          {STATUS_CONFIG.map((item) => {
            const locked = item.needsLoad && !hasActiveLoad;
            const btn = (
              <Button
                key={item.key}
                size="sm"
                variant="outline"
                disabled={locked}
                className={`h-10 sm:h-8 px-2 text-[11px] font-semibold transition-all duration-200 ${shareStatus === item.key
                    ? item.color + " border"
                    : "border-border/50 text-muted-foreground"
                  } ${locked ? "opacity-40 cursor-not-allowed" : ""}`}
                onClick={() => !locked && onStatusChange(item.key)}
              >
                {item.label}
              </Button>
            );
            return locked ? (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  You need an active load to go On Route
                </TooltipContent>
              </Tooltip>
            ) : (
              <React.Fragment key={item.key}>{btn}</React.Fragment>
            );
          })}
        </div>
        <Button
          size="sm"
          className={`w-full h-11 sm:h-9 text-xs font-bold transition-all duration-300 ${
            isSharing || isStarting
              ? "bg-rose-500/10 text-rose-600 border border-rose-200/50 hover:bg-rose-500/20 shadow-none"
              : "bg-primary text-primary-foreground shadow-sm hover:shadow-md"
          }`}
          variant={isSharing || isStarting ? "outline" : "default"}
          onClick={onToggleSharing}
        >
          <Navigation2
            className={`size-3.5 mr-2 ${
              isSharing || isStarting ? "animate-pulse" : ""
            }`}
          />
          {isSharing
            ? "Stop Sharing"
            : isStarting
              ? "Cancel GPS Connection"
              : "Start Sharing"}
        </Button>
        {lastShareAt && (
          <p className="text-[10px] text-muted-foreground/60 text-center font-medium">
            Last broadcast: {lastShareAt}
          </p>
        )}
        {shareError && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
            <p className="text-[11px] text-destructive font-medium">{shareError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
