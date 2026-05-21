"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Car,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  Briefcase,
  TrendingDown,
} from "lucide-react"
import { formatCurrency } from "@/utils/format"
import { DashboardMetrics } from "@/hooks/useDashboardStats"

interface StatHeroProps {
  metrics?: DashboardMetrics
  isLoading: boolean
}

export function StatHero({ metrics, isLoading }: StatHeroProps) {
  const intelligence = metrics?.intelligence
  const stats = metrics?.stats

  const kpis = [
    {
      label: "Active Units",
      value: isLoading ? "—" : stats?.activeInventory?.toString() || "0",
      description: "Ready / in recon",
      icon: <Car className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />,
      color: "blue",
    },
    {
      label: "Net Margin",
      value: isLoading ? "—" : formatCurrency(intelligence?.netMargin || 0),
      description: "After carrier pay",
      icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />,
      color: "emerald",
      trend: "+12.5%",
      trendUp: true,
    },
    {
      label: "Pipeline Value",
      value: isLoading ? "—" : formatCurrency(stats?.potentialRevenue || 0),
      description: "Pending funnel",
      icon: <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />,
      color: "amber",
    },
    {
      label: "Speed to Lead",
      value: isLoading ? "—" : `${intelligence?.speedToLead || 0}m`,
      description: "Avg response",
      icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />,
      color: "indigo",
      trend: "-2m",
      trendUp: true,
    },
    {
      label: "Quotes",
      value: isLoading ? "—" : stats?.monthlyQuotes?.toString() || "0",
      description: "This month",
      icon: <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />,
      color: "violet",
    },
    {
      label: "Doc Alerts",
      value: isLoading ? "—" : intelligence?.complianceAlerts?.toString() || "0",
      description: "Expired driver docs",
      icon: <ShieldCheck className={`h-4 w-4 sm:h-5 sm:w-5 ${(intelligence?.complianceAlerts || 0) > 0 ? "text-rose-500" : "text-emerald-500"}`} />,
      color: (intelligence?.complianceAlerts || 0) > 0 ? "rose" : "emerald",
      alert: (intelligence?.complianceAlerts || 0) > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
      {kpis.map((kpi, i) => (
        <Card
          key={i}
          className="relative p-0 overflow-hidden border border-border/40 bg-card hover:border-border/80 transition-all duration-200"
        >
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-start justify-between">
              <div className={`p-1.5 sm:p-2 rounded-xl bg-${kpi.color}-500/10`}>
                {kpi.icon}
              </div>
              {kpi.trend && (
                <div className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold ${kpi.trendUp ? "text-emerald-500" : "text-rose-500"}`}>
                  {kpi.trendUp ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                  {kpi.trend}
                </div>
              )}
            </div>

            <div className="mt-2 sm:mt-3 space-y-0.5">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight tabular-nums leading-none">
                {kpi.value}
              </h3>
              <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest truncate">
                {kpi.label}
              </p>
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[8px] sm:text-[9px] text-muted-foreground/40 font-medium truncate pr-1">
                {kpi.description}
              </p>
              {kpi.alert && (
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              )}
            </div>

            <div className={`absolute -right-4 -bottom-4 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-${kpi.color}-500/5 blur-2xl pointer-events-none`} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
