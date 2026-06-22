'use client';

import { useCallback, useMemo } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { isCrmNotification } from '@/components/notifications/notification-utils';

/**
 * CRM-scoped view over the global notification feed. Filters to notifications
 * relevant to the CRM section (leads, appointments, tasks, biometrics/timeproof,
 * aftermarket) without opening a second poll/socket connection — it reuses the
 * single NotificationProvider already mounted in the dashboard layout.
 *
 * markAllAsRead/clearRead only touch CRM-scoped notifications, leaving unrelated
 * (e.g. Shipments, Driver, Account) notifications untouched.
 */
export function useCrmNotifications() {
  const {
    notifications,
    isLoading,
    error,
    markAsRead,
    deleteNotification,
  } = useNotifications();

  const crmNotifications = useMemo(
    () => notifications.filter((n) => isCrmNotification(n.type)),
    [notifications],
  );

  const unreadCount = useMemo(
    () => crmNotifications.reduce((count, n) => count + (n.isRead ? 0 : 1), 0),
    [crmNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    const unreadIds = crmNotifications.filter((n) => !n.isRead).map((n) => n._id);
    await Promise.all(unreadIds.map((id) => markAsRead(id)));
  }, [crmNotifications, markAsRead]);

  const deleteAllRead = useCallback(async () => {
    const readIds = crmNotifications.filter((n) => n.isRead).map((n) => n._id);
    await Promise.all(readIds.map((id) => deleteNotification(id)));
  }, [crmNotifications, deleteNotification]);

  return {
    notifications: crmNotifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  };
}
