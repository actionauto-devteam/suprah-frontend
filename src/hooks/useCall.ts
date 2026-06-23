'use client';
import * as React from 'react';
import type { Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { playCallSound, stopCallSound, showBrowserNotification, requestNotifPermission } from '@/lib/notification-sound';

export interface JitsiPayload {
  domain: string;
  room: string;
  jwt?: string;
}

export interface LiveCall {
  meetingId: string;
  roomName: string;
  conversationId: string;
  moderatorUserId: string;
  initiatedBy: string;
  startedAt: string;
  callerName?: string;
  participantCount?: number;
}

export interface CallSession {
  call: any;
  jitsi: JitsiPayload;
}

interface MeetingJoinRequestPayload {
  meetingId?: string;
  requester?: { name?: string; email?: string };
}

/**
 * Tracks live calls per conversation, surfaces incoming-call state, and exposes
 * start/join/end actions. State survives refresh/reconnect via refreshStatus().
 */
export function useCall(socket: Socket | null, token: string, uid: string) {
  const [liveCalls, setLiveCalls] = React.useState<Record<string, LiveCall>>({});
  const [incoming, setIncoming] = React.useState<LiveCall | null>(null);
  const incomingRef = React.useRef<LiveCall | null>(null);
  const callNotifRef = React.useRef<Notification | null>(null);

  React.useEffect(() => { incomingRef.current = incoming; }, [incoming]);

  // Ensure permission is available for call notifications
  React.useEffect(() => { requestNotifPermission(); }, []);

  // Resume ringtone when user tabs back while a call is still incoming
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && incomingRef.current) {
        playCallSound();
        callNotifRef.current?.close();
        callNotifRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  React.useEffect(() => {
    if (!socket) return;

    const onStarted = (c: LiveCall) => {
      setLiveCalls((p) => ({ ...p, [c.conversationId]: { ...c, participantCount: 1 } }));
      if (c.initiatedBy !== uid) {
        setIncoming(c);
        playCallSound();
        // Show persistent OS notification so user sees it in any tab/window
        callNotifRef.current?.close();
        callNotifRef.current = showBrowserNotification(
          `📞 Incoming call`,
          {
            body: `${c.callerName || 'Someone'} is calling you. Open Suprah to answer.`,
            tag: 'incoming-call',
            requireInteraction: true,
          }
        );
      }
    };
    const onCount = ({ conversationId, participantCount }: any) =>
      setLiveCalls((p) =>
        p[conversationId] ? { ...p, [conversationId]: { ...p[conversationId], participantCount } } : p
      );
    const onEnded = ({ conversationId }: any) => {
      setLiveCalls((p) => {
        const n = { ...p };
        delete n[conversationId];
        return n;
      });
      setIncoming((cur) => {
        if (cur?.conversationId === conversationId) {
          stopCallSound();
          callNotifRef.current?.close();
          callNotifRef.current = null;
          return null;
        }
        return cur;
      });
    };
    const onMeetingJoinRequested = (payload: MeetingJoinRequestPayload) => {
      showBrowserNotification('Meeting approval needed', {
        body: `${payload?.requester?.name || payload?.requester?.email || 'Someone'} is waiting to join.`,
        tag: `meeting-approval-${payload?.meetingId || 'request'}`,
      });
    };

    socket.on('call:started', onStarted);
    socket.on('call:participant-joined', onCount);
    socket.on('call:participant-left', onCount);
    socket.on('call:ended', onEnded);
    socket.on('meeting:join-requested', onMeetingJoinRequested);
    return () => {
      socket.off('call:started', onStarted);
      socket.off('call:participant-joined', onCount);
      socket.off('call:participant-left', onCount);
      socket.off('call:ended', onEnded);
      socket.off('meeting:join-requested', onMeetingJoinRequested);
    };
  }, [socket, uid]);

  const refreshStatus = React.useCallback(
    async (conversationId: string): Promise<CallSession | null> => {
      try {
        const r = await apiClient.get(`/api/calls/${conversationId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = r.data?.data as CallSession | null;
        setLiveCalls((p) => {
          const n = { ...p };
          if (data?.call) {
            const c = data.call;
            n[conversationId] = {
              meetingId: c.meetingId,
              roomName: c.roomName,
              conversationId,
              moderatorUserId: String(c.moderatorUserId),
              initiatedBy: String(c.initiatedBy),
              startedAt: c.startedAt,
              participantCount: (c.participants || []).filter((x: any) => !x.leftAt).length,
            };
          } else {
            delete n[conversationId];
          }
          return n;
        });
        return data;
      } catch {
        return null;
      }
    },
    [token]
  );

  const startCall = React.useCallback(
    async (conversationId: string): Promise<CallSession> => {
      const r = await apiClient.post(
        '/api/calls/start',
        { conversationId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return r.data?.data as CallSession;
    },
    [token]
  );

  const joinCall = React.useCallback(
    async (meetingId: string): Promise<CallSession> => {
      const r = await apiClient.post(
        '/api/calls/join',
        { meetingId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (r.status === 202 || r.data?.data?.status === 'pending') {
        const err = new Error('Waiting for host approval') as Error & { response?: typeof r };
        err.response = r;
        throw err;
      }
      stopCallSound();
      callNotifRef.current?.close();
      callNotifRef.current = null;
      setIncoming(null);
      return r.data?.data as CallSession;
    },
    [token]
  );

  const endCall = React.useCallback(
    async (meetingId: string) => {
      try {
        await apiClient.post('/api/calls/end', { meetingId }, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        /* best-effort */
      }
    },
    [token]
  );

  return { liveCalls, incoming, setIncoming, startCall, joinCall, endCall, refreshStatus };
}
