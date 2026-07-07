'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';

export interface SSAttachment {
  url: string;
  fileKey?: string;
  originalName: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  duration?: number;        // seconds (voice notes)
}

export interface SSReaction { emoji: string; users: string[] }
export interface SSGif { url: string; width?: number; height?: number; title?: string }
export interface SSPollOption { id: string; text: string; votes: string[] }
export interface SSPoll { question: string; options: SSPollOption[]; allowMultiple: boolean; closed: boolean }
export interface SSEvent {
  title: string; description?: string; location?: string;
  startTime: string; endTime?: string | null;
  going: string[]; maybe: string[]; declined: string[];
}

export interface SSMessage {
  _id: string;
  conversationId: string;
  sender: { _id: string; fullName: string; username: string; avatar?: string };
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'voice' | 'gif' | 'poll' | 'event';
  attachments: SSAttachment[];
  gif?: SSGif | null;
  poll?: SSPoll | null;
  event?: SSEvent | null;
  replyTo?: SSMessage | null;
  reactions: SSReaction[];
  readBy: string[];
  metadata?: {
    meeting?: {
      meetingId: string;
      meetingLink: string;
      title: string;
      scheduledAt?: string | null;
      allowedDomain?: string;
    } | null;
  };
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface SSTheme {
  accent?: string | null;
  bubble?: string | null;
  wallpaper?: string | null;
  emoji?: string | null;
}

export interface SSConversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  emoji?: string | null;
  avatar?: string;
  members: Array<{ _id: string; fullName: string; username: string; avatar?: string; role: string }>;
  admins: string[];
  pinnedBy?: string[];
  archivedBy?: string[];
  deletedFor?: string[];
  theme?: SSTheme;
  lastMessage?: SSMessage;
  lastMessageAt?: string;
  unreadCount?: number;
  createdBy: string;
  spaceId?: string | null;
}

export interface PresenceMap { [userId: string]: 'online' | 'offline' }
export interface TypingMap { [conversationId: string]: Array<{ userId: string; fullName: string }> }

interface UseSupraSpaceReturn {
  socket: Socket | null;
  isConnected: boolean;
  presence: PresenceMap;
  typing: TypingMap;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  markRead: (conversationId: string) => void;
}

export function useSupraSpaceSocket(token: string | null): UseSupraSpaceReturn {
  const socketRef = React.useRef<Socket | null>(null);
  const [socketState, setSocketState] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [presence, setPresence] = React.useState<PresenceMap>({});
  const [typing, setTyping] = React.useState<TypingMap>({});

  React.useEffect(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || '', {
      path: '/socket/supraspace',
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SupraSpace] ✅ Connected via', socket.io.engine.transport.name, '| id:', socket.id);
      setIsConnected(true);
      setSocketState(socket);
      socket.emit('presence:request'); // ask for the current online roster
    });

    socket.io.engine.on('upgrade', (transport: any) => {
      console.log('[SupraSpace] 🔼 Upgraded transport to:', transport.name);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SupraSpace] ❌ Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[SupraSpace] Connection error:', err.message);
    });

    // NEW: full online roster seeded on connect
    socket.on('presence:sync', (userIds: string[]) => {
      const next: PresenceMap = {};
      (userIds || []).forEach((id) => { next[id] = 'online'; });
      setPresence(next);
    });

    socket.on('presence:update', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      setPresence((prev) => ({ ...prev, [userId]: status }));
    });

    socket.on('typing:start', ({ conversationId, userId, fullName }: any) => {
      setTyping((prev) => {
        const existing = prev[conversationId] || [];
        if (existing.find((t) => t.userId === userId)) return prev;
        return { ...prev, [conversationId]: [...existing, { userId, fullName }] };
      });
    });

    socket.on('typing:stop', ({ conversationId, userId }: any) => {
      setTyping((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter((t) => t.userId !== userId),
      }));
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        socket.connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setIsConnected(false);
    };
  }, [token]);

  const joinConversation = React.useCallback((conversationId: string) => {
    socketRef.current?.emit('join:conversation', { conversationId });
  }, []);
  const leaveConversation = React.useCallback((conversationId: string) => {
    socketRef.current?.emit('leave:conversation', { conversationId });
  }, []);
  const sendTypingStart = React.useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:start', { conversationId });
  }, []);
  const sendTypingStop = React.useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:stop', { conversationId });
  }, []);
  const markRead = React.useCallback((conversationId: string) => {
    socketRef.current?.emit('mark:read', { conversationId });
  }, []);

  return { socket: socketState, isConnected, presence, typing, joinConversation, leaveConversation, sendTypingStart, sendTypingStop, markRead };
}
