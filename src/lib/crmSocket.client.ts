import { io, Socket } from 'socket.io-client';

let crmSocket: Socket | null = null;

export const initializeCrmSocket = (token: string): Socket => {
  if (crmSocket && crmSocket.connected) return crmSocket;

  if (crmSocket) {
    crmSocket.removeAllListeners();
    crmSocket.disconnect();
    crmSocket = null;
  }

  const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  crmSocket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  crmSocket.on('connect', () => console.log('CRM Socket connected:', crmSocket?.id));
  crmSocket.on('disconnect', (reason) => console.log('CRM Socket disconnected:', reason));
  crmSocket.on('connect_error', (err) => console.error('CRM Socket error:', err));

  return crmSocket;
};

export const getCrmSocket = (): Socket | null => crmSocket;

export const disconnectCrmSocket = (): void => {
  if (crmSocket) {
    crmSocket.removeAllListeners();
    crmSocket.disconnect();
    crmSocket = null;
  }
};
