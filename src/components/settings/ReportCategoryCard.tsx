"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

export function ReportCategoryCard({
  title,
  description,
  count,
  icon,
  active,
  onClick,
  onViewAll,
}: {
  title: string;
  description: string;
  count: number;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  onViewAll: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`group cursor-pointer overflow-hidden rounded-xl border bg-card p-0 shadow-sm transition-[border-color,box-shadow,transform] duration-200 ${active
        ? "border-primary/60 bg-primary/[0.04] ring-2 ring-primary/10"
        : "border-border/70 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${active ? "border-primary/30 bg-primary/10" : "border-border/70 bg-muted/50"}`}
          >
            {icon}
          </div>
          <Badge
            variant="outline"
            className={`h-5 text-[10px] font-bold transition-colors ${active ? "border-primary/40 text-primary" : "text-muted-foreground"}`}
          >
            {count} Files
          </Badge>
        </div>
        <h3
          className={`mb-1 text-sm font-bold transition-colors ${active ? "text-primary" : "text-foreground"}`}
        >
          {title}
        </h3>
        <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewAll();
          }}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary transition-opacity hover:underline"
        >
          View in Reports <ArrowRight className="size-3" />
        </button>
      </CardContent>
    </Card>
  );
}