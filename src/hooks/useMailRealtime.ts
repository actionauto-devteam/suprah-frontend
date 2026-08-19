'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * useMailRealtime — subscribes to Suprah Mail push events on the main
 * Socket.io server (the same server socketEmitter's emitToUser targets, which
 * joins each authenticated socket to its `user:{id}` room — identical to how
 * the TimeProof clock receives `time-in`/`time-out` events).
 *
 * Events:
 *   mail:inbox:update        { added[], changed[], deleted[], fullResync? }
 *   mail:conversation:message { conversationId, message }
 *
 * The page pairs this with a slow polling fallback, so mail still flows even
 * if the socket is briefly down — realtime is an accelerator, not a single
 * point of failure.
 */

export interface MailInboxUpdate {
  added?: string[];
  changed?: string[];
  deleted?: string[];
  fullResync?: boolean;
}

export interface MailConversationPush {
  conversationId: string;
  message: any;
}

export function useMailRealtime(
  token: string | null,
  handlers: {
    onInboxUpdate?: (u: MailInboxUpdate) => void;
    onConversationMessage?: (p: MailConversationPush) => void;
    onConnectionReady?: () => void;
  },
) {
  const [connected, setConnected] = React.useState(false);
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;

  React.useEffect(() => {
    if (!token) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const socket: Socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
    });

    const onInbox = (u: MailInboxUpdate) => {
      if (!u || typeof u !== 'object') return;
      handlersRef.current.onInboxUpdate?.(u);
    };

    const onConv = (p: MailConversationPush) => {
      if (!p?.conversationId || !p?.message) return;
      handlersRef.current.onConversationMessage?.(p);
    };

    const onConnect = () => {
      setConnected(true);
      // Run a read-only reconciliation whenever the socket first connects or
      // reconnects. This closes the gap for events that may have happened while
      // the browser/network was temporarily offline.
      handlersRef.current.onConnectionReady?.();
    };

    const onDisconnected = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnected);
    socket.on('connect_error', onDisconnected);
    socket.on('mail:inbox:update', onInbox);
    socket.on('mail:conversation:message', onConv);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnected);
      socket.off('connect_error', onDisconnected);
      socket.off('mail:inbox:update', onInbox);
      socket.off('mail:conversation:message', onConv);
      socket.disconnect();
    };
  }, [token]);

  return { connected };
}

export default useMailRealtime;