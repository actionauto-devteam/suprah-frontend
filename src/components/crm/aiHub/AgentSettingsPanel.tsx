"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Loader2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api-client"
import type { CrmLeadGroup } from "@/hooks/useCrmLeadGroups"
import { HubCard } from "./ShadowStatusBadge"

export interface AgentSettingsValues {
  agentName: string
  fallbackGroupId: string
  followUpIntervalHours: number
}

const FOLLOW_UP_OPTIONS = [
  { value: 24, label: "Daily" },
  { value: 48, label: "Every other day" },
  { value: 72, label: "Every 3 days" },
]

export function normalizeFollowUpHours(value: unknown): number {
  return FOLLOW_UP_OPTIONS.some((option) => option.value === value) ? (value as number) : 24
}

export function AgentSettingsPanel({ getToken, isAdmin, ready, initial, groups, onSaved }: {
  getToken: () => Promise<string | null>
  isAdmin: boolean
  ready: boolean
  initial: AgentSettingsValues
  groups: CrmLeadGroup[]
  onSaved: (values: AgentSettingsValues) => void
}) {
  const [agentName, setAgentName] = React.useState(initial.agentName)
  const [fallbackGroupId, setFallbackGroupId] = React.useState(initial.fallbackGroupId)
  const [followUpIntervalHours, setFollowUpIntervalHours] = React.useState(initial.followUpIntervalHours)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setAgentName(initial.agentName)
    setFallbackGroupId(initial.fallbackGroupId)
    setFollowUpIntervalHours(initial.followUpIntervalHours)
  }, [ready, initial.agentName, initial.fallbackGroupId, initial.followUpIntervalHours])

  const activeGroups = groups.filter((group) => group.isActive)
  const unknownGroup = Boolean(fallbackGroupId) && !activeGroups.some((group) => group._id === fallbackGroupId)
  const dirty = agentName.trim() !== initial.agentName
    || fallbackGroupId !== initial.fallbackGroupId
    || followUpIntervalHours !== initial.followUpIntervalHours
  const disabled = !isAdmin || !ready || saving
  const displayName = agentName.trim() || "the agent"

  const save = async () => {
    if (!isAdmin || !ready) return
    setSaving(true)
    try {
      const token = await getToken()
      const name = agentName.trim() || "Alex"
      const intervalHours = normalizeFollowUpHours(followUpIntervalHours)
      await apiClient.patch(
        "/api/crm/org-settings",
        { aiAgentName: name, aiHandoffFallbackGroupId: fallbackGroupId, aiFollowUpIntervalHours: intervalHours },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setAgentName(name)
      setFollowUpIntervalHours(intervalHours)
      onSaved({ agentName: name, fallbackGroupId, followUpIntervalHours: intervalHours })
      toast.success("AI agent settings saved")
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error("Save failed", { description: message || "Could not save the AI agent settings. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <HubCard
      title="Agent settings"
      description="The agent's name, who it mentions on handoffs, and how often it follows up."
      icon={<Settings2 className="h-4 w-4 text-primary" />}
    >
      <div className="space-y-5">
        {!ready && (
          <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
            The current settings could not be loaded, so they cannot be changed right now. Refresh the page to try again.
          </p>
        )}
        {ready && !isAdmin && <p className="text-[11px] text-muted-foreground/70">You can view these settings. Only admins can change them.</p>}

        <div className="max-w-xl space-y-1.5">
          <label htmlFor="agent-settings-name" className="text-xs font-semibold">Agent name</label>
          <p className="text-[11px] text-muted-foreground/70">The name customers see on every reply it sends.</p>
          <Input
            id="agent-settings-name"
            disabled={disabled}
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
            maxLength={40}
            placeholder="AI Agent Name"
            className="max-w-xs"
          />
        </div>

        <div className="max-w-xl space-y-1.5">
          <label htmlFor="agent-settings-fallback" className="text-xs font-semibold">Fallback group for unassigned handoffs</label>
          <p className="text-[11px] text-muted-foreground/70">When {displayName} needs a human on a lead with no assigned rep, it mentions this group in its note. Leave unset to skip the mention.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              id="agent-settings-fallback"
              disabled={disabled}
              value={fallbackGroupId}
              onChange={(event) => setFallbackGroupId(event.target.value)}
              className="h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">No fallback group</option>
              {unknownGroup && <option value={fallbackGroupId}>Unavailable group (inactive or deleted)</option>}
              {activeGroups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
            </select>
            <Link href="/crm/settings/lead-groups" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Manage Lead Groups <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="max-w-xl space-y-1.5">
          <label htmlFor="agent-settings-followup" className="text-xs font-semibold">Follow-up frequency</label>
          <p className="text-[11px] text-muted-foreground/70">How often {displayName} checks in on a silent lead. It keeps going at this pace automatically, and stops on its own the moment the customer replies or opts out — no fixed limit on how many times.</p>
          <select
            id="agent-settings-followup"
            disabled={disabled}
            value={followUpIntervalHours}
            onChange={(event) => setFollowUpIntervalHours(parseInt(event.target.value, 10))}
            className="h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
          >
            {FOLLOW_UP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        {isAdmin && (
          <Button onClick={save} disabled={disabled || !dirty} className="h-9">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save agent settings"}
          </Button>
        )}
      </div>
    </HubCard>
  )
}
