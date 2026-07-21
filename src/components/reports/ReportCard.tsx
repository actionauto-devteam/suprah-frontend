"use client";

import React from "react";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
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
  stats: StatMeta[];
  highlights: Highlight[];
  isSelected: boolean;
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
  stats,
  highlights,
  isSelected,
  isDownloading,
  onToggle,
  onDownload,
  onPreview,
}: ReportCardProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPreview();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Preview ${title}`}
      onClick={onPreview}
      onKeyDown={handleKeyDown}
      className={`group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-5 ${
        isSelected
          ? "border-primary ring-2 ring-primary/15"
          : "border-border hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-primary/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
          <FileText className="size-5" />
        </div>
        <div
          onClick={(event) => event.stopPropagation()}
          className="rounded-lg p-1 hover:bg-muted"
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            aria-label={`Select ${title}`}
          />
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold leading-snug text-foreground">
            {title}
          </h3>
          <Badge
            variant="outline"
            className={`px-2 py-0.5 text-[10px] font-semibold ${categoryClass}`}
          >
            {category}
          </Badge>
        </div>
        <p className="text-xs font-semibold text-primary">{subtitle}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
        {highlights.map((highlight) => (
          <div
            key={highlight.label}
            className="rounded-xl border border-border bg-muted/40 px-3 py-2"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {highlight.label}
            </p>
            <p
              className={`mt-0.5 break-words text-sm font-bold leading-tight ${highlight.color}`}
            >
              {highlight.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {stats.map((stat, index) => (
          <span
            key={`${stat.label}-${index}`}
            className="flex items-center gap-1"
          >
            {stat.icon}
            {stat.label}
          </span>
        ))}
        <span className="font-semibold">PDF export</span>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
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
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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