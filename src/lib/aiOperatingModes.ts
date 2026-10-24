export const AI_CHANNELS = ["sms", "email", "webchat"] as const
export type AiChannel = (typeof AI_CHANNELS)[number]

export const AI_SELECTABLE_MODES = ["off", "training", "live"] as const
export type AiMode = "off" | "training" | "testing" | "live"
export type AiModeSource = "configured" | "legacy"

export interface AiModeChange {
  id: string
  channel: AiChannel
  fromMode: AiMode
  toMode: AiMode
  fromSource: AiModeSource | "disabled"
  reason: string
  changedByName: string
  createdAt: string
}

export interface ShadowDraftToggleChange {
  id: string
  fromMode: string
  toMode: string
  reason: string
  changedByName: string
  createdAt: string
}

export interface ShadowDraftsInfo {
  globalEnabled: boolean
  orgEnabled: boolean
  activeChannels: AiChannel[]
  usedToday: number
  dailyLimit: number
  timezone: string
  recentChanges: ShadowDraftToggleChange[]
}

export interface AiModesPayload {
  modes: Record<AiChannel, AiMode>
  effective: Record<AiChannel, AiMode>
  source: AiModeSource
  masterSwitchOn: boolean
  configuredAt: string | null
  usageToday: Record<string, number>
  canEdit: boolean
  recentChanges: AiModeChange[]
  shadowDrafts?: ShadowDraftsInfo
}

export const AI_LIVE_CONFIRMATION_PHRASE = "ENABLE LIVE"

export const AI_CHANNEL_LABELS: Record<AiChannel, string> = {
  sms: "Text messages",
  email: "Email replies",
  webchat: "Website chat",
}

export const AI_MODE_LABELS: Record<AiMode, string> = {
  off: "Off",
  training: "Training",
  testing: "Testing",
  live: "Live",
}

export function describeAiMode(mode: AiMode, agentName = "AI Agent"): string {
  if (mode === "live") return `${agentName} replies to customers automatically.`
  if (mode === "training" || mode === "testing") return `${agentName} does not send anything to customers. Your team handles every reply.`
  return `${agentName} is turned off for this channel.`
}

export function aiModeIndicatorLabel(mode: AiMode, agentName = "AI"): string {
  if (mode === "training" || mode === "testing") return `${agentName}: Training — not sending`
  if (mode === "off") return `${agentName}: Off — not sending`
  return `${agentName} live`
}
