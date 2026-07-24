/**
 * Suprah Pulse360 — shared frontend types and presentation tokens.
 *
 * The "p360" token set, sibling to sm5 (Suprah Mail) and ss4. Pulse360 uses a
 * violet spine so it never reads as "another emerald CRM panel", with a
 * severity ladder that runs sky → amber → orange → rose. Emerald is reserved
 * here for one thing only: a healthy score. That way green in this module
 * always means "nothing to do".
 */

export const P360 = {
  accent: '#8b5cf6',
  accentSoft: 'rgba(139, 92, 246, 0.12)',
  accentRing: 'rgba(139, 92, 246, 0.35)',
} as const;

export type PulsePriority =
  | 'information'
  | 'reminder'
  | 'warning'
  | 'critical'
  | 'deadline'
  | 'productivity'
  | 'attendance'
  | 'manager_request'
  | 'approval_required'
  | 'escalation';

export type PulseBand = 'excellent' | 'healthy' | 'watch' | 'at_risk' | 'critical';

export type PulseWorkState = 'working' | 'on_break' | 'idle' | 'off_shift' | 'absent';

export interface PulseAlert {
  _id: string;
  kind: string;
  priority: PulsePriority;
  severity: number;
  title: string;
  reason: string;
  recommendedAction: string;
  actionUrl?: string;
  actionLabel?: string;
  refType?: string;
  refId?: string;
  status: 'pending' | 'delivered' | 'acknowledged' | 'snoozed' | 'resolved' | 'expired';
  occurrences: number;
  firstFiredAt: string;
  lastFiredAt: string;
  snoozedUntil?: string;
  context: Record<string, unknown>;
  userId: string;
  department?: string;
}

export interface PulseComponents {
  attendance: number;
  taskCompletion: number;
  timeliness: number;
  engagement: number;
  responsiveness: number;
}

export interface PulseStats {
  openTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  completedInWindow: number;
  activeProjects: number;
  openAlerts: number;
  criticalAlerts: number;
  engagementPoints: number;
  minutesSinceMeaningfulWork: number | null;
  idleMinutesToday: number;
  shiftMinutesToday: number;
  daysAttendedInWindow: number;
  onTimeCompletionRate: number;
  medianFirstTouchHours: number | null;
}

export interface PulseHealth {
  userId: string;
  fullName: string;
  email: string;
  avatar?: string;
  department?: string;
  role?: string;
  score: number;
  band: PulseBand;
  delta: number;
  components: PulseComponents;
  stats: PulseStats;
  workState: PulseWorkState;
  isOnShift: boolean;
  shiftStartedAt?: string;
  lastSignalAt?: string;
  trend: Array<{ at: string; score: number }>;
  computedAt: string;
}

export interface PulseNextAction {
  taskId: string;
  title: string;
  projectName: string | null;
  dueAt: string | null;
  hoursUntilDue: number | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  urgency: number;
  url: string;
  why: string;
}

export interface PulseSignal {
  _id: string;
  type: string;
  module: string;
  title: string;
  description?: string;
  url?: string;
  weight: number;
  passive: boolean;
  occurredAt: string;
}

export interface PulseOverview {
  totals: {
    monitored: number;
    working: number;
    onBreak: number;
    idle: number;
    offShift: number;
    withOverdue: number;
    atRisk: number;
    openTasks: number;
    overdueTasks: number;
    dueSoonTasks: number;
    completedInWindow: number;
    averageScore: number;
  };
  departments: Array<{
    department: string;
    headcount: number;
    averageScore: number;
    band: PulseBand;
    overdueTasks: number;
    idle: number;
    working: number;
    atRisk: number;
  }>;
  alertsByPriority: Record<string, number>;
  openAlerts: number;
  bottlenecks: Array<{
    userId: string;
    fullName: string;
    avatar?: string;
    department?: string;
    score: number;
    band: PulseBand;
    workState: PulseWorkState;
    overdueTasks: number;
    openTasks: number;
    reason: string;
  }>;
  users: Array<{
    userId: string;
    fullName: string;
    email: string;
    avatar?: string;
    department?: string;
    role?: string;
    score: number;
    band: PulseBand;
    delta: number;
    workState: PulseWorkState;
    isOnShift: boolean;
    stats: PulseStats;
    components: PulseComponents;
    computedAt: string;
  }>;
  computedAt: string;
}

// ── Presentation ────────────────────────────────────────────────────────────

export interface PriorityMeta {
  label: string;
  /** Lucide icon name — resolved by the consuming component. */
  icon: string;
  dot: string;
  text: string;
  pill: string;
  ring: string;
  /** Accent bar down the left of the popup. */
  bar: string;
}

export const PRIORITY_META: Record<PulsePriority, PriorityMeta> = {
  information: {
    label: 'Information',
    icon: 'Info',
    dot: 'bg-sky-500',
    text: 'text-sky-500',
    pill: 'border-sky-500/25 bg-sky-500/10',
    ring: 'ring-sky-500/20',
    bar: 'bg-sky-500',
  },
  reminder: {
    label: 'Reminder',
    icon: 'Bell',
    dot: 'bg-violet-500',
    text: 'text-violet-500',
    pill: 'border-violet-500/25 bg-violet-500/10',
    ring: 'ring-violet-500/20',
    bar: 'bg-violet-500',
  },
  approval_required: {
    label: 'Approval required',
    icon: 'Stamp',
    dot: 'bg-cyan-500',
    text: 'text-cyan-500',
    pill: 'border-cyan-500/25 bg-cyan-500/10',
    ring: 'ring-cyan-500/20',
    bar: 'bg-cyan-500',
  },
  attendance: {
    label: 'Attendance',
    icon: 'Clock',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
    pill: 'border-amber-500/25 bg-amber-500/10',
    ring: 'ring-amber-500/20',
    bar: 'bg-amber-500',
  },
  productivity: {
    label: 'Productivity',
    icon: 'Activity',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
    pill: 'border-amber-500/25 bg-amber-500/10',
    ring: 'ring-amber-500/20',
    bar: 'bg-amber-500',
  },
  warning: {
    label: 'Warning',
    icon: 'AlertTriangle',
    dot: 'bg-orange-500',
    text: 'text-orange-500',
    pill: 'border-orange-500/25 bg-orange-500/10',
    ring: 'ring-orange-500/20',
    bar: 'bg-orange-500',
  },
  manager_request: {
    label: 'Manager request',
    icon: 'UserRoundSearch',
    dot: 'bg-fuchsia-500',
    text: 'text-fuchsia-500',
    pill: 'border-fuchsia-500/25 bg-fuchsia-500/10',
    ring: 'ring-fuchsia-500/20',
    bar: 'bg-fuchsia-500',
  },
  deadline: {
    label: 'Deadline',
    icon: 'CalendarClock',
    dot: 'bg-rose-500',
    text: 'text-rose-500',
    pill: 'border-rose-500/25 bg-rose-500/10',
    ring: 'ring-rose-500/20',
    bar: 'bg-rose-500',
  },
  critical: {
    label: 'Critical',
    icon: 'ShieldAlert',
    dot: 'bg-red-500',
    text: 'text-red-500',
    pill: 'border-red-500/25 bg-red-500/10',
    ring: 'ring-red-500/20',
    bar: 'bg-red-500',
  },
  escalation: {
    label: 'Escalation',
    icon: 'TrendingDown',
    dot: 'bg-red-600',
    text: 'text-red-600',
    pill: 'border-red-600/25 bg-red-600/10',
    ring: 'ring-red-600/20',
    bar: 'bg-red-600',
  },
};

export const BAND_META: Record<PulseBand, { label: string; text: string; pill: string; stroke: string }> = {
  excellent: {
    label: 'Excellent',
    text: 'text-emerald-500',
    pill: 'border-emerald-500/25 bg-emerald-500/10',
    stroke: 'stroke-emerald-500',
  },
  healthy: {
    label: 'Healthy',
    text: 'text-emerald-500',
    pill: 'border-emerald-500/25 bg-emerald-500/10',
    stroke: 'stroke-emerald-500',
  },
  watch: {
    label: 'Watch',
    text: 'text-amber-500',
    pill: 'border-amber-500/25 bg-amber-500/10',
    stroke: 'stroke-amber-500',
  },
  at_risk: {
    label: 'At risk',
    text: 'text-orange-500',
    pill: 'border-orange-500/25 bg-orange-500/10',
    stroke: 'stroke-orange-500',
  },
  critical: {
    label: 'Critical',
    text: 'text-red-500',
    pill: 'border-red-500/25 bg-red-500/10',
    stroke: 'stroke-red-500',
  },
};

export const WORK_STATE_META: Record<PulseWorkState, { label: string; dot: string; text: string }> = {
  working: { label: 'Working', dot: 'bg-emerald-500', text: 'text-emerald-500' },
  on_break: { label: 'On break', dot: 'bg-amber-500', text: 'text-amber-500' },
  idle: { label: 'Idle', dot: 'bg-orange-500', text: 'text-orange-500' },
  off_shift: { label: 'Off shift', dot: 'bg-zinc-400', text: 'text-zinc-500' },
  absent: { label: 'Absent', dot: 'bg-red-500', text: 'text-red-500' },
};

/** Component display order and labels, shared by the ring and the breakdown. */
export const COMPONENT_ORDER: Array<{ key: keyof PulseComponents; label: string; short: string }> = [
  { key: 'attendance', label: 'Attendance', short: 'ATT' },
  { key: 'taskCompletion', label: 'Task completion', short: 'TSK' },
  { key: 'timeliness', label: 'Timeliness', short: 'TIM' },
  { key: 'engagement', label: 'Engagement', short: 'ENG' },
  { key: 'responsiveness', label: 'Responsiveness', short: 'RSP' },
];

export function formatRelative(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatDueLabel(hours: number | null): string {
  if (hours === null) return 'No deadline';
  if (hours < 0) {
    const over = Math.round(-hours);
    return over >= 48 ? `${Math.round(over / 24)}d overdue` : `${over}h overdue`;
  }
  if (hours <= 1) return 'Due within the hour';
  if (hours <= 24) return `Due in ${Math.round(hours)}h`;
  return `Due in ${Math.round(hours / 24)}d`;
}
