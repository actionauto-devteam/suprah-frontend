"use client";

import * as React from "react";
import { Clock3, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { ReportId } from "@/types/report-filters";

interface RecentReportEntry {
  reportId: ReportId;
  label: string;
  href: string;
  visitedAt: string;
}

const STORAGE_KEY = "suprah-recent-reports";

function readRecentReports(): RecentReportEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently opened";

  const differenceMinutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60_000),
  );

  if (differenceMinutes < 1) return "Just now";
  if (differenceMinutes < 60) return `${differenceMinutes}m ago`;
  if (differenceMinutes < 1_440) {
    return `${Math.round(differenceMinutes / 60)}h ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function RecentReports() {
  const router = useRouter();
  const [reports, setReports] = React.useState<RecentReportEntry[]>([]);

  React.useEffect(() => {
    setReports(readRecentReports());
  }, []);

  if (reports.length === 0) return null;

  return (
    <section className="min-w-0 space-y-2.5" aria-label="Recently opened reports">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground sm:text-base">
            Recently Opened
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Continue from your most recent filtered report views.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground"
          onClick={() => {
            window.localStorage.removeItem(STORAGE_KEY);
            setReports([]);
          }}
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {reports.slice(0, 3).map((report) => (
          <button
            key={report.reportId}
            type="button"
            onClick={() => router.push(report.href)}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-3 text-left shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/25"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock3 className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {report.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {timeLabel(report.visitedAt)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
