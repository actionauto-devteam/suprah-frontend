import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;
let tokenProvider: (() => Promise<string | null>) | null = null;
let recoveryListenersAttached = false;

/** Registered by AuthProvider so reconnects can use a refreshed token. */
export const setSocketTokenProvider = (provider: (() => Promise<string | null>) | null) => {
  tokenProvider = provider;
};

const decodeJwt = (token: string | null): { sub?: string; exp?: number } | null => {
  try {
    return token ? JSON.parse(atob(token.split(".")[1])) : null;
  } catch {
    return null;
  }
};

/**
 * Token for each (re)connect attempt. The token captured at connect time
 * expires, and a reconnect with it is rejected. When it has expired, use a
 * fresh token from the provider, but only for the SAME user (a different
 * identity, e.g. a CRM token, must keep its own token and reconnect path).
 */
const resolveHandshakeToken = async (): Promise<string | null> => {
  const current = decodeJwt(currentToken);
  const expired = typeof current?.exp === "number" && Date.now() >= current.exp * 1000 - 30_000;
  if (!expired || !tokenProvider) return currentToken;
  try {
    const fresh = await tokenProvider();
    if (fresh && decodeJwt(fresh)?.sub && decodeJwt(fresh)?.sub === current?.sub) {
      currentToken = fresh;
    }
  } catch {
    // Keep the current token; the server will reject it and we retry later.
  }
  return currentToken;
};

/** Reconnect as soon as the device is back online or the tab is visible. */
const attachRecoveryListeners = () => {
  if (recoveryListenersAttached || typeof window === "undefined") return;
  recoveryListenersAttached = true;
  const reconnectIfNeeded = () => {
    if (socket && !socket.connected && currentToken) socket.connect();
  };
  window.addEventListener("online", reconnectIfNeeded);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reconnectIfNeeded();
  });
};

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
    // Evaluated on every (re)connect attempt so an expired token is replaced.
    auth: (cb) => {
      resolveHandshakeToken().then((resolved) => cb({ token: resolved ?? token }));
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    // Keep retrying (with backoff) instead of giving up after ~25 seconds.
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
  });
  attachRecoveryListeners();

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    // The server disconnects a user whose access changed (for example removed
    // from an organization). Reconnect so rooms are rebuilt from current
    // access; socket.io does not retry this reason on its own.
    if (reason === 'io server disconnect') {
      // Let the app re-check the signed-in user's role and organization.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('suprah:access-changed'));
      }
      setTimeout(() => {
        if (socket && !socket.connected && currentToken) socket.connect();
      }, 1000);
    }
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
