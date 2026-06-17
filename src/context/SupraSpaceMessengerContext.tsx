'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';

// ─── Minimal types (full types live in useSupraSpaceSocket.ts) ─────────────────

export interface SSMember {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
  role: string;
}

export interface SSLastMessage {
  _id: string;
  conversationId: string;
  sender: { _id: string; fullName: string; username: string; avatar?: string };
  content: string;
  type: string;
  readBy: string[];
  isDeleted: boolean;
  createdAt: string;
}

export interface SSConv {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  members: SSMember[];
  lastMessage?: SSLastMessage;
  lastMessageAt?: string;
  theme?: { accent?: string | null };
  pinnedBy?: string[];
  archivedBy?: string[];
  deletedFor?: string[];
  createdBy: string;
}

// ─── Context shape ─────────────────────────────────────────────────────────────

interface MessengerCtxValue {
  conversations: SSConv[];
  totalUnread: number;
  crmUserId: string | null;
  crmToken: string | null;
  isConnected: boolean;
  openChats: string[];
  minimizedChats: Set<string>;
  socket: Socket | null;
  openChatPopup: (convId: string) => void;
  closeChatPopup: (convId: string) => void;
  toggleMinimize: (convId: string) => void;
  markAsRead: (convId: string) => void;
}

const MessengerContext = React.createContext<MessengerCtxValue | null>(null);

export function useSupraSpaceMessenger(): MessengerCtxValue {
  const ctx = React.useContext(MessengerContext);
  if (!ctx) throw new Error('useSupraSpaceMessenger must be inside SupraSpaceMessengerProvider');
  return ctx;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function decodeCrmUserId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || null;
  } catch { return null; }
}

function sortByLastMessage(convs: SSConv[]): SSConv[] {
  return [...convs].sort(
    (a, b) =>
      new Date(b.lastMessageAt || 0).getTime() -
      new Date(a.lastMessageAt || 0).getTime()
  );
}

const MAX_OPEN = 3;

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SupraSpaceMessengerProvider({ children }: { children: React.ReactNode }) {
  const [crmToken, setCrmToken]           = React.useState<string | null>(null);
  const [crmUserId, setCrmUserId]         = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<SSConv[]>([]);
  const [socket, setSocket]               = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected]     = React.useState(false);
  const [openChats, setOpenChats]         = React.useState<string[]>([]);
  const [minimizedChats, setMinimizedChats] = React.useState<Set<string>>(new Set());

  // ── Read CRM token from localStorage ────────────────────────────────────────
  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
    if (token) {
      setCrmToken(token);
      setCrmUserId(decodeCrmUserId(token));
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'crm_token') return;
      if (e.newValue) {
        setCrmToken(e.newValue);
        setCrmUserId(decodeCrmUserId(e.newValue));
      } else {
        setCrmToken(null);
        setCrmUserId(null);
        setConversations([]);
        setOpenChats([]);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ── Fetch conversations when CRM token is available ──────────────────────────
  React.useEffect(() => {
    if (!crmToken) return;
    apiClient
      .get('/api/supraspace/conversations', {
        headers: { Authorization: `Bearer ${crmToken}` },
        _skipAuthRefresh: true,
      } as any)
      .then((r) => {
        setConversations(sortByLastMessage(r.data?.data || []));
      })
      .catch(() => {});
  }, [crmToken]);

  // ── Socket connection ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!crmToken) return;

    const s = io(process.env.NEXT_PUBLIC_API_URL || '', {
      path: '/socket/supraspace',
      auth: { token: crmToken },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      setSocket(s);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // New message → update conversation lastMessage + re-sort
    s.on('message:new', ({ conversationId, message }: { conversationId: string; message: SSLastMessage }) => {
      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv._id === conversationId
            ? { ...conv, lastMessage: message, lastMessageAt: message.createdAt }
            : conv
        );
        return sortByLastMessage(updated);
      });
    });

    // New conversation was created → prepend if not already in list
    s.on('conversation:new', (conv: SSConv) => {
      setConversations((prev) =>
        prev.find((c) => c._id === conv._id) ? prev : [conv, ...prev]
      );
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [crmToken]);

  // ── Derived unread count ──────────────────────────────────────────────────────
  const totalUnread = React.useMemo(() => {
    if (!crmUserId) return 0;
    return conversations.filter((conv) => {
      const msg = conv.lastMessage;
      if (!msg || msg.isDeleted) return false;
      // Not sent by me and not yet in my readBy
      return msg.sender?._id !== crmUserId && !msg.readBy?.includes(crmUserId);
    }).length;
  }, [conversations, crmUserId]);

  // ── Chat popup controls ───────────────────────────────────────────────────────
  const openChatPopup = React.useCallback((convId: string) => {
    setOpenChats((prev) => {
      if (prev.includes(convId)) {
        setMinimizedChats((m) => { const n = new Set(m); n.delete(convId); return n; });
        return prev;
      }
      const next = [convId, ...prev].slice(0, MAX_OPEN);
      return next;
    });
    setMinimizedChats((m) => { const n = new Set(m); n.delete(convId); return n; });
  }, []);

  const closeChatPopup = React.useCallback((convId: string) => {
    setOpenChats((prev) => prev.filter((id) => id !== convId));
    setMinimizedChats((m) => { const n = new Set(m); n.delete(convId); return n; });
  }, []);

  const toggleMinimize = React.useCallback((convId: string) => {
    setMinimizedChats((prev) => {
      const n = new Set(prev);
      n.has(convId) ? n.delete(convId) : n.add(convId);
      return n;
    });
  }, []);

  // Emit mark:read and optimistically clear unread in local state
  const markAsRead = React.useCallback(
    (convId: string) => {
      socket?.emit('mark:read', { conversationId: convId });
      if (!crmUserId) return;
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id !== convId || !conv.lastMessage) return conv;
          return {
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              readBy: [...new Set([...(conv.lastMessage.readBy || []), crmUserId])],
            },
          };
        })
      );
    },
    [socket, crmUserId]
  );

  return (
    <MessengerContext.Provider
      value={{
        conversations,
        totalUnread,
        crmUserId,
        crmToken,
        isConnected,
        openChats,
        minimizedChats,
        socket,
        openChatPopup,
        closeChatPopup,
        toggleMinimize,
        markAsRead,
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
}
