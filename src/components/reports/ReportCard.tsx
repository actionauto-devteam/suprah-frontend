"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Download, Eye, FileSpreadsheet, FileText, Loader2, Minus } from "lucide-react";
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
  onDownload: (format: "pdf" | "xlsx") => void;
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
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = React.useState(false);
  const downloadMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target as Node)
      ) {
        setIsDownloadMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleDownload = (format: "pdf" | "xlsx") => {
    setIsDownloadMenuOpen(false);
    onDownload(format);
  };

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
      className={`group relative flex h-full min-h-[300px] min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm outline-none transition-[border-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-4.5 ${
        isSelected
          ? "border-primary/70 bg-primary/[0.03] ring-2 ring-primary/10"
          : "border-border/80 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-primary via-primary/45 to-transparent opacity-70" />

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words text-base font-bold leading-snug text-foreground sm:text-[17px]">{title}</h3>
              <Badge variant="outline" className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold ${categoryClass}`}>{category}</Badge>
            </div>
            <p className="mt-1.5 text-xs font-semibold sm:text-sm text-primary">{subtitle}</p>
            {period && (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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

      <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {description}
      </p>

      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2.5">
        {highlights.map((highlight, index) => (
          <div
            key={highlight.label}
            className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center rounded-lg border px-3 py-2 text-center ${
              index === 0
                ? "border-primary/25 bg-primary/[0.07]"
                : "border-border/70 bg-muted/35"
            }`}
          >
            <p className="w-full break-words text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[10px]">
              {highlight.label}
            </p>
            <p
              className={`mt-1 w-full break-words text-center font-bold leading-none ${
                index === 0 ? "text-lg sm:text-xl" : "text-base sm:text-lg"
              } ${highlight.color}`}
            >
              {highlight.value}
            </p>
          </div>
        ))}
      </div>

      {selectionMode && (
        <div
          className={`mt-1.5 flex items-center justify-center rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-wide sm:text-[9px] ${
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
          className={`mt-2.5 flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-center text-[9px] font-semibold sm:text-[10px] ${
            trend.direction === "up"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : trend.direction === "down"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {trend.direction === "up" ? (
            <ArrowUpRight className="size-3.5 shrink-0" />
          ) : trend.direction === "down" ? (
            <ArrowDownRight className="size-3.5 shrink-0" />
          ) : (
            <Minus className="size-3.5 shrink-0" />
          )}
          <span className="min-w-0 break-words">{trend.label}</span>
        </div>
      )}

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground sm:text-[11px]">
        {stats.map((stat, index) => (
          <span
            key={`${stat.label}-${index}`}
            className="flex items-center gap-1"
          >
            {stat.icon}
            {stat.label}
          </span>
        ))}
        <span className="font-semibold">PDF · XLSX</span>
      </div>

      <div className="mt-auto grid min-w-0 grid-cols-2 gap-2.5 border-t border-border/70 pt-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-xs font-semibold sm:text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-muted"
        >
          <Eye className="size-4" />
          Preview
        </button>
        <div
          ref={downloadMenuRef}
          className="relative min-w-0"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsDownloadMenuOpen((current) => !current)}
            disabled={isDownloading}
            aria-haspopup="menu"
            aria-expanded={isDownloadMenuOpen}
            className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {isDownloading ? "Generating" : "Download"}
            {!isDownloading && <ChevronDown className="size-3.5" />}
          </button>

          {isDownloadMenuOpen && !isDownloading && (
            <div
              role="menu"
              className="absolute bottom-[calc(100%+0.5rem)] right-0 z-30 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => handleDownload("pdf")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <FileText className="size-4 text-red-500" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">PDF document</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Best for printing and sharing
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => handleDownload("xlsx")}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <FileSpreadsheet className="size-4 text-emerald-500" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Excel workbook</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Best for analysis and editing
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}