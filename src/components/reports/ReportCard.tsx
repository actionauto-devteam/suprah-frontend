"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
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

function IndividualExportButtons({
  title,
  isDownloading,
  onDownload,
}: {
  title: string;
  isDownloading: boolean;
  onDownload: (format: ExportFormat) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      aria-label={`${title} download options`}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 rounded-md px-2 text-[10px] font-bold"
        disabled={isDownloading}
        aria-label={`Download ${title} as PDF`}
        title={`Download ${title} as PDF`}
        onClick={() => onDownload("pdf")}
      >
        {isDownloading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <FileText className="size-3 text-red-500" />
        )}
        PDF
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 rounded-md px-2 text-[10px] font-bold"
        disabled={isDownloading}
        aria-label={`Download ${title} as Excel`}
        title={`Download ${title} as Excel`}
        onClick={() => onDownload("xlsx")}
      >
        {isDownloading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <FileSpreadsheet className="size-3 text-emerald-600 dark:text-emerald-400" />
        )}
        Excel
      </Button>
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
  const primaryMetric = highlights[0];
  const secondaryMetric = highlights[1];
  const primaryStat = stats[0];

  return (
    <article
      className={`relative flex h-full w-full max-w-[29rem] min-w-0 justify-self-center flex-col overflow-visible rounded-xl border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border/80"
      } ${className ?? ""}`}
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <FileText className="size-4.5" />
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
            <h3 className="min-w-0 truncate text-[15px] font-bold leading-5 tracking-tight text-foreground" title={title}>
              {title}
            </h3>
            <span
              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none ${categoryClass}`}
            >
              {category}
            </span>
          </div>

          <p className="mt-0.5 truncate text-[12px] font-semibold leading-4 text-primary" title={subtitle}>
            {subtitle}
          </p>
          <p className="mt-0.5 text-[11px] font-medium leading-4 text-muted-foreground">
            {period}
          </p>
        </div>

        {selectionMode ? (
          <button
            type="button"
            aria-label={`${isSelected ? "Deselect" : "Select"} ${title}`}
            onClick={onToggle}
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {isSelected ? <Check className="size-4" /> : null}
          </button>
        ) : (
          <IndividualExportButtons
            title={title}
            isDownloading={isDownloading}
            onDownload={onDownload}
          />
        )}
      </div>

      <div className="mt-3 grid min-h-[5.75rem] grid-cols-3 overflow-hidden rounded-xl border border-border/70 bg-muted/20">
        <div className="grid min-w-0 grid-rows-[1.15rem_1.75rem] content-center px-3 py-2.5">
          {primaryMetric ? (
            <>
              <p className="h-[1.15rem] truncate whitespace-nowrap text-[9px] font-bold uppercase leading-[1.15rem] tracking-[0.05em] text-muted-foreground">
                {primaryMetric.label}
              </p>
              <p
                className={`flex h-[1.75rem] min-w-0 items-center truncate whitespace-nowrap text-[18px] font-bold leading-none tracking-tight ${
                  primaryMetric.color ?? "text-foreground"
                }`}
                title={String(primaryMetric.value)}
              >
                {primaryMetric.value}
              </p>
            </>
          ) : null}
        </div>

        <div className="grid min-w-0 grid-rows-[1.15rem_1.75rem] content-center border-l border-border/60 px-3 py-2.5">
          {secondaryMetric ? (
            <>
              <p className="h-[1.15rem] truncate whitespace-nowrap text-[9px] font-bold uppercase leading-[1.15rem] tracking-[0.05em] text-muted-foreground">
                {secondaryMetric.label}
              </p>
              <p
                className={`flex h-[1.75rem] min-w-0 items-center truncate whitespace-nowrap text-[13px] font-bold leading-none tracking-tight ${
                  secondaryMetric.color ?? "text-foreground"
                }`}
                title={String(secondaryMetric.value)}
              >
                {secondaryMetric.value}
              </p>
            </>
          ) : null}
        </div>

        <div className="grid min-w-0 grid-rows-[1.15rem_1.75rem] content-center border-l border-border/60 px-3 py-2.5">
          {primaryStat ? (
            <>
              <p className="h-[1.15rem] truncate whitespace-nowrap text-[9px] font-bold uppercase leading-[1.15rem] tracking-[0.05em] text-muted-foreground">
                Records
              </p>
              <div className="flex h-[1.75rem] min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[13px] font-semibold leading-none text-foreground">
                <span className="shrink-0 text-muted-foreground">{primaryStat.icon}</span>
                <span className="min-w-0 truncate whitespace-nowrap" title={primaryStat.label}>{primaryStat.label}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="sr-only">
        <p>{description}</p>
        <p>{trend.label}</p>
        {stats.slice(1).map((stat, index) => (
          <span key={`${stat.label}-${index}`}>{stat.label}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3">
        <Button
          type="button"
          className="h-9 min-w-0 gap-1.5 font-semibold"
          onClick={selectionMode ? onToggle : onOpen}
        >
          {selectionMode
            ? isSelected
              ? "Selected"
              : "Select Report"
            : "Open Report"}
          {selectionMode && isSelected ? (
            <Check className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-9 min-w-0 gap-1.5 font-semibold"
          onClick={onPreview}
          aria-label={`Preview ${title}`}
        >
          <Eye className="size-4" />
          Preview Report
        </Button>
      </div>
    </article>
  );
}