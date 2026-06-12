'use client';
import * as React from 'react';
import { JitsiMeet } from '../supra-space/JitsiMeet';
import type { CallSession } from '@/hooks/useCall';

/**
 * Renders a brief "connecting" screen, then the Jitsi room.
 * onClose fires when the user leaves the meeting — the page wires this to
 * call.endCall(meetingId) so the server writes the "Call ended" message.
 */
export function CallExperience({
  session,
  displayName,
  email,
  avatarUrl,
  onClose,
}: {
  session: CallSession;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  onClose: () => void;
}) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div className="ss4-overlay fixed inset-0 z-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 ss4-logo-mark ss4-calling-ring flex items-center justify-center rounded-2xl" />
          <p style={{ fontSize: 13, color: '#fff' }}>Connecting…</p>
        </div>
      </div>
    );
  }

  return (
    <JitsiMeet
      domain={session.jitsi.domain}
      roomName={session.jitsi.room}
      jwt={session.jitsi.jwt}
      displayName={displayName}
      email={email}
      avatarUrl={avatarUrl}
      onClose={onClose}
      onError={() => onClose()}
    />
  );
}
