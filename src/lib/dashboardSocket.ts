import { io, Socket } from "socket.io-client";

/**
 * Shared Socket.IO client for the Appointment Dashboard chat.
 *
 * Connect lazily with a fresh auth token. We keep a single socket instance per
 * tab and reuse it. If the backend socket server isn't wired up yet, the
 * connection simply fails and the chat falls back to REST polling (handled in
 * the useDashboardChat hook) — so the UI keeps working either way.
 *
 * Configure the URL via NEXT_PUBLIC_SOCKET_URL (falls back to NEXT_PUBLIC_API_URL,
 * then same-origin).
 */

let socket: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export function getDashboardSocket(token: string): Socket {
  if (socket) {
    // Refresh auth in case the token rotated, then (re)connect if needed.
    (socket.auth as Record<string, unknown>) = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectDashboardSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}