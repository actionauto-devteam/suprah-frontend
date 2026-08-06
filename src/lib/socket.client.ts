import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;

const resolveSocketUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  if (typeof window === 'undefined') return configuredUrl;

  const host = window.location.hostname;
  const isLocalBrowser = host === 'localhost' || host === '127.0.0.1';
  const configuredIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(configuredUrl);

  // If the frontend is opened from a phone/PWA through the machine's LAN IP,
  // localhost would point to the phone. Use the same LAN host with backend port.
  if (configuredIsLocalhost && !isLocalBrowser) {
    return `${window.location.protocol}//${host}:5000`;
  }

  return configuredUrl;
};

export const initializeSocket = (token: string): Socket => {
  // Only reuse the existing connection if it's still authenticated with the
  // SAME token — otherwise a mode switch (e.g. CRM <-> Lot Tech) would silently
  // keep using the old auth context instead of reconnecting with the new one.
  if (socket && currentToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  if (socket) {
    // A token change requires a new authenticated connection, but do not call
    // removeAllListeners() for ordinary reconnects: multiple providers share
    // this singleton and own their own listener cleanup.
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  const SOCKET_URL = resolveSocketUrl();

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
};

export const joinConversation = (conversationId: string) => {
  if (socket && socket.connected) {
    socket.emit('join_conversation', conversationId);
  }
};

export const leaveConversation = (conversationId: string) => {
  if (socket && socket.connected) {
    socket.emit('leave_conversation', conversationId);
  }
};

export const emitTypingStart = (conversationId: string) => {
  if (socket && socket.connected) {
    socket.emit('typing_start', { conversationId });
  }
};

export const emitTypingStop = (conversationId: string) => {
  if (socket && socket.connected) {
    socket.emit('typing_stop', { conversationId });
  }
};
