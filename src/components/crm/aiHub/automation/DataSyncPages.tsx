"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays, Check, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api-client"
import { canViewAiHub } from "@/lib/aiShadowDrafts"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { automationError, automationRequest, type AutomationOptions, type DataSync } from "@/lib/crmAutomations"
import { LocationPicker } from "./AutomationBuilder"

const SYNC_LIST_PATH = "/crm/settings/ai-agent?tab=automation&view=sync"
const STEPS = ["Basic setup", "Data source", "Note setup", "Summary"]

function useHubAccess() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [options, setOptions] = React.useState<AutomationOptions | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const getHubToken = React.useCallback(async () => {
    const crmToken = typeof window !== "undefined" ? localStorage.getItem("crm_token") : null
    return crmToken || (await getToken())
  }, [getToken])

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      const token = localStorage.getItem("crm_token")
      if (!token) {
        router.replace("/crm")
        return
      }
      try {
        const me = await apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${token}` } })
        if (!canViewAiHub((me.data?.data || me.data)?.role)) {
          router.replace("/crm/settings/ai-agent")
          return
        }
        const opts = await automationRequest<AutomationOptions>(getHubToken, "get", "/options")
        if (!cancelled) setOptions(opts)
      } catch (err) {
        if (!cancelled) setError(automationError(err, "Could not open data sync"))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [getHubToken, router])

  return { options, error, getHubToken }
}

function PageShell({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur sm:px-5">
        <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0" onClick={onBack} aria-label="Back to data sync">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold sm:text-base">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      <div className="flex-1 bg-muted/30 px-4 py-8">{children}</div>
    </div>
  )
}

function Loading({ error, onBack }: { error: string | null; onBack: () => void }) {
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button type="button" variant="outline" onClick={onBack}>Back to data sync</Button>
      </div>
    )
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" aria-label="Loading" />
    </div>
  )
}

export function DataSyncTypePage() {
  const router = useRouter()
  const { options, error } = useHubAccess()
  const back = () => router.push(SYNC_LIST_PATH)
  if (!options) return <Loading error={error} onBack={back} />
  return (
    <PageShell title="Add new sync" onBack={back}>
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold">Data sync type</h2>
          <p className="mt-1 text-xs text-muted-foreground">Pick what you want to keep in step with another system.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/crm/settings/ai-agent/syncs/new/appointment")}
          disabled={!options.canEdit}
          className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 disabled:opacity-60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <CalendarDays className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Appointment sync</span>
            <span className="block text-[11px] text-muted-foreground">Sync appointments from your other CRM with Suprah</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        {!options.canEdit && <p className="text-center text-[11px] text-muted-foreground">Only admins can add data syncs.</p>}
      </div>
    </PageShell>
  )
}

export function DataSyncWizard({ syncId }: { syncId?: string }) {
  const router = useRouter()
  const { options, error, getHubToken } = useHubAccess()
  const [loaded, setLoaded] = React.useState(!syncId)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [status, setStatus] = React.useState<DataSync["status"]>("active")
  const [locations, setLocations] = React.useState<DataSync["locations"]>({ mode: "all", ids: [] })
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const back = () => router.push(SYNC_LIST_PATH)

  React.useEffect(() => {
    if (!syncId || !options) return
    let cancelled = false
    automationRequest<{ sync: DataSync }>(getHubToken, "get", `/syncs/${syncId}`)
      .then(({ sync }) => {
        if (cancelled) return
        const active = new Set(options.locations.map((location) => location.id))
        setName(sync.name)
        setStatus(sync.status)
        setLocations({ mode: sync.locations.mode, ids: sync.locations.ids.filter((id) => active.has(id)) })
        setLoaded(true)
      })
      .catch((err) => !cancelled && setLoadError(automationError(err, "Could not open this data sync")))
    return () => {
      cancelled = true
    }
  }, [getHubToken, options, syncId])

  if (!options || !loaded) return <Loading error={error || loadError} onBack={back} />
  const readOnly = !options.canEdit
  const ready = name.trim().length > 0 && (locations.mode === "all" || locations.ids.length > 0)

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const body = { type: "appointment", name: name.trim(), status, locations: locations.mode === "all" ? { mode: "all" } : locations }
      if (syncId) await automationRequest(getHubToken, "patch", `/syncs/${syncId}`, body)
      else await automationRequest(getHubToken, "post", "/syncs", body)
      toast.success("Data sync saved")
      router.push(SYNC_LIST_PATH)
    } catch (err) {
      setSaveError(automationError(err, "Could not save the data sync"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Appointment sync" subtitle={syncId ? name : "New data sync"} onBack={back}>
      <div className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Setup steps" className="rounded-2xl border border-border/60 bg-card p-2 shadow-sm">
          <ol className="flex gap-1 overflow-x-auto md:flex-col">
            {STEPS.map((step, index) => (
              <li key={step} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs", index === 0 ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground")} aria-current={index === 0 ? "step" : undefined}>
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px]", index === 0 ? "bg-primary text-primary-foreground" : "bg-muted")}>{index + 1}</span>
                <span>{step}</span>
                {index > 0 && <span className="ml-auto text-[9px] uppercase tracking-wide">Soon</span>}
              </li>
            ))}
          </ol>
        </nav>

        <section className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 shadow-sm" aria-labelledby="sync-basic-setup">
          <h2 id="sync-basic-setup" className="text-lg font-bold">Basic setup</h2>
          {saveError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{saveError}</p>}
          <div className="space-y-1.5">
            <label htmlFor="sync-name" className="block text-xs font-semibold">Sync name</label>
            <Input id="sync-name" value={name} maxLength={120} disabled={readOnly} onChange={(event) => setName(event.target.value)} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5 border-t border-border/40 pt-4">
            <label htmlFor="sync-status" className="block text-xs font-semibold">Status</label>
            <select id="sync-status" className="h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60" value={status} disabled={readOnly} onChange={(event) => setStatus(event.target.value === "inactive" ? "inactive" : "active")}>
              <option value="active">Active (default)</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <fieldset className="space-y-3 border-t border-border/40 pt-4">
            <legend className="sr-only">Locations</legend>
            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" name="sync-locations" className="mt-1" checked={locations.mode === "all"} disabled={readOnly} onChange={() => setLocations({ mode: "all", ids: [] })} />
              <span>
                <span className="block text-sm font-semibold">Global</span>
                <span className="block text-[11px] text-muted-foreground">Applies to all current and future locations.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" name="sync-locations" className="mt-1" checked={locations.mode === "specific"} disabled={readOnly} onChange={() => setLocations({ mode: "specific", ids: locations.ids })} />
              <span>
                <span className="block text-sm font-semibold">Custom</span>
                <span className="block text-[11px] text-muted-foreground">Applies only to the locations you pick.</span>
              </span>
            </label>
            {locations.mode === "specific" && (
              <LocationPicker options={options.locations} ids={locations.ids} readOnly={readOnly} onChange={(ids) => setLocations({ mode: "specific", ids })} />
            )}
          </fieldset>
          <p className="rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            Data source, note setup, and summary come next. Until they are set up, this sync does not move any data.
          </p>
          {!readOnly && (
            <div className="flex justify-end border-t border-border/40 pt-4">
              <Button type="button" onClick={save} disabled={!ready || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </Button>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
