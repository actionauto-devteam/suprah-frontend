"use client";

import React from "react";
import {
  BarChart3,
  CircleHelp,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Lead } from "@/types/lead";

import ReportAnalyticsPanel from "@/components/reports/analytics/ReportAnalyticsPanel";

import {
  buildLeadSourceSummary,
  calculateSourceCoverage,
  countUnknownSources,
} from "../utils/crm-preview-utils";

interface LeadSourceSectionProps {
  leads: Lead[];
  periodLabel?: string;
}

function StatCard({
  label,
  value,
  accent,
  icon,
  description,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <div
      className={`flex-1 min-w-27.5 rounded-lg border bg-card px-4 py-3 ${accent}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {label}
        </p>

        <span className="shrink-0 opacity-60">{icon}</span>
      </div>

      <p className="break-words text-xl font-bold leading-none text-foreground">
        {value}
      </p>

      {description ? (
        <p className="mt-1.5 whitespace-normal break-words text-[10px] text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>

      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border px-5 py-10 text-center">
      <Users className="mx-auto size-7 text-muted-foreground/40" />

      <p className="mt-3 text-sm font-semibold text-foreground">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function LeadSourceSection({
  leads,
  periodLabel,
}: LeadSourceSectionProps) {
  const sourceSummary = React.useMemo(
    () => buildLeadSourceSummary(leads),
    [leads],
  );

  const unknownSources = React.useMemo(
    () => countUnknownSources(sourceSummary),
    [sourceSummary],
  );

  const sourceCoverage = React.useMemo(
    () =>
      calculateSourceCoverage(
        leads.length,
        unknownSources,
      ),
    [leads.length, unknownSources],
  );

  const topSource = sourceSummary[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2.5">
        <StatCard
          label="Total Leads"
          value={leads.length.toLocaleString("en-US")}
          accent="border-border"
          icon={<Users className="size-3.5" />}
        />

        <StatCard
          label="Unique Sources"
          value={sourceSummary.length.toLocaleString("en-US")}
          accent="border-l-2 border-l-blue-500 border-t-border border-r-border border-b-border"
          icon={
            <BarChart3 className="size-3.5 text-blue-500" />
          }
        />

        <StatCard
          label="Top Source"
          value={topSource?.source ?? "No source"}
          description={
            topSource
              ? `${topSource.count.toLocaleString(
                  "en-US",
                )} leads`
              : "No lead activity"
          }
          accent="border-l-2 border-l-emerald-500 border-t-border border-r-border border-b-border"
          icon={
            <TrendingUp className="size-3.5 text-emerald-500" />
          }
        />

        <StatCard
          label="Source Coverage"
          value={`${sourceCoverage.toFixed(1)}%`}
          description={`${unknownSources.toLocaleString(
            "en-US",
          )} unknown`}
          accent="border-l-2 border-l-amber-500 border-t-border border-r-border border-b-border"
          icon={
            <CircleHelp className="size-3.5 text-amber-500" />
          }
        />
      </div>

      <ReportAnalyticsPanel
        reportId="lead-source-report"
        leads={leads}
        periodContext={{ label: periodLabel }}
        compact
      />

      <div>
        <SectionLabel>Lead Source Distribution</SectionLabel>

        {sourceSummary.length === 0 ? (
          <EmptyState
            title="No lead source data available"
            description="Lead source information will appear here once leads are available for the selected reporting period."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <div className="max-h-105 overflow-y-auto">
                <Table className="min-w-[760px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                    <TableRow className="bg-transparent hover:bg-transparent">
                      <TableHead className="w-16 text-xs font-semibold">
                        Rank
                      </TableHead>

                      <TableHead className="text-xs font-semibold">
                        Lead Source
                      </TableHead>

                      <TableHead className="text-right text-xs font-semibold">
                        Leads
                      </TableHead>

                      <TableHead className="text-right text-xs font-semibold">
                        Percentage
                      </TableHead>

                      <TableHead className="w-64 text-xs font-semibold">
                        Distribution
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sourceSummary.map((item, index) => (
                      <TableRow
                        key={item.source}
                        className="text-xs hover:bg-muted/30"
                      >
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        <TableCell>
                          <div className="min-w-0">
                            <p className="whitespace-normal break-words font-medium text-foreground">
                              {item.source}
                            </p>

                            {index === 0 ? (
                              <p className="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                Top-performing source
                              </p>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-semibold text-foreground">
                          {item.count.toLocaleString("en-US")}
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </TableCell>

                        <TableCell>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-cyan-500"
                              style={{
                                width: `${Math.min(
                                  item.percentage,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}