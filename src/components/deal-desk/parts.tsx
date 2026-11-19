'use client';

import * as React from 'react';
import Link from 'next/link';
import { Globe, MessageSquareText, LayoutGrid, Timer, AlertTriangle, ShieldAlert, FileText, RotateCw, Flame } from 'lucide-react';
import { Pill, Avatar } from './ui';
import { useNow } from '@/lib/deal-desk/hooks';
import { STAGE_META, SLA_TONE, slaState, clock, money, cn } from '@/lib/deal-desk/format';
import type { DealStage, DealSummary, DealSource } from '@/lib/deal-desk/types';

export function StageBadge({ stage, className }: { stage: DealStage; className?: string }) {
  const m = STAGE_META[stage];
  return (
    <Pill className={cn(m.tone, className)}>
      <span className={cn('size-1.5 rounded-full', m.dot, stage === 'processing' && 'animate-pulse')} />
      {m.label}
    </Pill>
  );
}

export function SourceBadge({ source, compact }: { source: DealSource; compact?: boolean }) {
  const map = {
    supra: { icon: MessageSquareText, label: 'Supra', cls: 'text-primary' },
    web: { icon: Globe, label: 'Website', cls: 'text-sky-600 dark:text-sky-400' },
    crm: { icon: LayoutGrid, label: 'CRM', cls: 'text-violet-600 dark:text-violet-400' },
  }[source];
  const Icon = map.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', map.cls)} title={`Source: ${map.label}`}>
      <Icon className="size-3.5" />
      {!compact && map.label}
    </span>
  );
}

/** Live "age in stage" chip, colored by the stage target (green → amber → red). */
export function SlaTimer({ stage, enteredAt, sla, className, showTarget }: { stage: DealStage; enteredAt?: string; sla?: Record<string, number>; className?: string; showTarget?: boolean }) {
  const now = useNow();
  if (!enteredAt) return null;
  const state = slaState(stage, enteredAt, sla, now);
  const ms = now - new Date(enteredAt).getTime();
  return (
    <Pill className={cn('font-mono tabular-nums', SLA_TONE[state], className)} title={sla?.[stage] ? `Target ${sla[stage]} min in this stage` : undefined}>
      {state === 'late' ? <Flame className="size-3" /> : <Timer className="size-3" />}
      {clock(ms)}
      {showTarget && sla?.[stage] ? <span className="opacity-60">/ {sla[stage]}m</span> : null}
    </Pill>
  );
}

/** Finance Manager offer countdown (5:00 → 0:00). */
export function OfferCountdown({ expiresAt, offeredAt, className, big }: { expiresAt?: string; offeredAt?: string; className?: string; big?: boolean }) {
  const now = useNow();
  if (!expiresAt) return null;
  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const total = offeredAt ? new Date(expiresAt).getTime() - new Date(offeredAt).getTime() : 300000;
  const pctLeft = Math.max(0, Math.min(1, left / total));
  const tone = pctLeft > 0.4 ? 'emerald' : pctLeft > 0.15 ? 'amber' : 'rose';
  if (big) {
    const r = 46;
    const c = 2 * Math.PI * r;
    return (
      <div className={cn('relative grid size-32 place-items-center', className)}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r={r} className="fill-none stroke-muted" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r={r}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pctLeft)}
            className={cn('fill-none transition-[stroke-dashoffset] duration-1000 ease-linear', tone === 'emerald' ? 'stroke-emerald-500' : tone === 'amber' ? 'stroke-amber-500' : 'stroke-rose-500')}
          />
        </svg>
        <div className="text-center">
          <div className="font-mono text-3xl font-bold tabular-nums">{clock(left)}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">to accept</div>
        </div>
      </div>
    );
  }
  return (
    <Pill
      className={cn(
        'font-mono tabular-nums',
        tone === 'emerald' ? SLA_TONE.ok : tone === 'amber' ? SLA_TONE.warn : SLA_TONE.late,
        className,
      )}
    >
      <RotateCw className={cn('size-3', left > 0 && 'animate-spin [animation-duration:3s]')} />
      {clock(left)}
    </Pill>
  );
}

export function ReadinessRing({ value, size = 44 }: { value?: number; size?: number }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const r = 16;
  const c = 2 * Math.PI * r;
  const tone = value >= 80 ? 'stroke-emerald-500' : value >= 55 ? 'stroke-amber-500' : 'stroke-rose-500';
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} title={`Readiness ${value}/100`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} className="fill-none stroke-muted" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className={cn('fill-none', tone)} />
      </svg>
      <span className="text-[11px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

/** Horizontal gauge with a limit marker (LTV / DTI / PTI). */
export function RatioGauge({ label, value, warnAt, badAt, max, hint }: { label: string; value?: number; warnAt: number; badAt: number; max: number; hint?: string }) {
  const v = value ?? 0;
  const pos = Math.min(100, (v / max) * 100);
  const tone = value == null ? 'bg-muted-foreground/30' : v >= badAt ? 'bg-rose-500' : v >= warnAt ? 'bg-amber-500' : 'bg-emerald-500';
  const text = value == null ? 'text-muted-foreground' : v >= badAt ? 'text-rose-600 dark:text-rose-400' : v >= warnAt ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className={cn('text-xl font-bold tabular-nums', text)}>{value == null ? '—' : `${value}%`}</span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-700', tone)} style={{ width: `${pos}%` }} />
        <div className="absolute inset-y-0 w-px bg-amber-500/70" style={{ left: `${(warnAt / max) * 100}%` }} />
        <div className="absolute inset-y-0 w-px bg-rose-500/70" style={{ left: `${(badAt / max) * 100}%` }} />
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function FitPill({ fit }: { fit: string }) {
  const map: Record<string, string> = {
    strong: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    good: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    stretch: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    fail: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  };
  const label: Record<string, string> = { strong: 'Strong fit', good: 'Good fit', stretch: 'Stretch', fail: 'Doesn’t fit' };
  return <Pill className={map[fit]}>{label[fit] || fit}</Pill>;
}

/** Card used on the board and in mobile lists. */
export function DealCard({ deal, sla, flashAt, meId, compact }: { deal: DealSummary; sla?: Record<string, number>; flashAt?: number; meId?: string; compact?: boolean }) {
  const now = useNow();
  const flashing = !!flashAt && now - flashAt < 2500;
  const state = slaState(deal.stage, deal.stageEnteredAt, sla, now);
  const offeredToMe = deal.stage === 'offered' && deal.offer?.fmId === meId;
  return (
    <Link
      href={`/crm/deal-desk/${deal.id}`}
      className={cn(
        'group relative block rounded-xl border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
        state === 'late' ? 'border-rose-500/40' : 'border-border',
        offeredToMe && 'border-orange-500/60 ring-2 ring-orange-500/30',
        flashing && 'ring-2 ring-primary/50',
      )}
    >
      {state === 'late' && <span aria-hidden className="absolute -inset-px -z-10 rounded-xl bg-rose-500/10 blur-sm" />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold text-muted-foreground">#{deal.dealNumber}</span>
            <SourceBadge source={deal.source} compact />
            {deal.escalated && <ShieldAlert className="size-3.5 text-rose-500" aria-label="Escalated" />}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold group-hover:text-primary">{deal.customerName}</div>
          <div className="truncate text-xs text-muted-foreground">{deal.vehicleLabel || 'Vehicle not set'}</div>
        </div>
        {deal.readiness != null && <ReadinessRing value={deal.readiness} size={36} />}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {deal.stage === 'offered' ? (
          <OfferCountdown expiresAt={deal.offer?.expiresAt} offeredAt={deal.offer?.offeredAt} />
        ) : (
          <SlaTimer stage={deal.stage} enteredAt={deal.stageEnteredAt} sla={sla} />
        )}
        {compact && <StageBadge stage={deal.stage} />}
        {deal.blockingFlags > 0 && (
          <Pill className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="size-3" />
            {deal.blockingFlags}
          </Pill>
        )}
        {deal.amountFinanced != null && <span className="ml-auto text-xs font-semibold tabular-nums">{money(deal.amountFinanced)}</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-dashed border-border pt-2">
        <div className="flex items-center -space-x-1.5">
          {deal.salesperson && <Avatar name={deal.salesperson.name} size="xs" ring="ring-2 ring-card" />}
          {deal.reviewer && <Avatar name={deal.reviewer.name} size="xs" ring="ring-2 ring-card" />}
          {deal.financeManager && <Avatar name={deal.financeManager.name} size="xs" ring="ring-2 ring-card" />}
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          {deal.stage === 'offered' && deal.offer?.fmName && <span className="truncate">→ {offeredToMe ? 'You' : deal.offer.fmName}</span>}
          {deal.bestLender && deal.stage !== 'offered' && <span className="truncate">{deal.bestLender.name}</span>}
          <span className="inline-flex items-center gap-0.5">
            <FileText className="size-3" />
            {deal.docCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
