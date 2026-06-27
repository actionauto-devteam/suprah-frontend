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
      className={`border shadow-sm transition-all cursor-pointer bg-card p-0 md:p-4 group ${active
        ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
        : "border-border/50 hover:border-primary/30 hover:ring-1 hover:ring-primary/20 hover:shadow-md"
        }`}
    >
      <CardContent className="p-3 md:p-6">
        <div className="flex gap-2 md:items-center justify-between mb-4">
          <div
            className={`size-10 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${active ? "bg-primary/10 border-primary/30" : "bg-secondary"}`}
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
          className={`font-bold text-xs md:text-sm mb-1 transition-colors ${active ? "text-primary" : "text-foreground"}`}
        >
          {title}
        </h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed italic mb-3">
          {description}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewAll();
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-primary opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:underline"
        >
          View in Reports <ArrowRight className="size-3" />
        </button>
      </CardContent>
    </Card>
  );
}
