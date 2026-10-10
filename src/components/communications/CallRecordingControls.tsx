"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pause, Play, ShieldCheck, Loader2 } from 'lucide-react';
import { useCallRecordingApi, recordingError, type Recording } from '@/hooks/useCallRecordingApi';

export function CallRecordingControls({ callId }: { callId?: string }) {
  const { request, orgId, authKey } = useCallRecordingApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['call-recording-control', orgId, authKey, callId], enabled: Boolean(callId), retry: false, refetchInterval: 2000, queryFn: () => request<{ recording: Recording | null; canControl: boolean }>('get', `/calls/${callId}/recording`) });
  const record = query.data?.recording;
  if (!record) return null;
  const action = record.state === 'paused' ? 'resume' : record.state === 'awaiting-consent' ? 'consent' : 'pause';
  const enabled = query.data?.canControl && ['paused', 'recording', 'awaiting-consent'].includes(record.state);
  const label = action === 'pause' ? 'Pause recording' : action === 'resume' ? 'Resume recording' : 'Confirm customer consent';
  return <div className="w-full min-w-0 border-t border-white/15 pt-2 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="break-words">Recording: {record.state.replaceAll('-', ' ')}{record.incomplete ? ' (incomplete coverage)' : ''}</span>
      {enabled && <button title={label} aria-label={label} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 disabled:opacity-50" onClick={async () => {
        if (action === 'consent' && !window.confirm('Has the customer given the consent required by the approved recording policy?')) return;
        setBusy(true); setError('');
        try { await request('post', `/calls/${callId}/recording/control`, { action }); } catch (err) { setError(recordingError(err)); }
        finally { setBusy(false); await query.refetch(); }
      }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : action === 'pause' ? <Pause className="h-4 w-4" /> : action === 'resume' ? <Play className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{label}</button>}</div>
    {(error || record.error) && <p role="alert" className="mt-1 break-words text-amber-300">{error || record.error}</p>}
  </div>;
}
