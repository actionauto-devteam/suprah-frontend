"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { DashboardMetrics } from "@/hooks/useDashboardStats"

interface OperationalHealthProps {
  metrics?: DashboardMetrics
  isLoading: boolean
}

export function OperationalHealth({ metrics, isLoading }: OperationalHealthProps) {
  const logistics = metrics?.logistics || { drivers: { active: 0, ready: 0 } }
  const stats = metrics?.stats

  const networkHealthPct = Math.round(
    (logistics.drivers.active / (logistics.drivers.active + logistics.drivers.ready || 1)) * 100
  )

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col p-0">
      <CardHeader className="py-5 px-6 border-b border-border/10">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">
          Pipeline Status
        </CardTitle>
        <CardDescription className="text-xs font-bold text-muted-foreground/50 italic">
          Throughput &amp; Capacity
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h4 className="text-lg font-black tracking-tighter">Inventory Turnover</h4>
              <span className="text-[10px] font-bold text-primary tabular-nums">75%</span>
            </div>
            <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '75%' }} />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Target: 14 Days | Current: {stats?.avgDaysOnLot || 14} Days
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h4 className="text-lg font-black tracking-tighter">Quote Conversion</h4>
              <span className="text-[10px] font-bold text-emerald-500 tabular-nums">62%</span>
            </div>
            <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62%' }} />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Volume up 12% this month
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h4 className="text-lg font-black tracking-tighter">Network Health</h4>
              <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{networkHealthPct}%</span>
            </div>
            <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${networkHealthPct}%` }}
              />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              {networkHealthPct}% of driver network engaged
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
