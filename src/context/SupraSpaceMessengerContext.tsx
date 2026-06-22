'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { useCrmToken } from '@/hooks/useCrmToken';
import { playMessageSound, requestNotifPermission, showNotificationViaSW, unlockAudio } from '@/lib/notification-sound';

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
  myAvatar: string | undefined;
  openChatPopup: (convId: string) => void;
  closeChatPopup: (convId: string) => void;
  toggleMinimize: (convId: string) => void;
  markAsRead: (convId: string) => void;
  refreshConversations: () => void;
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
  const crmToken                          = useCrmToken();
  const crmUserId                         = crmToken ? decodeCrmUserId(crmToken) : null;
  const [conversations, setConversations] = React.useState<SSConv[]>([]);
  const conversationsRef                  = React.useRef<SSConv[]>([]);
  const [socket, setSocket]               = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected]     = React.useState(false);
  const [openChats, setOpenChats]         = React.useState<string[]>([]);
  const [minimizedChats, setMinimizedChats] = React.useState<Set<string>>(new Set());
  const [myAvatar, setMyAvatar]           = React.useState<string | undefined>(undefined);

  // Keep ref in sync so socket handlers can read current conversations
  React.useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Request OS notification permission once on mount
  React.useEffect(() => { requestNotifPermission(); }, []);

  // Unlock AudioContext on first user gesture so playMessageSound() works
  // inside socket event handlers (which have no user gesture of their own).
  React.useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  // ── Fetch current user's own profile (for up-to-date avatar) ─────────────────
  React.useEffect(() => {
    if (!crmToken) return;
    apiClient.get('/api/crm/me', { headers: { Authorization: `Bearer ${crmToken}` } })
      .then(r => { const d = r.data?.data || r.data; if (d?.avatar) setMyAvatar(d.avatar); })
      .catch(() => {});
  }, [crmToken]);

  // ── Fetch conversations when CRM token is available ──────────────────────────
  const fetchConversations = React.useCallback(() => {
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

  React.useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Re-fetch conversations (and member avatars) when the window regains focus
  React.useEffect(() => {
    const onFocus = () => fetchConversations();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchConversations]);

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

    // New message → update conversation lastMessage + re-sort + sound
    s.on('message:new', ({ conversationId, message }: { conversationId: string; message: SSLastMessage }) => {
      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv._id === conversationId
            ? { ...conv, lastMessage: message, lastMessageAt: message.createdAt }
            : conv
        );
        return sortByLastMessage(updated);
      });
      if (message.sender?._id !== crmUserId) {
        playMessageSound();
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          const conv = conversationsRef.current.find(c => c._id === conversationId);
          const isGroup = conv?.type === 'group';
          const title = isGroup ? (conv?.name || 'New message') : (message.sender?.fullName || 'New message');
          const preview = message.content?.slice(0, 120) || (isGroup ? `${message.sender?.fullName} sent a message` : 'New message');
          const body = isGroup ? `${message.sender?.fullName}: ${preview}` : preview;
          showNotificationViaSW(title, { body, tag: conversationId });
        }
      }
    });

    // New conversation was created → prepend if not already in list
    s.on('conversation:new', (conv: SSConv) => {
      setConversations((prev) =>
        prev.find((c) => c._id === conv._id) ? prev : [conv, ...prev]
      );
    });

    // Profile updated → patch member avatars in all conversations
    s.on('user:profile:updated', ({ userId, avatar, fullName }: { userId: string; avatar?: string; fullName?: string }) => {
      if (userId === crmUserId && avatar) setMyAvatar(avatar);
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          members: conv.members.map((m) =>
            m._id === userId
              ? { ...m, ...(avatar ? { avatar } : {}), ...(fullName ? { fullName } : {}) }
              : m
          ),
        }))
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
        myAvatar,
        openChatPopup,
        closeChatPopup,
        toggleMinimize,
        markAsRead,
        refreshConversations: fetchConversations,
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
}
