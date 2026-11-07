"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT } from "@/lib/timezone"

export interface SalespersonCounts {
  leads: number
  notWorked: number
  working: number
  appointments: number
  sold: number
  lost: number
  textsSent: number
  callsMade: number
  callsAnswered: number
}

export interface SalespersonRow extends SalespersonCounts {
  key: string
  name: string
  email: string
  active: boolean
}

export interface SalespersonLeadRow {
  salesperson: string
  firstName: string
  lastName: string
  phone: string
  email: string
  source: string
  status: string
  location: string
  createdAt: string
}

export interface SalespeopleReport {
  range: { from: string; to: string }
  scope: "everyone" | "self"
  rows: SalespersonRow[]
  totals: SalespersonCounts
  leads?: SalespersonLeadRow[]
  leadsTruncated?: boolean
}

const UNASSIGNED = "unassigned"

const COLUMNS: Array<{ key: keyof SalespersonCounts; label: string; help: string }> = [
  { key: "leads", label: "Leads", help: "New leads in this period that are assigned to this person now" },
  { key: "notWorked", label: "Not worked yet", help: "Still New or Viewed" },
  { key: "working", label: "Working", help: "Contacted, appointment, follow-up and other open statuses" },
  { key: "appointments", label: "Appointments", help: "Leads with an appointment that was not cancelled" },
  { key: "sold", label: "Sold", help: "Sold, In Finance or Online Financing" },
  { key: "lost", label: "Lost", help: "Missed Opportunity, Bought Elsewhere, Bad Lead, Do Not Contact or Closed" },
  { key: "textsSent", label: "Texts sent", help: "Texts this person sent in this period, on any lead" },
  { key: "callsMade", label: "Calls made", help: "Calls this person made in this period" },
  { key: "callsAnswered", label: "Calls answered", help: "Incoming calls this person answered in this period" },
]

function displayPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  return local.length === 10 ? `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}` : value
}

export function soldRate(row: SalespersonCounts): string {
  return row.leads > 0 ? `${Math.round((row.sold / row.leads) * 100)}%` : "—"
}

export const salespersonExcelColumns = [
  { label: "Salesperson", width: 26, value: (row: SalespersonRow) => (row.key !== UNASSIGNED && !row.active ? `${row.name} (inactive)` : row.name) },
  { label: "Email", width: 30, value: (row: SalespersonRow) => row.email },
  ...COLUMNS.map((column) => ({ label: column.label, width: 14, value: (row: SalespersonRow) => row[column.key], type: "number" as const })),
  { label: "Sold rate", width: 12, value: (row: SalespersonRow) => (row.leads > 0 ? row.sold / row.leads : 0), type: "percentage" as const },
]

export const salespersonLeadExcelColumns = [
  { label: "Salesperson", width: 26, value: (row: SalespersonLeadRow) => row.salesperson },
  { label: "First name", width: 18, value: (row: SalespersonLeadRow) => row.firstName },
  { label: "Last name", width: 18, value: (row: SalespersonLeadRow) => row.lastName },
  { label: "Phone", width: 18, value: (row: SalespersonLeadRow) => displayPhone(row.phone) },
  { label: "Email", width: 30, value: (row: SalespersonLeadRow) => row.email },
  { label: "Source", width: 28, value: (row: SalespersonLeadRow) => row.source },
  { label: "Status", width: 20, value: (row: SalespersonLeadRow) => row.status },
  { label: "Location", width: 14, value: (row: SalespersonLeadRow) => row.location },
  { label: "Created (Mountain Time)", width: 26, value: (row: SalespersonLeadRow) => fmtLongDateTimeMDT(row.createdAt) },
]

function PersonName({ row }: { row: SalespersonRow }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">
        {row.name}
        {row.key !== UNASSIGNED && !row.active && <span className="ml-1.5 text-xs font-medium text-muted-foreground">(inactive)</span>}
      </p>
      {row.email && <p className="truncate text-xs font-normal text-muted-foreground">{row.email}</p>}
    </div>
  )
}

function countClass(key: keyof SalespersonCounts, value: number): string {
  if (key === "notWorked" && value > 0) return "text-amber-600 dark:text-amber-400"
  if (key === "sold" && value > 0) return "text-emerald-600 dark:text-emerald-400"
  return "text-foreground"
}

export function SalespeopleSection({ report, loading, error }: { report: SalespeopleReport | null; loading: boolean; error: string }) {
  const self = report?.scope === "self"
  const showTotals = Boolean(report && report.rows.length > 1)

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-bold text-foreground sm:text-lg">By Salesperson</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {self
            ? "Your leads and your texts and calls for the selected period."
            : "New leads by who they are assigned to, and the texts and calls each person made in the selected period."}
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : loading && !report ? (
        <div className="flex justify-center rounded-xl border border-border/80 bg-card py-10">
          <Loader2 aria-label="Loading the report by salesperson" className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !report || report.rows.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
          <p className="text-sm font-semibold text-foreground">No activity in this period</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">No new leads, texts or calls by the team in this period.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm lg:block">
            <table className="w-full min-w-[880px] text-sm">
              <caption className="sr-only">Leads and activity by salesperson</caption>
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5 text-left">Salesperson</th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope="col" title={column.help} className="px-3 py-2.5 text-right">{column.label}</th>
                  ))}
                  <th scope="col" title="Sold divided by Leads" className="px-3 py-2.5 text-right">Sold rate</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.key} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="max-w-[220px] px-3 py-2.5 text-left font-normal">
                      <PersonName row={row} />
                    </th>
                    {COLUMNS.map((column) => (
                      <td key={column.key} className={cn("px-3 py-2.5 text-right font-semibold tabular-nums", countClass(column.key, row[column.key]))}>
                        {row[column.key].toLocaleString("en-US")}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">{soldRate(row)}</td>
                  </tr>
                ))}
              </tbody>
              {showTotals && (
                <tfoot>
                  <tr className="border-t border-border/80 bg-muted/20 font-bold">
                    <th scope="row" className="px-3 py-2.5 text-left text-foreground">Total</th>
                    {COLUMNS.map((column) => (
                      <td key={column.key} className="px-3 py-2.5 text-right tabular-nums text-foreground">{report.totals[column.key].toLocaleString("en-US")}</td>
                    ))}
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{soldRate(report.totals)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <ul className="space-y-3 lg:hidden" aria-label="Salespeople">
            {report.rows.map((row) => (
              <li key={row.key} className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
                <PersonName row={row} />
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {COLUMNS.map((column) => (
                    <div key={column.key} className="min-w-0 rounded-lg bg-muted/30 px-2 py-1.5">
                      <dt className="break-words text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{column.label}</dt>
                      <dd className={cn("mt-0.5 text-base font-bold tabular-nums", countClass(column.key, row[column.key]))}>{row[column.key].toLocaleString("en-US")}</dd>
                    </div>
                  ))}
                  <div className="min-w-0 rounded-lg bg-muted/30 px-2 py-1.5">
                    <dt className="break-words text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">Sold rate</dt>
                    <dd className="mt-0.5 text-base font-bold tabular-nums text-foreground">{soldRate(row)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs text-muted-foreground">
            Leads are the new leads that came in during this period, counted under the person they are assigned to now. Texts and calls are what each person did in this period on any lead. Texts from the AI agent and automatic messages are not counted, and combined duplicate cards are not counted. Export Excel adds this table and the list of leads behind it.
          </p>
        </>
      )}
    </div>
  )
}
