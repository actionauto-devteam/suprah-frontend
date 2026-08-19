'use client';
import * as React from 'react';
import { JitsiMeet } from './JitsiMeet';
import type { CallSession } from '@/hooks/useCall';
import { apiClient } from '@/lib/api-client';
import { AutrixPanel } from './AutrixPanel';
import { Check, Copy, Link2, Share2 } from 'lucide-react';

interface ConvMember {
  _id: string;
  fullName?: string;
  username?: string;
  avatar?: string;
}

const fmtElapsed = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function CallExperience({
  session,
  displayName,
  email,
  avatarUrl,
  currentUserId,
  token,
  conversationMembers = [],
  callRecording,
  onClose,
}: {
  session: CallSession;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  currentUserId: string;
  token: string;
  conversationMembers?: ConvMember[];
  callRecording?: { isRecording: boolean; startedAt: string | null } | null;
  onRecordingChange?: (v: { isRecording: boolean; startedAt: string | null } | null) => void;
  onClose: () => void;
}) {
  const [ready, setReady] = React.useState(false);
  const [permOpen, setPermOpen] = React.useState(false);
  const [autrixOpen, setAutrixOpen] = React.useState(false);
  const callTitle: string = session.call?.title ?? session.call?.meetingId ?? 'Meeting';
  const [grantedIds, setGrantedIds] = React.useState<string[]>(() =>
    (session.call?.recordingAllowedUsers ?? []).map(String)
  );
  const [toggling, setToggling] = React.useState<string | null>(null);
  const [recLoading, setRecLoading] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [linkCopied, setLinkCopied] = React.useState(false);

  const meetingId: string = session.call?.meetingId ?? '';
  const meetingLink: string = session.call?.meetingLink || (
    typeof window !== 'undefined' && meetingId ? `${window.location.origin}/crm/supra-space?meeting=${encodeURIComponent(meetingId)}` : ''
  );
  const moderatorUserId: string = String(session.call?.moderatorUserId ?? '');
  const isHost = currentUserId === moderatorUserId;
  const canRecord = true;
  const isRecording = callRecording?.isRecording ?? false;

  // Live elapsed timer — ticks every second while recording
  React.useEffect(() => {
    if (!isRecording || !callRecording?.startedAt) { setElapsed(0); return; }
    const startMs = new Date(callRecording.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRecording, callRecording?.startedAt]);

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  const startRecording = async () => {
    if (recLoading || !meetingId) return;
    setRecLoading(true);
    try {
      await apiClient.post(
        `/api/calls/meeting/${meetingId}/recording/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch { /* socket event updates state */ } finally { setRecLoading(false); }
  };

  const stopRecording = async () => {
    if (recLoading || !meetingId) return;
    setRecLoading(true);
    try {
      await apiClient.post(
        `/api/calls/meeting/${meetingId}/recording/stop`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch { /* socket event updates state */ } finally { setRecLoading(false); }
  };

  const togglePermission = async (userId: string) => {
    if (toggling) return;
    setToggling(userId);
    const isGranted = grantedIds.includes(userId);
    try {
      if (isGranted) {
        await apiClient.delete(`/api/calls/meeting/${meetingId}/grant-recording`, {
          data: { userId },
          headers: { Authorization: `Bearer ${token}` },
        });
        setGrantedIds((prev) => prev.filter((id) => id !== userId));
      } else {
        await apiClient.post(
          `/api/calls/meeting/${meetingId}/grant-recording`,
          { userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setGrantedIds((prev) => [...prev, userId]);
      }
    } catch {
      // Granting is legacy-only now; recording no longer depends on this.
    } finally {
      setToggling(null);
    }
  };

  const otherMembers = conversationMembers.filter((m) => m._id !== currentUserId && m._id !== moderatorUserId);

  const copyMeetingLink = async () => {
    if (!meetingLink) return;
    try {
      await navigator.clipboard.writeText(meetingLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      /* best-effort */
    }
  };
  const shareMeetingLink = async () => {
    if (!meetingLink) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: callTitle, text: 'Join my Suprah meeting', url: meetingLink });
      } else {
        await copyMeetingLink();
      }
    } catch {
      /* user cancelled or browser denied */
    }
  };

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
    <>
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

      {/* Autrix AI round button — top right */}
      <button
        onClick={() => setAutrixOpen(v => !v)}
        title="Autrix AI"
        style={{
          position: 'fixed',
          top: 14,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: autrixOpen
            ? 'linear-gradient(135deg, #6d28d9, #4338ca)'
            : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          border: autrixOpen
            ? '2px solid rgba(167,139,250,0.6)'
            : '2px solid rgba(255,255,255,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 215,
          backdropFilter: 'blur(10px)',
          boxShadow: autrixOpen
            ? '0 0 0 3px rgba(109,40,217,0.35), 0 4px 20px rgba(79,70,229,0.5)'
            : '0 4px 20px rgba(79,70,229,0.4)',
          transition: 'all 0.2s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L13.8 8.2L19.2 9.3L15.4 13.1L16.5 18.5L12 16L7.5 18.5L8.6 13.1L4.8 9.3L10.2 8.2L12 3Z"/>
        </svg>
      </button>

      {/* Autrix AI panel */}
      {autrixOpen && (
        <AutrixPanel
          token={token}
          callTitle={callTitle}
          onClose={() => setAutrixOpen(false)}
        />
      )}

      {/* REC badge — visible to ALL participants when recording is active */}
      {meetingLink && (
        <div style={{
          position: 'fixed',
          top: 14,
          left: 16,
          zIndex: 210,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 'min(440px, calc(100vw - 96px))',
          background: 'rgba(10,10,10,0.82)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 999,
          padding: '6px 8px 6px 12px',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
        }}>
          <Link2 size={15} color="#93c5fd" style={{ flexShrink: 0 }} />
          <span style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'rgba(255,255,255,0.82)',
            fontSize: 12,
            fontWeight: 600,
          }}>{meetingLink}</span>
          <button
            onClick={copyMeetingLink}
            title="Copy meeting link"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: linkCopied ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.08)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {linkCopied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button
            onClick={shareMeetingLink}
            title="Share meeting link"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Share2 size={15} />
          </button>
        </div>
      )}

      {isRecording && (
        <div style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 210,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: 'rgba(10,10,10,0.85)',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 999,
          padding: '5px 14px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 6px #ef4444',
            animation: 'pulse 1s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
            REC
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
            {fmtElapsed(elapsed)}
          </span>
        </div>
      )}

      {/* Record / Stop button — canRecord users only */}
      {canRecord && (
        <div style={{ position: 'fixed', top: 14, right: 60, zIndex: 215 }}>
          {isRecording ? (
            <button
              onClick={stopRecording}
              disabled={recLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 10, padding: '8px 16px',
                color: '#fca5a5', fontSize: 12, fontWeight: 700,
                cursor: recLoading ? 'wait' : 'pointer',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 14 }}>⏹</span>
              Stop · {fmtElapsed(elapsed)}
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={recLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(10,10,10,0.9)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '8px 16px',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: recLoading ? 'wait' : 'pointer',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 14, color: '#ef4444' }}>⏺</span>
              {recLoading ? 'Starting…' : 'Record'}
            </button>
          )}
        </div>
      )}

      {/* Host-only: Recording Permissions overlay */}
      {false && isHost && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 200 }}>
          <button
            onClick={() => setPermOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: permOpen ? '#4f46e5' : 'rgba(15,15,15,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '8px 14px',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 14 }}>⏺</span>
            Recording Permissions
            <span style={{
              background: grantedIds.length ? '#22c55e' : 'rgba(255,255,255,0.15)',
              borderRadius: 20, padding: '1px 7px', fontSize: 11,
            }}>
              {grantedIds.length}
            </span>
          </button>

          {permOpen && (
            <div style={{
              position: 'absolute', bottom: 46, right: 0, width: 270,
              background: 'rgba(14,15,17,0.97)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              backdropFilter: 'blur(20px)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>Recording Access</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Grant tray recording to participants</div>
                </div>
                <button onClick={() => setPermOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
              </div>

              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName} <span style={{ color: '#4f46e5', fontSize: 10 }}>HOST</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, background: 'rgba(34,197,94,0.12)', borderRadius: 6, padding: '2px 8px' }}>Always</div>
              </div>

              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {otherMembers.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#444', fontSize: 12 }}>No other members in this call</div>
                ) : (
                  otherMembers.map((member) => {
                    const granted = grantedIds.includes(member._id);
                    const isToggling = toggling === member._id;
                    const initials = (member.fullName || member.username || '?').charAt(0).toUpperCase();
                    return (
                      <div key={member._id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.fullName || member.username || 'Unknown'}
                          </div>
                        </div>
                        <button
                          onClick={() => togglePermission(member._id)}
                          disabled={isToggling}
                          style={{
                            background: granted ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                            border: `1px solid ${granted ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                            color: granted ? '#22c55e' : '#888',
                            cursor: isToggling ? 'wait' : 'pointer',
                            transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                          }}
                        >
                          {isToggling ? '…' : granted ? '⏺ Granted' : 'Grant'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: '#3a3a3a', lineHeight: 1.5 }}>Granted users can record this call from their tray-app.</div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
