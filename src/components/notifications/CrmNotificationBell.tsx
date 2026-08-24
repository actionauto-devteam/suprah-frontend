'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import { resolveNotificationCategory } from './notification-utils';
import { NotificationDrawer } from './NotificationDrawer';

interface CrmNotificationBellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CrmNotificationBell({ open, onOpenChange }: CrmNotificationBellProps) {
  const general = useNotifications();
  const crm = useCrmNotifications();

  const generalUnread = React.useMemo(
    () => general.notifications.filter(
      (notification) => !notification.isRead && resolveNotificationCategory(notification) !== 'crm',
    ).length,
    [general.notifications],
  );
  const unreadCount = generalUnread + crm.unreadCount;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          'relative h-9 w-9 overflow-visible rounded-full transition-all duration-200',
          open && 'border-emerald-400 bg-emerald-500/10 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400',
          !open && unreadCount > 0
            ? 'border-emerald-300 shadow-sm shadow-emerald-500/10 dark:border-emerald-700'
            : !open && 'border-border/80 bg-background text-foreground/85 shadow-sm ring-1 ring-border/35 dark:text-foreground dark:ring-border/45',
        )}
        title={open ? 'Close notifications' : 'Open notifications'}
        aria-label={open ? 'Close notifications' : 'Open notifications'}
        aria-expanded={open}
        aria-controls="notification-drawer"
        onClick={() => onOpenChange(!open)}
      >
        <Bell
          className={cn(
            'size-4',
            open || unreadCount > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-foreground/80 dark:text-foreground',
          )}
        />

        {unreadCount === 0 && !open && (
          <span className="absolute -right-0.5 -top-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/80 shadow-sm dark:bg-muted-foreground" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 z-20 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-background bg-linear-to-br from-red-500 to-rose-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <NotificationDrawer open={open} onOpenChange={onOpenChange} />
    </>
  );
}