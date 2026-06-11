"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Wrench, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnedVehicle } from "@/lib/api/vehicles";
import { fetchServiceHistory } from "@/lib/api/services";
import { cn } from "@/lib/utils";

const SERVICE_TYPE_COLORS: Record<string, string> = {
  OIL_CHANGE: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  TIRES: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  BRAKES: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  INSPECTION: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  OTHER: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
};

interface ServiceLogTabProps {
  vehicles: OwnedVehicle[] | undefined;
  onLogService: (vehicle: OwnedVehicle) => void;
}

export function ServiceLogTab({ vehicles, onLogService }: ServiceLogTabProps) {
  const [historyVehicleId, setHistoryVehicleId] = React.useState<string>("");

  const historyVehicle = React.useMemo(
    () => vehicles?.find((v) => (v.id || v._id) === historyVehicleId) ?? vehicles?.[0] ?? null,
    [vehicles, historyVehicleId],
  );

  const { data: serviceHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["serviceHistory", historyVehicle?.id],
    queryFn: () => fetchServiceHistory(historyVehicle!.id),
    enabled: !!historyVehicle?.id,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground uppercase">
            Service Log
          </h2>
          {historyVehicle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {historyVehicle.year} {historyVehicle.make} {historyVehicle.model}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {vehicles && vehicles.length > 1 && (
            <Select value={historyVehicleId} onValueChange={setHistoryVehicleId}>
              <SelectTrigger className="h-8 w-36 text-xs rounded-xl border-border/50">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id || v._id} value={v.id || v._id} className="text-xs">
                    {v.year} {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {historyVehicle && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl gap-1.5 text-xs font-semibold border-border/50 shrink-0"
              onClick={() => onLogService(historyVehicle)}
            >
              <Plus className="h-3.5 w-3.5" /> Log Service
            </Button>
          )}
        </div>
      </div>

      {isLoadingHistory ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse dark:bg-zinc-900" />
          ))}
        </div>
      ) : !serviceHistory || serviceHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-6 w-6 text-muted-foreground/25" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">No service records</p>
            <p className="text-xs text-muted-foreground">Start logging your maintenance history.</p>
          </div>
          {historyVehicle && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => onLogService(historyVehicle)}
            >
              <Plus className="h-3.5 w-3.5" /> Log First Service
            </Button>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4.75 top-4 bottom-4 w-px bg-border/40" />

          <div className="space-y-3">
            {serviceHistory.map((record, idx) => {
              const colorCls = SERVICE_TYPE_COLORS[record.serviceType] ?? SERVICE_TYPE_COLORS.OTHER;
              return (
                <div key={record._id || idx} className="flex gap-4 items-start">
                  {/* Timeline dot */}
                  <div className={cn(
                    "shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border z-10 bg-card",
                    colorCls,
                  )}>
                    <Wrench className="h-4 w-4" />
                  </div>

                  {/* Record card */}
                  <div className="flex-1 min-w-0 rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {record.serviceType.replace(/_/g, " ")}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        {record.locationName && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {record.locationName}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {record.mileageAtService.toLocaleString()} mi
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {record.cost ? (
                        <p className="text-sm font-black text-foreground tabular-nums">
                          ${record.cost.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">—</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(record.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
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
