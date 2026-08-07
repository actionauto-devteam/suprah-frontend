'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Check, Trash2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Notification } from '@/types/notification';
import {
  getNotificationMeta,
  getNotificationFlatColor,
  formatNotificationDate,
  formatFullDate,
  getNotificationRoute,
  getNotificationCategoryLabel,
} from './notification-utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (notification: Notification) => boolean | void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
  compact,
}: NotificationItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const meta = getNotificationMeta(notification.type);
  const flatColor = getNotificationFlatColor(notification.type);
  const Icon = meta.icon;
  const route = getNotificationRoute(notification, pathname);
  const isClickable = !!route || !!onClick;
  const category = getNotificationCategoryLabel(notification);
  const occurrenceCount = notification.occurrenceCount ?? 1;

  const handleClick = () => {
    if (!isClickable) return;
    const handled = onClick?.(notification) === true;
    if (!notification.isRead) onMarkAsRead(notification._id);
    if (route && !handled) router.push(route);
  };

  return (
    <div
      className={cn(
        'group relative transition-colors duration-150',
        compact
          ? 'rounded-xl border px-3 py-2.5'
          : 'px-5 py-4',
        !notification.isRead
          ? compact
            ? 'border-emerald-500/25 bg-emerald-500/[0.055] hover:bg-emerald-500/[0.085]'
            : 'bg-primary/5 hover:bg-primary/8 dark:bg-primary/10 dark:hover:bg-primary/15'
          : compact
            ? 'border-border/45 bg-card/70 hover:border-border/75 hover:bg-muted/35'
            : 'hover:bg-muted/50',
        isClickable && 'cursor-pointer',
      )}
      onClick={handleClick}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          <div
            className={cn(
              'flex items-center justify-center rounded-lg',
              compact ? 'h-8 w-8' : 'h-11 w-11 rounded-xl',
              flatColor.iconBg,
              flatColor.iconText,
            )}
          >
            <Icon className={compact ? 'size-3.5' : 'size-5'} />
          </div>
          {!notification.isRead && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className={cn(
                'min-w-0 flex-1 truncate font-semibold leading-snug',
                compact ? 'text-[12px]' : 'text-sm',
                !notification.isRead ? 'text-foreground' : 'text-muted-foreground',
              )}
              title={notification.title}
            >
              {notification.title}
            </p>

            {occurrenceCount > 1 && (
              <Badge
                variant="outline"
                className="h-4.5 shrink-0 rounded-full px-1.5 text-[10px] font-semibold text-muted-foreground"
              >
                {occurrenceCount}×
              </Badge>
            )}

            {isClickable && (
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-emerald-500" />
            )}
          </div>

          <p
            className={cn(
              'mt-0.5 line-clamp-2 leading-relaxed',
              compact ? 'text-[11px]' : 'text-xs',
              !notification.isRead ? 'text-muted-foreground' : 'text-muted-foreground/70',
            )}
          >
            {notification.message}
          </p>

          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <span className="max-w-[55%] truncate rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {category}
            </span>
            <span
              className="shrink-0 text-[10px] text-muted-foreground/60"
              title={formatFullDate(notification.createdAt)}
            >
              {formatNotificationDate(notification.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification._id);
              }}
              aria-label={`Mark ${notification.title} as read`}
              title="Mark as read"
            >
              <Check className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/60"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification._id);
            }}
            aria-label={`Delete ${notification.title}`}
            title="Delete notification"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}