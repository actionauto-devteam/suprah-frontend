"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Mail,
  Phone,
  UserCheck,
  Users,
} from "lucide-react";

import type { Lead } from "@/types/lead";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";

type ExportFormat = "pdf" | "xlsx";

interface LeadStatusPreviewProps {
  open: boolean;
  onClose: () => void;
  leads: Lead[];
  monthLabel: string;
  isDownloading?: boolean;
  onDownload: (format: ExportFormat) => void;
}

interface LeadStatusSummary {
  total: number;
  new: number;
  contacted: number;
  pending: number;
  appointment: number;
  closed: number;
}

interface StatusItem {
  key: keyof Omit<LeadStatusSummary, "total">;
  label: string;
  count: number;
  textClass: string;
  backgroundClass: string;
  barClass: string;
}

function normalizeStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function statusMatches(status: unknown, expected: string[]): boolean {
  const normalized = normalizeStatus(status);

  return expected.some((value) => normalized === normalizeStatus(value));
}

function buildLeadSummary(leads: Lead[]): LeadStatusSummary {
  return {
    total: leads.length,

    new: leads.filter((lead) =>
      statusMatches(lead.status, ["new"]),
    ).length,

    contacted: leads.filter((lead) =>
      statusMatches(lead.status, ["contacted"]),
    ).length,

    pending: leads.filter((lead) =>
      statusMatches(lead.status, ["pending"]),
    ).length,

    appointment: leads.filter((lead) =>
      statusMatches(lead.status, [
        "appointment set",
        "appointment",
        "scheduled",
      ]),
    ).length,

    closed: leads.filter((lead) =>
      statusMatches(lead.status, [
        "closed",
        "converted",
        "won",
        "completed",
      ]),
    ).length,
  };
}

function formatLeadName(lead: Lead): string {
  const fullName = [lead.firstName, lead.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || lead.senderName || "Unnamed lead";
}

function formatLeadEmail(lead: Lead): string {
  return lead.email || lead.senderEmail || "—";
}

function formatLeadPhone(lead: Lead): string {
  return lead.phone || "—";
}

function formatLeadVehicle(lead: Lead): string {
  const { vehicle } = lead;

  if (!vehicle) {
    return "—";
  }

  const description = [
    vehicle.year,
    vehicle.make,
    vehicle.model,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return description || "—";
}

function formatDate(value: unknown): string {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: unknown): string {
  const value = String(status ?? "").trim();

  return value || "Unspecified";
}

function getStatusBadgeClass(status: unknown): string {
  const normalized = normalizeStatus(status);

  if (
    ["closed", "converted", "won", "completed"].includes(normalized)
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (
    ["appointment set", "appointment", "scheduled"].includes(normalized)
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300";
  }

  if (normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (normalized === "contacted") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300";
  }

  if (normalized === "new") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-300";
  }

  return "border-border bg-muted text-muted-foreground";
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  className: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${className}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
        </div>

        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function LeadStatusPreview({
  open,
  onClose,
  leads,
  monthLabel,
  isDownloading = false,
  onDownload,
}: LeadStatusPreviewProps) {
  const summary = React.useMemo(
    () => buildLeadSummary(leads),
    [leads],
  );

  const statusItems = React.useMemo<StatusItem[]>(
    () => [
      {
        key: "new",
        label: "New",
        count: summary.new,
        textClass: "text-cyan-600 dark:text-cyan-400",
        backgroundClass: "bg-cyan-50 dark:bg-cyan-950/40",
        barClass: "bg-cyan-500",
      },
      {
        key: "contacted",
        label: "Contacted",
        count: summary.contacted,
        textClass: "text-blue-600 dark:text-blue-400",
        backgroundClass: "bg-blue-50 dark:bg-blue-950/40",
        barClass: "bg-blue-500",
      },
      {
        key: "pending",
        label: "Pending",
        count: summary.pending,
        textClass: "text-amber-600 dark:text-amber-400",
        backgroundClass: "bg-amber-50 dark:bg-amber-950/40",
        barClass: "bg-amber-500",
      },
      {
        key: "appointment",
        label: "Appointment Set",
        count: summary.appointment,
        textClass: "text-violet-600 dark:text-violet-400",
        backgroundClass: "bg-violet-50 dark:bg-violet-950/40",
        barClass: "bg-violet-500",
      },
      {
        key: "closed",
        label: "Closed",
        count: summary.closed,
        textClass: "text-emerald-600 dark:text-emerald-400",
        backgroundClass: "bg-emerald-50 dark:bg-emerald-950/40",
        barClass: "bg-emerald-500",
      },
    ],
    [summary],
  );

  const sortedLeads = React.useMemo(() => {
    return [...leads].sort((first, second) => {
      const firstDate = new Date(first.createdAt).getTime();
      const secondDate = new Date(second.createdAt).getTime();

      if (Number.isNaN(firstDate) && Number.isNaN(secondDate)) {
        return 0;
      }

      if (Number.isNaN(firstDate)) {
        return 1;
      }

      if (Number.isNaN(secondDate)) {
        return -1;
      }

      return secondDate - firstDate;
    });
  }, [leads]);

  const closedRate =
    summary.total > 0
      ? Math.round((summary.closed / summary.total) * 100)
      : 0;

  const appointmentRate =
    summary.total > 0
      ? Math.round((summary.appointment / summary.total) * 100)
      : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-[96rem] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border/80 bg-card px-4 py-4 text-left sm:px-6">
          <div className="flex min-w-0 flex-col gap-3 pr-7 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400">
                  <Users className="size-5" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <DialogTitle className="text-lg font-bold tracking-tight sm:text-xl">
                    Lead Status Report
                  </DialogTitle>

                  <DialogDescription className="mt-1">
                    CRM pipeline activity and lead status distribution for{" "}
                    {monthLabel}.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>

              <ReportExportMenu
                label="Export"
                onDownload={onDownload}
                isDownloading={isDownloading}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto w-full max-w-[92rem] space-y-5 p-4 sm:p-6">
            <section
              aria-label="Lead status summary"
              className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            >
              <SummaryCard
                label="Total Leads"
                value={summary.total}
                icon={Users}
                className="bg-slate-500"
              />

              <SummaryCard
                label="New"
                value={summary.new}
                icon={CircleDot}
                className="bg-cyan-500"
              />

              <SummaryCard
                label="Contacted"
                value={summary.contacted}
                icon={UserCheck}
                className="bg-blue-500"
              />

              <SummaryCard
                label="Pending"
                value={summary.pending}
                icon={Clock3}
                className="bg-amber-500"
              />

              <SummaryCard
                label="Appointments"
                value={summary.appointment}
                icon={CalendarDays}
                className="bg-violet-500"
              />

              <SummaryCard
                label="Closed"
                value={summary.closed}
                icon={CheckCircle2}
                className="bg-emerald-500"
              />
            </section>

            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                <div className="border-b border-border/80 px-4 py-3.5 sm:px-5">
                  <h2 className="text-sm font-bold text-foreground sm:text-base">
                    Status Distribution
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Breakdown of leads by their current CRM status.
                  </p>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  {statusItems.map((item) => {
                    const rate =
                      summary.total > 0
                        ? Math.round(
                            (item.count / summary.total) * 100,
                          )
                        : 0;

                    return (
                      <div key={item.key}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`size-2.5 shrink-0 rounded-full ${item.barClass}`}
                            />

                            <span className="truncate text-sm font-semibold text-foreground">
                              {item.label}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-1 text-xs font-bold ${item.backgroundClass} ${item.textClass}`}
                            >
                              {item.count}
                            </span>

                            <span className="w-10 text-right text-xs text-muted-foreground">
                              {rate}%
                            </span>
                          </div>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-[width] duration-300 ${item.barClass}`}
                            style={{
                              width: `${Math.min(100, Math.max(0, rate))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Closed Lead Rate
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {closedRate}%
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {summary.closed} of {summary.total} leads are currently
                    marked as closed.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Appointment Rate
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                    {appointmentRate}%
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {summary.appointment} of {summary.total} leads currently
                    have an appointment status.
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
              <div className="flex flex-col gap-1 border-b border-border/80 px-4 py-3.5 sm:px-5">
                <h2 className="text-sm font-bold text-foreground sm:text-base">
                  Lead Details
                </h2>

                <p className="text-xs text-muted-foreground sm:text-sm">
                  {sortedLeads.length} lead
                  {sortedLeads.length === 1 ? "" : "s"} included in this
                  reporting period.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[70rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40">
                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                        Lead
                      </th>

                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                        Contact
                      </th>

                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                        Vehicle
                      </th>

                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                        Source
                      </th>

                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                        Status
                      </th>

                      <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedLeads.length > 0 ? (
                      sortedLeads.map((lead, index) => (
                        <tr
                          key={lead._id || `${lead.email}-${index}`}
                          className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 align-top">
                            <p className="max-w-[15rem] truncate text-sm font-semibold text-foreground">
                              {formatLeadName(lead)}
                            </p>

                            <p className="mt-1 max-w-[15rem] truncate text-xs text-muted-foreground">
                              {lead.subject || "No subject"}
                            </p>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1.5">
                              <div className="flex max-w-[18rem] items-center gap-2 text-xs text-foreground">
                                <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                  {formatLeadEmail(lead)}
                                </span>
                              </div>

                              <div className="flex max-w-[18rem] items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="size-3.5 shrink-0" />
                                <span className="truncate">
                                  {formatLeadPhone(lead)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top text-sm text-foreground">
                            <span className="block max-w-[15rem] truncate">
                              {formatLeadVehicle(lead)}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <span className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium text-foreground">
                              {lead.source || "Unspecified"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <span
                              className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                                lead.status,
                              )}`}
                            >
                              {formatStatus(lead.status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-muted-foreground">
                            {formatDate(lead.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-14 text-center"
                        >
                          <div className="mx-auto flex max-w-sm flex-col items-center">
                            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                              <Users className="size-5" />
                            </div>

                            <p className="mt-3 text-sm font-semibold text-foreground">
                              No leads found
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              There are no lead records for {monthLabel}.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}