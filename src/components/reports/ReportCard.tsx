"use client";

import * as React from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Minus,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type ExportFormat = "pdf" | "xlsx";
type TrendDirection = "up" | "down" | "flat";

interface ReportCardStat {
  icon: React.ReactNode;
  label: string;
}

interface ReportCardHighlight {
  label: string;
  value: React.ReactNode;
  color?: string;
}

interface ReportCardTrend {
  label: string;
  direction: TrendDirection;
}

interface ReportCardProps {
  className?: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  categoryClass: string;
  period: string;
  trend: ReportCardTrend;
  stats: ReportCardStat[];
  highlights: ReportCardHighlight[];
  isSelected: boolean;
  selectionMode: boolean;
  isDownloading: boolean;
  onToggle: () => void;
  onDownload: (format: ExportFormat) => void;
  onOpen: () => void;
  onPreview: () => void;
}

function DownloadMenu({
  isDownloading,
  onDownload,
}: {
  isDownloading: boolean;
  onDownload: (format: ExportFormat) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        disabled={isDownloading}
        aria-label="Download report"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        <ChevronDown className="absolute bottom-0.5 right-0.5 size-2.5 text-muted-foreground" />
      </Button>

      {open && !isDownloading ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+0.45rem)] right-0 z-50 w-44 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onDownload("pdf");
            }}
          >
            <FileText className="size-4 text-red-500" />
            Download PDF
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onDownload("xlsx");
            }}
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            Download Excel
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TrendRow({ trend }: { trend: ReportCardTrend }) {
  const TrendIcon =
    trend.direction === "up"
      ? ArrowUpRight
      : trend.direction === "down"
        ? ArrowDownRight
        : trend.label.toLowerCase().includes("data")
          ? Minus
          : Minus;

  const tone =
    trend.direction === "up"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : trend.direction === "down"
        ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
        : "border-border/80 bg-muted/45 text-slate-700 dark:text-slate-300";

  return (
    <div
      className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-center text-[13px] font-semibold leading-snug ${tone}`}
    >
      <TrendIcon className="size-3.5 shrink-0" />
      <span className="break-words">{trend.label}</span>
    </div>
  );
}

export function ReportCard({
  className,
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
  selectionMode,
  isDownloading,
  onToggle,
  onDownload,
  onOpen,
  onPreview,
}: ReportCardProps) {
  return (
    <article
      className={`relative flex h-full w-full max-w-[29rem] min-w-0 justify-self-center flex-col overflow-visible rounded-xl border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md sm:p-4 ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border/80"
      } ${className ?? ""}`}
    >
      {selectionMode ? (
        <button
          type="button"
          aria-label={`${isSelected ? "Deselect" : "Select"} ${title}`}
          onClick={onToggle}
          className={`absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-lg border shadow-sm transition-colors ${
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
          }`}
        >
          {isSelected ? <Check className="size-4" /> : null}
        </button>
      ) : null}

      <div className="flex min-h-[6.25rem] min-w-0 items-start gap-2.5 pr-8">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <FileText className="size-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-base font-bold tracking-tight text-foreground">
              {title}
            </h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${categoryClass}`}
            >
              {category}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-semibold leading-5 text-primary">
            {subtitle}
          </p>
          <p className="mt-1 text-[13px] font-medium leading-5 text-slate-700 dark:text-slate-300">
            {period}
          </p>
        </div>
      </div>

      <p className="mt-3 min-h-[4.5rem] break-words text-sm leading-6 text-slate-800 dark:text-slate-200">
        {description}
      </p>

      <div className="mt-2.5 grid min-h-[4.75rem] grid-cols-2 gap-2">
        {highlights.map((highlight) => (
          <div
            key={highlight.label}
            className="min-w-0 rounded-lg border border-border/80 bg-muted/20 px-2.5 py-2 text-center"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              {highlight.label}
            </p>
            <p
              className={`mt-1 break-words text-base font-bold ${highlight.color ?? "text-foreground"}`}
              title={String(highlight.value)}
            >
              {highlight.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 min-h-[2.75rem]">
        <TrendRow trend={trend} />
      </div>

      <div className="mt-2.5 grid min-h-[3.75rem] min-w-0 grid-cols-2 items-center gap-2 border-y border-border/70 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        {stats.map((stat, index) => (
          <span
            key={`${stat.label}-${index}`}
            className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-slate-800 dark:text-slate-200"
          >
            <span className="shrink-0 text-muted-foreground">{stat.icon}</span>
            <span className="break-words">{stat.label}</span>
          </span>
        ))}
        <span className="col-span-2 shrink-0 text-[13px] font-semibold text-slate-700 dark:text-slate-300 sm:col-span-1 sm:justify-self-end">
          PDF · Excel
        </span>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-2.5">
        <Button
          type="button"
          className="h-9 min-w-0 flex-1 gap-2 font-semibold"
          onClick={selectionMode ? onToggle : onOpen}
        >
          {selectionMode ? (isSelected ? "Selected" : "Select Report") : "Open Report"}
          {selectionMode && isSelected ? (
            <Check className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          onClick={onPreview}
          aria-label={`Preview ${title}`}
        >
          <Eye className="size-4" />
        </Button>
        <DownloadMenu
          isDownloading={isDownloading}
          onDownload={onDownload}
        />
      </div>
    </article>
  );
}
