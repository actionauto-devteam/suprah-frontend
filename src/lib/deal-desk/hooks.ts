'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { dealDeskApi, type DealBundle } from './api';
import { retainDealDeskSocket, releaseDealDeskSocket, onSocketStatus } from './socket';
import { OPEN_STAGES, CLOSED_STAGES } from './format';
import type { Bootstrap, DealMessage, DealScope, DealSummary, FmPresence, QueueMetrics } from './types';

/* ───────────────────────── socket subscription ───────────────────────── */

export function useDealDeskEvents(handlers: Record<string, (payload: any) => void>, enabled = true) {
  const ref = useRef(handlers);
  ref.current = handlers;
  const events = Object.keys(handlers).sort().join('|');
  useEffect(() => {
    if (!enabled) return;
    const socket = retainDealDeskSocket();
    const bound = events.split('|').filter(Boolean).map((ev) => {
      const fn = (p: any) => ref.current[ev]?.(p);
      socket.on(ev, fn);
      return [ev, fn] as const;
    });
    return () => {
      bound.forEach(([ev, fn]) => socket.off(ev, fn));
      releaseDealDeskSocket();
    };
  }, [events, enabled]);
}

export function useSocketConnected() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    retainDealDeskSocket();
    const off = onSocketStatus(setConnected);
    return () => {
      off();
      releaseDealDeskSocket();
    };
  }, []);
  return connected;
}

/* ───────────────────────── ticking clock ───────────────────────── */

const tickListeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;
let tickNow = Date.now();
function subscribeTick(cb: () => void) {
  tickListeners.add(cb);
  if (!tickTimer)
    tickTimer = setInterval(() => {
      tickNow = Date.now();
      tickListeners.forEach((l) => l());
    }, 1000);
  return () => {
    tickListeners.delete(cb);
    if (!tickListeners.size && tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}
/** One shared 1-second clock for every live timer on screen. */
export function useNow(): number {
  return useSyncExternalStore(subscribeTick, () => tickNow, () => tickNow);
}

/* ───────────────────────── bootstrap (who am I, settings) ───────────────────────── */

let bootCache: Bootstrap | null = null;
let bootPromise: Promise<Bootstrap> | null = null;
const bootListeners = new Set<() => void>();

export function loadBootstrap(force = false): Promise<Bootstrap> {
  if (!force && bootCache) return Promise.resolve(bootCache);
  if (!force && bootPromise) return bootPromise;
  bootPromise = dealDeskApi
    .bootstrap()
    .then((b) => {
      bootCache = b;
      bootListeners.forEach((l) => l());
      return b;
    })
    .finally(() => {
      bootPromise = null;
    });
  return bootPromise;
}

export function useBootstrap() {
  const [, force] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    bootListeners.add(l);
    loadBootstrap().catch((e) => setError(e.message));
    return () => {
      bootListeners.delete(l);
    };
  }, []);
  useDealDeskEvents({
    'settings:changed': () => {
      loadBootstrap(true).catch(() => {});
      retainDealDeskSocket().emit('roles:refresh');
      releaseDealDeskSocket();
    },
  });
  return { boot: bootCache, error, reload: () => loadBootstrap(true) };
}

/* ───────────────────────── deal lists ───────────────────────── */

export interface DealFilters {
  scope: DealScope;
  q?: string;
  source?: string;
}

function matchesScope(d: DealSummary, f: DealFilters, boot: Bootstrap | null): boolean {
  if (f.source && d.source !== f.source) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = `${d.dealNumber} ${d.customerName} ${d.vehicleLabel}`.toLowerCase();
    if (!hay.includes(q.replace(/^#/, ''))) return false;
  }
  const me = boot?.actor.id;
  const mine = d.salesperson?.id === me;
  switch (f.scope) {
    case 'open':
      return OPEN_STAGES.includes(d.stage) && (boot?.roles.isStaff || mine);
    case 'closed':
      return CLOSED_STAGES.includes(d.stage) && (boot?.roles.isStaff || mine);
    case 'drafts':
      return d.stage === 'draft' && mine;
    case 'mine':
      return mine && d.stage !== 'cancelled';
    case 'needs_me': {
      const r = boot?.roles;
      if (d.stage === 'needs_info' && mine) return true;
      if (r?.isReviewer && (d.stage === 'submitted' || (['picked_up', 'structured'].includes(d.stage) && d.reviewer?.id === me))) return true;
      if (r?.isFm && ((d.stage === 'offered' && d.offer?.fmId === me) || (d.stage === 'in_fi' && d.financeManager?.id === me))) return true;
      if (r?.isManager && d.escalated && ['ready_for_fi', 'offered'].includes(d.stage)) return true;
      return false;
    }
  }
  return false;
}

export function useDeals(filters: DealFilters) {
  const { boot } = useBootstrap();
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const key = `${filters.scope}|${filters.q || ''}|${filters.source || ''}`;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setError(null);
        const res = await dealDeskApi.listDeals({ scope: filters.scope, q: filters.q, source: filters.source, limit: 300 }, signal);
        setDeals(res.deals);
        setTotal(res.total);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => load(ctrl.signal), filters.q ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [load, filters.q]);

  useDealDeskEvents({
    'deal:upsert': ({ deal }: { deal: DealSummary }) => {
      setDeals((prev) => {
        const i = prev.findIndex((d) => d.id === deal.id);
        const fits = matchesScope(deal, filtersRef.current, bootCache);
        if (i >= 0 && !fits) return prev.filter((d) => d.id !== deal.id);
        if (i >= 0) {
          const copy = prev.slice();
          copy[i] = deal;
          return copy;
        }
        return fits ? [deal, ...prev] : prev;
      });
      setFlash((f) => ({ ...f, [deal.id]: Date.now() }));
    },
    connect: () => load(),
  });

  return { deals, total, loading, error, reload: load, flash, boot };
}

/* ───────────────────────── single deal workspace ───────────────────────── */

export function useDeal(id: string | undefined) {
  const [bundle, setBundle] = useState<DealBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  const [typing, setTyping] = useState<{ name: string; at: number } | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const b = await dealDeskApi.getDeal(id);
      setBundle(b);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(load, 150);
  }, [load]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const socket = retainDealDeskSocket();
    const watch = () => socket.emit('deal:watch', { dealId: id });
    if (socket.connected) watch();
    socket.on('connect', watch);
    socket.on('ready', watch);
    return () => {
      socket.emit('deal:unwatch', { dealId: id });
      socket.off('connect', watch);
      socket.off('ready', watch);
      releaseDealDeskSocket();
    };
  }, [id]);

  useDealDeskEvents(
    {
      'deal:upsert': ({ deal }: { deal: DealSummary }) => {
        if (deal.id === id) scheduleRefetch();
      },
      'deal:message': (m: DealMessage) => {
        if (m.dealId !== id) return;
        setBundle((b) => (b && !b.messages.some((x) => x.id === m.id) ? { ...b, messages: [...b.messages, m] } : b));
      },
      'deal:progress': (p: { dealId: string; step: string }) => {
        if (p.dealId === id) setProgress(p.step === 'done' ? null : p.step);
      },
      'deal:typing': (p: { dealId: string; name: string }) => {
        if (p.dealId === id) setTyping({ name: p.name, at: Date.now() });
      },
      connect: () => scheduleRefetch(),
    },
    !!id,
  );

  useEffect(() => {
    if (bundle?.deal.stage !== 'processing') setProgress(null);
  }, [bundle?.deal.stage]);

  const setDeal = useCallback((deal: DealBundle['deal']) => {
    setBundle((b) => (b ? { ...b, deal } : b));
    scheduleRefetch();
  }, [scheduleRefetch]);

  const addMessage = useCallback((m: DealMessage) => {
    setBundle((b) => (b && !b.messages.some((x) => x.id === m.id) ? { ...b, messages: [...b.messages, m] } : b));
  }, []);

  return { bundle, error, loading, reload: load, setDeal, addMessage, progress, typing };
}

/* ───────────────────────── metrics & presence ───────────────────────── */

export function useMetrics(range: string, enabled = true) {
  const [data, setData] = useState<QueueMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      last.current = Date.now();
      setData(await dealDeskApi.metrics(range));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [range, enabled]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Live: refresh at most every 5s while deals are moving.
  useDealDeskEvents(
    {
      'deal:upsert': () => {
        if (pending.current) return;
        const wait = Math.max(0, 5000 - (Date.now() - last.current));
        pending.current = setTimeout(() => {
          pending.current = null;
          load();
        }, wait);
      },
      'fm:presence': (presence: FmPresence[]) => setData((d) => (d ? { ...d, presence } : d)),
    },
    enabled,
  );

  return { data, error, reload: load };
}

export function usePresence(enabled = true) {
  const [presence, setPresence] = useState<FmPresence[]>([]);
  useEffect(() => {
    if (!enabled) return;
    dealDeskApi.presence().then((r) => setPresence(r.presence)).catch(() => {});
  }, [enabled]);
  useDealDeskEvents({ 'fm:presence': (p: FmPresence[]) => setPresence(p) }, enabled);
  return presence;
}

/* ───────────────────────── toasts ───────────────────────── */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'default' | 'success' | 'warn' | 'error';
  href?: string;
}
let toasts: Toast[] = [];
let toastSeq = 1;
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((l) => l());

export function toast(t: Omit<Toast, 'id'>, ms = 6000) {
  const id = toastSeq++;
  toasts = [...toasts.slice(-4), { ...t, id }];
  emitToasts();
  setTimeout(() => dismissToast(id), ms);
  return id;
}
export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
}
export function useToasts() {
  return useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
}

/* ───────────────────────── sidebar badge ───────────────────────── */

/** Count of deals that need the signed-in user right now (for the sidebar). */
export function useDealDeskBadge(enabled = true) {
  const [count, setCount] = useState(0);
  const load = useCallback(() => {
    if (!enabled) return;
    dealDeskApi
      .listDeals({ scope: 'needs_me', limit: 1 })
      .then((r) => setCount(r.total))
      .catch(() => {});
  }, [enabled]);
  useEffect(() => {
    load();
    if (!enabled) return;
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load, enabled]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useDealDeskEvents(
    {
      'deal:upsert': () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(load, 800);
      },
      'offer:new': load,
      'offer:cleared': load,
    },
    enabled,
  );
  return enabled ? count : 0;
}

export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useMemo(() => ((...args: any[]) => ref.current(...args)) as T, []);
}
