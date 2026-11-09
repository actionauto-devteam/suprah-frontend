"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ChevronDown, Loader2, Pencil, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { canViewAiHub } from "@/lib/aiShadowDrafts"
import {
  AUTOMATION_STATUS_LABELS,
  ENGINE_OFF_NOTE,
  INVENTORY_EVENTS,
  MAX_TOTAL_STEPS,
  NEW_TRIGGER_DEFAULTS,
  TIMED_STEP_TYPES,
  allowsBeforeTrigger,
  automationError,
  automationRequest,
  branchConfig,
  countSteps,
  stepTiming,
  type Automation,
  type AutomationDraft,
  type AutomationOptions,
  type AutomationStep,
} from "@/lib/crmAutomations"
import { findAutomationTemplate } from "@/lib/crmAutomationTemplates"
import { TriggerCard, TriggerChooser, TriggerPlaceholder } from "./AutomationTriggerNode"
import { Connector, StepList, cardWidth } from "./AutomationStepList"

const HUB_PATH = "/crm/settings/ai-agent?tab=automation"
const BUILDER_PATH = "/crm/settings/ai-agent/automations"
const EMPTY_DRAFT: AutomationDraft = { name: "", locations: { mode: "all", ids: [] }, trigger: null, steps: [] }

export function LocationPicker({ options, ids, readOnly, onChange }: {
  options: AutomationOptions["locations"]
  ids: string[]
  readOnly: boolean
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = React.useState("")
  const visible = options.filter((location) => location.name.toLowerCase().includes(query.trim().toLowerCase()))
  const allChecked = options.length > 0 && options.every((location) => ids.includes(location.id))
  const label = ids.length === 0 ? "Pick locations" : ids.length === 1 ? options.find((location) => location.id === ids[0])?.name || "1 location" : `${ids.length} locations`

  return (
    <Popover>
      <PopoverTrigger asChild disabled={readOnly}>
        <button type="button" className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm font-semibold disabled:opacity-60">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-2">
        <div className="relative">
          <label htmlFor="automation-location-search" className="sr-only">Search locations</label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input id="automation-location-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-8 pl-8 text-sm" />
        </div>
        <div className="mt-2 max-h-60 space-y-0.5 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No locations yet. Add them in CRM Settings → Locations.</p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-muted/60">
                <input type="checkbox" checked={allChecked} onChange={(event) => onChange(event.target.checked ? options.map((location) => location.id) : [])} />
                Select all
              </label>
              {visible.map((location) => (
                <label key={location.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                  <input
                    type="checkbox"
                    checked={ids.includes(location.id)}
                    onChange={(event) => onChange(event.target.checked ? [...ids, location.id] : ids.filter((id) => id !== location.id))}
                  />
                  {location.name}
                </label>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function missingParts(draft: AutomationDraft): string | null {
  if (!draft.name.trim()) return "Give the automation a name."
  if (draft.locations.mode === "specific" && draft.locations.ids.length === 0) return "Pick at least one location, or apply it to all locations."
  return stepsProblem(draft.steps, draft.trigger, "")
}

function stepsProblem(steps: AutomationStep[], trigger: AutomationDraft["trigger"], prefix: string): string | null {
  for (const [index, step] of steps.entries()) {
    const config = step.config
    const label = `${prefix}Step ${index + 1}`
    if (step.type === "send_message" && !String(config.body || "").trim()) return `${label}: write the message.`
    if (step.type === "send_notification" && !String(config.message || "").trim()) return `${label}: write the notification.`
    if (step.type === "send_email" && !String(config.subject || "").trim()) return `${label}: write the email subject.`
    if (step.type === "send_email" && !String(config.body || "").trim()) return `${label}: write the email.`
    if (step.type === "create_task" && !String(config.task || "").trim()) return `${label}: write the task.`
    if (step.type === "create_task" && config.recipients === "people" && !(config.userIds as string[] | undefined)?.length) return `${label}: pick who gets the task.`
    if (step.type === "update_lead_status" && !config.status) return `${label}: pick the new status.`
    if (step.type === "send_notification" && config.recipients === "people" && !(config.userIds as string[] | undefined)?.length) return `${label}: pick who gets the notification.`
    if (step.type === "assign_team_member" && !config.userId) return `${label}: pick the team member.`
    if (step.type === "wait" && !(Number(config.amount) >= 1)) return `${label}: set how long to wait.`
    if ((TIMED_STEP_TYPES.has(step.type) || step.type === "branch") && stepTiming(config).when === "before" && !allowsBeforeTrigger(trigger)) return `${label}: "Deliver before trigger" only works with appointment or On a Date triggers.`
    if (step.type !== "branch") continue
    const branch = branchConfig(config)
    for (const [pathIndex, path] of branch.paths.entries()) {
      const problem = stepsProblem(path.steps, trigger, `${label}, If ${pathIndex + 1}, `)
      if (problem) return problem
    }
    const problem = branch.else.doNothing ? null : stepsProblem(branch.else.steps, trigger, `${label}, Else, `)
    if (problem) return problem
  }
  return null
}

function prepareSteps(steps: AutomationStep[]): AutomationStep[] {
  return steps.map((step) => {
    if (step.type === "wait") return { ...step, config: { ...step.config, amount: Number(step.config.amount) } }
    if (step.type !== "branch") return step
    const branch = branchConfig(step.config)
    return {
      ...step,
      config: {
        ...branch,
        paths: branch.paths.map((path) => ({ ...path, steps: prepareSteps(path.steps) })),
        else: { doNothing: branch.else.doNothing, steps: branch.else.doNothing ? [] : prepareSteps(branch.else.steps) },
      },
    }
  })
}

export function AutomationBuilder({ automationId, templateKey }: { automationId?: string; templateKey?: string }) {
  const router = useRouter()
  const { getToken } = useAuth()
  const template = React.useMemo(() => (automationId ? null : findAutomationTemplate(templateKey)), [automationId, templateKey])
  const [options, setOptions] = React.useState<AutomationOptions | null>(null)
  const [saved, setSaved] = React.useState<Automation | null>(null)
  const [draft, setDraft] = React.useState<AutomationDraft>(() => (template ? template.build() : EMPTY_DRAFT))
  const [baseline, setBaseline] = React.useState(JSON.stringify(EMPTY_DRAFT))
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [choosing, setChoosing] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const [droppedLocations, setDroppedLocations] = React.useState(0)
  const canvasRef = React.useRef<HTMLElement>(null)

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
        const role = (me.data?.data || me.data)?.role
        if (!canViewAiHub(role)) {
          router.replace("/crm/settings/ai-agent")
          return
        }
        const [opts, existing] = await Promise.all([
          automationRequest<AutomationOptions>(getHubToken, "get", "/options"),
          automationId ? automationRequest<{ automation: Automation }>(getHubToken, "get", `/${automationId}`) : Promise.resolve(null),
        ])
        if (cancelled) return
        setOptions(opts)
        if (existing) {
          const active = new Set(opts.locations.map((location) => location.id))
          const ids = existing.automation.locations.ids.filter((id) => active.has(id))
          const next: AutomationDraft = {
            name: existing.automation.name,
            locations: { mode: existing.automation.locations.mode, ids },
            trigger: existing.automation.trigger,
            steps: existing.automation.steps,
          }
          setDroppedLocations(existing.automation.locations.ids.length - ids.length)
          setSaved(existing.automation)
          setDraft(next)
          setBaseline(JSON.stringify({ ...next, locations: existing.automation.locations }))
        }
      } catch (err) {
        if (!cancelled) setLoadError(automationError(err, "Could not open this automation"))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [automationId, getHubToken, router])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) canvas.scrollLeft = (canvas.scrollWidth - canvas.clientWidth) / 2
  }, [options])

  const readOnly = !options?.canEdit
  const triggerEvent = draft.trigger?.event || ""
  const stepOptions = React.useMemo(() => {
    if (!options || INVENTORY_EVENTS.has(triggerEvent)) return options
    const hidden = new Set(options.inventoryVariables || [])
    return { ...options, variables: options.variables.filter((variable) => !hidden.has(variable.key)) }
  }, [options, triggerEvent])
  const dirty = JSON.stringify(draft) !== baseline
  const missing = missingParts(draft)

  React.useEffect(() => {
    if (!dirty || readOnly) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, readOnly])

  const update = (patch: Partial<AutomationDraft>) => setDraft((current) => ({ ...current, ...patch }))

  const persist = async (): Promise<Automation | null> => {
    if (missing) {
      setSaveError(missing)
      return null
    }
    setSaving(true)
    setSaveError(null)
    try {
      const body = {
        name: draft.name.trim(),
        locations: draft.locations.mode === "all" ? { mode: "all" } : draft.locations,
        trigger: draft.trigger,
        steps: prepareSteps(draft.steps),
      }
      const result = saved
        ? await automationRequest<{ automation: Automation }>(getHubToken, "patch", `/${saved.id}`, body)
        : await automationRequest<{ automation: Automation }>(getHubToken, "post", "", body)
      const next: AutomationDraft = { name: result.automation.name, locations: result.automation.locations, trigger: result.automation.trigger, steps: result.automation.steps }
      setSaved(result.automation)
      setDraft(next)
      setBaseline(JSON.stringify(next))
      setDroppedLocations(0)
      if (!saved) router.replace(`${BUILDER_PATH}/${result.automation.id}`)
      return result.automation
    } catch (err) {
      setSaveError(automationError(err, "Could not save the automation"))
      return null
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (await persist()) toast.success("Automation saved")
  }

  const changeStatus = async (next: "active" | "test" | "inactive") => {
    const current = dirty || !saved ? await persist() : saved
    if (!current) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await automationRequest<{ automation: Automation }>(getHubToken, "post", `/${current.id}/status`, { status: next })
      setSaved(result.automation)
      toast.success(next === "active" ? "Automation is active" : next === "test" ? "Automation is in Test Mode" : "Automation is turned off")
    } catch (err) {
      setSaveError(automationError(err, "Could not change the automation"))
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    if (dirty && !readOnly) setLeaving(true)
    else router.push(HUB_PATH)
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => router.push(HUB_PATH)}>Back to automations</Button>
      </div>
    )
  }
  if (!options) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" aria-label="Loading" />
      </div>
    )
  }

  const status = saved?.status || "draft"
  const isOn = status === "active" || status === "test"

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur sm:px-5">
        <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0" onClick={goBack} aria-label="Back to automations">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold sm:text-base">{saved ? saved.name : "Create new automation"}</h1>
          <p className="text-[11px] text-muted-foreground">
            {saved ? AUTOMATION_STATUS_LABELS[saved.status] : "Not saved yet"}
            {readOnly ? " · View only. Only admins can change automations." : dirty ? " · Unsaved changes" : ""}
          </p>
        </div>
        {!readOnly && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={save} disabled={saving || (!dirty && Boolean(saved))}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isOn ? "Update Automation" : "Save"}
            </Button>
            {isOn && <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => void changeStatus("inactive")} disabled={saving}>Deactivate</Button>}
            {status !== "test" && <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => void changeStatus("test")} disabled={saving}>Set to Test Mode</Button>}
            {status !== "active" && <Button type="button" size="sm" className="h-9" onClick={() => void changeStatus("active")} disabled={saving}>Activate Automation</Button>}
          </div>
        )}
      </header>

      <section
        ref={canvasRef}
        aria-label="Automation steps"
        className="flex-1 overflow-x-auto bg-muted/40 px-4 py-8"
        style={{ backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
        <div className="mx-auto flex w-full max-w-md flex-col lg:w-max lg:min-w-full lg:max-w-none lg:items-center">
          <div className={cardWidth(0)}>
            {saveError && (
              <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{saveError}</p>
            )}
            {!options.engineEnabled && (
              <p role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">{ENGINE_OFF_NOTE}</p>
            )}
            {template && !saved && (
              <p role="status" className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-[11px]">Started from the &quot;{template.name}&quot; template. Check the steps and messages, then Save. It stays a Draft until you turn it on.</p>
            )}
            {status === "test" && (
              <p className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-[11px] text-sky-800 dark:text-sky-200">Test Mode: this automation runs but sends nothing and changes nothing. See what it would do in Monitor with Test mode on.</p>
            )}

            <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="border-b border-border/40 p-3">
                <label htmlFor="automation-name" className="sr-only">Automation name</label>
                <div className="relative">
                  <Input id="automation-name" value={draft.name} maxLength={120} disabled={readOnly} onChange={(event) => update({ name: event.target.value })} placeholder="Name your automation" className="h-10 pr-9 text-sm font-semibold" />
                  <Pencil className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                </div>
              </div>
              <fieldset className="space-y-2 p-3">
                <legend className="mb-2 text-xs font-bold">Select locations</legend>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="automation-locations" checked={draft.locations.mode === "all"} disabled={readOnly} onChange={() => update({ locations: { mode: "all", ids: [] } })} />
                  Apply to all current and future locations
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="automation-locations" checked={draft.locations.mode === "specific"} disabled={readOnly} onChange={() => update({ locations: { mode: "specific", ids: draft.locations.ids } })} />
                  Select specific locations
                </label>
                {draft.locations.mode === "specific" && (
                  <LocationPicker options={options.locations} ids={draft.locations.ids} readOnly={readOnly} onChange={(ids) => update({ locations: { mode: "specific", ids } })} />
                )}
                {droppedLocations > 0 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{droppedLocations} location{droppedLocations === 1 ? " was" : "s were"} archived and removed from this automation. Save to keep the change.</p>
                )}
              </fieldset>
            </div>

            <Connector />

            {choosing ? (
              <TriggerChooser
                sources={options.sources}
                initial={draft.trigger}
                onCancel={() => setChoosing(false)}
                onDone={(source, event) => {
                  const keep = draft.trigger && draft.trigger.source === source ? draft.trigger : null
                  update({ trigger: { ...NEW_TRIGGER_DEFAULTS, ...(keep || {}), source, event } })
                  setChoosing(false)
                }}
              />
            ) : draft.trigger ? (
              <TriggerCard
                trigger={draft.trigger}
                sources={options.sources}
                options={options}
                readOnly={readOnly}
                onChange={(trigger) => update({ trigger })}
                onEdit={() => setChoosing(true)}
                onRemove={() => update({ trigger: null })}
              />
            ) : (
              <TriggerPlaceholder onChoose={() => setChoosing(true)} disabled={readOnly} />
            )}
          </div>

          {draft.trigger && !choosing && (
            <StepList
              steps={draft.steps}
              depth={0}
              room={MAX_TOTAL_STEPS - countSteps(draft.steps)}
              options={stepOptions || options}
              readOnly={readOnly}
              allowBefore={allowsBeforeTrigger(draft.trigger)}
              onChange={(steps) => update({ steps })}
            />
          )}
          <div className="h-16" />
        </div>
      </section>

      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>Your changes to this automation will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(HUB_PATH)}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
