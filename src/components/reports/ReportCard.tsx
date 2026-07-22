"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, Download, Eye, FileText, Loader2, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Highlight {
  label: string;
  value: string | number;
  color: string;
}

interface StatMeta {
  icon: React.ReactNode;
  label: string;
}

interface ReportCardProps {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  categoryClass: string;
  period?: string;
  trend?: {
    label: string;
    direction: "up" | "down" | "flat";
  };
  stats: StatMeta[];
  highlights: Highlight[];
  isSelected: boolean;
  selectionMode?: boolean;
  isDownloading: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onPreview: () => void;
}

export function ReportCard({
  title,
  subtitle,
  description,
  category,
  categoryClass,
  period,
  trend,
  stats,
  highlights,
  isSelected,
  selectionMode = false,
  isDownloading,
  onToggle,
  onDownload,
  onPreview,
}: ReportCardProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (selectionMode) {
        onToggle();
      } else {
        onPreview();
      }
    }
  };

  const handleCardClick = () => {
    if (selectionMode) {
      onToggle();
      return;
    }

    onPreview();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={selectionMode ? `${isSelected ? "Deselect" : "Select"} ${title}` : `Preview ${title}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex h-full min-h-[268px] min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card p-3 shadow-sm outline-none transition-[border-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-3.5 ${
        isSelected
          ? "border-primary/70 bg-primary/[0.03] ring-2 ring-primary/10"
          : "border-border/80 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-primary via-primary/45 to-transparent opacity-70" />

      <div className="flex min-w-0 items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h3 className="min-w-0 break-words text-sm font-bold leading-snug text-foreground sm:text-[15px]">{title}</h3>
              <Badge variant="outline" className={`shrink-0 px-1.5 py-0 text-[9px] font-semibold ${categoryClass}`}>{category}</Badge>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-primary">{subtitle}</p>
            {period && (
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                {period}
              </p>
            )}
          </div>
        </div>
        {(selectionMode || isSelected) && (
          <div
            onClick={(event) => event.stopPropagation()}
            className="rounded-md p-0.5 hover:bg-muted"
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              aria-label={`${isSelected ? "Deselect" : "Select"} ${title}`}
            />
          </div>
        )}
      </div>

      <p className="mt-2.5 line-clamp-2 min-h-9 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
        {description}
      </p>

      <div className="mt-2.5 grid min-w-0 grid-cols-2 gap-2">
        {highlights.map((highlight, index) => (
          <div
            key={highlight.label}
            className={`flex min-h-[54px] min-w-0 flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 text-center ${
              index === 0
                ? "border-primary/25 bg-primary/[0.07]"
                : "border-border/70 bg-muted/35"
            }`}
          >
            <p className="w-full break-words text-center text-[8px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[9px]">
              {highlight.label}
            </p>
            <p
              className={`mt-1 w-full break-words text-center font-bold leading-none ${
                index === 0 ? "text-base sm:text-lg" : "text-sm sm:text-base"
              } ${highlight.color}`}
            >
              {highlight.value}
            </p>
          </div>
        ))}
      </div>

      {selectionMode && (
        <div
          className={`mt-1 flex items-center justify-center rounded px-2 py-0.5 text-[7px] font-bold uppercase tracking-wide sm:text-[8px] ${
            isSelected
              ? "bg-primary/12 text-primary"
              : "bg-muted/70 text-muted-foreground"
          }`}
        >
          {isSelected ? "Selected" : "Tap card to select"}
        </div>
      )}

      {trend && (
        <div
          className={`mt-2 flex min-w-0 items-center justify-center gap-1 rounded-md px-2 py-1 text-center text-[8px] font-semibold sm:text-[9px] ${
            trend.direction === "up"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : trend.direction === "down"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {trend.direction === "up" ? (
            <ArrowUpRight className="size-3 shrink-0" />
          ) : trend.direction === "down" ? (
            <ArrowDownRight className="size-3 shrink-0" />
          ) : (
            <Minus className="size-3 shrink-0" />
          )}
          <span className="min-w-0 break-words">{trend.label}</span>
        </div>
      )}

      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-muted-foreground sm:text-[10px]">
        {stats.map((stat, index) => (
          <span
            key={`${stat.label}-${index}`}
            className="flex items-center gap-1"
          >
            {stat.icon}
            {stat.label}
          </span>
        ))}
        <span className="font-semibold">PDF</span>
      </div>

      <div className="mt-auto grid min-w-0 grid-cols-2 gap-2 border-t border-border/70 pt-2.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className="inline-flex h-8.5 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-muted"
        >
          <Eye className="size-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDownload();
          }}
          disabled={isDownloading}
          className="inline-flex h-8.5 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          {isDownloading ? "Generating" : "Download"}
        </button>
      </div>
    </div>
  );
}