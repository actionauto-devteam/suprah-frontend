"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Headphones, Loader2, Search } from 'lucide-react';
import { useCallRecordingApi, recordingError, type RecordingList, type RecordingListItem } from '@/hooks/useCallRecordingApi';
import { CallRecordingPlayer } from './CallRecordingPlayer';
import { Button } from '@/components/ui/button';
import { fmtFullDateTimeMDT, mdtDayRangeUtc, todayStrMDT } from '@/lib/timezone';

type Range = 'all' | 'today' | '7' | '30' | 'custom';
const field = 'min-h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm';
const STATE_LABEL: Record<string, string> = { ready: 'Saved', processing: 'Saving', recording: 'Recording now', paused: 'Paused', failed: 'Failed', unknown: 'Needs attention' };

function rangeQuery(range: Range, from: string, to: string): Record<string, string> {
  if (range === 'all') return {};
  if (range === 'custom') return { ...(from ? { from: mdtDayRangeUtc(from).start } : {}), ...(to ? { to: mdtDayRangeUtc(to).end } : {}) };
  const days = range === 'today' ? 0 : Number(range) - 1;
  return { from: mdtDayRangeUtc(todayStrMDT(-days)).start, to: mdtDayRangeUtc(todayStrMDT()).end };
}

export function prettyPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : value;
}

export function formatCallLength(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes ? `${minutes}m ${String(rest).padStart(2, '0')}s` : `${rest}s`;
}

function RecordingRow({ item, open, toggle, refresh }: { item: RecordingListItem; open: boolean; toggle: () => void; refresh: () => void }) {
  const inbound = item.direction === 'inbound';
  const phone = item.customerPhone ? prettyPhone(item.customerPhone) : '';
  const line = item.line.startsWith('+') ? prettyPhone(item.line) : item.line;
  const name = item.customerName || phone || 'Unknown caller';
  return <li className="min-w-0 border-b py-4 last:border-b-0">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {item.leadId ? <Link href={`/crm/leads?leadId=${item.leadId}`} className="min-w-0 break-words font-semibold text-foreground hover:underline">{name}</Link> : <span className="min-w-0 break-words font-semibold">{name}</span>}
          {item.reviewedAt && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600" title={item.reviewedByName ? `Reviewed by ${item.reviewedByName}` : 'Reviewed'}><CheckCircle2 className="h-3 w-3" />Reviewed</span>}
          {item.state !== 'ready' && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">{STATE_LABEL[item.state] || item.state}</span>}
        </div>
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {item.customerName && phone && <span>{phone}</span>}
          <span className="inline-flex items-center gap-1">{inbound ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}{inbound ? 'Incoming' : 'Outgoing'}{line ? ` · ${line}` : ''}</span>
        </p>
        <p className="text-xs text-muted-foreground">Rep: <span className="text-foreground">{item.repName || 'Unknown'}</span> · {fmtFullDateTimeMDT(item.startedAt)} · {formatCallLength(item.durationSec)}</p>
      </div>
      <Button variant={open ? 'secondary' : 'outline'} className="min-h-11 w-full shrink-0 sm:w-auto" aria-expanded={open} onClick={toggle}><Headphones className="h-4 w-4" />{open ? 'Close' : 'Listen'}</Button>
    </div>
    {open && <CallRecordingPlayer recordingId={item._id} onChanged={refresh} />}
  </li>;
}

export function CallRecordingsList() {
  const { request, orgId, authKey } = useCallRecordingApi();
  const [range, setRange] = useState<Range>('30');
  const [from, setFrom] = useState(todayStrMDT(-29));
  const [to, setTo] = useState(todayStrMDT());
  const [reviewed, setReviewed] = useState('all');
  const [repId, setRepId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 400);
    return () => window.clearTimeout(timer);
  }, [searchText]);
  const params = new URLSearchParams({ page: String(page), reviewed, ...(repId ? { repId } : {}), ...(search ? { search } : {}), ...rangeQuery(range, from, to) });
  const query = useQuery({ queryKey: ['call-recordings', orgId, authKey, params.toString()], retry: false, placeholderData: previous => previous, queryFn: () => request<RecordingList>('get', `/recordings?${params.toString()}`) });
  const data = query.data;
  const reset = (apply: () => void) => { apply(); setPage(1); setOpenId(''); };
  if (query.isError && !data) return <p role="alert" className="break-words rounded-lg border p-4 text-sm text-muted-foreground">{(query.error as { response?: { status?: number } })?.response?.status === 403 ? "You don't have access to listen to call recordings. Ask an admin to give you access under Who can access." : recordingError(query.error)}</p>;
  const first = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.total, data.page * data.pageSize) : 0;
  return <section className="min-w-0 space-y-4" aria-label="Recorded calls">
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="relative min-w-0 sm:col-span-2 lg:col-span-1"><span className="sr-only">Search customer name or phone</span><Search aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input type="search" aria-label="Search customer name or phone" className={`${field} pl-9`} placeholder="Customer name or phone" value={searchText} onChange={event => setSearchText(event.target.value)} /></label>
      <label className="min-w-0"><span className="sr-only">Date range</span><select aria-label="Date range" className={field} value={range} onChange={event => reset(() => setRange(event.target.value as Range))}><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option><option value="custom">Custom dates</option></select></label>
      <label className="min-w-0"><span className="sr-only">Review status</span><select aria-label="Review status" className={field} value={reviewed} onChange={event => reset(() => setReviewed(event.target.value))}><option value="all">Reviewed and not reviewed</option><option value="unreviewed">Not reviewed yet</option><option value="reviewed">Reviewed</option></select></label>
      <label className="min-w-0"><span className="sr-only">Rep</span><select aria-label="Rep" className={field} value={repId} onChange={event => reset(() => setRepId(event.target.value))}><option value="">All reps</option>{data?.reps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
      {range === 'custom' && <div className="grid min-w-0 gap-3 sm:col-span-2 sm:grid-cols-2">
        <label className="min-w-0 space-y-1 text-xs text-muted-foreground">From<input type="date" className={field} value={from} max={to || undefined} onChange={event => reset(() => setFrom(event.target.value))} /></label>
        <label className="min-w-0 space-y-1 text-xs text-muted-foreground">To<input type="date" className={field} value={to} min={from || undefined} onChange={event => reset(() => setTo(event.target.value))} /></label>
      </div>}
    </div>
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span role="status">{query.isFetching && !data ? 'Loading recordings...' : data ? (data.total ? `${first}–${last} of ${data.total} recorded calls` : 'No recorded calls') : ''}</span>
      {query.isFetching && data && <Loader2 aria-label="Updating" className="h-4 w-4 animate-spin" />}
    </div>
    {!data ? <Loader2 aria-label="Loading recordings" className="h-5 w-5 animate-spin" /> : !data.items.length ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No recorded calls here yet. When a rep presses Record during a call, it shows up in this list.</div> : <ul className="min-w-0 rounded-lg border px-4">
      {data.items.map(item => <RecordingRow key={item._id} item={item} open={openId === item._id} toggle={() => setOpenId(current => current === item._id ? '' : item._id)} refresh={() => void query.refetch()} />)}
    </ul>}
    {data && data.total > data.pageSize && <div className="flex items-center justify-end gap-2">
      <Button variant="outline" className="min-h-11" disabled={page <= 1 || query.isFetching} onClick={() => { setPage(page - 1); setOpenId(''); }}><ChevronLeft className="h-4 w-4" />Previous</Button>
      <Button variant="outline" className="min-h-11" disabled={last >= data.total || query.isFetching} onClick={() => { setPage(page + 1); setOpenId(''); }}>Next<ChevronRight className="h-4 w-4" /></Button>
    </div>}
  </section>;
}
