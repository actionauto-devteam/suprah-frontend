'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '@/types/notification';
import { useCrmToken } from '@/hooks/useCrmToken';

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
 * A genuinely separate provider for CRM-identity (CrmUser) notifications —
 * NOT a filter over the main NotificationContext. `/api/notifications` is
 * authenticated with the main-site User JWT only, so it structurally cannot
 * return anything targeted at a CrmUser._id; this context talks to the
 * crmAuth()-gated /api/crm/notifications endpoints instead, using the
 * separate crm_token.
 *
 * Poll-only by design (no socket wiring) — the shared socket singleton is
 * reused across identities and only holds one room membership at a time, so
 * layering a second reconnect attempt here would make that pre-existing
 * fragility worse. A reliable 20s poll is the deliberate fallback for this
 * phase; see the notification unification plan's Phase D notes.
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

        fetchNotifications(DEFAULT_FETCH_OPTIONS);

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

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [fetchNotifications, crmToken]);

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

export function useCrmNotificationContext() {
    const context = useContext(CrmNotificationContext);
    if (!context) throw new Error('useCrmNotificationContext must be used within CrmNotificationProvider');
    return context;
}
