"use client"

import * as React from "react"
import { Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { automationError, type Automation, type AutomationAlerts, type AutomationOptions } from "@/lib/crmAutomations"

const FIELD_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
const DEFAULT_ALERTS: AutomationAlerts = { enabled: false, condition: "min_events", minEvents: 1, days: 7, dropPercent: 50, userIds: [], lastAlertAt: null }

function NumberBox({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      aria-label={label}
      value={Number.isFinite(value) ? value : ""}
      onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Math.round(Number(event.target.value)))}
      className="h-8 w-16 text-center text-sm"
    />
  )
}

export function AutomationAlertsDialog({ automation, team, onClose, onSave }: {
  automation: Automation | null
  team: AutomationOptions["team"]
  onClose: () => void
  onSave: (automation: Automation, alerts: AutomationAlerts) => Promise<void>
}) {
  const [draft, setDraft] = React.useState<AutomationAlerts>(DEFAULT_ALERTS)
  const [query, setQuery] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDraft({ ...DEFAULT_ALERTS, ...(automation?.alerts || {}) })
    setQuery("")
    setError(null)
  }, [automation])

  const patch = (next: Partial<AutomationAlerts>) => setDraft((current) => ({ ...current, ...next }))
  const inRange = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max
  const numbersOk = inRange(draft.days, 1, 90) && (draft.condition === "min_events" ? inRange(draft.minEvents, 1, 1000) : inRange(draft.dropPercent, 1, 100))
  const ready = !draft.enabled || (draft.userIds.length > 0 && numbersOk)
  const needle = query.trim().toLowerCase()
  const matches = team.filter((member) => `${member.name} ${member.email || ""}`.toLowerCase().includes(needle)).slice(0, 50)
  const chosen = draft.userIds.map((id) => team.find((member) => member.id === id) || { id, name: "Team member", email: "", role: "" })

  const save = async () => {
    if (!automation) return
    setSaving(true)
    setError(null)
    try {
      await onSave(automation, draft)
      onClose()
    } catch (err) {
      setError(automationError(err, "Could not save the alerts"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(automation)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up alerts</DialogTitle>
          <DialogDescription className="truncate">{automation?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="automation-alerts-enabled" className="text-sm font-medium">Enable alert monitoring for this automation</label>
            <Switch id="automation-alerts-enabled" checked={draft.enabled} onCheckedChange={(checked) => patch({ enabled: Boolean(checked) })} />
          </div>
          {draft.enabled && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="automation-alerts-condition" className="text-xs font-semibold">Threshold condition</label>
                <select id="automation-alerts-condition" className={FIELD_CLASS} value={draft.condition} onChange={(event) => patch({ condition: event.target.value === "percentage_drop" ? "percentage_drop" : "min_events" })}>
                  <option value="min_events">Minimum events in the last days</option>
                  <option value="percentage_drop">Percentage drop</option>
                </select>
                {draft.condition === "min_events" ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <span>At least</span>
                    <NumberBox label="Minimum events" value={draft.minEvents} min={1} max={1000} onChange={(minEvents) => patch({ minEvents })} />
                    <span>event(s) over the last</span>
                    <NumberBox label="Days" value={draft.days} min={1} max={90} onChange={(days) => patch({ days })} />
                    <span>days</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <span>Drop of</span>
                    <NumberBox label="Drop percent" value={draft.dropPercent} min={1} max={100} onChange={(dropPercent) => patch({ dropPercent })} />
                    <span>% or more over the last</span>
                    <NumberBox label="Days" value={draft.days} min={1} max={90} onChange={(days) => patch({ days })} />
                    <span>days, compared to the days before</span>
                  </div>
                )}
                {!numbersOk && <p className="text-[11px] text-red-600 dark:text-red-400">Days must be 1 to 90, events 1 to 1000, and the drop 1 to 100%.</p>}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold">Send alert to</p>
                {chosen.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {chosen.map((member) => (
                      <span key={member.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
                        {member.name}
                        <button type="button" onClick={() => patch({ userIds: draft.userIds.filter((id) => id !== member.id) })} aria-label={`Remove ${member.name}`} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <label htmlFor="automation-alerts-search" className="sr-only">Search and add users</label>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="automation-alerts-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search and add users..." className="h-9 pl-8 text-sm" />
                </div>
                <ul className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-border/50 p-1" aria-label="Team members">
                  {matches.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">No one matches.</li>}
                  {matches.map((member) => (
                    <li key={member.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                        <input
                          type="checkbox"
                          checked={draft.userIds.includes(member.id)}
                          onChange={(event) => patch({ userIds: event.target.checked ? [...draft.userIds, member.id] : draft.userIds.filter((id) => id !== member.id) })}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">{member.name}</span>
                          {member.email && <span className="block truncate text-[11px] text-muted-foreground">{member.email}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-muted-foreground">Checked once a day after 9 AM Mountain Time, only while the automation is Active. Filtered runs are not counted.</p>
            </>
          )}
          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving || !ready}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
