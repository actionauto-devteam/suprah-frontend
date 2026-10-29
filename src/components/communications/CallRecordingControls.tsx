"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Circle, Pause, Play, Loader2 } from 'lucide-react';
import { useCallRecordingApi, recordingError, type Recording } from '@/hooks/useCallRecordingApi';

const STATUS: Record<string, string> = {
  waiting: 'Starting recording...',
  disclosing: 'Playing the recording announcement...',
  starting: 'Starting recording...',
  'start-pending': 'Starting recording...',
  recording: 'Recording',
  pausing: 'Pausing...',
  paused: 'Recording paused',
  resuming: 'Resuming...',
  unknown: 'Recording status unknown',
  processing: 'Saving recording...',
  ready: 'Recording saved',
  failed: 'Recording failed',
};
const button = 'flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 font-semibold disabled:opacity-50';

export function CallRecordingControls({ callId }: { callId?: string }) {
  const { request, orgId, authKey } = useCallRecordingApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['call-recording-control', orgId, authKey, callId], enabled: Boolean(callId), retry: false, refetchInterval: 2000, queryFn: () => request<{ recording: Recording | null; canStart: boolean; canControl: boolean }>('get', `/calls/${callId}/recording`) });
  if (!callId || !query.data) return null;
  const { recording: record, canStart, canControl } = query.data;
  const run = async (action: 'start' | 'pause' | 'resume') => {
    setBusy(true); setError('');
    try { await request('post', `/calls/${callId}/recording/control`, { action }); } catch (err) { setError(recordingError(err)); }
    finally { setBusy(false); await query.refetch(); }
  };
  const showStart = !record || canStart;
  const status = showStart ? (canStart ? 'Not recording' : 'Record is available once the call is connected') : STATUS[record.state] || record.state.replaceAll('-', ' ');
  const problem = error || (record?.state === 'failed' || record?.state === 'unknown' ? record.error : '');
  return <div className="w-full min-w-0 border-t border-white/15 pt-2 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 break-words" role="status">
        {record?.state === 'recording' && !showStart && <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 motion-safe:animate-pulse" />}
        {status}
      </span>
      {showStart && <button type="button" className={button} disabled={busy || !canStart} title="Record this call" aria-label="Record this call" onClick={() => void run('start')}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4 fill-red-500 text-red-500" />}Record</button>}
      {!showStart && canControl && record.state === 'recording' && <button type="button" className={button} disabled={busy} title="Pause recording" aria-label="Pause recording" onClick={() => void run('pause')}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}Pause</button>}
      {!showStart && canControl && record.state === 'paused' && <button type="button" className={button} disabled={busy} title="Resume recording" aria-label="Resume recording" onClick={() => void run('resume')}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Resume</button>}
    </div>
    {problem && <p role="alert" className="mt-1 break-words text-amber-300">{problem}</p>}
  </div>;
}
