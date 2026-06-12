'use client';
import * as React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import type { LiveCall } from '@/hooks/useCall';

export function IncomingCallModal({
  call,
  onJoin,
  onDismiss,
}: {
  call: LiveCall;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    try {
      audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(() => {
        /* autoplay may be blocked until user gesture */
      });
    } catch {
      /* no-op */
    }
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  return (
    <div className="ss4-overlay fixed inset-0 z-200 flex items-center justify-center p-4">
      <div className="ss4-modal w-full max-w-xs p-6 flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-2xl ss4-ava-accent ss4-calling-ring flex items-center justify-center mb-4">
          <Video className="h-7 w-7 text-white" />
        </div>
        <p className="ss4-display font-bold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
          {call.callerName || 'Someone'} started a call
        </p>
        <p className="mt-1" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Tap to join
        </p>
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={onDismiss}
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--danger-muted)', color: 'var(--danger)' }}
          >
            <PhoneOff className="h-5 w-5" />
          </button>
          <button
            onClick={onJoin}
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--positive)', color: '#fff' }}
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
