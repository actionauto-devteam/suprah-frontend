"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Loader2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api-client"
import type { CrmLeadGroup } from "@/hooks/useCrmLeadGroups"
import { refreshAiAgentIdentity } from "@/hooks/useAiAgentIdentity"
import { AI_AGENT_NAME_MAX_LENGTH, cleanAiAgentName, isValidAiAgentName } from "@/lib/aiAgentIdentity"
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
  const queryClient = useQueryClient()

  React.useEffect(() => {
    setAgentName(initial.agentName)
    setFallbackGroupId(initial.fallbackGroupId)
    setFollowUpIntervalHours(initial.followUpIntervalHours)
  }, [ready, initial.agentName, initial.fallbackGroupId, initial.followUpIntervalHours])

  const activeGroups = groups.filter((group) => group.isActive)
  const unknownGroup = Boolean(fallbackGroupId) && !activeGroups.some((group) => group._id === fallbackGroupId)
  const cleanedName = cleanAiAgentName(agentName)
  const nameInvalid = Boolean(cleanedName) && !isValidAiAgentName(cleanedName)
  const dirty = cleanedName !== initial.agentName
    || fallbackGroupId !== initial.fallbackGroupId
    || followUpIntervalHours !== initial.followUpIntervalHours
  const disabled = !isAdmin || !ready || saving
  const displayName = cleanedName && !nameInvalid ? cleanedName : "the AI Agent"

  const save = async () => {
    if (!isAdmin || !ready) return
    if (nameInvalid) {
      toast.error("Save failed", { description: "The AI Agent name needs at least one letter." })
      return
    }
    setSaving(true)
    try {
      const token = await getToken()
      const name = cleanedName
      const intervalHours = normalizeFollowUpHours(followUpIntervalHours)
      await apiClient.patch(
        "/api/crm/org-settings",
        { aiAgentName: name, aiHandoffFallbackGroupId: fallbackGroupId, aiFollowUpIntervalHours: intervalHours },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setAgentName(name)
      setFollowUpIntervalHours(intervalHours)
      onSaved({ agentName: name, fallbackGroupId, followUpIntervalHours: intervalHours })
      void refreshAiAgentIdentity(queryClient)
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
          <p className="text-[11px] text-muted-foreground/70">Required for every AI feature. Customers see this name on AI replies, and your team sees it on drafts and labels.</p>
          <Input
            id="agent-settings-name"
            disabled={disabled}
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
            maxLength={AI_AGENT_NAME_MAX_LENGTH}
            placeholder="Enter a name"
            aria-invalid={nameInvalid || undefined}
            aria-describedby="agent-settings-name-hint"
            className="max-w-xs"
          />
          {nameInvalid ? (
            <p id="agent-settings-name-hint" role="alert" className="text-[11px] text-red-600 dark:text-red-400">Use at least one letter in the name.</p>
          ) : !cleanedName ? (
            <p id="agent-settings-name-hint" role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              No name set. AI replies, introductions, follow-ups, and drafts stay off until you save a name. Manual sending still works.
            </p>
          ) : (
            <p id="agent-settings-name-hint" className="text-[11px] text-muted-foreground/70">Saving a name does not turn AI on. Each channel still follows its operating mode above.</p>
          )}
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
          <Button onClick={save} disabled={disabled || !dirty || nameInvalid} className="h-9">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save agent settings"}
          </Button>
        )}
      </div>
    </HubCard>
  )
}
