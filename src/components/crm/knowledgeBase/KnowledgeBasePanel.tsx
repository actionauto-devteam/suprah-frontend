"use client"

import * as React from "react"
import { BookOpen, Loader2, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { HubCard, HubState } from "@/components/crm/aiHub/ShadowStatusBadge"
import {
  knowledgeErrorMessage,
  knowledgeRequest,
  useKnowledgeEntries,
  useKnowledgeLocations,
  useKnowledgeStatus,
  type KbEntryFilters,
} from "@/hooks/useAiKnowledgeBase"
import {
  KB_KIND_LABELS,
  KB_KINDS,
  KB_STATUS_LABELS,
  KB_STATUSES,
  KB_TOPIC_LABELS,
  KB_TOPICS,
  approvalDisplay,
  entryDisplay,
  locationNameList,
  locationNames,
  type KbAvailability,
  type KbEntrySummary,
  type KbLocation,
} from "@/lib/aiKnowledgeBase"
import { cn } from "@/lib/utils"
import { KbBadge, KbPill, formatKbDate } from "./KnowledgeShared"
import { KnowledgeEntryEditor, type KbEditorTarget } from "./KnowledgeEntryEditor"
import { KnowledgeEntryDrawer } from "./KnowledgeEntryDrawer"
import { VerifiedDetailsSection } from "./VerifiedDetailsSection"
import { KnowledgeAuditSection } from "./KnowledgeAuditSection"

type Section = "entries" | "details" | "history"

const SELECT_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto"

function AvailabilityItem({ label, value, tone, children }: { label: string; value: string; tone: "on" | "off" | "info"; children?: React.ReactNode }) {
  const dot = tone === "on" ? "bg-emerald-500" : tone === "off" ? "bg-slate-400" : "bg-sky-500"
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border/40 p-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden="true" />
          {value}
        </p>
      </div>
      {children}
    </div>
  )
}

function AvailabilityStrip({ availability, getToken, onChange }: {
  availability: KbAvailability
  getToken: () => Promise<string | null>
  onChange: (next: KbAvailability) => void
}) {
  const [confirming, setConfirming] = React.useState<boolean | null>(null)
  const [busy, setBusy] = React.useState(false)
  const canToggle = availability.serverEnabled && availability.canManageSettings

  const save = async (enabled: boolean) => {
    setBusy(true)
    try {
      const next = await knowledgeRequest<KbAvailability>(getToken, "patch", "/settings", { enabled })
      onChange(next)
      toast.success(enabled ? "Knowledge Base turned on for this organization" : "Knowledge Base turned off for this organization")
      setConfirming(null)
    } catch (err) {
      toast.error("Could not change the setting", { description: knowledgeErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3" role="group" aria-label="Knowledge Base availability">
        <AvailabilityItem label="Server" value={availability.serverEnabled ? "Available" : "Not available on this server"} tone={availability.serverEnabled ? "on" : "off"} />
        <AvailabilityItem label="This organization" value={availability.orgEnabled ? "On" : "Off"} tone={availability.orgEnabled ? "on" : "off"}>
          {canToggle && (
            <Switch
              checked={availability.orgEnabled}
              disabled={busy}
              onCheckedChange={(checked) => setConfirming(checked)}
              aria-label="Knowledge Base for this organization"
            />
          )}
        </AvailabilityItem>
        <AvailabilityItem
          label={"AI Agent replies"}
          value={availability.affectsAlex ? "Uses approved content" : "Not using Knowledge Base content yet"}
          tone="info"
        />
      </div>
      {confirming !== null && (
        <div role="alertdialog" aria-label="Confirm Knowledge Base setting" className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px]">
          <p>
            {confirming
              ? "Turn the Knowledge Base on for this organization? Reps can write drafts and managers can review them. The AI Agent still won't use any of it."
              : "Turn the Knowledge Base off for this organization? Entries and history are kept, but nobody can manage them until an admin turns it back on."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
            <Button size="sm" variant={confirming ? "default" : "destructive"} disabled={busy} onClick={() => void save(confirming)}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {confirming ? "Turn on" : "Turn off"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry, locations, onOpen }: { entry: KbEntrySummary; locations: KbLocation[]; onOpen: () => void }) {
  const display = entryDisplay(entry)
  const approval = entry.approval
  const earlier = approval && entry.status !== "approved" && entry.lifecycle === "active" ? approvalDisplay(approval) : null
  const suspended = approval?.activeSuspendedLocationIds.length ? locationNameList(approval.activeSuspendedLocationIds, locations) : []
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-border/40 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <KbBadge display={display} />
        <KbPill>{KB_KIND_LABELS[entry.kind]}</KbPill>
        <KbPill>{KB_TOPIC_LABELS[entry.topic] || entry.topic}</KbPill>
        {entry.isMine && <KbPill>Yours</KbPill>}
        {entry.source.system === "podium_import" && <KbPill>Imported from Podium</KbPill>}
        {entry.source.sourceStatus === "off" && <KbPill>Originally Off in Podium</KbPill>}
      </div>
      <p className="mt-1.5 break-words text-xs font-semibold">{entry.title}</p>
      {entry.question && entry.question !== entry.title && <p className="break-words text-[11px] text-muted-foreground">{entry.question}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">
        {locationNames(entry.locationScope, locations)} · Version {entry.currentVersion} · Updated {formatKbDate(entry.updatedAt)}
      </p>
      {earlier && (
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          Earlier approved version {approval?.version}: <KbBadge display={earlier} />
        </p>
      )}
      {suspended.length > 0 && entry.lifecycle === "active" && (
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Suspended at {suspended.join(", ")}. Needs a fresh review there.</p>
      )}
    </button>
  )
}

function EntriesSection({ getToken, availability, locations, refreshKey, onOpen, onCreate }: {
  getToken: () => Promise<string | null>
  availability: KbAvailability
  locations: KbLocation[]
  refreshKey: number
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<KbEntryFilters>({ page: 1 })

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => (current.q || "") === search.trim() ? current : { ...current, q: search.trim() || undefined, page: 1 })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const list = useKnowledgeEntries(getToken, filters, true, refreshKey)
  const setFilter = (patch: Partial<KbEntryFilters>) => setFilters((current) => ({ ...current, ...patch, page: 1 }))
  const filtered = Boolean(filters.q || filters.status || filters.lifecycle || filters.kind || filters.topic || filters.locationId || filters.needsReapproval)
  const total = list.data?.total || 0
  const limit = list.data?.limit || 20
  const page = filters.page || 1
  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="kb-search" className="sr-only">Search entries</label>
          <Input id="kb-search" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles and questions" className="h-9 pl-8 text-xs" />
        </div>
        {availability.canCreate && (
          <Button size="sm" className="h-9 shrink-0" onClick={onCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New entry
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <label className="sr-only" htmlFor="kb-filter-status">Status</label>
        <select id="kb-filter-status" className={SELECT_CLASS} value={filters.status || ""} onChange={(event) => setFilter({ status: event.target.value || undefined })}>
          <option value="">Any status</option>
          {KB_STATUSES.map((value) => <option key={value} value={value}>{KB_STATUS_LABELS[value]}</option>)}
        </select>
        <label className="sr-only" htmlFor="kb-filter-lifecycle">State</label>
        <select id="kb-filter-lifecycle" className={SELECT_CLASS} value={filters.lifecycle || ""} onChange={(event) => setFilter({ lifecycle: event.target.value || undefined })}>
          <option value="">Active and disabled</option>
          <option value="active">Active only</option>
          <option value="disabled">Disabled</option>
          <option value="archived">Archived</option>
        </select>
        <label className="sr-only" htmlFor="kb-filter-kind">Type</label>
        <select id="kb-filter-kind" className={SELECT_CLASS} value={filters.kind || ""} onChange={(event) => setFilter({ kind: event.target.value || undefined })}>
          <option value="">Any type</option>
          {KB_KINDS.map((value) => <option key={value} value={value}>{KB_KIND_LABELS[value]}</option>)}
        </select>
        <label className="sr-only" htmlFor="kb-filter-topic">Topic</label>
        <select id="kb-filter-topic" className={SELECT_CLASS} value={filters.topic || ""} onChange={(event) => setFilter({ topic: event.target.value || undefined })}>
          <option value="">Any topic</option>
          {KB_TOPICS.map((value) => <option key={value} value={value}>{KB_TOPIC_LABELS[value]}</option>)}
        </select>
        <label className="sr-only" htmlFor="kb-filter-location">Location</label>
        <select id="kb-filter-location" className={SELECT_CLASS} value={filters.locationId || ""} onChange={(event) => setFilter({ locationId: event.target.value || undefined })}>
          <option value="">Any location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}{location.status === "archived" ? " (archived)" : ""}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={Boolean(filters.needsReapproval)} onChange={(event) => setFilter({ needsReapproval: event.target.checked || undefined })} />
          Needs re-approval
        </label>
      </div>
      {!availability.canReview && <p className="text-[11px] text-muted-foreground">You see the entries you created. A manager or admin reviews them.</p>}
      <HubState
        loading={list.loading && !list.data}
        error={list.error}
        onRetry={list.reload}
        empty={list.data && !list.data.items.length ? (filtered ? "No entries match these filters." : "No entries yet. Use New entry to write the first one.") : false}
      >
        <p className="text-[11px] text-muted-foreground" aria-live="polite">{total} entr{total === 1 ? "y" : "ies"}</p>
        <ul aria-label="Knowledge Base entries" className="space-y-2">
          {(list.data?.items || []).map((entry) => (
            <li key={entry.id}><EntryRow entry={entry} locations={locations} onOpen={() => onOpen(entry.id)} /></li>
          ))}
        </ul>
        {pages > 1 && (
          <nav aria-label="Entry pages" className="flex items-center justify-between gap-2 pt-1">
            <Button size="sm" variant="outline" disabled={page <= 1 || list.loading} onClick={() => setFilters((current) => ({ ...current, page: page - 1 }))}>Previous</Button>
            <span className="text-[11px] text-muted-foreground">Page {page} of {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages || list.loading} onClick={() => setFilters((current) => ({ ...current, page: page + 1 }))}>Next</Button>
          </nav>
        )}
      </HubState>
    </div>
  )
}

export function KnowledgeBasePanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const status = useKnowledgeStatus(getToken)
  const availability = status.data
  const enabled = Boolean(availability?.enabled)
  const locationList = useKnowledgeLocations(getToken, enabled)
  const locations = React.useMemo(() => locationList.data || [], [locationList.data])
  const [section, setSection] = React.useState<Section>("entries")
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [openEntryId, setOpenEntryId] = React.useState<string | null>(null)
  const [editor, setEditor] = React.useState<KbEditorTarget | null>(null)

  const sections: Array<{ value: Section; label: string }> = [
    { value: "entries", label: "Entries" },
    { value: "details", label: "Verified contacts & programs" },
    ...(availability?.canReview ? [{ value: "history" as const, label: "History" }] : []),
  ]

  return (
    <HubCard
      title="Knowledge Base"
      description="Approved dealership answers and business information. Managing it here does not change what the AI Agent says."
      icon={<BookOpen className="h-4 w-4 text-primary" />}
    >
      <HubState loading={status.loading && !status.data} error={status.error} onRetry={status.reload}>
        {availability && (
          <div className="space-y-4">
            <AvailabilityStrip availability={availability} getToken={getToken} onChange={(next) => { status.setData(next); setRefreshKey((value) => value + 1) }} />
            {!availability.serverEnabled && (
              <p role="status" className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
                The Knowledge Base isn&apos;t available on this server yet. Nothing can be created or changed.
              </p>
            )}
            {availability.serverEnabled && !availability.orgEnabled && (
              <p role="status" className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
                The Knowledge Base is turned off for this organization.{" "}
                {availability.canManageSettings ? "Use the switch above to turn it on." : "An admin can turn it on."}
              </p>
            )}
            {enabled && (
              <>
                <div role="tablist" aria-label="Knowledge Base sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                  {sections.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      id={`kb-tab-${item.value}`}
                      aria-selected={section === item.value}
                      aria-controls={`kb-panel-${item.value}`}
                      onClick={() => setSection(item.value)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        section === item.value ? "border-primary bg-primary text-primary-foreground" : "border-border/50 text-muted-foreground hover:bg-muted/40",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div role="tabpanel" id={`kb-panel-${section}`} aria-labelledby={`kb-tab-${section}`}>
                  {section === "entries" && (
                    <EntriesSection
                      getToken={getToken}
                      availability={availability}
                      locations={locations}
                      refreshKey={refreshKey}
                      onOpen={setOpenEntryId}
                      onCreate={() => setEditor({ mode: "create" })}
                    />
                  )}
                  {section === "details" && <VerifiedDetailsSection getToken={getToken} canReview={availability.canReview} locations={locations} />}
                  {section === "history" && availability.canReview && (
                    <KnowledgeAuditSection getToken={getToken} locations={locations} onOpenEntry={setOpenEntryId} />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </HubState>
      {enabled && (
        <>
          <KnowledgeEntryDrawer
            entryId={openEntryId}
            getToken={getToken}
            locations={locations}
            refreshKey={refreshKey}
            onClose={() => setOpenEntryId(null)}
            onEdit={(detail) => setEditor({ mode: "edit", detail })}
            onChanged={() => setRefreshKey((value) => value + 1)}
          />
          <KnowledgeEntryEditor
            target={editor}
            locations={locations}
            getToken={getToken}
            onClose={() => setEditor(null)}
            onSaved={(detail) => {
              setEditor(null)
              setRefreshKey((value) => value + 1)
              setOpenEntryId(detail.entry.id)
            }}
          />
        </>
      )}
    </HubCard>
  )
}
