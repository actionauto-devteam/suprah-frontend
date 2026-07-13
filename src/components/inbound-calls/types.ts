
export type AgentStatus = "available" | "on-call" | "break" | "offline"
export type BreakReason = "lunch" | "short-break" | "meeting" | "training"
export type CallDirection = "inbound" | "outbound"

export interface AgentInfo {
  name: string
  employeeId: string
  avatar?: string
  status: AgentStatus
  breakReason?: BreakReason
  liveAt?: string
}

export interface InboundCall {
  id: string
  callerNumber: string
  callerName?: string
  status: "ringing" | "connected" | "on-hold" | "ended"
  startedAt: string
  answeredAt?: string
  endedAt?: string
  duration?: number
  isRecording?: boolean
  isMuted?: boolean
  leadId?: string
  notes?: string
}

export interface OutboundCall {
  id: string
  dialedNumber: string
  contactName?: string
  status: "dialing" | "ringing" | "connected" | "on-hold" | "ended" | "failed" | "no-answer"
  startedAt: string
  answeredAt?: string
  endedAt?: string
  duration?: number
  isRecording?: boolean
  isMuted?: boolean
  notes?: string
}

export interface QueuedCall {
  id: string
  callerNumber: string
  callerName?: string
  waitingSince: string
  estimatedWait?: number
  priority: "normal" | "high" | "vip"
}

export interface CallLogEntry {
  id: string
  callerNumber: string
  callerName?: string
  direction: CallDirection
  status: "answered" | "missed" | "voicemail" | "no-answer" | "failed"
  startedAt: string
  duration: number
  notes?: string
}

export interface CustomerRecord {
  id: string
  name: string
  email?: string
  phone: string
  accountStatus: "active" | "inactive" | "new"
  recentTransactions?: { date: string; description: string; amount: string }[]
  previousCalls?: { date: string; duration: number; notes?: string }[]
  internalNotes?: string
}

export interface RecentContact {
  name: string
  number: string
  lastCalled?: string
}

export const agentStatusConfig: Record<
  AgentStatus,
  { label: string; color: string; dot: string; bg: string; border: string }
> = {
  available: {
    label: "Available",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  "on-call": {
    label: "On Call",
    color: "text-amber-400",
    dot: "bg-amber-400 animate-pulse",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  break: {
    label: "On Break",
    color: "text-sky-400",
    dot: "bg-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
  },
  offline: {
    label: "Offline",
    color: "text-zinc-500",
    dot: "bg-zinc-600",
    bg: "bg-zinc-800/50",
    border: "border-zinc-700/50",
  },
}

export const breakReasonLabels: Record<BreakReason, string> = {
  lunch: "Lunch Break",
  "short-break": "Short Break",
  meeting: "In a Meeting",
  training: "Training",
}