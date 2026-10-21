"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, Bot, ChevronRight, FileText, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AI_CHANNELS,
  AI_CHANNEL_LABELS,
  AI_MODE_LABELS,
  type AiMode,
  type AiModesPayload,
} from "@/lib/aiOperatingModes"
import { useShadowDraftList } from "@/hooks/useAiShadowDrafts"
import { HubCard, HubState } from "./ShadowStatusBadge"
import { ShadowDraftRow } from "./ShadowDraftsPanel"
import { ShadowTrainingToggle } from "./ShadowTrainingToggle"

export interface AiAgentSettingsSummary {
  agentName: string
  fallbackGroupName?: string
  followUpIntervalHours?: number
}

const MODE_PILL: Record<AiMode, string> = {
  off: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  training: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  testing: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  live: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
}

const FOLLOW_UP_LABELS: Record<number, string> = { 24: "Daily", 48: "Every other day", 72: "Every 3 days" }

export const RELATED_TOOLS = [
  { href: "/crm/settings/integrations", label: "Lead Integrations", description: "Lead sources, Gmail, website chat, and review requests." },
  { href: "/crm/vehicle-reengagement", label: "Vehicle Re-engagement", description: "Texts to past leads when a matching vehicle arrives." },
  { href: "/crm/ai-tasks", label: "AI Tasks", description: "Handoffs where Alex asked a person to step in." },
  { href: "/crm/campaigns", label: "Campaigns", description: "SMS and email campaigns to selected leads." },
  { href: "/crm/price-drop-emails", label: "Price Drop Emails", description: "Automatic emails when a vehicle a lead asked about gets cheaper." },
]

export function AiHubOverview({ data, settings, isAdmin, getToken, onModesChange, onOpenDraft, onShowDrafts }: {
  data: AiModesPayload
  settings: AiAgentSettingsSummary
  isAdmin: boolean
  getToken: () => Promise<string | null>
  onModesChange: (data: AiModesPayload) => void
  onOpenDraft: (id: string) => void
  onShowDrafts: () => void
}) {
  const recent = useShadowDraftList(getToken, { limit: 5 })
  const shadow = data.shadowDrafts

  return (
    <div className="space-y-4">
      <HubCard title={`${settings.agentName} status`} description="How the AI agent is set up for each channel right now." icon={<Bot className="h-4 w-4 text-primary" />}>
        <div className="space-y-4">
          {!data.masterSwitchOn && (
            <div role="status" className="flex items-start gap-2 rounded-lg border border-slate-300/60 bg-slate-500/5 p-3 text-[11px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              AI is switched off for this whole server, so every channel is off no matter what is selected.
            </div>
          )}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {AI_CHANNELS.map((channel) => {
              const mode = data.effective[channel]
              return (
                <li key={channel} className="flex items-center justify-between gap-2 rounded-xl border border-border/40 p-3">
                  <span className="text-xs font-semibold">{AI_CHANNEL_LABELS[channel]}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", MODE_PILL[mode])}>{AI_MODE_LABELS[mode]}</span>
                </li>
              )
            })}
          </ul>
          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Agent name</dt>
              <dd className="mt-0.5">{settings.agentName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Handoff group</dt>
              <dd className="mt-0.5">{settings.fallbackGroupName || "None"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Follow-up pace</dt>
              <dd className="mt-0.5">{settings.followUpIntervalHours ? FOLLOW_UP_LABELS[settings.followUpIntervalHours] || `Every ${settings.followUpIntervalHours} hours` : "—"}</dd>
            </div>
          </dl>
          <Link href="/crm/settings/ai-agent?tab=modes" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Change these in Modes &amp; Settings <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </HubCard>

      {shadow && (
        <HubCard
          title="Shadow Training"
          description={`Today: ${shadow.usedToday} of ${shadow.dailyLimit} draft attempts (resets at midnight ${shadow.timezone}).`}
          icon={<FileText className="h-4 w-4 text-primary" />}
        >
          <div className="space-y-5">
            <ShadowTrainingToggle data={data} isAdmin={isAdmin} getToken={getToken} onSaved={onModesChange} />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">Latest drafts</p>
                <button type="button" onClick={onShowDrafts} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  View all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <HubState
                loading={recent.loading}
                error={recent.error}
                onRetry={recent.reload}
                empty={recent.data && !recent.data.drafts.length ? "No shadow drafts yet." : false}
              >
                <ul aria-label="Latest shadow drafts" className="space-y-2">
                  {recent.data?.drafts.map((draft) => <ShadowDraftRow key={draft.id} draft={draft} onOpen={onOpenDraft} />)}
                </ul>
              </HubState>
            </div>
          </div>
        </HubCard>
      )}

      <HubCard title="Related tools" description="Existing automation pages. They stay where they are." icon={<Wrench className="h-4 w-4 text-primary" />}>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RELATED_TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link href={tool.href} className="flex h-full items-start justify-between gap-2 rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/40">
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{tool.label}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{tool.description}</span>
                </span>
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              </Link>
            </li>
          ))}
        </ul>
      </HubCard>
    </div>
  )
}
