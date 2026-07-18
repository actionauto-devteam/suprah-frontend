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
  unreadCount?: number;
  theme?: { accent?: string | null };
  pinnedBy?: string[];
  archivedBy?: string[];
  deletedFor?: string[];
  notificationPreference?: NotifPref;
  createdBy: string;
  spaceId?: string | null;
}

export interface SSSpace {
  _id: string;
  name: string;
  emoji?: string | null;
  members: SSMember[];
  admins: string[];
  createdBy: string;
  createdAt: string;
}

// ─── Context shape ─────────────────────────────────────────────────────────────

export type NotifPref = { type: 'all' | 'main' | 'foryou' | 'none'; muted: boolean };
type SupraSpaceRequestConfig = {
  headers: { Authorization: string };
  _skipAuthRefresh?: boolean;
};

interface MessengerCtxValue {
  conversations: SSConv[];
  spaces: SSSpace[];
  totalUnread: number;
  crmUserId: string | null;
  crmToken: string | null;
  myFullName: string;
  isLoadingConversations: boolean;
  conversationError: boolean;
  isConnected: boolean;
  openChats: string[];
  minimizedChats: Set<string>;
  socket: Socket | null;
  myAvatar: string | undefined;
  notifPrefs: Record<string, NotifPref>;
  setNotifPrefs: React.Dispatch<React.SetStateAction<Record<string, NotifPref>>>;
  openChatPopup: (convId: string) => void;
  closeChatPopup: (convId: string) => void;
  toggleMinimize: (convId: string) => void;
  markAsRead: (convId: string) => void;
  refreshConversations: () => void;
  refreshSpaces: () => void;
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

function mentionBoundaryRegex(alias: string): RegExp | null {
  const normalized = alias.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return new RegExp(`(^|[^\\w@])@${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\w])`, 'i');
}

function mentionAliasesForName(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const aliases = new Set<string>();
  if (parts.length) aliases.add(parts[0]);
  if (parts.length >= 2) aliases.add(`${parts[0]} ${parts[parts.length - 1]}`);
  if (fullName.trim()) aliases.add(fullName.trim());
  return [...aliases];
}

function isUserMentioned(content: string, fullName: string): boolean {
  if (/(^|[^\w@])@all(?=$|[^\w])/i.test(content)) return true;
  return mentionAliasesForName(fullName).some((alias) => mentionBoundaryRegex(alias)?.test(content));
}

function shouldNotify(pref: NotifPref, isMentioned: boolean): boolean {
  if (pref.muted || pref.type === 'none') return false;
  if (pref.type === 'foryou') return isMentioned;
  return true;
}

function defaultNotifPref(): NotifPref {
  return { type: 'all', muted: false };
}

function authConfig(token: string, skipAuthRefresh = false): SupraSpaceRequestConfig {
  return {
    headers: { Authorization: `Bearer ${token}` },
    ...(skipAuthRefresh ? { _skipAuthRefresh: true } : {}),
  };
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SupraSpaceMessengerProvider({ children }: { children: React.ReactNode }) {
  const crmToken                          = useCrmToken();
  const crmUserId                         = crmToken ? decodeCrmUserId(crmToken) : null;
  const [conversations, setConversations] = React.useState<SSConv[]>([]);
  const [spaces, setSpaces]               = React.useState<SSSpace[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = React.useState(false);
  const [conversationError, setConversationError] = React.useState(false);
  const conversationsRef                  = React.useRef<SSConv[]>([]);
  const tokenRecoveryAttemptedRef         = React.useRef(false);
  const [socket, setSocket]               = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected]     = React.useState(false);
  const [openChats, setOpenChats]         = React.useState<string[]>([]);
  const [minimizedChats, setMinimizedChats] = React.useState<Set<string>>(new Set());
  const [myAvatar, setMyAvatar]           = React.useState<string | undefined>(undefined);
  const [myFullName, setMyFullName]       = React.useState('');
  const [notifPrefs, setNotifPrefs]       = React.useState<Record<string, NotifPref>>({});

  // Refs so socket handlers always see current values (stale-closure safety)
  const notifPrefsRef  = React.useRef<Record<string, NotifPref>>({});
  const myFullNameRef  = React.useRef('');
  React.useEffect(() => { notifPrefsRef.current = notifPrefs; }, [notifPrefs]);
  React.useEffect(() => { myFullNameRef.current = myFullName; }, [myFullName]);

  const resolveNotifPref = React.useCallback((conversationId: string): NotifPref => {
    const serverPref = conversationsRef.current.find(c => c._id === conversationId)?.notificationPreference;
    return (
      serverPref ||
      notifPrefsRef.current[conversationId] ||
      defaultNotifPref()
    );
  }, []);

  // Load persisted prefs when we know who the user is
  React.useEffect(() => {
    if (!crmUserId) return;
    try {
      const saved = localStorage.getItem(`ss4_notif_prefs_${crmUserId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, NotifPref>;
      setNotifPrefs(parsed);
      const migrationKey = `ss4_notif_prefs_migrated_${crmUserId}`;
      if (crmToken && !localStorage.getItem(migrationKey)) {
        Object.entries(parsed).forEach(([conversationId, pref]) => {
          apiClient
            .patch(`/api/supraspace/conversations/${conversationId}/notifications`, pref, {
              ...authConfig(crmToken, true),
            })
            .catch(() => {});
        });
        localStorage.setItem(migrationKey, '1');
      }
    } catch {}
  }, [crmUserId, crmToken]);

  // Persist whenever prefs change
  React.useEffect(() => {
    if (!crmUserId) return;
    try {
      localStorage.setItem(`ss4_notif_prefs_${crmUserId}`, JSON.stringify(notifPrefs));
    } catch {}
  }, [notifPrefs, crmUserId]);

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
      .then(r => { const d = r.data?.data || r.data; if (d?.avatar) setMyAvatar(d.avatar); if (d?.fullName) setMyFullName(d.fullName); })
      .catch(() => {});
  }, [crmToken]);

  // ── Fetch conversations when CRM token is available ──────────────────────────
  const fetchConversations = React.useCallback(() => {
    if (!crmToken) return;
    setIsLoadingConversations(true);
    setConversationError(false);
    apiClient
      .get('/api/supraspace/conversations', {
        ...authConfig(crmToken, true),
      })
      .then((r) => {
        const next = sortByLastMessage(r.data?.data || []);
        setConversations(next);
        const serverPrefs = next.reduce<Record<string, NotifPref>>((acc, conv) => {
          if (conv.notificationPreference) acc[conv._id] = conv.notificationPreference;
          return acc;
        }, {});
        if (Object.keys(serverPrefs).length) {
          setNotifPrefs(prev => ({ ...prev, ...serverPrefs }));
        }
        if (next.length > 0) tokenRecoveryAttemptedRef.current = false;
        if (next.length === 0 && !tokenRecoveryAttemptedRef.current && typeof window !== 'undefined') {
          tokenRecoveryAttemptedRef.current = true;
          window.dispatchEvent(new Event('supraspace:refresh-crm-token'));
        }
      })
      .catch(() => {
        setConversationError(true);
        if (!tokenRecoveryAttemptedRef.current && typeof window !== 'undefined') {
          tokenRecoveryAttemptedRef.current = true;
          window.dispatchEvent(new Event('supraspace:refresh-crm-token'));
        }
      })
      .finally(() => setIsLoadingConversations(false));
  }, [crmToken]);

  // ── Fetch spaces ─────────────────────────────────────────────────────────────
  const fetchSpaces = React.useCallback(() => {
    if (!crmToken) return;
    apiClient
      .get('/api/supraspace/spaces', {
        ...authConfig(crmToken, true),
      })
      .then((r) => { setSpaces(r.data?.data || []); })
      .catch(() => {});
  }, [crmToken]);

  React.useEffect(() => { fetchConversations(); }, [fetchConversations]);
  React.useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

  // Re-fetch on window focus AND on page visibility (covers PWA foreground transitions).
  React.useEffect(() => {
    const onFocus = () => { fetchConversations(); fetchSpaces(); };
    const onVisible = () => { if (document.visibilityState === 'visible') { fetchConversations(); fetchSpaces(); } };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchConversations, fetchSpaces]);

  // ── Socket connection ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!crmToken) return;

    const s = io(process.env.NEXT_PUBLIC_API_URL || '', {
      path: '/socket/supraspace',
      auth: { token: crmToken },
      // Start with polling so the connection survives mobile network transitions;
      // upgrade to websocket once the connection is stable.
      transports: ['polling', 'websocket'],
      upgrade: true,
      // Never stop retrying — mobile devices can background the app for long
      // periods and the socket must recover automatically when they return.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      // Keep the connection alive through brief network gaps (mobile switching).
      timeout: 20000,
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
        const updated = prev.map((conv) => {
          if (conv._id !== conversationId) return conv;
          const isIncomingUnread = message.sender?._id !== crmUserId && !message.readBy?.includes(crmUserId || '');
          return {
            ...conv,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: isIncomingUnread ? (conv.unreadCount || 0) + 1 : 0,
          };
        });
        return sortByLastMessage(updated);
      });
      if (message.sender?._id !== crmUserId) {
        const pref = resolveNotifPref(conversationId);
        const isMentioned = isUserMentioned(message.content || '', myFullNameRef.current);
        if (shouldNotify(pref, isMentioned)) {
          playMessageSound();
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
            const conv = conversationsRef.current.find(c => c._id === conversationId);
            const isGroup = conv?.type === 'group';
            const nextUnreadCount = (conv?.unreadCount || 0) + 1;
            const title = isGroup ? (conv?.name || 'New message') : (message.sender?.fullName || 'New message');
            const preview = message.content?.slice(0, 120) || (isGroup ? `${message.sender?.fullName} sent a message` : 'New message');
            const body = nextUnreadCount >= 2 ? `${nextUnreadCount} new messages` : isGroup ? `${message.sender?.fullName}: ${preview}` : preview;
            showNotificationViaSW(title, {
              body,
              tag: conversationId,
              url: `/crm/supra-space?conversationId=${encodeURIComponent(conversationId)}&messageId=${encodeURIComponent(message._id)}`,
            });
          }
        }
      }
    });

    // New conversation was created → prepend if not already in list
    s.on('conversation:new', (conv: SSConv) => {
      if (conv.notificationPreference) {
        setNotifPrefs(prev => ({ ...prev, [conv._id]: conv.notificationPreference! }));
      }
      setConversations((prev) =>
        prev.find((c) => c._id === conv._id) ? prev : [conv, ...prev]
      );
    });

    s.on('conversation:notification-preference', ({ conversationId, preference }: { conversationId: string; preference: NotifPref }) => {
      setNotifPrefs(prev => ({ ...prev, [conversationId]: preference }));
      setConversations(prev => prev.map(conv =>
        conv._id === conversationId ? { ...conv, notificationPreference: preference } : conv
      ));
    });

    // Conversation moved to/from a space
    s.on('conversation:moved', ({ conversationId, spaceId }: { conversationId: string; spaceId: string | null }) => {
      setConversations((prev) =>
        prev.map((c) => c._id === conversationId ? { ...c, spaceId: spaceId || null } : c)
      );
    });

    // New space created
    s.on('space:new', ({ space }: { space: SSSpace }) => {
      setSpaces((prev) => prev.find(sp => sp._id === space._id) ? prev : [...prev, space]);
    });

    // Space updated
    s.on('space:updated', ({ space }: { space: SSSpace }) => {
      setSpaces((prev) => prev.map(sp => sp._id === space._id ? space : sp));
    });

    // Space deleted → remove from list, unlink conversations
    s.on('space:deleted', ({ spaceId }: { spaceId: string }) => {
      setSpaces((prev) => prev.filter(sp => sp._id !== spaceId));
      setConversations((prev) =>
        prev.map((c) => c.spaceId === spaceId ? { ...c, spaceId: null } : c)
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

    // Reconnect immediately when the PWA/tab comes back to the foreground.
    // On mobile the OS can suspend socket I/O while backgrounded; this ensures
    // the socket is live again before the user sees the chat UI.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !s.connected) {
        s.connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
      if ((conv.unreadCount || 0) > 0) return true;
      const msg = conv.lastMessage;
      if (!msg || msg.isDeleted) return false;
      return msg.sender?._id !== crmUserId && !msg.readBy?.includes(crmUserId);
    }).length;
  }, [conversations, crmUserId]);

  // ── Chat popup controls ───────────────────────────────────────────────────────
  const openChatPopup = React.useCallback((convId: string) => {
    setOpenChats((prev) => {
      if (prev.includes(convId)) {
        setMinimizedChats((m) => { const n = new Set(m); n.delete(convId); return n; });
        return [convId, ...prev.filter((id) => id !== convId)];
      }
      const next = [convId, ...prev];
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
            unreadCount: 0,
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
        spaces,
        totalUnread,
        crmUserId,
        crmToken,
        myFullName,
        isLoadingConversations,
        conversationError,
        isConnected,
        openChats,
        minimizedChats,
        socket,
        myAvatar,
        notifPrefs,
        setNotifPrefs,
        openChatPopup,
        closeChatPopup,
        toggleMinimize,
        markAsRead,
        refreshConversations: fetchConversations,
        refreshSpaces: fetchSpaces,
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
}
