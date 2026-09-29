'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '@/types/notification';
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from '@/lib/socket.client';
import { playShiftAlertSound, playPingSound } from '@/lib/notification-sound';
import { resolveNotificationCategory } from '@/components/notifications/notification-utils';

interface FetchNotificationsOptions {
    limit?: number;
    skip?: number;
    isRead?: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    /** Unread CRM-category notifications (the CRM badge counts these). */
    unreadCrmCount: number;
    totalCount: number;
    isLoading: boolean;
    error: string | null;
    fetchNotifications: (options?: FetchNotificationsOptions) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    deleteAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const POLL_INTERVAL = 20000;
const MAX_BACKOFF = 300000;
const DEFAULT_FETCH_OPTIONS: FetchNotificationsOptions = { limit: 50, skip: 0 };

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadCrmCount, setUnreadCrmCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    // Timed refreshes, live events and the drawer (which loads every
    // notification) can overlap. Only the newest request may apply its result,
    // otherwise the list and counts flip between an older and a newer answer.
    const fetchSeqRef = useRef(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const backoffRef = useRef(POLL_INTERVAL);
    const fetchRef = useRef<((options?: FetchNotificationsOptions) => Promise<void>) | undefined>(undefined);
    const activeFetchOptionsRef = useRef<FetchNotificationsOptions>(DEFAULT_FETCH_OPTIONS);
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const fetchNotifications = useCallback(async (options?: FetchNotificationsOptions) => {
        const nextOptions: FetchNotificationsOptions = { ...activeFetchOptionsRef.current };

        if (options?.limit !== undefined) nextOptions.limit = options.limit;
        if (options?.skip !== undefined) nextOptions.skip = options.skip;
        if (options?.isRead !== undefined) nextOptions.isRead = options.isRead;

        activeFetchOptionsRef.current = nextOptions;
        const seq = ++fetchSeqRef.current;

        if (!isSignedIn) {
            setNotifications([]);
            setUnreadCount(0);
            setUnreadCrmCount(0);
            setTotalCount(0);
            setIsLoading(false);
            return;
        }

        try {
            const token = await getToken();
            if (seq !== fetchSeqRef.current) return;
            if (!token) {
                setNotifications([]);
                setUnreadCount(0);
                setUnreadCrmCount(0);
                setTotalCount(0);
                setIsLoading(false);
                return;
            }

            const params = new URLSearchParams();
            if (nextOptions.limit !== undefined) params.set('limit', String(nextOptions.limit));
            if (nextOptions.skip !== undefined && nextOptions.skip > 0) params.set('skip', String(nextOptions.skip));
            if (nextOptions.isRead !== undefined) params.set('isRead', String(nextOptions.isRead));

            const endpoint = params.toString()
                ? `${API_URL}/api/notifications?${params.toString()}`
                : `${API_URL}/api/notifications`;

            const res = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (seq !== fetchSeqRef.current) return;
            if (res.ok) {
                const data = await res.json();
                if (seq !== fetchSeqRef.current) return;
                const payload = data?.data ?? {};
                const nextNotifications = Array.isArray(payload.notifications) ? payload.notifications : [];
                const nextUnreadCount = typeof payload.unreadCount === 'number'
                    ? payload.unreadCount
                    : nextNotifications.filter((n: Notification) => !n.isRead).length;
                const nextTotalCount = typeof payload.total === 'number'
                    ? payload.total
                    : nextNotifications.length;

                const nextUnreadCrmCount = typeof payload.unreadCrmCount === 'number'
                    ? payload.unreadCrmCount
                    : nextNotifications.filter((n: Notification) => !n.isRead && resolveNotificationCategory(n) === 'crm').length;

                setNotifications(nextNotifications);
                setUnreadCount(nextUnreadCount);
                setUnreadCrmCount(nextUnreadCrmCount);
                setTotalCount(nextTotalCount);
                setError(null);
                backoffRef.current = POLL_INTERVAL;
            } else if (res.status === 401) {
                setError(null);
            } else if (res.status === 404) {
                setNotifications([]);
                setUnreadCount(0);
                setUnreadCrmCount(0);
                setTotalCount(0);
                setError(null);
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch {
            if (seq !== fetchSeqRef.current) return;
            setError('Failed to load notifications');
            backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        } finally {
            if (seq === fetchSeqRef.current) setIsLoading(false);
        }
    }, [getToken, isSignedIn]);

    fetchRef.current = fetchNotifications;

    const markAsRead = useCallback(async (id: string) => {
        const target = notifications.find(n => n._id === id);
        if (!target || target.isRead) return;

        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (resolveNotificationCategory(target) === 'crm') setUnreadCrmCount(prev => Math.max(0, prev - 1));

        try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
        } catch {
            fetchRef.current?.();
        }
    }, [notifications, getToken]);

    const markAllAsRead = useCallback(async () => {
        const snapshot = [...notifications];
        const prevCount = unreadCount;
        const prevCrmCount = unreadCrmCount;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        setUnreadCrmCount(0);

        try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/api/notifications/read-all`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
        } catch {
            setNotifications(snapshot);
            setUnreadCount(prevCount);
            setUnreadCrmCount(prevCrmCount);
        }
    }, [notifications, unreadCount, unreadCrmCount, getToken]);

    const deleteNotification = useCallback(async (id: string) => {
        const target = notifications.find(n => n._id === id);
        if (!target) return;

        const snapshot = [...notifications];
        const prevCount = unreadCount;
        const prevTotal = totalCount;
        const prevCrmCount = unreadCrmCount;
        const wasUnread = !target.isRead;
        const wasUnreadCrm = wasUnread && resolveNotificationCategory(target) === 'crm';

        setNotifications(prev => prev.filter(n => n._id !== id));
        if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
        if (wasUnreadCrm) setUnreadCrmCount(prev => Math.max(0, prev - 1));
        setTotalCount(prev => Math.max(0, prev - 1));

        try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
        } catch {
            setNotifications(snapshot);
            setUnreadCount(prevCount);
            setUnreadCrmCount(prevCrmCount);
            setTotalCount(prevTotal);
        }
    }, [notifications, unreadCount, unreadCrmCount, totalCount, getToken]);

    const deleteAllRead = useCallback(async () => {
        const snapshot = [...notifications];
        const prevCount = unreadCount;
        const prevTotal = totalCount;
        setNotifications(prev => prev.filter(n => !n.isRead));

        try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/api/notifications/read/all`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    }, [notifications, unreadCount, totalCount, getToken]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) {
            setNotifications([]);
            setUnreadCount(0);
            setUnreadCrmCount(0);
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

        const cleanups: Array<() => void> = [];
        let cancelled = false;

        const attachSocketListeners = async () => {
            const token = await getToken();
            if (!token || cancelled) return;
            const socket = initializeSocket(token);

            const onNew = (notification: Notification) => {
                setNotifications(prev => {
                    if (prev.some(n => n._id === notification._id)) return prev;
                    return [notification, ...prev];
                });
                if (notification.type === 'driver_dispatch_alert') {
                    // Schema-v2 Dispatch Alerts distinguish a short attention
                    // ping from an urgent warning. Legacy alerts do not carry
                    // soundProfile, so keep their historical warning sound.
                    const soundProfile = notification.metadata?.soundProfile;
                    const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
                    if (isVisible && soundProfile === 'attention') {
                        playPingSound(notification.metadata?.soundFile);
                    } else if (isVisible && (soundProfile === 'urgent' || !soundProfile)) {
                        playShiftAlertSound(notification.metadata?.soundFile);
                    }
                } else if (notification.type === 'driver_dispatch_message') {
                    // Messenger-style chat cue while Suprah is already visible.
                    // The service worker/OS owns background and lock-screen sound.
                    const isVisible =
                        typeof document === 'undefined' ||
                        document.visibilityState === 'visible';
                    if (isVisible) {
                        playPingSound(notification.metadata?.soundFile);
                    }
                } else if (notification.type === 'ping') {
                    playPingSound();
                }
                fetchRef.current?.();
            };

            const onRead = ({ notificationId }: { notificationId: string }) => {
                setNotifications(prev =>
                    prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
                );
                fetchRef.current?.();
            };

            const onReadAll = () => {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                setUnreadCrmCount(0);
                fetchRef.current?.();
            };

            const onUpdated = (notification: Notification) => {
                setNotifications(prev => {
                    const exists = prev.some(n => n._id === notification._id);
                    return exists
                        ? prev.map(n => n._id === notification._id ? notification : n)
                        : [notification, ...prev];
                });
                fetchRef.current?.();
            };

            socket.on('notification:new', onNew);
            socket.on('notification:read', onRead);
            socket.on('notification:readAll', onReadAll);
            socket.on('notification:updated', onUpdated);

            cleanups.push(
                () => socket.off('notification:new', onNew),
                () => socket.off('notification:read', onRead),
                () => socket.off('notification:readAll', onReadAll),
                () => socket.off('notification:updated', onUpdated),
            );
        };

        attachSocketListeners().catch(() => {});

        return () => {
            cancelled = true;
            stopPolling();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            cleanups.forEach(fn => fn());
        };
    }, [fetchNotifications, getToken, isLoaded, isSignedIn]);

    // Support for App Badge API (PWA)
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
            try {
                if (unreadCount > 0) {
                    (navigator as any).setAppBadge(unreadCount).catch((err: any) =>
                        console.error('[BadgeAPI] Error setting badge:', err)
                    );
                } else {
                    (navigator as any).clearAppBadge().catch((err: any) =>
                        console.error('[BadgeAPI] Error clearing badge:', err)
                    );
                }
            } catch (error) {
                console.error('[BadgeAPI] Fatal error:', error);
            }
        }
    }, [unreadCount]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                unreadCrmCount,
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
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
}