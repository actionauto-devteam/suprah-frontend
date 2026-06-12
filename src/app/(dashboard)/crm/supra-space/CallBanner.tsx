'use client';
import * as React from 'react';
import { Phone, Users } from 'lucide-react';
import type { LiveCall } from '@/hooks/useCall';

/**
 * Persistent in-conversation banner shown while a call is active.
 * Displays active status, participant count, elapsed duration, and Join Call.
 */
export function CallBanner({ call, onJoin }: { call: LiveCall; onJoin: () => void }) {
  const [elapsed, setElapsed] = React.useState('00:00');

  React.useEffect(() => {
    const start = new Date(call.startedAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsed(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [call.startedAt]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 mx-3 mt-2 rounded-xl"
      style={{ background: 'var(--positive-muted)', border: '1px solid rgba(52,201,125,0.3)' }}
    >
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ background: 'var(--positive)', animation: 'ss4-call-ring 1.5s infinite' }}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-none" style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
          Meeting in progress
        </p>
        <div className="flex items-center gap-2 mt-1" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {call.participantCount ?? 1}
          </span>
          <span className="ss4-mono">{elapsed}</span>
        </div>
      </div>
      <button
        onClick={onJoin}
        className="ss4-send-btn h-8 px-3 flex items-center gap-1.5 font-semibold shrink-0"
        style={{ fontSize: 12 }}
      >
        <Phone className="h-3.5 w-3.5" /> Join Call
      </button>
    </div>
  );
}
