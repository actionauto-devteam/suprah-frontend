"use client";

import * as React from 'react';
import { isAxiosError } from 'axios';
import { Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatMeetDateTime } from '@/lib/meet-schedule';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Schedule = { _id: string; code: string; title: string; scheduledAt?: string | null };

export function MeetScheduleCleanup({ onRemoved }: { onRemoved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [rows, setRows] = React.useState<Schedule[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const requestRef = React.useRef(0);
  const failure = (err: unknown) => isAxiosError(err) ? err.response?.data?.message || err.message : 'Please try again.';

  const preview = async () => {
    const request = ++requestRef.current;
    setOpen(true); setLoading(true); setError(null); setMessage(null); setRows([]); setSelected(new Set());
    try {
      const response = await apiClient.get('/api/crm/meet/unused-schedules');
      if (request !== requestRef.current) return;
      const meetings: Schedule[] = response.data?.data?.meetings ?? [];
      setRows(meetings);
      setSelected(new Set(meetings.map(meeting => meeting._id)));
    } catch (err) { if (request === requestRef.current) setError(failure(err)); }
    finally { if (request === requestRef.current) setLoading(false); }
  };

  const remove = async () => {
    if (removing || !selected.size) return;
    setRemoving(true); setError(null);
    const ids = [...selected];
    try {
      const response = await apiClient.delete('/api/crm/meet/unused-schedules', { data: { ids } });
      const count = response.data?.data?.deletedCount ?? 0;
      setRows([]); setSelected(new Set());
      setMessage(`Removed ${count} unused schedule${count === 1 ? '' : 's'}.${count < ids.length ? ' Some meetings changed and were kept. Refresh to review them.' : ''}`);
      onRemoved();
    } catch (err) { setError(failure(err)); }
    finally { setRemoving(false); }
  };

  return <>
    <Button variant="ghost" className="min-h-11 justify-start gap-2 text-muted-foreground" onClick={() => void preview()}>
      <Trash2 className="size-4" /> Clean up unused schedules
    </Button>
    <Dialog open={open} onOpenChange={next => { if (!removing) { if (!next) ++requestRef.current; setOpen(next); } }}>
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Remove unused Instant meetings</DialogTitle>
          <DialogDescription>Review unstarted schedules titled “Instant meeting.” Other meeting titles, active calls, calendar-linked rooms, recordings, and summaries are kept. You can manage your own drafts; admins and managers can also manage team drafts.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        {loading ? <p role="status" className="text-sm">Loading schedules…</p> : rows.length ? <>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={selected.size === rows.length} disabled={removing}
              onChange={event => setSelected(new Set(event.target.checked ? rows.map(row => row._id) : []))} />
            Select all {rows.length} schedules
          </label>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {rows.map(row => <label key={row._id} className="flex min-h-14 items-center gap-3 border-t py-3 text-sm">
              <input type="checkbox" aria-label={`Remove ${row.code}`} checked={selected.has(row._id)} disabled={removing}
                onChange={event => setSelected(current => { const next = new Set(current); if (event.target.checked) next.add(row._id); else next.delete(row._id); return next; })} />
              <span>{row.title}<span className="block text-muted-foreground">{row.code} · {row.scheduledAt ? formatMeetDateTime(row.scheduledAt) : 'No scheduled time'}</span></span>
            </label>)}
          </div>
          {rows.length === 200 && <p className="text-sm text-muted-foreground">Showing the first 200 schedules. Refresh after removal to review more.</p>}
        </> : !error && !message && <p className="text-sm">No unused Instant meeting schedules to remove.</p>}
        <DialogFooter>
          <Button variant="outline" disabled={loading || removing} onClick={() => void preview()}>Refresh</Button>
          <Button variant="outline" disabled={removing} onClick={() => { ++requestRef.current; setOpen(false); }}>Close</Button>
          <Button variant="destructive" disabled={loading || removing || !selected.size} onClick={() => void remove()}>
            {removing ? 'Removing…' : `Remove ${selected.size} selected`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
