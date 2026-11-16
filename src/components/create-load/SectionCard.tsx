"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2 } from "lucide-react"

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 pt-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>
      ))}
    </div>
  )
}

interface SectionCardProps {
  icon: React.ElementType
  title: string
  description: string
  children?: React.ReactNode
  skeletonRows?: number
  comingSoon?: boolean
  step?: number
  badge?: string
  badgeVariant?: "default" | "success" | "warning"
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  skeletonRows = 3,
  comingSoon = true,
  step,
  badge,
  badgeVariant = "default",
}: SectionCardProps) {
  const badgeColors = {
    default: "bg-muted text-muted-foreground border-border",
    success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  }

  return (
    <Card className="border-border bg-card shadow-none overflow-hidden">
      <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          {step != null ? (
            <div className="flex items-center justify-center size-7 rounded-full bg-green-500 text-white text-[11px] font-bold shrink-0">
              {step}
            </div>
          ) : (
            <div className="bg-green-500/10 dark:bg-green-500/20 p-1.5 rounded shrink-0">
              <Icon className="size-4 text-green-600 dark:text-green-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              {badge && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${badgeColors[badgeVariant]}`}>
                  {badgeVariant === "success" && <CheckCircle2 className="size-2.5" />}
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 py-4">
        {comingSoon ? <SectionSkeleton rows={skeletonRows} /> : children}
      </CardContent>
    </Card>
  )
}
