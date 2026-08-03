"use client";

import React from "react";
import {
  CheckCircle2,
  CircleHelp,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  buildLeadStatusSummary,
  countActiveLeads,
  countUnknownStatuses,
  getLeadCreatedAt,
  getLeadEmail,
  getLeadId,
  getLeadName,
  getLeadPhone,
  getLeadSource,
  getLeadStatus,
  getLeadVehicle,
  leadStatusBadgeClass,
} from "../utils/crm-preview-utils";

interface LeadStatusSectionProps {
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

export function LeadStatusSection({
  leads,
  periodLabel,
}: LeadStatusSectionProps) {
  const statusSummary = React.useMemo(
    () => buildLeadStatusSummary(leads),
    [leads],
  );

  const activeLeads = React.useMemo(
    () => countActiveLeads(statusSummary),
    [statusSummary],
  );

  const unknownStatuses = React.useMemo(
    () => countUnknownStatuses(statusSummary),
    [statusSummary],
  );

  const mostCommonStatus = statusSummary[0];

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
          label="Active Leads"
          value={activeLeads.toLocaleString("en-US")}
          accent="border-l-2 border-l-emerald-500 border-t-border border-r-border border-b-border"
          icon={
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          }
        />

        <StatCard
          label="Most Common Status"
          value={mostCommonStatus?.status ?? "No status"}
          description={
            mostCommonStatus
              ? `${mostCommonStatus.count.toLocaleString(
                  "en-US",
                )} leads`
              : "No lead activity"
          }
          accent="border-l-2 border-l-blue-500 border-t-border border-r-border border-b-border"
          icon={
            <TrendingUp className="size-3.5 text-blue-500" />
          }
        />

        <StatCard
          label="Unknown Status"
          value={unknownStatuses.toLocaleString("en-US")}
          accent="border-l-2 border-l-amber-500 border-t-border border-r-border border-b-border"
          icon={
            <CircleHelp className="size-3.5 text-amber-500" />
          }
        />
      </div>

      <ReportAnalyticsPanel
        reportId="lead-status-report"
        leads={leads}
        periodContext={{ label: periodLabel }}
        compact
      />

      <div>
        <SectionLabel>Status Distribution</SectionLabel>

        {statusSummary.length === 0 ? (
          <EmptyState
            title="No lead status data available"
            description="Lead status information will appear here once leads are available for the selected reporting period."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <div className="max-h-105 overflow-y-auto">
                <Table className="min-w-[700px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                    <TableRow className="bg-transparent hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">
                        Status
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
                    {statusSummary.map((item) => (
                      <TableRow
                        key={item.status}
                        className="text-xs hover:bg-muted/30"
                      >
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${leadStatusBadgeClass(
                              item.status,
                            )}`}
                          >
                            {item.status}
                          </Badge>
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
                              className="h-full rounded-full bg-blue-500"
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

      <div>
        <SectionLabel>Lead Details</SectionLabel>

        {leads.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="There are no leads available for the selected reporting period."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <div className="max-h-105 overflow-y-auto">
                <Table className="min-w-[980px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                    <TableRow className="bg-transparent hover:bg-transparent">
                      <TableHead className="w-44 text-xs font-semibold">
                        Lead
                      </TableHead>

                      <TableHead className="w-52 text-xs font-semibold">
                        Contact
                      </TableHead>

                      <TableHead className="w-44 text-xs font-semibold">
                        Vehicle
                      </TableHead>

                      <TableHead className="w-32 text-xs font-semibold">
                        Source
                      </TableHead>

                      <TableHead className="w-32 text-xs font-semibold">
                        Status
                      </TableHead>

                      <TableHead className="w-28 whitespace-nowrap text-xs font-semibold">
                        Created
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {leads.map((lead, index) => {
                      const email = getLeadEmail(lead);
                      const phone = getLeadPhone(lead);

                      return (
                        <TableRow
                          key={getLeadId(
                            lead,
                            `lead-${index}`,
                          )}
                          className="text-xs hover:bg-muted/30"
                        >
                          <TableCell className="font-medium text-foreground">
                            <span
                              className="block whitespace-normal break-words"
                              title={getLeadName(lead)}
                            >
                              {getLeadName(lead)}
                            </span>
                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            <div className="max-w-48">
                              <p
                                className="break-all"
                                title={email}
                              >
                                {email}
                              </p>

                              <p
                                className="break-all"
                                title={phone}
                              >
                                {phone}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            <span
                              className="block whitespace-normal break-words"
                              title={getLeadVehicle(lead)}
                            >
                              {getLeadVehicle(lead)}
                            </span>
                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            <span
                              className="block whitespace-normal break-words"
                              title={getLeadSource(lead)}
                            >
                              {getLeadSource(lead)}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium ${leadStatusBadgeClass(
                                getLeadStatus(lead),
                              )}`}
                            >
                              {getLeadStatus(lead)}
                            </Badge>
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {getLeadCreatedAt(lead)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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