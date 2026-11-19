/**
 * Single shared connection to the "/deal-desk" socket namespace.
 *
 * ⚠️ INTEGRATION SEAM — if your socket.io server uses a custom `path`
 * (anything other than "/socket.io"), set NEXT_PUBLIC_SOCKET_PATH.
 */
import { io, type Socket } from 'socket.io-client';
import { apiBase, getDealDeskToken } from './http';

let socket: Socket | null = null;
let refs = 0;
const statusListeners = new Set<(connected: boolean) => void>();

export function getDealDeskSocket(): Socket {
  if (socket) return socket;
  socket = io(`${apiBase()}/deal-desk`, {
    path: process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    auth: (cb) => {
      getDealDeskToken().then((token) => cb(token ? { token } : {}));
    },
  });
  socket.on('connect', () => statusListeners.forEach((l) => l(true)));
  socket.on('disconnect', () => statusListeners.forEach((l) => l(false)));
  return socket;
}

/** Ref-counted: the connection closes when the last consumer unmounts. */
export function retainDealDeskSocket(): Socket {
  refs++;
  return getDealDeskSocket();
}

export function releaseDealDeskSocket() {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && socket) {
    const s = socket;
    setTimeout(() => {
      if (refs === 0 && socket === s) {
        s.disconnect();
        socket = null;
      }
    }, 3000);
  }
}

export function onSocketStatus(fn: (connected: boolean) => void) {
  statusListeners.add(fn);
  if (socket) fn(socket.connected);
  return () => {
    statusListeners.delete(fn);
  };
}
