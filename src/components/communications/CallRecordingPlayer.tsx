"use client";

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Share2, CheckCheck, Headphones, X, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useCallRecordingApi, recordingError, type Recording, type RecordingPermission } from '@/hooks/useCallRecordingApi';
import { Button } from '@/components/ui/button';

type Detail = { recording: Recording; permissions: RecordingPermission[]; audits: { _id: string; action: string; actorId?: string; createdAt: string }[]; shares: { _id: string; expiresAt: string; revokedAt?: string }[] };
export function CallRecordingPlayer({ callId, recordingId, shareId }: { callId?: string; recordingId?: string; shareId?: string }) {
  const { orgId, authKey } = useCallRecordingApi();
  return <RecordingPlayerContent key={`${orgId}:${authKey}:${callId}:${recordingId}:${shareId}`} callId={callId} recordingId={recordingId} shareId={shareId} />;
}
function RecordingPlayerContent({ callId, recordingId, shareId }: { callId?: string; recordingId?: string; shareId?: string }) {
  const { request, mediaUrl, orgId, authKey } = useCallRecordingApi();
  const audio = useRef<HTMLAudioElement>(null);
  const generation = useRef(0);
  const [open, setOpen] = useState(!callId);
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [deleted, setDeleted] = useState(false);
  useEffect(() => {
    const element = audio.current;
    const clear = () => {
      generation.current += 1;
      element?.pause();
      element?.removeAttribute('src');
      element?.load();
      setSource('');
      setLink('');
    };
    window.addEventListener('suprah:clear-private-cache', clear);
    window.addEventListener('supraspace:refresh-crm-token', clear);
    return () => {
      generation.current += 1;
      element?.pause();
      element?.removeAttribute('src');
      element?.load();
      window.removeEventListener('suprah:clear-private-cache', clear);
      window.removeEventListener('supraspace:refresh-crm-token', clear);
    };
  }, [source]);
  const query = useQuery({ queryKey: ['call-recording', orgId, authKey, callId, recordingId, shareId], enabled: open, retry: false, gcTime: 0, queryFn: async () => {
    let id = recordingId;
    if (shareId) id = (await request<{ recording: Recording }>('get', `/recording-shares/${shareId}`)).recording._id;
    if (callId) id = (await request<{ recording: Recording | null }>('get', `/calls/${callId}/recording`)).recording?._id;
    return id ? request<Detail>('get', `/recordings/${id}`) : null;
  } });
  const record = query.data?.recording;
  const fileId = selected || record?.files[0]?._id;
  const command = async (run: () => Promise<void>) => { setBusy(true); setError(''); try { await run(); } catch (err) { setError(recordingError(err)); } finally { setBusy(false); } };
  const load = (mode: 'play' | 'download') => command(async () => {
    const current = generation.current;
    const session = await request<{ path: string }>('post', `/recordings/${record?._id}/media-session`, { mode, fileId, shareId });
    if (current !== generation.current) return;
    const url = mediaUrl(session.path);
    if (mode === 'play') setSource(url);
    else { const anchor = document.createElement('a'); anchor.href = url; anchor.download = `call-${record?._id}.mp3`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); }
  });
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 flex min-h-11 items-center gap-2 text-xs" title="Open call recording"><Headphones className="h-4 w-4" />Recording</button>;
  if (deleted) return <p role="status" className="mt-3 text-xs text-muted-foreground">Recording deleted</p>;
  return <section className="mt-3 min-w-0 space-y-3 border-t pt-3">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Call Recording</h3>{callId && <button className="flex h-11 w-11 items-center justify-center" aria-label="Close recording" onClick={() => { setSource(''); setOpen(false); }}><X className="h-4 w-4" /></button>}</div>
    {query.isPending && <Loader2 aria-label="Loading recording" className="h-4 w-4 animate-spin" />}
    {query.isError && <p role="alert" className="break-words text-xs text-red-500">{recordingError(query.error)}</p>}
    {query.isSuccess && !record && <p className="text-xs text-muted-foreground">No recording for this call</p>}
    {record && <>
      <p className="break-words text-xs">{record.state.replaceAll('-', ' ')}{record.incomplete ? ' - incomplete coverage' : ''}{record.expiresAt ? ` - expires ${new Date(record.expiresAt).toLocaleDateString()}` : ''}</p>
      {record.error && <p role="alert" className="break-words text-xs text-amber-600">{record.error}</p>}
      {record.files.length > 1 && <select aria-label="Recording segment" className="min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-sm" value={fileId} onChange={event => { setSelected(event.target.value); setSource(''); }}>{record.files.map((f, i) => <option key={f._id} value={f._id}>Segment {i + 1} - {new Date(f.startedAt).toLocaleTimeString()}</option>)}</select>}
      {source && <audio ref={audio} key={source} controls crossOrigin="use-credentials" preload="none" src={source} className="h-12 w-full min-w-0 max-w-full" onError={() => setError('Playback unavailable or session expired. Open playback again.')} />}
      <div className="flex flex-wrap gap-2">
        {fileId && <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void load('play')}><Headphones className="h-4 w-4" />Play</Button>}
        {fileId && query.data?.permissions.includes('download') && <Button variant="outline" size="icon" className="h-11 w-11" disabled={busy} title="Download recording" aria-label="Download recording" onClick={() => void load('download')}><Download className="h-4 w-4" /></Button>}
        {query.data?.permissions.includes('share') && <Button variant="outline" size="icon" className="h-11 w-11" disabled={busy} title="Share internally" aria-label="Share internally" onClick={() => void command(async () => { const share = await request<{ shareId: string }>('post', `/recordings/${record._id}/shares`); const url = `${window.location.origin}/crm/recordings/shared/${share.shareId}`; setLink(url); await navigator.clipboard?.writeText(url); await query.refetch(); })}><Share2 className="h-4 w-4" /></Button>}
        {query.data?.permissions.includes('review') && <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void command(async () => { await request('post', `/recordings/${record._id}/review`); await query.refetch(); })}><CheckCheck className="h-4 w-4" />Mark reviewed</Button>}
        {record.endedAt && ['failed', 'processing'].includes(record.state) && query.data?.permissions.includes('review') && <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void command(async () => { await request('post', `/recordings/${record._id}/retry`); await query.refetch(); })}><RefreshCw className="h-4 w-4" />Retry import</Button>}
        {record.endedAt && query.data?.permissions.includes('delete') && <Button variant="outline" size="icon" className="h-11 w-11" disabled={busy} title="Delete recording" aria-label="Delete recording" onClick={() => { if (window.confirm('Permanently delete this recording and revoke its shared links?')) void command(async () => { await request('delete', `/recordings/${record._id}`); setSource(''); setDeleted(true); }); }}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      {link && <input aria-label="Internal recording share link" readOnly value={link} className="min-h-11 w-full min-w-0 rounded-md border bg-background px-2 text-xs" onFocus={event => event.target.select()} />}
      {query.data?.permissions.includes('share') && query.data.shares.filter(s => !s.revokedAt && new Date(s.expiresAt) > new Date()).map(s => <div key={s._id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>Share expires {new Date(s.expiresAt).toLocaleDateString()}</span><Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => void command(async () => { await request('delete', `/recording-shares/${s._id}`); await query.refetch(); })}><X className="h-4 w-4" />Revoke</Button></div>)}
      <details className="text-xs"><summary className="min-h-11 cursor-pointer py-3">Access history</summary><ul className="max-h-52 space-y-2 overflow-auto">{query.data?.audits.map(a => <li key={a._id} className="break-words">{a.action} - {a.actorId || 'System'} - {new Date(a.createdAt).toLocaleString()}</li>)}</ul></details>
    </>}
    {error && <p role="alert" className="break-words text-xs text-red-500">{error}</p>}
  </section>;
}
