'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, LayoutGrid, List, Settings2, BarChart3, Inbox, Wifi, WifiOff, Power } from 'lucide-react';
import { Button, Card, Input, Segmented, Select, StatTile, PageHeader, EmptyState, ErrorBanner, Skeleton, Avatar, LiveDot, Pill } from './ui';
import { DealCard, StageBadge, SlaTimer, OfferCountdown, SourceBadge, ReadinessRing } from './parts';
import { InsightsView } from './InsightsView';
import { useDeals, useMetrics, usePresence, useSocketConnected, useNow, toast, loadBootstrap } from '@/lib/deal-desk/hooks';
import { dealDeskApi } from '@/lib/deal-desk/api';
import { OPEN_STAGES, STAGE_META, duration, money, cn, slaState } from '@/lib/deal-desk/format';
import type { DealScope, DealSummary, DealStage } from '@/lib/deal-desk/types';

type View = 'board' | 'list';
type Tab = 'queue' | 'insights';

export function QueueView() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'queue';
  const [scope, setScope] = React.useState<DealScope>((params.get('scope') as DealScope) || 'open');
  const [view, setView] = React.useState<View>('board');
  const [q, setQ] = React.useState('');
  const [source, setSource] = React.useState('');
  const connected = useSocketConnected();

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('dealdesk:view');
      if (saved === 'list' || saved === 'board') setView(saved);
      else if (window.matchMedia('(max-width: 767px)').matches) setView('list');
    } catch {
      /* storage unavailable */
    }
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('dealdesk:view', v);
    } catch {
      /* ignore */
    }
  };

  const { deals, loading, error, reload, flash, boot } = useDeals({ scope, q, source });
  const roles = boot?.roles;
  const sla = boot?.settings.sla;
  const { data: metrics } = useMetrics('today', !!boot);
  const presence = usePresence(!!roles?.isStaff);

  // default the first-time view to the most useful scope for the person
  const defaulted = React.useRef(false);
  React.useEffect(() => {
    if (!boot || defaulted.current || params.get('scope')) return;
    defaulted.current = true;
    if (!boot.roles.isStaff) setScope('mine');
  }, [boot, params]);

  const setTab = (t: Tab) => {
    const sp = new URLSearchParams(params.toString());
    if (t === 'queue') sp.delete('tab');
    else sp.set('tab', t);
    router.replace(`/crm/deal-desk${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
  };

  const scopeOptions: { value: DealScope; label: string }[] = roles?.isStaff
    ? [
        { value: 'needs_me', label: 'Needs me' },
        { value: 'open', label: 'All open' },
        { value: 'mine', label: 'My deals' },
        { value: 'drafts', label: 'Drafts' },
        { value: 'closed', label: 'Closed' },
      ]
    : [
        { value: 'mine', label: 'My deals' },
        { value: 'needs_me', label: 'Needs me' },
        { value: 'drafts', label: 'Drafts' },
        { value: 'closed', label: 'Closed' },
      ];

  const showBoard = view === 'board' && (scope === 'open' || scope === 'needs_me' || scope === 'mine');

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pb-24 sm:px-6">
      <PageHeader
        kicker="Deal Desk // AI Deal Builder"
        title={
          <span className="flex items-center gap-3">
            Deal Queue
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium', connected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground')}>
              {connected ? <LiveDot className="text-emerald-500" /> : <WifiOff className="size-3" />}
              {connected ? 'Live' : 'Reconnecting'}
            </span>
          </span>
        }
        subtitle="Every deal from Supra, the website and the CRM in one queue — timed at every handoff from submit to signed."
        actions={
          <>
            {roles?.isFm && <AvailabilityToggle />}
            {roles?.isStaff && (
              <Link href="/crm/deal-desk/settings">
                <Button variant="outline" icon={<Settings2 className="size-4" />}>
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
            )}
            <Link href="/crm/deal-desk/new">
              <Button icon={<Plus className="size-4" />}>New deal</Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'queue', label: <span className="flex items-center gap-1.5"><Inbox className="size-3.5" />Queue</span> },
            { value: 'insights', label: <span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" />Insights</span> },
          ]}
        />
      </div>

      {tab === 'insights' ? (
        <InsightsView />
      ) : (
        <>
          <KpiStrip metrics={metrics} />
          {roles?.isStaff && presence.length > 0 && <PresenceBar presence={presence} />}

          <div className="sticky top-0 z-20 -mx-3 mb-4 flex flex-col gap-2 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:flex-row md:items-center">
            <Segmented value={scope} onChange={setScope} options={scopeOptions} />
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, VIN, #deal" className="h-9 pl-9" />
              </div>
              <Select value={source} onChange={(e) => setSource(e.target.value)} className="h-9 w-32 shrink-0">
                <option value="">All sources</option>
                <option value="supra">Supra</option>
                <option value="web">Website</option>
                <option value="crm">CRM</option>
              </Select>
              <div className="ml-auto hidden items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5 sm:flex">
                <button onClick={() => changeView('board')} className={cn('rounded-md p-1.5', view === 'board' ? 'bg-background shadow-sm' : 'text-muted-foreground')} aria-label="Board view">
                  <LayoutGrid className="size-4" />
                </button>
                <button onClick={() => changeView('list')} className={cn('rounded-md p-1.5', view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground')} aria-label="List view">
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} onRetry={() => reload()} />}

          {loading && !deals.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : !deals.length ? (
            <Card>
              <EmptyState
                icon={<Inbox className="size-5" />}
                title={scope === 'needs_me' ? 'Nothing needs you right now' : 'No deals here yet'}
                body={scope === 'needs_me' ? 'New deals, offers and requests for info will show up here the moment they happen.' : 'Start a deal from the Supra New Deal channel and it lands in this queue.'}
                action={
                  <Link href="/crm/deal-desk/new">
                    <Button icon={<Plus className="size-4" />}>New deal</Button>
                  </Link>
                }
              />
            </Card>
          ) : showBoard ? (
            <Board deals={deals} sla={sla} flash={flash} meId={boot?.actor.id} />
          ) : (
            <DealList deals={deals} sla={sla} flash={flash} meId={boot?.actor.id} />
          )}
        </>
      )}
    </div>
  );
}

function AvailabilityToggle() {
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    loadBootstrap().then((b) => setAvailable(!!b.myPresence?.available)).catch(() => {});
  }, []);
  if (available == null) return null;
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await dealDeskApi.setAvailability(!available);
          setAvailable(r.available);
          toast({ title: r.available ? 'You’re in the F&I rotation' : 'You’re off the rotation', tone: r.available ? 'success' : 'default' });
          loadBootstrap(true).catch(() => {});
        } catch (e: any) {
          toast({ title: 'Couldn’t change availability', body: e.message, tone: 'error' });
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all',
        available ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 shadow-[0_0_18px_-6px] shadow-emerald-500/60 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground',
      )}
    >
      {available ? <LiveDot className="text-emerald-500" /> : <Power className="size-3.5" />}
      {available ? 'Available for F&I' : 'Off rotation'}
    </button>
  );
}

function KpiStrip({ metrics }: { metrics: ReturnType<typeof useMetrics>['data'] }) {
  const waiting = metrics?.live.byStage.find((s) => s.stage === 'submitted');
  const avail = metrics?.presence.filter((p) => p.available).length ?? 0;
  return (
    <div className="-mx-3 mb-4 flex gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 xl:grid-cols-6">
      <StatTile label="Open deals" value={metrics?.live.open ?? '—'} sub="in the queue now" live />
      <StatTile label="Waiting pickup" value={waiting?.count ?? '—'} sub={waiting?.oldestMs ? `oldest ${duration(waiting.oldestMs)}` : 'none waiting'} tone={waiting && waiting.late > 0 ? 'bad' : 'default'} />
      <StatTile label="Time to pickup" value={duration(metrics?.timings.firstPickup.avgMs)} sub="avg today" />
      <StatTile label="Submit → F&I" value={duration(metrics?.timings.submitToFi.avgMs)} sub="avg today" />
      <StatTile label="FM accept" value={duration(metrics?.timings.fmAccept.avgMs)} sub={`${avail} FM${avail === 1 ? '' : 's'} available`} tone={avail ? 'good' : 'warn'} />
      <StatTile label="Over target" value={metrics?.live.late ?? '—'} sub="deals in the red" tone={metrics?.live.late ? 'bad' : 'good'} />
    </div>
  );
}

function PresenceBar({ presence }: { presence: ReturnType<typeof usePresence> }) {
  return (
    <div className="mb-4 flex items-center gap-3 overflow-x-auto rounded-xl border border-border bg-card/60 px-3 py-2 [scrollbar-width:none]">
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">F&I team</span>
      {presence.map((p) => (
        <span key={p.userId} className={cn('inline-flex shrink-0 items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs', p.available ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border opacity-60')}>
          <span className="relative">
            <Avatar name={p.name} size="xs" />
            <span className={cn('absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-card', p.available ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
          </span>
          <span className="font-medium">{p.name || 'Finance Manager'}</span>
          <span className="text-muted-foreground">{p.activeDealCount} active</span>
        </span>
      ))}
    </div>
  );
}

const BOARD_COLUMNS: DealStage[] = OPEN_STAGES;

function Board({ deals, sla, flash, meId }: { deals: DealSummary[]; sla?: Record<string, number>; flash: Record<string, number>; meId?: string }) {
  const now = useNow();
  const byStage = React.useMemo(() => {
    const m = new Map<DealStage, DealSummary[]>();
    for (const s of BOARD_COLUMNS) m.set(s, []);
    for (const d of deals) m.get(d.stage)?.push(d);
    for (const list of m.values()) list.sort((a, b) => new Date(a.stageEnteredAt).getTime() - new Date(b.stageEnteredAt).getTime());
    return m;
  }, [deals]);
  const columns = BOARD_COLUMNS.filter((s) => (byStage.get(s)?.length ?? 0) > 0 || ['submitted', 'picked_up', 'structured', 'ready_for_fi', 'in_fi'].includes(s));
  return (
    <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-4 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
      {columns.map((stage) => {
        const list = byStage.get(stage) || [];
        const late = list.filter((d) => slaState(d.stage, d.stageEnteredAt, sla, now) === 'late').length;
        const m = STAGE_META[stage];
        return (
          <div key={stage} className="flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl border border-border bg-muted/30 sm:w-[300px]">
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', m.dot)} />
                <span className="text-sm font-semibold">{m.label}</span>
                <span className="rounded-md bg-background px-1.5 text-xs font-semibold tabular-nums shadow-sm ring-1 ring-border">{list.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {late > 0 && <Pill className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">{late} late</Pill>}
                {sla?.[stage] && <span className="font-mono text-[10px] text-muted-foreground">{sla[stage]}m</span>}
              </div>
            </div>
            <div className="flex max-h-[calc(100dvh-22rem)] min-h-24 flex-col gap-2 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
              {list.length ? list.map((d) => <DealCard key={d.id} deal={d} sla={sla} flashAt={flash[d.id]} meId={meId} />) : <div className="grid h-20 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">Clear</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealList({ deals, sla, flash, meId }: { deals: DealSummary[]; sla?: Record<string, number>; flash: Record<string, number>; meId?: string }) {
  return (
    <>
      <div className="grid gap-2 md:hidden">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} sla={sla} flashAt={flash[d.id]} meId={meId} compact />
        ))}
      </div>
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Deal</th>
                <th className="px-3 py-2.5 font-medium">Customer · Vehicle</th>
                <th className="px-3 py-2.5 font-medium">Stage</th>
                <th className="px-3 py-2.5 font-medium">Age in stage</th>
                <th className="px-3 py-2.5 font-medium">People</th>
                <th className="px-3 py-2.5 text-right font-medium">Financed</th>
                <th className="px-4 py-2.5 text-right font-medium">Ready</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <ListRow key={d.id} d={d} sla={sla} flashAt={flash[d.id]} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ListRow({ d, sla, flashAt }: { d: DealSummary; sla?: Record<string, number>; flashAt?: number }) {
  const router = useRouter();
  const now = useNow();
  const flashing = !!flashAt && now - flashAt < 2500;
  return (
    <tr onClick={() => router.push(`/crm/deal-desk/${d.id}`)} className={cn('cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-primary/5', flashing && 'bg-primary/10')}>
      <td className="px-4 py-3">
        <div className="font-mono text-xs font-semibold">#{d.dealNumber}</div>
        <SourceBadge source={d.source} />
      </td>
      <td className="max-w-[18rem] px-3 py-3">
        <div className="truncate font-medium">{d.customerName}</div>
        <div className="truncate text-xs text-muted-foreground">{d.vehicleLabel || '—'}</div>
      </td>
      <td className="px-3 py-3">
        <StageBadge stage={d.stage} />
      </td>
      <td className="px-3 py-3">
        {d.stage === 'offered' ? <OfferCountdown expiresAt={d.offer?.expiresAt} offeredAt={d.offer?.offeredAt} /> : ['signed', 'funded', 'cancelled'].includes(d.stage) ? <span className="text-xs text-muted-foreground">—</span> : <SlaTimer stage={d.stage} enteredAt={d.stageEnteredAt} sla={sla} />}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center -space-x-1.5">
          {[d.salesperson, d.reviewer, d.financeManager].filter(Boolean).map((p, i) => (
            <Avatar key={i} name={p!.name} size="xs" ring="ring-2 ring-card" />
          ))}
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{money(d.amountFinanced)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <ReadinessRing value={d.readiness} size={32} />
        </div>
      </td>
    </tr>
  );
}
