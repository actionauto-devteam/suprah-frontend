'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  CheckCheck,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import { NotificationList } from './NotificationList';
import { NotificationErrorBoundary } from './NotificationErrorBoundary';

interface CrmNotificationBellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useDesktopDrawer() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}

function CrmNotificationDrawerContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useCrmNotifications();

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="shrink-0 border-b border-border/60 bg-card/95 px-4 py-3.5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold tracking-tight text-foreground">
                CRM Notifications
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                {unreadCount > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {unreadCount} new notification{unreadCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  'All caught up'
                )}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close CRM notifications"
            title="Close notifications"
          >
            <X className="size-4" />
          </Button>
        </div>

        {notifications.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                onClick={markAllAsRead}
              >
                <CheckCheck className="mr-1.5 size-3.5" />
                Read all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              onClick={deleteAllRead}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Clear read
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900 dark:bg-red-950/20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="size-3.5 shrink-0" />
            <p className="text-[11px]">{error}</p>
          </div>
        </div>
      )}

      <div className="notification-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-card/80">
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onDelete={deleteNotification}
          compact
        />
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 py-3 backdrop-blur-sm">
        {notifications.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <Link
              href={{
                pathname: '/crm/notifications',
                query: { tab: 'all', source: 'crm-header' },
              }}
              onClick={onClose}
              className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <span className="truncate">View all notifications</span>
              <ArrowUpRight className="size-3 shrink-0" />
            </Link>
            <Link
              href="/crm/notifications/preferences"
              onClick={onClose}
              className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Settings className="size-3" />
              Preferences
            </Link>
          </div>
        ) : (
          <Link
            href="/crm/notifications/preferences"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="size-3" />
            Notification preferences
          </Link>
        )}
      </div>
    </div>
  );
}

function CrmNotificationDrawer({
  open,
  onOpenChange,
}: CrmNotificationBellProps) {
  const isDesktop = useDesktopDrawer();

  if (!open) return null;

  if (isDesktop) {
    // IMPORTANT: render the desktop drawer through a portal.
    // CrmNotificationBell lives inside CrmHeader, and that header uses
    // backdrop-filter/backdrop-blur. Browsers treat a filtered ancestor as
    // the containing block for position:fixed descendants. Without a portal,
    // the "fixed" drawer is constrained to the header instead of the viewport,
    // which makes the notification list collapse and leaves a second blank
    // reserved column on the right. Portaling to document.body makes right:0
    // and inset-y-0 truly viewport-relative.
    if (typeof document === 'undefined') return null;

    return createPortal(
      <aside
        id="crm-notification-drawer"
        className="fixed inset-y-0 right-0 z-[70] flex w-[340px] flex-col border-l border-border/70 bg-card shadow-[-18px_0_45px_rgba(0,0,0,0.12)] animate-in slide-in-from-right duration-300 xl:w-[380px] dark:shadow-[-18px_0_45px_rgba(0,0,0,0.32)]"
        aria-label="CRM notifications"
      >
        <NotificationErrorBoundary>
          <CrmNotificationDrawerContent onClose={() => onOpenChange(false)} />
        </NotificationErrorBoundary>
      </aside>,
      document.body,
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-none gap-0 p-0 sm:w-[340px] sm:max-w-[340px]"
      >
        <SheetTitle className="sr-only">CRM Notifications</SheetTitle>
        <SheetDescription className="sr-only">
          Review and manage your CRM notifications.
        </SheetDescription>
        <NotificationErrorBoundary>
          <CrmNotificationDrawerContent onClose={() => onOpenChange(false)} />
        </NotificationErrorBoundary>
      </SheetContent>
    </Sheet>
  );
}

export function CrmNotificationBell({
  open,
  onOpenChange,
}: CrmNotificationBellProps) {
  const { unreadCount } = useCrmNotifications();
  const toggle = useCallback(() => onOpenChange(!open), [onOpenChange, open]);

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
        title={open ? 'Close CRM notifications' : 'Open CRM notifications'}
        aria-label={open ? 'Close CRM notifications' : 'Open CRM notifications'}
        aria-expanded={open}
        aria-controls="crm-notification-drawer"
        onClick={toggle}
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

      <div id="crm-notification-drawer">
        <CrmNotificationDrawer open={open} onOpenChange={onOpenChange} />
      </div>
    </>
  );
}