'use client';

/**
 * Mount ONCE in the CRM layout. Keeps the Deal Desk live everywhere in the
 * app (not just on Deal Desk pages):
 *   - the 5-minute Finance Manager offer pops up on whatever page the FM is on
 *   - toasts for needs-info, mentions, new website deals, SLA breaches
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Car, Check, X, User, Wallet } from 'lucide-react';
import { Modal, Button, Toaster, Kicker } from './ui';
import { OfferCountdown, ReadinessRing } from './parts';
import { useDealDeskEvents, toast, loadBootstrap } from '@/lib/deal-desk/hooks';
import { dealDeskApi } from '@/lib/deal-desk/api';
import { money } from '@/lib/deal-desk/format';
import type { DealSummary } from '@/lib/deal-desk/types';

function chime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1175, 1568].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.14);
      o.stop(ctx.currentTime + i * 0.14 + 0.4);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio blocked until user gesture */
  }
}

export function DealDeskLive() {
  const router = useRouter();
  const [offer, setOffer] = React.useState<{ deal: DealSummary; expiresAt: string } | null>(null);
  const [busy, setBusy] = React.useState<'accept' | 'decline' | null>(null);
  const [enabled, setEnabled] = React.useState(false);

  // Only connect when the user can use the Deal Desk.
  React.useEffect(() => {
    loadBootstrap()
      .then((b) => {
        setEnabled(true);
        if (b.roles.isFm) {
          // restore an offer that was already open before a refresh
          dealDeskApi
            .listDeals({ scope: 'needs_me', stage: 'offered', limit: 5 })
            .then((r) => {
              const mine = r.deals.find((d) => d.offer?.fmId === b.actor.id && d.offer?.expiresAt && new Date(d.offer.expiresAt).getTime() > Date.now());
              if (mine) setOffer({ deal: mine, expiresAt: mine.offer!.expiresAt! });
            })
            .catch(() => {});
        }
      })
      .catch(() => setEnabled(false));
  }, []);

  React.useEffect(() => {
    if (!offer) return;
    const ms = new Date(offer.expiresAt).getTime() - Date.now();
    const t = setTimeout(() => setOffer(null), Math.max(0, ms + 1500));
    return () => clearTimeout(t);
  }, [offer]);

  useDealDeskEvents(
    {
      'offer:new': (p: { deal: DealSummary; expiresAt: string }) => {
        setOffer({ deal: p.deal, expiresAt: p.expiresAt });
        chime();
        if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`New deal #${p.deal.dealNumber} — 5 minutes to accept`, { body: `${p.deal.customerName} · ${p.deal.vehicleLabel}`, tag: `offer-${p.deal.id}` });
          } catch {
            /* ignore */
          }
        }
      },
      'offer:cleared': (p: { dealId: string; reason: string }) => {
        setOffer((o) => (o && o.deal.id === p.dealId ? null : o));
        if (p.reason === 'expired') toast({ title: 'Offer expired', body: 'The deal moved to the next Finance Manager.', tone: 'warn' });
      },
      'deal:needs_info': (p: { deal: DealSummary; note: string }) => toast({ title: `Deal #${p.deal.dealNumber} needs info`, body: p.note, tone: 'warn', href: `/crm/deal-desk/${p.deal.id}` }, 10000),
      'deal:mention': (p: { dealId: string; dealNumber: number; from: string; preview: string }) => {
        if (typeof window !== 'undefined' && window.location.pathname.includes(p.dealId)) return;
        toast({ title: `${p.from} · Deal #${p.dealNumber}`, body: p.preview, href: `/crm/deal-desk/${p.dealId}` });
      },
      'deal:web': (d: DealSummary) => toast({ title: 'New online purchase', body: `${d.customerName} · ${d.vehicleLabel}`, tone: 'success', href: `/crm/deal-desk/${d.id}` }, 9000),
      'deal:sla': (p: { deal: DealSummary; minutes: number }) => toast({ title: `Deal #${p.deal.dealNumber} is over target`, body: `${p.minutes} min in “${p.deal.stageLabel}” · ${p.deal.customerName}`, tone: 'error', href: `/crm/deal-desk/${p.deal.id}` }, 9000),
      'deal:escalated': (d: DealSummary) => toast({ title: `Deal #${d.dealNumber} escalated`, body: 'No Finance Manager accepted after a full rotation.', tone: 'error', href: `/crm/deal-desk/${d.id}` }, 12000),
      'deal:resubmitted': (d: DealSummary) => toast({ title: `Deal #${d.dealNumber} is back`, body: 'The salesperson added the missing info.', href: `/crm/deal-desk/${d.id}` }),
    },
    enabled,
  );

  const act = async (kind: 'accept' | 'decline') => {
    if (!offer) return;
    setBusy(kind);
    try {
      if (kind === 'accept') {
        await dealDeskApi.acceptOffer(offer.deal.id);
        toast({ title: `Deal #${offer.deal.dealNumber} is yours`, tone: 'success' });
        const id = offer.deal.id;
        setOffer(null);
        router.push(`/crm/deal-desk/${id}`);
      } else {
        await dealDeskApi.declineOffer(offer.deal.id);
        setOffer(null);
      }
    } catch (e: any) {
      toast({ title: 'Offer no longer available', body: e.message, tone: 'warn' });
      setOffer(null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Toaster />
      <Modal open={!!offer} onClose={() => setOffer(null)} dismissable={false} size="sm" title={<span className="flex items-center gap-2"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-500 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-orange-500" /></span>New deal for you</span>}>
        {offer && (
          <div className="flex flex-col items-center text-center">
            <OfferCountdown big expiresAt={offer.expiresAt} offeredAt={offer.deal.offer?.offeredAt} />
            <Kicker className="mt-4">Deal #{offer.deal.dealNumber}</Kicker>
            <div className="mt-1 flex items-center gap-2 text-lg font-bold"><User className="size-4 text-muted-foreground" />{offer.deal.customerName}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Car className="size-4" />{offer.deal.vehicleLabel || 'Vehicle'}</div>
            <div className="mt-4 grid w-full grid-cols-3 gap-2 rounded-xl border border-border bg-muted/30 p-3 text-left">
              <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Financed</div><div className="font-semibold tabular-nums">{money(offer.deal.amountFinanced)}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment</div><div className="font-semibold tabular-nums">{money(offer.deal.estPayment)}</div></div>
              <div className="flex items-center justify-end"><ReadinessRing value={offer.deal.readiness} size={40} /></div>
            </div>
            {offer.deal.bestLender && <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" />Best fit: {offer.deal.bestLender.name} ~{offer.deal.bestLender.rate}%</div>}
            <div className="mt-5 grid w-full grid-cols-2 gap-2">
              <Button variant="outline" size="lg" loading={busy === 'decline'} onClick={() => act('decline')} icon={<X className="size-4" />}>Pass</Button>
              <Button variant="success" size="lg" loading={busy === 'accept'} onClick={() => act('accept')} icon={<Check className="size-4" />}>Accept</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
