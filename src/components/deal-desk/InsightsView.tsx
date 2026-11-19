'use client';

import * as React from 'react';
import { Clock, Gauge, RotateCw, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, Segmented, StatTile, Skeleton, ErrorBanner, Avatar, Pill } from './ui';
import { useMetrics } from '@/lib/deal-desk/hooks';
import { duration, cn } from '@/lib/deal-desk/format';
import type { QueueMetrics } from '@/lib/deal-desk/types';

/* Validated pair (dataviz validator, light + dark): emerald-600 / indigo-500. */
const SERIES = { submitted: '#059669', signed: '#6366f1' };

export function InsightsView() {
  const [range, setRange] = React.useState<'today' | '7d' | '30d' | '90d'>('7d');
  const { data, error, reload } = useMetrics(range);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: 'today', label: 'Today' },
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' },
          ]}
        />
        {data && <span className="font-mono text-[11px] text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>}
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!data ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-72 md:col-span-2" />
        </div>
      ) : (
        <>
          <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 xl:grid-cols-5">
            <StatTile label="First pickup" value={duration(data.timings.firstPickup.avgMs)} sub={`median ${duration(data.timings.firstPickup.medianMs)} · ${data.timings.firstPickup.count} deals`} icon={<Clock className="size-3.5" />} />
            <StatTile label="Submit → F&I" value={duration(data.timings.submitToFi.avgMs)} sub={`p90 ${duration(data.timings.submitToFi.p90Ms)}`} icon={<Gauge className="size-3.5" />} />
            <StatTile label="FM accept" value={duration(data.timings.fmAccept.avgMs)} sub={`${data.rotation.expired} expired · ${data.rotation.declined} passed`} icon={<RotateCw className="size-3.5" />} />
            <StatTile label="Time in F&I" value={duration(data.timings.timeInFi.avgMs)} sub={`${data.timings.timeInFi.count} finished`} icon={<Users className="size-3.5" />} />
            <StatTile label="Submit → signed" value={duration(data.timings.submitToSigned.avgMs)} sub={`${data.timings.submitToSigned.count} signed`} icon={<CheckCircle2 className="size-3.5" />} tone="good" />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader kicker="Where deals wait" title="Average time in each stage vs target" />
              <StageTimingChart data={data} />
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader kicker="Live" title="Queue right now" />
              <LiveQueue data={data} />
            </Card>
          </div>

          {range !== 'today' && (
            <Card>
              <CardHeader kicker="Volume" title="Deals submitted and signed per day" />
              <DailyChart data={data} />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader kicker="F&I rotation" title="Finance Managers" actions={<span className="text-xs text-muted-foreground">avg {data.rotation.avgRotationsPerDeal} passes per deal · {data.rotation.escalated} escalated</span>} />
              <PeopleTable
                rows={data.byFm.map((r) => ({ id: r.id, name: r.name, cells: [r.offers, `${r.acceptRate}%`, duration(r.avgAcceptMs), r.expired, r.signed] }))}
                headers={['Offers', 'Accept rate', 'Avg accept', 'Expired', 'Signed']}
                empty="No offers in this period"
              />
            </Card>
            <Card>
              <CardHeader kicker="Supra New Deal channel" title="Salespeople" />
              <PeopleTable
                rows={data.bySalesperson.map((r) => ({ id: r.id, name: r.name, cells: [r.submitted, duration(r.avgPickupMs), r.needsInfo, r.signed] }))}
                headers={['Submitted', 'Wait to pickup', 'Sent back', 'Signed']}
                empty="No submissions in this period"
              />
            </Card>
          </div>

          <Card>
            <CardHeader kicker="Sources" title="Where deals came from" />
            <SourceSplit data={data} />
          </Card>
        </>
      )}
    </div>
  );
}

function StageTimingChart({ data }: { data: QueueMetrics }) {
  const rows = data.timings.byStage.filter((r) => r.stage !== 'draft' && r.avgMs != null);
  const [hover, setHover] = React.useState<string | null>(null);
  if (!rows.length) return <div className="px-5 py-10 text-center text-sm text-muted-foreground">No finished stages in this period yet.</div>;
  const maxMs = Math.max(...rows.map((r) => Math.max(r.avgMs || 0, (r.target || 0) * 60000))) * 1.08;
  return (
    <div className="space-y-3 px-4 py-4 sm:px-5">
      {rows.map((r) => {
        const avg = r.avgMs || 0;
        const targetMs = (r.target || 0) * 60000;
        const over = targetMs > 0 && avg > targetMs;
        const late = targetMs > 0 && avg > targetMs * 2;
        return (
          <div key={r.stage} className="group relative" onMouseEnter={() => setHover(r.stage)} onMouseLeave={() => setHover(null)}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium">{r.label}</span>
              <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                {over && (
                  <span className={cn('inline-flex items-center gap-1 font-medium', late ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')}>
                    <AlertTriangle className="size-3" /> over target
                  </span>
                )}
                <span className="font-semibold text-foreground">{duration(avg)}</span>
                {r.target ? <span>/ {r.target}m</span> : null}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${(avg / maxMs) * 100}%`, background: late ? '#e11d48' : over ? '#d97706' : SERIES.submitted }}
              />
              {targetMs > 0 && <div className="absolute -inset-y-1 w-0.5 rounded bg-foreground/60" style={{ left: `${(targetMs / maxMs) * 100}%` }} title={`Target ${r.target} min`} />}
            </div>
            {hover === r.stage && (
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                <div className="font-semibold">{r.label}</div>
                <div className="text-muted-foreground">avg {duration(r.avgMs)} · median {duration(r.medianMs)} · p90 {duration(r.p90Ms)}</div>
                <div className="text-muted-foreground">{r.count} deals passed through</div>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full" style={{ background: SERIES.submitted }} />Average</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 rounded bg-foreground/60" />Target</span>
      </div>
    </div>
  );
}

function LiveQueue({ data }: { data: QueueMetrics }) {
  const max = Math.max(1, ...data.live.byStage.map((s) => s.count));
  return (
    <div className="space-y-2.5 px-4 py-4 sm:px-5">
      {data.live.byStage.map((s) => (
        <div key={s.stage} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-xs">
          <span className="truncate font-medium">{s.label}</span>
          <div className="flex h-5 overflow-hidden rounded-md bg-muted" title={`${s.ok} on time · ${s.warn} close · ${s.late} late`}>
            {s.count > 0 && (
              <>
                <div className="bg-emerald-500" style={{ width: `${(s.ok / max) * 100}%` }} />
                <div className="border-l-2 border-card bg-amber-500" style={{ width: `${(s.warn / max) * 100}%`, display: s.warn ? undefined : 'none' }} />
                <div className="border-l-2 border-card bg-rose-500" style={{ width: `${(s.late / max) * 100}%`, display: s.late ? undefined : 'none' }} />
              </>
            )}
          </div>
          <span className="w-16 text-right tabular-nums">
            <b>{s.count}</b>
            {s.late > 0 && <span className="ml-1 text-rose-600 dark:text-rose-400">· {s.late} late</span>}
          </span>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-emerald-500" />On time</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-amber-500" />Close to target</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-rose-500" />Over 2× target</span>
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: QueueMetrics }) {
  const days = data.daily;
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => Math.max(d.submitted, d.signed)));
  const ticks = [0, Math.ceil(max / 2), max];
  const H = 180;
  const step = days.length > 45 ? 7 : days.length > 14 ? 3 : 1;
  return (
    <div className="px-4 pb-4 pt-3 sm:px-5">
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: SERIES.submitted }} />Submitted</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: SERIES.signed }} />Signed</span>
      </div>
      <div className="relative flex gap-2">
        <div className="flex flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-muted-foreground" style={{ height: H + 20 }}>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="relative flex-1 overflow-x-auto">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" style={{ height: H }} />
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border" style={{ top: H / 2 }} />
          <div className="flex items-end gap-[3px]" style={{ height: H, minWidth: days.length * 14 }}>
            {days.map((d, i) => (
              <div key={d.date} className="relative flex h-full flex-1 items-end justify-center gap-[2px]" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <div className={cn('w-full max-w-3 rounded-t-[4px] transition-opacity', hover != null && hover !== i && 'opacity-40')} style={{ height: `${(d.submitted / max) * 100}%`, background: SERIES.submitted, minHeight: d.submitted ? 2 : 0 }} />
                <div className={cn('w-full max-w-3 rounded-t-[4px] transition-opacity', hover != null && hover !== i && 'opacity-40')} style={{ height: `${(d.signed / max) * 100}%`, background: SERIES.signed, minHeight: d.signed ? 2 : 0 }} />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold">{new Date(d.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: SERIES.submitted }} />Submitted <b className="ml-auto pl-3">{d.submitted}</b></div>
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: SERIES.signed }} />Signed <b className="ml-auto pl-3">{d.signed}</b></div>
                    <div className="text-muted-foreground">Funded {d.funded}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-[3px] text-[10px] text-muted-foreground" style={{ minWidth: days.length * 14 }}>
            {days.map((d, i) => (
              <span key={d.date} className="flex-1 text-center">
                {i % step === 0 ? new Date(d.date + 'T12:00:00').toLocaleDateString([], { month: 'numeric', day: 'numeric' }) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PeopleTable({ headers, rows, empty }: { headers: string[]; rows: { id: string; name: string; cells: React.ReactNode[] }[]; empty: string }) {
  if (!rows.length) return <div className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <th className="px-4 py-2 font-medium sm:px-5">Name</th>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2.5 sm:px-5">
                <span className="flex items-center gap-2">
                  <Avatar name={r.name} size="xs" />
                  <span className="truncate font-medium">{r.name || '—'}</span>
                </span>
              </td>
              {r.cells.map((c, i) => (
                <td key={i} className="px-3 py-2.5 text-right tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceSplit({ data }: { data: QueueMetrics }) {
  const items = [
    { key: 'supra', label: 'Supra New Deal', color: '#059669' },
    { key: 'web', label: 'Website widget', color: '#6366f1' },
    { key: 'crm', label: 'CRM', color: '#64748b' },
  ];
  const total = items.reduce((s, i) => s + (data.bySource[i.key] || 0), 0);
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          items.map((i, idx) => {
            const v = data.bySource[i.key] || 0;
            return v ? <div key={i.key} title={`${i.label}: ${v}`} style={{ width: `${(v / total) * 100}%`, background: i.color }} className={cn(idx > 0 && 'border-l-2 border-card')} /> : null;
          })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {items.map((i) => (
          <span key={i.key} className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
            {i.label}
            <b className="tabular-nums">{data.bySource[i.key] || 0}</b>
            {total > 0 && <Pill className="border-border text-muted-foreground">{Math.round(((data.bySource[i.key] || 0) / total) * 100)}%</Pill>}
          </span>
        ))}
      </div>
    </div>
  );
}
