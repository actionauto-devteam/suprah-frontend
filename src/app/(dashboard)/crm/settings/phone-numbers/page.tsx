"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2, Loader2, Pencil, PhoneCall, Plus, RefreshCw, Trash2, XCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { useLeadLocationCounts } from "@/hooks/useLeads"
import { useCrmLocations } from "@/hooks/useCrmLocations"
import { formatSmsRecipient } from "@/lib/api/leadComposer"
import { cn } from "@/lib/utils"

type Kind = "main" | "location" | "department"

interface TelnyxCheck {
  status: "ready" | "needs_setup" | "not_in_account" | "unchecked" | "error"
  readyForCalls: boolean
  readyForTexts: boolean
  message: string
  checkedAt: string | null
}

interface DealershipNumber {
  _id: string
  number: string
  label: string
  kind: Kind
  location: string
  department: string
  telnyx: TelnyxCheck
}

interface NumbersResponse {
  numbers: DealershipNumber[]
  suggestion: { number: string } | null
}

interface FormValues {
  number: string
  label: string
  kind: Kind
  location: string
  department: string
}

const KIND_LABELS: Record<Kind, string> = { main: "Main number", location: "Location", department: "Department" }
const DEPARTMENT_SUGGESTIONS = ["Sales", "Service", "Licensing", "Finance", "Parts"]
const field = "mt-1 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

function errorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status
}

function NumberForm({
  initial,
  locations,
  saving,
  onCancel,
  onSave,
}: {
  initial: FormValues
  locations: string[]
  saving: boolean
  onCancel: () => void
  onSave: (values: FormValues) => Promise<void>
}) {
  const [values, setValues] = React.useState<FormValues>(initial)
  const [error, setError] = React.useState("")
  const set = (changes: Partial<FormValues>) => setValues((current) => ({ ...current, ...changes }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    try {
      await onSave(values)
    } catch (err) {
      setError(errorMessage(err, "Could not save this number."))
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Phone number
          <input type="tel" inputMode="tel" required value={values.number} onChange={(e) => set({ number: e.target.value })} placeholder="(801) 555-0123" className={field} />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Name
          <input value={values.label} onChange={(e) => set({ label: e.target.value })} placeholder={values.kind === "main" ? "Main" : "e.g. Lehi Sales"} maxLength={60} className={field} />
        </label>
      </div>
      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">What is this number for?</legend>
        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup">
          {(Object.keys(KIND_LABELS) as Kind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={values.kind === kind}
              onClick={() => set({ kind })}
              className={cn(
                "min-h-11 rounded-lg border px-3 text-sm font-medium",
                values.kind === kind ? "border-emerald-600 bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      </fieldset>
      {values.kind === "location" && (
        <label className="block text-xs font-medium text-muted-foreground">
          Location
          <input list="phone-number-locations" required value={values.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. LEHI" maxLength={80} className={field} />
          <datalist id="phone-number-locations">
            {locations.map((location) => <option key={location} value={location} />)}
          </datalist>
          <span className="mt-1 block font-normal">New leads from this number get this location. Use the same spelling as the Leads location filter.</span>
        </label>
      )}
      {values.kind === "department" && (
        <label className="block text-xs font-medium text-muted-foreground">
          Department
          <input list="phone-number-departments" required value={values.department} onChange={(e) => set({ department: e.target.value })} placeholder="e.g. Service" maxLength={60} className={field} />
          <datalist id="phone-number-departments">
            {DEPARTMENT_SUGGESTIONS.map((department) => <option key={department} value={department} />)}
          </datalist>
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-lg border px-4 text-sm font-medium hover:bg-muted">Cancel</button>
        <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save number
        </button>
      </div>
    </form>
  )
}

function ReadyChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

function statusText(check: TelnyxCheck) {
  return check.message || (check.status === "unchecked" ? "Not checked with Telnyx yet." : "")
}

export default function PhoneNumbersSettingsPage() {
  const { getToken, orgId } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = React.useState<{ id: string | null; values: FormValues } | null>(null)
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState("")
  const { counts: leadLocationCounts } = useLeadLocationCounts()
  const crmLocations = useCrmLocations(getToken, "active")
  const headers = async () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("crm_token") || await getToken()}` } })
  const key = ["crm-phone-numbers", orgId]

  const query = useQuery({
    queryKey: key,
    retry: false,
    queryFn: async () => (await apiClient.get("/api/crm/phone-numbers", await headers())).data.data as NumbersResponse,
  })

  const locations = React.useMemo(() => {
    const names = [
      ...Object.keys(leadLocationCounts || {}).filter((name) => name && name !== "Unknown Location"),
      ...((crmLocations.data?.locations || []).map((location) => location.name)),
    ]
    return [...new Set(names)].sort((a, b) => a.localeCompare(b))
  }, [leadLocationCounts, crmLocations.data])

  const save = useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: FormValues }) => {
      const auth = await headers()
      return id
        ? (await apiClient.patch(`/api/crm/phone-numbers/${id}`, values, auth)).data.data
        : (await apiClient.post("/api/crm/phone-numbers", values, auth)).data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const check = useMutation({
    mutationFn: async (id: string) => (await apiClient.post(`/api/crm/phone-numbers/${id}/check`, {}, await headers())).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => (await apiClient.delete(`/api/crm/phone-numbers/${id}`, await headers())).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const numbers = query.data?.numbers || []
  const suggestion = query.data?.suggestion || null
  const hasMain = numbers.some((row) => row.kind === "main")

  const startNew = (values?: Partial<FormValues>) => {
    setNotice("")
    setEditing({ id: null, values: { number: "", label: "", kind: hasMain ? "location" : "main", location: "", department: "", ...values } })
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 border-b pb-4">
        <Link href="/crm/settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border" title="Back to settings" aria-label="Back to settings">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <PhoneCall className="h-5 w-5 text-emerald-500" />
            Phone Numbers
          </h1>
          <p className="text-sm text-muted-foreground">Calls and texts to these numbers come into your dealership&apos;s Suprah CRM.</p>
        </div>
      </div>

      {query.isPending ? (
        <Loader2 aria-label="Loading phone numbers" className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {errorStatus(query.error) === 403 ? "Only admins can manage phone numbers." : errorMessage(query.error, "Could not load phone numbers.")}
        </p>
      ) : (
        <>
          {suggestion && !editing && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="min-w-0 text-sm">
                Your current Suprah number <span className="font-semibold">{formatSmsRecipient(suggestion.number) || suggestion.number}</span>{" "}isn&apos;t in this list yet.
              </p>
              <button type="button" onClick={() => startNew({ number: suggestion.number, kind: "main", label: "Main" })} className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">
                Add as main number
              </button>
            </div>
          )}

          {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}

          {editing ? (
            <NumberForm
              key={editing.id || "new"}
              initial={editing.values}
              locations={locations}
              saving={save.isPending}
              onCancel={() => setEditing(null)}
              onSave={async (values) => {
                await save.mutateAsync({ id: editing.id, values })
                setEditing(null)
                setNotice(editing.id ? "Number saved." : "Number added.")
              }}
            />
          ) : (
            <button type="button" onClick={() => startNew()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-dashed px-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary">
              <Plus className="h-4 w-4" />
              Add phone number
            </button>
          )}

          <ul className="space-y-2" aria-label="Phone numbers">
            {numbers.map((row) => (
              <li key={row._id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="text-sm text-muted-foreground">{formatSmsRecipient(row.number) || row.number}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.kind === "main" ? "Main number" : row.kind === "location" ? `Location: ${row.location}` : `Department: ${row.department}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" title="Check with Telnyx again" aria-label={`Check ${row.label} with Telnyx again`} onClick={() => check.mutate(row._id)} disabled={check.isPending && check.variables === row._id} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                      <RefreshCw className={cn("h-4 w-4", check.isPending && check.variables === row._id && "animate-spin")} />
                    </button>
                    <button type="button" title="Edit" aria-label={`Edit ${row.label}`} onClick={() => { setNotice(""); setEditing({ id: row._id, values: { number: row.number, label: row.label, kind: row.kind, location: row.location, department: row.department } }) }} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" title="Remove" aria-label={`Remove ${row.label}`} onClick={() => setRemovingId(row._id)} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ReadyChip ok={row.telnyx?.readyForCalls} label={row.telnyx?.readyForCalls ? "Ready for calls" : "Calls not ready"} />
                  <ReadyChip ok={row.telnyx?.readyForTexts} label={row.telnyx?.readyForTexts ? "Ready for texts" : "Texts not ready"} />
                </div>
                {row.telnyx && row.telnyx.status !== "ready" && statusText(row.telnyx) && (
                  <p className="mt-2 text-xs text-muted-foreground">{statusText(row.telnyx)}</p>
                )}
                {removingId === row._id && (
                  <div role="alertdialog" aria-label={`Remove ${row.label}`} className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                    <p className="text-sm">Remove this number? Calls and texts to it will no longer come into Suprah.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRemovingId(null)} className="min-h-11 rounded-lg border px-3 text-sm font-medium hover:bg-muted">Cancel</button>
                      <button type="button" onClick={async () => { await remove.mutateAsync(row._id); setRemovingId(null); setNotice("Number removed.") }} className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700">Remove</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {numbers.length === 0 && !editing && (
              <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No phone numbers yet. Add your main number first, then a number for each location or department.
              </li>
            )}
          </ul>

          <p className="text-xs text-muted-foreground">
            Each number must be in Suprah&apos;s Telnyx account. Texting also needs the number registered for business texting (10DLC) in Telnyx.
            Replies go out from the number the customer texted or called. New texts and calls go out from the lead&apos;s location number, or the main number.
            Suprah only sends from a number that shows ready here. If none is ready, the current Suprah number is used.
          </p>
        </>
      )}
    </main>
  )
}
