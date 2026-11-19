'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Bot, Hand, Undo2, MessageCircleQuestion, Rocket, Check, X, PenLine, BadgeDollarSign, LogOut, Ban, Pencil,
  ShieldAlert, Sparkles, AlertTriangle, Info, CircleAlert, Eye, Lock, User, Car, Calculator, ClipboardList, Users,
  FileStack, History, MessagesSquare, BarChart3, Repeat, Globe, CheckCircle2, Loader2,
} from 'lucide-react';
import { Button, Card, CardHeader, Kicker, Modal, Textarea, Tabs, Avatar, Pill, Skeleton, ErrorBanner, Checkbox, LiveDot } from './ui';
import { StageBadge, SourceBadge, SlaTimer, OfferCountdown, ReadinessRing, RatioGauge, FitPill } from './parts';
import { DocumentsPanel } from './DocumentsPanel';
import { ThreadPanel } from './ThreadPanel';
import { useDeal, useBootstrap, toast } from '@/lib/deal-desk/hooks';
import { dealDeskApi } from '@/lib/deal-desk/api';
import { STEPPER, STAGE_META, money, pct, duration, shortTime, cn } from '@/lib/deal-desk/format';
import type { DealDetail, DealPermissions, DealStage } from '@/lib/deal-desk/types';

type Tab = 'overview' | 'analysis' | 'documents' | 'timeline' | 'thread';

export function DealWorkspace({ id }: { id: string }) {
  const { boot } = useBootstrap();
  const { bundle, error, loading, reload, setDeal, addMessage, progress, typing } = useDeal(id);
  const [tab, setTab] = React.useState<Tab>('overview');
  const tabInit = React.useRef(false);

  React.useEffect(() => {
    if (!bundle || tabInit.current) return;
    tabInit.current = true;
    if (bundle.deal.analysis && ['structured', 'ready_for_fi', 'offered', 'in_fi'].includes(bundle.deal.stage)) setTab('analysis');
  }, [bundle]);

  if (error && !bundle) return <div className="mx-auto max-w-4xl p-6"><ErrorBanner message={error} onRetry={reload} /></div>;
  if (loading || !bundle)
    return (
      <div className="mx-auto max-w-[1500px] space-y-4 p-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-12" />
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]"><Skeleton className="h-[60vh]" /><Skeleton className="h-[60vh]" /></div>
      </div>
    );

  const { deal, permissions, messages, events } = bundle;
  const sla = boot?.settings.sla;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-3 pb-24 sm:px-6">
      <Header deal={deal} sla={sla} />
      <ActionBar deal={deal} perms={permissions} onDeal={setDeal} meId={boot?.actor.id} />
      <Banners deal={deal} progress={progress} meId={boot?.actor.id} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'overview', label: 'Overview', icon: <User className="size-4" /> },
              { value: 'analysis', label: 'Analysis', icon: <BarChart3 className="size-4" /> },
              { value: 'documents', label: 'Documents', icon: <FileStack className="size-4" />, badge: deal.documents.length },
              { value: 'timeline', label: 'Timeline', icon: <History className="size-4" /> },
              { value: 'thread', label: 'Thread', icon: <MessagesSquare className="size-4" />, hideOn: 'lg', badge: messages.filter((m) => m.kind === 'user').length },
            ]}
            className="mb-4"
          />
          {tab === 'overview' && <Overview deal={deal} perms={permissions} />}
          {tab === 'analysis' && <Analysis deal={deal} />}
          {tab === 'documents' && (
            <Card className="p-4 sm:p-5">
              <DocumentsPanel dealId={deal.id} documents={deal.documents} canUpload={permissions.uploadDocs} canDelete={permissions.edit} onChange={setDeal} />
            </Card>
          )}
          {tab === 'timeline' && <Timeline deal={deal} events={events} sla={sla} />}
          {tab === 'thread' && (
            <Card className="h-[70dvh] overflow-hidden lg:hidden">
              <ThreadPanel dealId={deal.id} messages={messages} meId={boot?.actor.id} onSent={addMessage} typing={typing} className="h-full" />
            </Card>
          )}
        </div>
        <Card className="hidden h-[calc(100dvh-8rem)] min-h-[520px] flex-col overflow-hidden lg:sticky lg:top-4 lg:flex">
          <CardHeader icon={<MessagesSquare className="size-4" />} kicker="Deal thread" title="Live conversation" actions={<LiveDot className="text-emerald-500" />} />
          <ThreadPanel dealId={deal.id} messages={messages} meId={boot?.actor.id} onSent={addMessage} typing={typing} className="min-h-0 flex-1" />
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────── header & stepper ───────────────────────── */

function Header({ deal, sla }: { deal: DealDetail; sla?: Record<string, number> }) {
  const reached = new Set(deal.stageHistory.map((h) => h.stage));
  const currentIdx = (() => {
    const order: DealStage[] = ['submitted', 'picked_up', 'processing', 'needs_info', 'structured', 'ready_for_fi', 'offered', 'in_fi', 'signed', 'funded'];
    const map: Record<string, number> = { submitted: 0, picked_up: 1, processing: 1, needs_info: 1, structured: 2, ready_for_fi: 3, offered: 3, in_fi: 4, signed: 5, funded: 6 };
    return deal.stage === 'draft' ? -1 : deal.stage === 'cancelled' ? Math.max(...deal.stageHistory.map((h) => map[h.stage] ?? -1)) : map[deal.stage] ?? order.indexOf(deal.stage);
  })();

  return (
    <div className="relative isolate pt-4 sm:pt-5">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)]" />
      <Link href="/crm/deal-desk" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Deal Queue
      </Link>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-muted-foreground">#{deal.dealNumber}</span>
            <SourceBadge source={deal.source} />
            <StageBadge stage={deal.stage} />
            {deal.stage === 'offered' ? <OfferCountdown expiresAt={deal.offer?.expiresAt} offeredAt={deal.offer?.offeredAt} /> : !['signed', 'funded', 'cancelled', 'draft'].includes(deal.stage) && <SlaTimer stage={deal.stage} enteredAt={deal.stageEnteredAt} sla={sla} showTarget />}
            {deal.escalated && <Pill className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"><ShieldAlert className="size-3" />Escalated</Pill>}
            {deal.depositRequested && <Pill className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"><BadgeDollarSign className="size-3" />Wants deposit</Pill>}
          </div>
          <h1 className="mt-1.5 truncate text-2xl font-bold tracking-tight sm:text-3xl">{deal.customerName}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {deal.vehicleLabel || 'Vehicle not set'}
            {deal.vehicle.vin && <span className="ml-2 font-mono text-xs">{deal.vehicle.vin}</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <Kicker>Est. payment</Kicker>
            <div className="text-xl font-bold tabular-nums">{deal.analysis?.estPayment != null ? `${money(deal.analysis.estPayment)}` : '—'}<span className="text-xs font-medium text-muted-foreground">/mo</span></div>
            <div className="text-xs text-muted-foreground">{money(deal.analysis?.amountFinanced)} financed</div>
          </div>
          <ReadinessRing value={deal.readiness} size={56} />
        </div>
      </div>

      <div className="-mx-3 mt-4 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ol className="flex min-w-max items-center">
          {STEPPER.map((s, i) => {
            const done = i < currentIdx || (i === currentIdx && ['funded'].includes(deal.stage));
            const active = i === currentIdx && deal.stage !== 'cancelled' && deal.stage !== 'funded';
            const entry = [...deal.stageHistory].reverse().find((h) => h.stage === s.stage);
            return (
              <li key={s.stage} className="flex items-center">
                <div className="flex flex-col items-center gap-1 px-1">
                  <span className={cn('grid size-7 place-items-center rounded-full border text-[11px] font-bold transition-all', done ? 'border-primary bg-primary text-primary-foreground' : active ? 'border-primary bg-primary/15 text-primary shadow-[0_0_0_4px] shadow-primary/15' : 'border-border bg-background text-muted-foreground')}>
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className={cn('whitespace-nowrap text-[11px] font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
                  <span className="h-3 font-mono text-[9.5px] text-muted-foreground">{entry?.durationMs != null ? duration(entry.durationMs) : reached.has(s.stage) && active ? 'now' : ''}</span>
                </div>
                {i < STEPPER.length - 1 && <span className={cn('mb-7 h-0.5 w-8 rounded sm:w-14', i < currentIdx ? 'bg-primary' : 'bg-border')} />}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ───────────────────────── actions ───────────────────────── */

function ActionBar({ deal, perms, onDeal, meId }: { deal: DealDetail; perms: DealPermissions; onDeal: (d: DealDetail) => void; meId?: string }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<null | 'info' | 'cancel' | 'release' | 'approve' | 'ssn'>(null);
  const [note, setNote] = React.useState('');
  const [override, setOverride] = React.useState(false);
  const [ssn, setSsn] = React.useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<{ deal: DealDetail }>, success?: string) => {
    setBusy(key);
    try {
      const res = await fn();
      onDeal(res.deal);
      if (success) toast({ title: success, tone: 'success' }, 3000);
      setModal(null);
      setNote('');
    } catch (e: any) {
      toast({ title: 'That didn’t work', body: e.message, tone: 'error' }, 8000);
    } finally {
      setBusy(null);
    }
  };

  const blocking = (deal.analysis?.flags || []).filter((f) => f.level === 'block');
  const buttons: React.ReactNode[] = [];
  const b = (key: string, node: React.ReactNode) => buttons.push(<React.Fragment key={key}>{node}</React.Fragment>);

  if (perms.acceptOffer) b('accept', <Button variant="success" size="lg" loading={busy === 'accept'} icon={<Check className="size-4" />} onClick={() => run('accept', () => dealDeskApi.acceptOffer(deal.id), 'Deal accepted — it’s yours')}>Accept deal</Button>);
  if (perms.declineOffer) b('decline', <Button variant="outline" size="lg" loading={busy === 'decline'} icon={<X className="size-4" />} onClick={() => run('decline', () => dealDeskApi.declineOffer(deal.id), 'Passed to the next Finance Manager')}>Pass</Button>);
  if (perms.submit) b('submit', <Link href={`/crm/deal-desk/new?edit=${deal.id}`}><Button icon={<Rocket className="size-4" />}>{deal.stage === 'needs_info' ? 'Update & resubmit' : 'Finish & submit'}</Button></Link>);
  if (perms.pickup) b('pickup', <Button loading={busy === 'pickup'} icon={<Hand className="size-4" />} onClick={() => run('pickup', () => dealDeskApi.pickup(deal.id), 'You picked up the deal')}>Pick up</Button>);
  if (perms.analyze) b('analyze', <Button variant={deal.stage === 'picked_up' ? 'primary' : 'outline'} loading={busy === 'analyze'} icon={<Bot className="size-4" />} onClick={() => run('analyze', () => dealDeskApi.analyze(deal.id))}>{deal.analysis ? 'Re-run Deal Builder' : 'Run Deal Builder'}</Button>);
  if (perms.approve) b('approve', <Button variant="success" loading={busy === 'approve'} icon={<Rocket className="size-4" />} onClick={() => (blocking.length ? setModal('approve') : run('approve', () => dealDeskApi.approve(deal.id), 'Approved — finding a Finance Manager'))}>Approve for F&I</Button>);
  if (perms.markSigned) b('signed', <Button variant="success" loading={busy === 'signed'} icon={<PenLine className="size-4" />} onClick={() => run('signed', () => dealDeskApi.changeStage(deal.id, 'signed'), 'Marked signed')}>Mark signed</Button>);
  if (perms.markFunded) b('funded', <Button variant="success" loading={busy === 'funded'} icon={<BadgeDollarSign className="size-4" />} onClick={() => run('funded', () => dealDeskApi.changeStage(deal.id, 'funded'), 'Marked funded')}>Mark funded</Button>);
  if (perms.requestInfo) b('info', <Button variant="warn" icon={<MessageCircleQuestion className="size-4" />} onClick={() => setModal('info')}>Request info</Button>);
  if (perms.edit && !perms.submit) b('edit', <Link href={`/crm/deal-desk/new?edit=${deal.id}`}><Button variant="outline" icon={<Pencil className="size-4" />}>Edit</Button></Link>);
  if (perms.returnToQueue) b('return', <Button variant="ghost" loading={busy === 'return'} icon={<Undo2 className="size-4" />} onClick={() => run('return', () => dealDeskApi.returnToQueue(deal.id))}>Back to queue</Button>);
  if (perms.backToStructured) b('back', <Button variant="ghost" loading={busy === 'back'} icon={<Undo2 className="size-4" />} onClick={() => run('back', () => dealDeskApi.changeStage(deal.id, 'structured'))}>Pull back</Button>);
  if (perms.release) b('release', <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={() => setModal('release')}>Release</Button>);
  if (perms.revealSsn) b('ssn', <Button variant="ghost" icon={<Eye className="size-4" />} onClick={() => setModal('ssn')}>SSN</Button>);
  if (perms.cancel) b('cancel', <Button variant="ghost" className="text-rose-600 hover:bg-rose-500/10" icon={<Ban className="size-4" />} onClick={() => setModal('cancel')}>Cancel deal</Button>);

  return (
    <>
      {buttons.length > 0 && (
        <div className="sticky top-0 z-20 -mx-3 mt-3 border-y border-border/60 bg-background/85 px-3 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">{buttons}</div>
        </div>
      )}

      <Modal open={modal === 'info'} onClose={() => setModal(null)} title="What’s missing?" description="The salesperson gets this right away and the deal moves to “Needs info”." footer={<><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button variant="warn" loading={busy === 'info'} disabled={note.trim().length < 3} onClick={() => run('info', () => dealDeskApi.requestInfo(deal.id, note.trim()), 'Sent back to the salesperson')}>Send request</Button></>}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {['Upload proof of income', 'Need a clear photo of the driver’s license', 'Confirm trade payoff amount', 'Book value is missing', 'Customer needs to sign the credit authorization'].map((s) => (
            <button key={s} onClick={() => setNote((n) => (n ? `${n}\n${s}` : s))} className="rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary/40 hover:bg-primary/5">{s}</button>
          ))}
        </div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Be specific so they can fix it in one go" rows={4} autoFocus />
      </Modal>

      <Modal open={modal === 'cancel'} onClose={() => setModal(null)} title={`Cancel deal #${deal.dealNumber}?`} description="This closes the deal for everyone. It stays in history." footer={<><Button variant="outline" onClick={() => setModal(null)}>Keep deal</Button><Button variant="danger" loading={busy === 'cancel'} disabled={note.trim().length < 3} onClick={() => run('cancel', () => dealDeskApi.changeStage(deal.id, 'cancelled', note.trim()), 'Deal cancelled')}>Cancel deal</Button></>}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (e.g. customer bought elsewhere)" rows={3} autoFocus />
      </Modal>

      <Modal open={modal === 'release'} onClose={() => setModal(null)} title="Release back to the F&I queue?" description="It goes back into the 5-minute rotation for the next Finance Manager." footer={<><Button variant="outline" onClick={() => setModal(null)}>Keep it</Button><Button loading={busy === 'release'} onClick={() => run('release', () => dealDeskApi.release(deal.id, note.trim() || undefined), 'Released to the F&I queue')}>Release</Button></>}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the next Finance Manager" rows={3} />
      </Modal>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="This deal has blocking issues" footer={<><Button variant="outline" onClick={() => setModal(null)}>Fix first</Button>{perms.approveOverride && <Button variant="danger" disabled={!override} loading={busy === 'approve'} onClick={() => run('approve', () => dealDeskApi.approve(deal.id, true), 'Approved with manager override')}>Approve anyway</Button>}</>}>
        <ul className="space-y-2">
          {blocking.map((f) => (
            <li key={f.code} className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><CircleAlert className="size-4" />{f.message}</li>
          ))}
        </ul>
        {perms.approveOverride ? (
          <Checkbox className="mt-4" checked={override} onChange={setOverride} label="I’m a manager and I approve this deal for F&I anyway. This is logged." />
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Fix these, re-run the Deal Builder, or ask a manager to approve with override.</p>
        )}
      </Modal>

      <Modal open={modal === 'ssn'} onClose={() => { setModal(null); setSsn(null); }} title="Social Security number" description="Viewing the full number is logged to the deal’s audit trail." size="sm" footer={!ssn && <Button loading={busy === 'ssn'} icon={<Lock className="size-4" />} onClick={async () => { setBusy('ssn'); try { const r = await dealDeskApi.revealSsn(deal.id); setSsn(r.ssn); } catch (e: any) { toast({ title: 'Can’t reveal', body: e.message, tone: 'error' }); } finally { setBusy(null); } }}>Reveal</Button>}>
        <div className="rounded-xl border border-border bg-muted/40 py-4 text-center font-mono text-2xl tracking-widest">{ssn || deal.creditApp.ssnMasked || '—'}</div>
      </Modal>
    </>
  );
}

/* ───────────────────────── banners ───────────────────────── */

function Banners({ deal, progress, meId }: { deal: DealDetail; progress: string | null; meId?: string }) {
  if (deal.stage === 'needs_info' && deal.needsInfoNote)
    return (
      <div className="mt-3 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">{deal.reviewer?.name || 'Online sales'} needs more info</div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-amber-900/80 dark:text-amber-100/80">{deal.needsInfoNote}</p>
        </div>
      </div>
    );
  if (deal.stage === 'processing') {
    const steps = [
      { key: 'extract', label: 'Reading documents' },
      { key: 'analyze', label: 'LTV · DTI · lender match' },
      { key: 'summarize', label: 'Writing F&I summary' },
    ];
    const at = Math.max(0, steps.findIndex((s) => s.key === progress));
    return (
      <div className="relative mt-3 overflow-hidden rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
        <div aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 animate-[dd-scan_2.2s_linear_infinite] bg-linear-to-r from-transparent via-violet-400/20 to-transparent" />
        <style>{`@keyframes dd-scan{to{transform:translateX(400%)}}`}</style>
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-200"><Sparkles className="size-4" />Deal Builder is working…</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <span key={s.key} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', i < at ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : i === at ? 'border-violet-500/40 bg-background text-violet-700 dark:text-violet-200' : 'border-border text-muted-foreground')}>
              {i < at ? <CheckCircle2 className="size-3.5" /> : i === at ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-3.5 rounded-full border border-current opacity-40" />}
              {s.label}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (deal.stage === 'offered')
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
        <Repeat className="size-5 shrink-0 text-orange-600" />
        <div className="min-w-0 flex-1 text-sm">
          <b>{deal.offer?.fmId === meId ? 'Offered to you' : `Offered to ${deal.offer?.fmName || 'a Finance Manager'}`}</b>
          <span className="text-muted-foreground"> · round {deal.offer?.round || 1}{deal.rotations ? ` · ${deal.rotations} passed so far` : ''}</span>
        </div>
        <OfferCountdown expiresAt={deal.offer?.expiresAt} offeredAt={deal.offer?.offeredAt} />
      </div>
    );
  if (deal.stage === 'ready_for_fi')
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
        <Loader2 className="size-5 shrink-0 animate-spin text-emerald-600" />
        <span><b>Waiting for a Finance Manager.</b> <span className="text-muted-foreground">It’s offered automatically as soon as one is available.</span></span>
      </div>
    );
  if (deal.stage === 'cancelled')
    return (
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200">
        <Ban className="size-5 shrink-0" />
        Cancelled{deal.cancelReason ? `: ${deal.cancelReason}` : ''}
      </div>
    );
  return null;
}

/* ───────────────────────── overview ───────────────────────── */

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/70 py-1.5 last:border-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{k}</dt>
      <dd className={cn('min-w-0 truncate text-right text-sm font-medium', mono && 'font-mono text-xs')}>{v ?? '—'}</dd>
    </div>
  );
}

function Overview({ deal, perms }: { deal: DealDetail; perms: DealPermissions }) {
  const c = deal.customer;
  const v = deal.vehicle;
  const t = deal.tradeIn;
  const fs = deal.fourSquare;
  const ca = deal.creditApp;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader icon={<User className="size-4" />} title="Customer" />
        <dl className="px-4 py-2 sm:px-5">
          <KV k="Name" v={deal.customerName} />
          <KV k="Phone" v={c.phone ? <a className="text-primary hover:underline" href={`tel:${c.phone}`}>{c.phone}</a> : '—'} />
          <KV k="Email" v={c.email ? <a className="text-primary hover:underline" href={`mailto:${c.email}`}>{c.email}</a> : '—'} />
          <KV k="Address" v={[c.address?.street, c.address?.city, c.address?.state, c.address?.zip].filter(Boolean).join(', ') || '—'} />
          {deal.coBuyer.present && <KV k="Co-buyer" v={`${deal.coBuyer.firstName || ''} ${deal.coBuyer.lastName || ''} · ${money(deal.coBuyer.grossMonthlyIncome)}/mo`} />}
        </dl>
      </Card>
      <Card>
        <CardHeader icon={<Car className="size-4" />} title="Vehicle" />
        <dl className="px-4 py-2 sm:px-5">
          <KV k="Vehicle" v={deal.vehicleLabel || '—'} />
          <KV k="VIN" v={v.vin} mono />
          <KV k="Stock #" v={v.stockNumber} />
          <KV k="Mileage" v={v.mileage != null ? `${v.mileage.toLocaleString()} mi` : '—'} />
          <KV k="Listed price" v={money(v.price)} />
          <KV k="Book value" v={money(v.bookValue)} />
        </dl>
      </Card>
      <Card>
        <CardHeader icon={<Calculator className="size-4" />} title="Four Square" />
        <dl className="px-4 py-2 sm:px-5">
          <KV k="Sale price" v={money(fs.salePrice ?? v.price)} />
          <KV k="Down payment" v={money(fs.downPayment ?? 0)} />
          <KV k="Doc / other fees" v={`${money(fs.docFee ?? 0)} / ${money(fs.otherFees ?? 0)}`} />
          <KV k="Tax rate" v={fs.taxRate != null ? `${fs.taxRate}%` : '—'} />
          <KV k="Backend products" v={money(fs.backendProducts ?? 0)} />
          <KV k="Target payment · term" v={`${fs.desiredPayment ? money(fs.desiredPayment) + '/mo' : '—'} · ${fs.desiredTerm || '—'} mo`} />
          {t.present && <KV k="Trade" v={`${[t.year, t.make, t.model].filter(Boolean).join(' ')} · ${money(t.allowance)} − ${money(t.payoff)} payoff`} />}
        </dl>
      </Card>
      <Card>
        <CardHeader icon={<ClipboardList className="size-4" />} title="Credit application" actions={<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="size-3" />Encrypted</span>} />
        <dl className="px-4 py-2 sm:px-5">
          <KV k="Employer" v={[ca.employer, ca.jobTitle].filter(Boolean).join(' · ') || '—'} />
          <KV k="Time at job" v={ca.employmentMonths != null ? `${Math.floor(ca.employmentMonths / 12)}y ${ca.employmentMonths % 12}m` : '—'} />
          <KV k="Gross income" v={`${money(ca.grossMonthlyIncome)}/mo${ca.otherMonthlyIncome ? ` + ${money(ca.otherMonthlyIncome)}` : ''}`} />
          <KV k="Housing" v={`${ca.housingStatus || '—'} · ${money(ca.housingPayment)}/mo`} />
          <KV k="Other debt" v={`${money(ca.monthlyDebt)}/mo`} />
          <KV k="Credit score" v={ca.creditScore ? `${ca.creditScore} (${(ca.creditScoreSource || '').replace('_', ' ')})` : '—'} />
          <KV k="SSN" v={ca.ssnMasked || '—'} mono />
          <KV k="Credit authorization" v={ca.consent?.granted ? <span className="text-emerald-600">Granted {shortTime(ca.consent.at)}</span> : <span className="text-rose-600">Not captured</span>} />
        </dl>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader icon={<Users className="size-4" />} title="People on this deal" />
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          {[
            { role: 'Salesperson', p: deal.salesperson },
            { role: 'Online sales', p: deal.reviewer },
            { role: 'Finance Manager', p: deal.financeManager },
          ].map(({ role, p }) => (
            <div key={role} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Avatar name={p?.name || '?'} size="md" />
              <div className="min-w-0">
                <Kicker>{role}</Kicker>
                <div className="truncate text-sm font-medium">{p?.name || (deal.source === 'web' && role === 'Salesperson' ? 'Website (no salesperson)' : 'Not assigned')}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ───────────────────────── analysis ───────────────────────── */

function Analysis({ deal }: { deal: DealDetail }) {
  const a = deal.analysis;
  if (!a)
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-600"><Bot className="size-6" /></div>
        <div className="font-semibold">No analysis yet</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Once the online sales team picks up the deal and runs the Deal Builder, LTV, DTI, lender matches and the F&I summary show up here.</p>
      </Card>
    );
  const flagIcon = { block: CircleAlert, warn: AlertTriangle, info: Info };
  const flagTone = { block: 'text-rose-600 dark:text-rose-400', warn: 'text-amber-600 dark:text-amber-400', info: 'text-muted-foreground' };
  return (
    <div className="space-y-4">
      {a.aiSummary && (
        <Card className="overflow-hidden">
          <div className="relative p-4 sm:p-5">
            <div aria-hidden className="absolute -right-8 -top-8 size-32 rounded-full bg-violet-500/15 blur-2xl" />
            <div className="flex items-center gap-2"><Sparkles className="size-4 text-violet-500" /><Kicker className="text-violet-600 dark:text-violet-300">F&I summary</Kicker></div>
            <p className="mt-2 text-[15px] leading-relaxed">{a.aiSummary}</p>
            <div className="mt-2 font-mono text-[10px] text-muted-foreground">Rules {a.rulesVersion} · {a.aiProvider && a.aiProvider !== 'none' ? `AI: ${a.aiProvider}` : 'template summary'} · {shortTime(a.computedAt)}</div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <Kicker className="mb-4">Ratios</Kicker>
          <div className="grid gap-5 sm:grid-cols-3">
            <RatioGauge label="LTV" value={a.ltv} warnAt={115} badAt={130} max={160} hint={a.bookValueUsed ? `of ${money(a.bookValueUsed)} book` : 'no book value'} />
            <RatioGauge label="DTI" value={a.dti} warnAt={42} badAt={50} max={70} hint="incl. housing + new payment" />
            <RatioGauge label="PTI" value={a.pti} warnAt={15} badAt={20} max={30} hint="payment ÷ income" />
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <Kicker className="mb-3">Structure</Kicker>
          <dl>
            <KV k="Amount financed" v={money(a.amountFinanced)} />
            <KV k="Sales tax" v={money(a.taxAmount)} />
            <KV k="Net trade" v={money(a.netTrade)} />
            <KV k="Est. rate · term" v={`${a.estRate ?? '—'}% · ${a.estTerm ?? '—'} mo`} />
            <KV k="Est. payment" v={<span className="text-base font-bold">{money(a.estPayment)}</span>} />
          </dl>
        </Card>
      </div>

      {a.flags.length > 0 && (
        <Card>
          <CardHeader title="Things to check" kicker={`${a.flags.length} flag${a.flags.length === 1 ? '' : 's'}`} actions={<ReadinessRing value={a.readiness} size={36} />} />
          <ul className="divide-y divide-border/60">
            {[...a.flags].sort((x, y) => ['block', 'warn', 'info'].indexOf(x.level) - ['block', 'warn', 'info'].indexOf(y.level)).map((f, i) => {
              const Icon = flagIcon[f.level];
              return (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5">
                  <Icon className={cn('size-4 shrink-0', flagTone[f.level])} />
                  <span className="flex-1">{f.message}</span>
                  <span className={cn('font-mono text-[10px] uppercase', flagTone[f.level])}>{f.level === 'block' ? 'blocking' : f.level}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="Lender matches" kicker="From your lender matrix" />
        {deal.lenderMatches.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-2 font-medium sm:px-5">Lender</th>
                  <th className="px-3 py-2 font-medium">Fit</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Term</th>
                  <th className="px-3 py-2 text-right font-medium">Payment</th>
                  <th className="px-3 py-2 text-right font-medium">DTI</th>
                  <th className="px-4 py-2 font-medium sm:px-5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {deal.lenderMatches.map((m, i) => (
                  <tr key={i} className={cn('border-b border-border/50 last:border-0', m.fit === 'fail' && 'opacity-60')}>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-[11px] capitalize text-muted-foreground">{(m.type || '').replace('_', ' ')}</div>
                    </td>
                    <td className="px-3 py-3"><FitPill fit={m.fit} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{m.rate != null ? `${m.rate}–${m.rateMax}%` : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{m.term ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(m.payment)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{pct(m.dti)}</td>
                    <td className="max-w-[16rem] px-4 py-3 text-xs text-muted-foreground sm:px-5">{m.reasons.join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-6 text-sm text-muted-foreground">No lenders in the matrix yet — an admin can add them in Deal Desk settings.</div>
        )}
      </Card>
    </div>
  );
}

/* ───────────────────────── timeline ───────────────────────── */

const EVENT_LABEL: Record<string, string> = {
  created: 'Deal created',
  edited: 'Deal edited',
  submitted: 'Submitted',
  resubmitted: 'Resubmitted',
  web_submitted: 'Submitted from the website',
  picked_up: 'Picked up',
  returned_to_queue: 'Put back in queue',
  analysis_started: 'Deal Builder started',
  analysis_completed: 'Deal structured',
  analysis_failed: 'Deal Builder failed',
  needs_info: 'Requested more info',
  approved: 'Approved for F&I',
  offered: 'Offered to Finance Manager',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer passed',
  offer_expired: 'Offer expired',
  escalated: 'Escalated to managers',
  released: 'Released by F&I',
  signed: 'Signed',
  funded: 'Funded',
  cancelled: 'Cancelled',
  structured: 'Pulled back from F&I',
  document_uploaded: 'Document uploaded',
  document_viewed: 'Document viewed',
  document_deleted: 'Document removed',
  ssn_revealed: 'SSN viewed',
};

function Timeline({ deal, events, sla }: { deal: DealDetail; events: { id: string; action: string; actorName?: string; meta?: Record<string, unknown>; createdAt: string }[]; sla?: Record<string, number> }) {
  const totalMs = deal.stageHistory.reduce((s, h) => s + (h.durationMs || 0), 0) || 1;
  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <Kicker className="mb-3">Time in each stage</Kicker>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {deal.stageHistory.filter((h) => h.durationMs).map((h, i) => (
            <div key={i} title={`${h.label}: ${duration(h.durationMs)}`} className={cn(STAGE_META[h.stage].dot, i > 0 && 'border-l-2 border-card')} style={{ width: `${((h.durationMs || 0) / totalMs) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-4 space-y-2">
          {deal.stageHistory.map((h, i) => {
            const target = sla?.[h.stage];
            const over = target && h.durationMs != null && h.durationMs > target * 60000;
            const live = !h.exitedAt && i === deal.stageHistory.length - 1;
            return (
              <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                <span className={cn('size-2.5 rounded-full', STAGE_META[h.stage].dot, live && 'animate-pulse')} />
                <span className="min-w-0 truncate">
                  <b className="font-medium">{h.label}</b>
                  <span className="text-muted-foreground"> · {h.actorName || 'System'} · {shortTime(h.enteredAt)}</span>
                </span>
                <span className={cn('font-mono text-xs tabular-nums', over ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                  {live ? 'now' : duration(h.durationMs)}
                  {target ? <span className="opacity-60"> / {target}m</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Audit trail" kicker={`${events.length} events`} />
        <ul className="max-h-[480px] divide-y divide-border/50 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm sm:px-5">
              <Avatar name={e.actorName} size="xs" />
              <span className="min-w-0 flex-1 truncate">
                <b className="font-medium">{EVENT_LABEL[e.action] || e.action.replace(/_/g, ' ')}</b>
                <span className="text-muted-foreground"> · {e.actorName || 'System'}</span>
                {e.action === 'offered' && e.meta?.fmName ? <span className="text-muted-foreground"> → {String(e.meta.fmName)}</span> : null}
                {e.action === 'offer_accepted' && e.meta?.acceptSeconds != null ? <span className="text-muted-foreground"> in {duration(Number(e.meta.acceptSeconds) * 1000)}</span> : null}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{shortTime(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
