'use client';

import { useCrmNotificationContext, useOptionalCrmNotificationContext } from '@/context/CrmNotificationContext';

/**
 * CRM-identity notifications — backed by CrmNotificationContext, which talks
 * to the crmAuth()-gated /api/crm/notifications endpoints under the CrmUser
 * identity. Previously this was a client-side filter over the main
 * NotificationContext, which could never actually show anything (that feed
 * is authenticated with the main-site User JWT and only ever returns
 * User-targeted docs, never CrmUser-targeted ones).
 */
export function useCrmNotifications() {
  const {
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
  } = useCrmNotificationContext();

  return {
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
  };
}


export function useOptionalCrmNotifications() {
  const context = useOptionalCrmNotificationContext();

  if (!context) return null;

  const {
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
  } = context;

  return {
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
  };
}