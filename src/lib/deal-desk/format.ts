import type { DealStage } from './types';

export const STAGE_ORDER: DealStage[] = [
  'draft',
  'submitted',
  'picked_up',
  'processing',
  'needs_info',
  'structured',
  'ready_for_fi',
  'offered',
  'in_fi',
  'signed',
  'funded',
  'cancelled',
];

export const OPEN_STAGES: DealStage[] = ['submitted', 'picked_up', 'processing', 'needs_info', 'structured', 'ready_for_fi', 'offered', 'in_fi'];
export const CLOSED_STAGES: DealStage[] = ['signed', 'funded', 'cancelled'];

/** Main path shown in the progress stepper. */
export const STEPPER: { stage: DealStage; label: string }[] = [
  { stage: 'submitted', label: 'Submitted' },
  { stage: 'picked_up', label: 'Review' },
  { stage: 'structured', label: 'Structured' },
  { stage: 'ready_for_fi', label: 'Ready for F&I' },
  { stage: 'in_fi', label: 'In F&I' },
  { stage: 'signed', label: 'Signed' },
  { stage: 'funded', label: 'Funded' },
];

export const STAGE_META: Record<DealStage, { label: string; short: string; tone: string; dot: string }> = {
  draft: { label: 'Draft', short: 'Draft', tone: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  submitted: { label: 'Waiting pickup', short: 'Waiting', tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25', dot: 'bg-sky-500' },
  picked_up: { label: 'In review', short: 'Review', tone: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25', dot: 'bg-indigo-500' },
  processing: { label: 'AI processing', short: 'AI', tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25', dot: 'bg-violet-500' },
  needs_info: { label: 'Needs info', short: 'Needs info', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30', dot: 'bg-amber-500' },
  structured: { label: 'Structured', short: 'Structured', tone: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25', dot: 'bg-teal-500' },
  ready_for_fi: { label: 'Ready for F&I', short: 'Ready F&I', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500' },
  offered: { label: 'Offered to FM', short: 'Offered', tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30', dot: 'bg-orange-500' },
  in_fi: { label: 'In F&I', short: 'In F&I', tone: 'bg-green-600/10 text-green-700 dark:text-green-300 border-green-600/30', dot: 'bg-green-600' },
  signed: { label: 'Signed', short: 'Signed', tone: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-600/30', dot: 'bg-emerald-600' },
  funded: { label: 'Funded', short: 'Funded', tone: 'bg-emerald-700/15 text-emerald-900 dark:text-emerald-100 border-emerald-700/30', dot: 'bg-emerald-700' },
  cancelled: { label: 'Cancelled', short: 'Cancelled', tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25', dot: 'bg-rose-500' },
};

export const DOC_LABELS: Record<string, string> = {
  four_square: 'Four Square',
  credit_app: 'Credit application',
  drivers_license: 'Driver’s license',
  proof_income: 'Proof of income',
  proof_residence: 'Proof of residence',
  insurance: 'Insurance',
  trade_title: 'Trade title / payoff',
  other: 'Other',
};

export const money = (v?: number | null, cents = false) =>
  v == null || Number.isNaN(v)
    ? '—'
    : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 });

export const pct = (v?: number | null) => (v == null || Number.isNaN(v) ? '—' : `${v}%`);

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export function duration(ms?: number | null): string {
  if (ms == null || Number.isNaN(ms)) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function timeAgo(iso?: string | null, now = Date.now()): string {
  if (!iso) return '';
  const diff = now - new Date(iso).getTime();
  if (diff < 45_000) return 'just now';
  return `${duration(diff)} ago`;
}

export function shortTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export type SlaState = 'ok' | 'warn' | 'late' | 'none';

export function slaState(stage: string, enteredAt: string | undefined, sla: Record<string, number> | undefined, now: number): SlaState {
  const target = sla?.[stage];
  if (!target || !enteredAt) return 'none';
  const mins = (now - new Date(enteredAt).getTime()) / 60000;
  if (mins <= target) return 'ok';
  if (mins <= target * 2) return 'warn';
  return 'late';
}

export const SLA_TONE: Record<SlaState, string> = {
  ok: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  warn: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30',
  late: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30',
  none: 'text-muted-foreground bg-muted border-border',
};

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const toNum = (v: unknown): number | undefined => {
  if (v === '' || v == null) return undefined;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

/* Client mirror of the backend calc for live previews (server is the source of truth). */
export function estimate(input: { price?: number; docFee?: number; otherFees?: number; taxRate?: number; down?: number; tradeAllowance?: number; tradePayoff?: number; backend?: number; apr?: number; term?: number }) {
  const price = input.price || 0;
  const docFee = input.docFee || 0;
  const taxable = Math.max(0, price + docFee - (input.tradeAllowance || 0));
  const tax = Math.round(taxable * (input.taxRate || 0)) / 100;
  const netTrade = (input.tradeAllowance || 0) - (input.tradePayoff || 0);
  const amount = Math.max(0, price + docFee + (input.otherFees || 0) + tax + (input.backend || 0) - (input.down || 0) - netTrade);
  const r = (input.apr ?? 7.99) / 1200;
  const n = input.term || 72;
  const payment = amount <= 0 ? 0 : r === 0 ? amount / n : (amount * r) / (1 - Math.pow(1 + r, -n));
  return { tax, netTrade, amount: Math.round(amount * 100) / 100, payment: Math.round(payment * 100) / 100 };
}

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}
