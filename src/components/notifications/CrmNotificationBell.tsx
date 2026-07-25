'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Trash2, AlertCircle, ArrowUpRight, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useCrmNotifications } from '@/hooks/useCrmNotifications';
import { NotificationList } from './NotificationList';
import { NotificationErrorBoundary } from './NotificationErrorBoundary';

function CrmNotificationDropdownContent() {
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
    <>
      <div className="shrink-0 px-4 py-3 border-b border-border/50 bg-card/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground tracking-tight">CRM Notifications</h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                {unreadCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {unreadCount} new
                  </span>
                ) : 'All caught up'}
              </p>
            </div>
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-0.5">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-lg"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="size-3 mr-1" />
                  Read all
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-lg"
                onClick={deleteAllRead}
              >
                <Trash2 className="size-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="size-3.5" />
            <p className="text-[11px]">{error}</p>
          </div>
        </div>
      )}

      <div className="notification-scrollbar flex-1 overflow-y-auto min-h-0 bg-card/80">
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onDelete={deleteNotification}
          compact
        />
      </div>

      {notifications.length > 0 && (
        <div className="shrink-0 border-t border-border/50 px-4 py-2 bg-card/90 flex items-center justify-between gap-2">
          <Link
            href={{ pathname: '/crm/notifications', query: { tab: 'all', source: 'crm-header' } }}
            className="flex items-center gap-1.5 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold transition-colors"
          >
            View all notifications
            <ArrowUpRight className="size-3" />
          </Link>
          <Link
            href="/crm/notifications/preferences"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <Settings className="size-3" />
            Preferences
          </Link>
        </div>
      )}
    </>
  );
}

export function CrmNotificationBell() {
  const { unreadCount } = useCrmNotifications();
  const [open, setOpen] = useState(false);
  const handleOpenChange = useCallback((next: boolean) => setOpen(next), []);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-full relative overflow-visible transition-all duration-300',
            unreadCount > 0
              ? 'border-emerald-300 dark:border-emerald-700 shadow-sm shadow-emerald-500/10'
              : 'border-border/80 bg-background text-foreground/85 dark:text-foreground shadow-sm ring-1 ring-border/35 dark:ring-border/45'
          )}
          title="CRM notifications"
        >
          <Bell className={cn(
            'size-4',
            unreadCount > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-foreground/80 dark:text-foreground'
          )} />
          {unreadCount === 0 && (
            <span className="absolute -top-0.5 -right-0.5 z-10 h-2.5 w-2.5 rounded-full bg-muted-foreground/80 dark:bg-muted-foreground border-2 border-background shadow-sm" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 z-20 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[10px] font-bold text-white bg-linear-to-br from-red-500 to-rose-600 rounded-full shadow-sm border-2 border-background animate-in zoom-in-50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-95 sm:w-105 p-0 shadow-xl border border-border/50 rounded-2xl overflow-hidden flex flex-col max-h-[min(70vh,540px)] bg-card/95"
      >
        <NotificationErrorBoundary>
          {open && <CrmNotificationDropdownContent />}
        </NotificationErrorBoundary>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
