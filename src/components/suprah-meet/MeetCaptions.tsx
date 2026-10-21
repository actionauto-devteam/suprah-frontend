"use client";

import { Captions, Loader2, X } from 'lucide-react';
import type { useSuprahMeet } from '@/hooks/useSuprahMeet';
import { cn } from '@/lib/utils';

type Meet = ReturnType<typeof useSuprahMeet>;

export function MeetCaptionsButton({ meet }: { meet: Meet }) {
  return (
    <button type="button" onClick={meet.toggleCaptions} aria-pressed={meet.captionsVisible}
      aria-label={meet.captionsVisible ? 'Hide captions' : 'Show captions'}
      title={meet.captionsVisible ? 'Hide captions' : 'Show captions'}
      className={cn('flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors',
        meet.captionsVisible ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-100' : 'border-emerald-400/20 text-emerald-200 hover:bg-emerald-400/10')}>
      <Captions className="size-5" aria-hidden="true" />
      <span className="hidden sm:inline">Captions</span>
    </button>
  );
}

export function MeetCaptionsPanel({ meet }: { meet: Meet }) {
  if (!meet.captionsVisible) return null;
  const active = ['starting', 'on', 'interrupted', 'stopping'].includes(meet.captionStatus);
  const lines = meet.captionLines.slice(-2);
  const statusText = meet.captionStatus === 'failed'
    ? 'Live captions are unavailable. The host can retry.'
    : meet.captionStatus === 'interrupted' ? 'Captions interrupted. Reconnecting…'
    : active ? 'Listening… captions appear when someone speaks.'
    : meet.canEndForAll ? 'Start live captions to subtitle this meeting.' : 'Waiting for the host to start live captions.';
  return (
    <section aria-label="Live captions" className="shrink-0 rounded-xl border border-emerald-400/25 bg-black/85 p-3 text-white shadow-lg">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-emerald-200">Live captions · English (US) <span className="font-normal text-white/50">· May contain errors</span></p>
        <button type="button" onClick={meet.toggleCaptions} aria-label="Hide captions" className="-my-1 grid min-h-11 min-w-11 place-items-center rounded-lg text-white/70 hover:bg-white/10">
          <X className="size-4" />
        </button>
      </div>
      <div role="log" aria-live="polite" aria-relevant="additions text" className="max-h-[22dvh] overflow-y-auto break-words text-sm leading-relaxed sm:text-base">
        {lines.length ? lines.map((line) => {
          const person = Object.values(meet.roster).find((entry) => entry.attendeeId === line.attendeeId || (line.speakerId && entry.crmUserId === line.speakerId));
          const fallback = meet.meeting?.participants.find((entry) => entry.crmUserId === line.speakerId)?.fullName;
          return <p key={line.id} className={cn('mb-1 last:mb-0', line.partial && 'text-white/80')}>
            <span className="mr-1.5 font-semibold text-emerald-300">{person?.name || fallback || 'Speaker'}:</span>{line.text}
          </p>;
        }) : <p className="py-1 text-sm text-white/65">{statusText}</p>}
      </div>
      {meet.canEndForAll && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
          <button type="button" disabled={meet.captionBusy} onClick={() => void meet.changeLiveCaptions(!active, 'en-US')}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-emerald-400/40 px-3 text-xs font-medium text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-50">
            {meet.captionBusy && <Loader2 className="size-3.5 animate-spin" />}
            {active ? 'Stop live captions' : 'Start live captions'}
          </button>
        </div>
      )}
    </section>
  );
}
