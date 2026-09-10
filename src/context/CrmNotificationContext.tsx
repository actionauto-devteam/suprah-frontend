'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '@/types/notification';
import { useCrmToken } from '@/hooks/useCrmToken';
import { useAuth } from '@/providers/AuthProvider';
import { initializeSocket } from '@/lib/socket.client';

interface FetchNotificationsOptions {
    limit?: number;
    skip?: number;
    isRead?: boolean;
}

interface CrmNotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    totalCount: number;
    isLoading: boolean;
    error: string | null;
    fetchNotifications: (options?: FetchNotificationsOptions) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    deleteAllRead: () => Promise<void>;
}

const CrmNotificationContext = createContext<CrmNotificationContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const POLL_INTERVAL = 20000;
const MAX_BACKOFF = 300000;
const DEFAULT_FETCH_OPTIONS: FetchNotificationsOptions = { limit: 50, skip: 0 };

/**
 * CRM-identity (CrmUser) notifications remain a distinct feed from the main
 * User notification context. REST continues to authenticate with crm_token.
 *
 * Real-time delivery reuses the existing main-app socket singleton instead of
 * opening/re-authenticating a second Socket.IO connection. The backend joins
 * that socket to a dedicated crm-user:{CrmUser._id} room and emits namespaced
 * crm:notification:* events, so main User notifications and CRM notifications
 * can never be mistaken for one another even though they share one socket.
 * Polling remains as a reconciliation/offline fallback.
 */
export function CrmNotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const backoffRef = useRef(POLL_INTERVAL);
    const fetchRef = useRef<((options?: FetchNotificationsOptions) => Promise<void>) | undefined>(undefined);
    const activeFetchOptionsRef = useRef<FetchNotificationsOptions>(DEFAULT_FETCH_OPTIONS);
    const crmToken = useCrmToken();
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const fetchNotifications = useCallback(async (options?: FetchNotificationsOptions) => {
        const nextOptions: FetchNotificationsOptions = { ...activeFetchOptionsRef.current };

        if (options?.limit !== undefined) nextOptions.limit = options.limit;
        if (options?.skip !== undefined) nextOptions.skip = options.skip;
        if (options?.isRead !== undefined) nextOptions.isRead = options.isRead;

        activeFetchOptionsRef.current = nextOptions;

        if (!crmToken) {
            setIsLoading(false);
            return;
        }

        try {
            const params = new URLSearchParams();
            if (nextOptions.limit !== undefined) params.set('limit', String(nextOptions.limit));
            if (nextOptions.skip !== undefined && nextOptions.skip > 0) params.set('skip', String(nextOptions.skip));
            if (nextOptions.isRead !== undefined) params.set('isRead', String(nextOptions.isRead));

            const endpoint = params.toString()
                ? `${API_URL}/api/crm/notifications?${params.toString()}`
                : `${API_URL}/api/crm/notifications`;

            const res = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${crmToken}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const payload = data?.data ?? {};
                const nextNotifications = Array.isArray(payload.notifications) ? payload.notifications : [];
                const nextUnreadCount = typeof payload.unreadCount === 'number'
                    ? payload.unreadCount
                    : nextNotifications.filter((n: Notification) => !n.isRead).length;
                const nextTotalCount = typeof payload.total === 'number'
                    ? payload.total
                    : nextNotifications.length;

                setNotifications(nextNotifications);
                setUnreadCount(nextUnreadCount);
                setTotalCount(nextTotalCount);
                setError(null);
                backoffRef.current = POLL_INTERVAL;
            } else if (res.status === 401) {
                setError(null);
            } else if (res.status === 404) {
                setNotifications([]);
                setUnreadCount(0);
                setTotalCount(0);
                setError(null);
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch {
            setError('Failed to load CRM notifications');
            backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        } finally {
            setIsLoading(false);
        }
    }, [crmToken]);

    fetchRef.current = fetchNotifications;

    const markAsRead = useCallback(async (id: string) => {
        const target = notifications.find(n => n._id === id);
        if (!target || target.isRead || !crmToken) return;

        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            const res = await fetch(`${API_URL}/api/crm/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
            });
            if (!res.ok) throw new Error();
        } catch {
            fetchRef.current?.();
        }
    }, [notifications, crmToken]);

    const markAllAsRead = useCallback(async () => {
        if (!crmToken) return;
        const snapshot = [...notifications];
        const prevCount = unreadCount;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);

        try {
            const res = await fetch(`${API_URL}/api/crm/notifications/read-all`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
            });
            if (!res.ok) throw new Error();
        } catch {
            setNotifications(snapshot);
            setUnreadCount(prevCount);
        }
    }, [notifications, unreadCount, crmToken]);

    const deleteNotification = useCallback(async (id: string) => {
        if (!crmToken) return;
        const target = notifications.find(n => n._id === id);
        if (!target) return;

        const snapshot = [...notifications];
        const prevCount = unreadCount;
        const prevTotal = totalCount;
        const wasUnread = !target.isRead;

        setNotifications(prev => prev.filter(n => n._id !== id));
        if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
        setTotalCount(prev => Math.max(0, prev - 1));

        try {
            const res = await fetch(`${API_URL}/api/crm/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
            });
            if (!res.ok) throw new Error();
        } catch {
            setNotifications(snapshot);
            setUnreadCount(prevCount);
            setTotalCount(prevTotal);
        }
    }, [notifications, unreadCount, totalCount, crmToken]);

    const deleteAllRead = useCallback(async () => {
        if (!crmToken) return;
        const snapshot = [...notifications];
        const prevCount = unreadCount;
        const prevTotal = totalCount;
        setNotifications(prev => prev.filter(n => !n.isRead));

        try {
            const res = await fetch(`${API_URL}/api/crm/notifications/read/all`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
            });
            if (!res.ok) throw new Error();

            const data = await res.json().catch(() => null);
            const deletedCount = data?.data?.deletedCount;

            if (typeof deletedCount === 'number') {
                setTotalCount(Math.max(0, prevTotal - deletedCount));
            } else {
                const deletedInView = snapshot.length - snapshot.filter(n => !n.isRead).length;
                setTotalCount(Math.max(0, prevTotal - deletedInView));
            }
        } catch {
            setNotifications(snapshot);
            setUnreadCount(prevCount);
            setTotalCount(prevTotal);
        }
    }, [notifications, unreadCount, totalCount, crmToken]);

    useEffect(() => {
        if (!crmToken) {
            setNotifications([]);
            setUnreadCount(0);
            setTotalCount(0);
            activeFetchOptionsRef.current = DEFAULT_FETCH_OPTIONS;
            setIsLoading(false);
            return;
        }

        void fetchNotifications(DEFAULT_FETCH_OPTIONS);

        const startPolling = () => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(() => fetchRef.current?.(), backoffRef.current);
        };

        const stopPolling = () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };

        const onVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                fetchRef.current?.();
                startPolling();
            }
        };

        startPolling();
        document.addEventListener('visibilitychange', onVisibilityChange);

        const cleanups: Array<() => void> = [];
        let cancelled = false;

        const attachSocketListeners = async () => {
            if (!isLoaded || !isSignedIn) return;
            const token = await getToken();
            if (!token || cancelled) return;

            const socket = initializeSocket(token);

            const reconcile = () => {
                fetchRef.current?.();
            };

            const onNew = (notification: Notification) => {
                setNotifications(prev => {
                    if (prev.some(n => n._id === notification._id)) return prev;
                    return [notification, ...prev];
                });
                if (!notification.isRead) {
                    setUnreadCount(prev => prev + 1);
                }
                setTotalCount(prev => prev + 1);
                // The local update is instant; REST then confirms filtered counts
                // and recovers any event that may have been missed previously.
                reconcile();
            };

            const onUpdated = (notification: Notification) => {
                setNotifications(prev => {
                    const exists = prev.some(n => n._id === notification._id);
                    return exists
                        ? prev.map(n => n._id === notification._id ? notification : n)
                        : [notification, ...prev];
                });
                reconcile();
            };

            const onRead = ({ notificationId }: { notificationId?: string }) => {
                if (!notificationId) return;
                setNotifications(prev => prev.map(n =>
                    n._id === notificationId ? { ...n, isRead: true } : n,
                ));
                reconcile();
            };

            const onReadAll = () => {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                reconcile();
            };

            const onDeleted = ({ notificationId }: { notificationId?: string }) => {
                if (!notificationId) return;
                setNotifications(prev => prev.filter(n => n._id !== notificationId));
                reconcile();
            };

            const onDeleteAllRead = () => {
                setNotifications(prev => prev.filter(n => !n.isRead));
                reconcile();
            };

            const onConnect = () => reconcile();

            socket.on('crm:notification:new', onNew);
            socket.on('crm:notification:updated', onUpdated);
            socket.on('crm:notification:read', onRead);
            socket.on('crm:notification:readAll', onReadAll);
            socket.on('crm:notification:deleted', onDeleted);
            socket.on('crm:notification:deleteAllRead', onDeleteAllRead);
            socket.on('connect', onConnect);

            cleanups.push(
                () => socket.off('crm:notification:new', onNew),
                () => socket.off('crm:notification:updated', onUpdated),
                () => socket.off('crm:notification:read', onRead),
                () => socket.off('crm:notification:readAll', onReadAll),
                () => socket.off('crm:notification:deleted', onDeleted),
                () => socket.off('crm:notification:deleteAllRead', onDeleteAllRead),
                () => socket.off('connect', onConnect),
            );
        };

        attachSocketListeners().catch(() => {});

        return () => {
            cancelled = true;
            stopPolling();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            cleanups.forEach(fn => fn());
        };
    }, [crmToken, fetchNotifications, getToken, isLoaded, isSignedIn]);

    return (
        <CrmNotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                totalCount,
                isLoading,
                error,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                deleteAllRead,
            }}
        >
            {children}
        </CrmNotificationContext.Provider>
    );
}

export function useOptionalCrmNotificationContext() {
    return useContext(CrmNotificationContext);
}

export function useCrmNotificationContext() {
    const context = useOptionalCrmNotificationContext();
    if (!context) throw new Error('useCrmNotificationContext must be used within CrmNotificationProvider');
    return context;
}