"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  Activity,
  ArrowLeftRight,
  Bell,
  Copy,
  FlaskConical,
  LayoutGrid,
  ListChecks,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  Search,
  Tag,
  Trash2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { cn } from "@/lib/utils"
import {
  AUTOMATION_STATUS_LABELS,
  AUTOMATION_STATUS_STYLES,
  automationError,
  automationRequest,
  formatAutomationDate,
  type Automation,
  type AutomationOptions,
  type AutomationAlerts,
  type AutomationStatus,
} from "@/lib/crmAutomations"
import { HubCard, HubState } from "../ShadowStatusBadge"
import { AutomationTagsDialog } from "./AutomationTagsDialog"
import { AutomationMonitor } from "./AutomationMonitor"
import { AutomationAlertsDialog } from "./AutomationAlertsDialog"
import { AddSyncButton, DataSyncList } from "./DataSyncList"

type GetToken = () => Promise<string | null>
type AutomationView = "manage" | "monitor" | "browse" | "sync"

const VIEWS: Array<{ value: AutomationView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "manage", label: "Manage", icon: ListChecks },
  { value: "monitor", label: "Monitor", icon: Activity },
  { value: "browse", label: "Browse", icon: LayoutGrid },
  { value: "sync", label: "Data Sync", icon: ArrowLeftRight },
]

const EMPTY_STATES: Record<Exclude<AutomationView, "manage" | "monitor" | "sync">, { title: string; body: string }> = {
  browse: { title: "No ready-made automations yet", body: "Ready-made automations will show here." },
}

const SELECT_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto"
const BUILDER_PATH = "/crm/settings/ai-agent/automations"

function EmptyState({ icon: Icon, title, body, action }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function StatusPill({ status }: { status: AutomationStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", AUTOMATION_STATUS_STYLES[status])}>
      {AUTOMATION_STATUS_LABELS[status]}
    </span>
  )
}

export function AutomationPanel({ getToken }: { getToken: GetToken }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [view, setView] = React.useState<AutomationView>(() => {
    const requested = searchParams?.get("view")
    return VIEWS.some((item) => item.value === requested) ? (requested as AutomationView) : "manage"
  })
  const [items, setItems] = React.useState<Automation[] | null>(null)
  const [options, setOptions] = React.useState<AutomationOptions | null>(null)
  const [canEdit, setCanEdit] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [source, setSource] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [tag, setTag] = React.useState("")
  const [tagging, setTagging] = React.useState<Automation | null>(null)
  const [alerting, setAlerting] = React.useState<Automation | null>(null)
  const [deleting, setDeleting] = React.useState<Automation | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, opts] = await Promise.all([
        automationRequest<{ items: Automation[]; canEdit: boolean }>(getToken, "get", ""),
        automationRequest<AutomationOptions>(getToken, "get", "/options"),
      ])
      setItems(list.items)
      setCanEdit(list.canEdit)
      setOptions(opts)
    } catch (err) {
      setError(automationError(err, "Could not load automations"))
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    void load()
  }, [load])

  const sourceLabel = (key?: string) => options?.sources.find((item) => item.key === key)?.label || "—"
  const allTags = Array.from(new Set((items || []).flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b))
  const visible = (items || []).filter((item) => {
    if (source && (item.trigger?.source || "") !== source) return false
    if (status && item.status !== status) return false
    if (tag && !item.tags.includes(tag)) return false
    const needle = query.trim().toLowerCase()
    return !needle || item.name.toLowerCase().includes(needle)
  })

  const duplicate = async (item: Automation) => {
    setBusyId(item.id)
    try {
      await automationRequest(getToken, "post", `/${item.id}/duplicate`)
      toast.success(`Duplicated "${item.name}"`)
      await load()
    } catch (err) {
      toast.error(automationError(err, "Could not duplicate the automation"))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async () => {
    if (!deleting) return
    const target = deleting
    setBusyId(target.id)
    try {
      await automationRequest(getToken, "delete", `/${target.id}`)
      toast.success(`Deleted "${target.name}"`)
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(automationError(err, "Could not delete the automation"))
    } finally {
      setBusyId(null)
    }
  }

  const changeStatus = async (item: Automation, next: "active" | "test" | "inactive") => {
    setBusyId(item.id)
    try {
      const saved = await automationRequest<{ automation: Automation }>(getToken, "post", `/${item.id}/status`, { status: next })
      setItems((current) => (current || []).map((row) => (row.id === item.id ? saved.automation : row)))
      toast.success(next === "active" ? `"${item.name}" is now active` : next === "test" ? `"${item.name}" is in Test Mode` : `"${item.name}" is turned off`)
    } catch (err) {
      toast.error(automationError(err, "Could not change the automation"))
    } finally {
      setBusyId(null)
    }
  }

  const saveAlerts = async (target: Automation, alerts: AutomationAlerts) => {
    const saved = await automationRequest<{ automation: Automation }>(getToken, "patch", `/${target.id}/alerts`, {
      enabled: alerts.enabled,
      condition: alerts.condition,
      minEvents: alerts.minEvents,
      days: alerts.days,
      dropPercent: alerts.dropPercent,
      userIds: alerts.userIds,
    })
    setItems((current) => (current || []).map((item) => (item.id === target.id ? saved.automation : item)))
    toast.success(alerts.enabled ? "Alerts saved" : "Alerts turned off")
  }

  const saveTags = async (target: Automation, tags: string[]) => {
    const saved = await automationRequest<{ automation: Automation }>(getToken, "patch", `/${target.id}`, { tags })
    setItems((current) => (current || []).map((item) => (item.id === target.id ? saved.automation : item)))
    toast.success("Tags saved")
  }

  const addButton = canEdit && (
    <Button type="button" size="sm" className="h-9" onClick={() => router.push(`${BUILDER_PATH}/new`)}>
      <Plus className="h-4 w-4" />
      Automation
    </Button>
  )

  return (
    <HubCard
      title="Automation"
      description="Automatic texts, emails, and chat replies the system sends to customers."
      icon={<Zap className="h-4 w-4 text-primary" />}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
            <div className="inline-flex w-max gap-1 rounded-xl border border-border/40 bg-muted/30 p-1" role="group" aria-label="Automation views">
              {VIEWS.map((item) => {
                const Icon = item.icon
                const active = view === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setView(item.value)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {addButton}
              <AddSyncButton />
            </div>
          )}
        </div>

        {view === "sync" ? (
          <DataSyncList getToken={getToken} />
        ) : view === "monitor" ? (
          <AutomationMonitor getToken={getToken} automations={items || []} options={options} />
        ) : view !== "manage" ? (
          <EmptyState icon={VIEWS.find((item) => item.value === view)?.icon || Activity} {...EMPTY_STATES[view]} />
        ) : (
          <HubState loading={loading && !items} error={items ? null : error} onRetry={load}>
            {items && items.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No automations yet"
                body={canEdit ? "Click + Automation to build your first one." : "Automations your admins add will show here."}
                action={addButton}
              />
            ) : items && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <div className="relative min-w-0 sm:w-64">
                    <label htmlFor="automation-search" className="sr-only">Search by automation name</label>
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="automation-search" type="search" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Search by automation name" className="h-9 pl-8 text-sm" />
                  </div>
                  <label htmlFor="automation-source" className="sr-only">Source</label>
                  <select id="automation-source" className={SELECT_CLASS} value={source} onChange={(event) => setSource(event.target.value)}>
                    <option value="">All sources</option>
                    {(options?.sources || []).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                  <label htmlFor="automation-status" className="sr-only">Status</label>
                  <select id="automation-status" className={SELECT_CLASS} value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">All statuses</option>
                    {(Object.keys(AUTOMATION_STATUS_LABELS) as AutomationStatus[]).map((value) => <option key={value} value={value}>{AUTOMATION_STATUS_LABELS[value]}</option>)}
                  </select>
                  <label htmlFor="automation-tag" className="sr-only">Tag</label>
                  <select id="automation-tag" className={SELECT_CLASS} value={tag} onChange={(event) => setTag(event.target.value)}>
                    <option value="">All tags</option>
                    {allTags.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>

                {visible.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">No automations match these filters.</p>
                ) : (
                  <ul className="space-y-2" aria-label="Automations">
                    {visible.map((item) => (
                      <li key={item.id} className={cn("flex items-start gap-3 rounded-xl border border-border/40 bg-background p-3 sm:items-center", busyId === item.id && "opacity-60")}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <button type="button" onClick={() => router.push(`${BUILDER_PATH}/${item.id}`)} className="text-left text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                              {item.name}
                            </button>
                            {item.tags.map((value) => (
                              <span key={value} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                                {value}
                              </span>
                            ))}
                            {canEdit && (
                              <button type="button" onClick={() => setTagging(item)} className="inline-flex items-center gap-0.5 rounded-md px-1 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                                <Plus className="h-2.5 w-2.5" aria-hidden="true" />
                                Add tag
                              </button>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <StatusPill status={item.status} />
                            <span>{item.locations.mode === "all" ? "All locations" : `${item.locations.ids.length} location${item.locations.ids.length === 1 ? "" : "s"}`}</span>
                            <span>Source: {sourceLabel(item.trigger?.source)}</span>
                            <span>Updated {formatAutomationDate(item.updatedAt)}</span>
                            {item.alerts?.enabled && (
                              <span className="inline-flex items-center gap-1"><Bell className="h-3 w-3" aria-hidden="true" />Alerts on</span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" aria-label={`Actions for ${item.name}`} disabled={busyId === item.id}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onSelect={() => router.push(`${BUILDER_PATH}/${item.id}`)}>
                              <Pencil className="h-4 w-4" />
                              {canEdit ? "Edit" : "View"}
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem onSelect={() => void duplicate(item)}>
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                {item.status === "active" || item.status === "test" ? (
                                  <DropdownMenuItem onSelect={() => void changeStatus(item, "inactive")}>
                                    <Power className="h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onSelect={() => void changeStatus(item, "active")}>
                                    <Power className="h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => setAlerting(item)}>
                                  <Bell className="h-4 w-4" />
                                  Manage Alerts
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setTagging(item)}>
                                  <Tag className="h-4 w-4" />
                                  Manage tags
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={item.status === "test"} onSelect={() => void changeStatus(item, "test")}>
                                  <FlaskConical className="h-4 w-4" />
                                  Set to Test Mode
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(item)}>
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </HubState>
        )}
      </div>

      <AutomationAlertsDialog
        automation={alerting}
        team={options?.team || []}
        onClose={() => setAlerting(null)}
        onSave={saveAlerts}
      />

      <AutomationTagsDialog
        automation={tagging}
        suggestions={allTags}
        onClose={() => setTagging(null)}
        onSave={saveTags}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this automation?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.name}&quot; will be removed for everyone. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void remove() }} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HubCard>
  )
}
