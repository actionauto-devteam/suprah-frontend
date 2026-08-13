'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Check, Trash2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Notification } from '@/types/notification';
import { getNotificationMeta, getNotificationFlatColor, formatNotificationDate, formatFullDate, getNotificationRoute, getNotificationCategoryLabel } from './notification-utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (notification: Notification) => boolean | void;
  compact?: boolean;
}

export function NotificationItem({ notification, onMarkAsRead, onDelete, onClick, compact }: NotificationItemProps) {
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
        'group relative transition-all duration-200',
        compact
          ? 'px-4 py-3 rounded-xl border border-border/40 bg-card/80 shadow-sm hover:shadow-md'
          : 'px-5 py-4',
        !notification.isRead
          ? compact
            ? 'border-primary/25 bg-primary/5 hover:bg-primary/8'
            : 'bg-primary/5 dark:bg-primary/10 hover:bg-primary/8 dark:hover:bg-primary/15'
          : compact
            ? 'hover:border-border/70 hover:bg-muted/40'
            : 'hover:bg-muted/50',
        isClickable && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <div className={cn(
            'rounded-xl flex items-center justify-center',
            compact ? 'w-9 h-9' : 'w-11 h-11',
            flatColor.iconBg,
            flatColor.iconText,
          )}>
            <Icon className={compact ? 'size-4' : 'size-5'} />
          </div>
          {!notification.isRead && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={cn(
              'text-sm font-semibold leading-snug truncate',
              !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {notification.title}
            </p>
            {occurrenceCount > 1 && (
              <Badge variant="outline" className="h-4.5 shrink-0 rounded-full px-1.5 text-[10px] font-semibold text-muted-foreground">
                {occurrenceCount}×
              </Badge>
            )}
            {isClickable && (
              <ArrowUpRight className="size-3.5 text-muted-foreground/40 shrink-0 group-hover:text-emerald-500 transition-colors" />
            )}
          </div>
          <p className={cn(
            'text-xs leading-relaxed line-clamp-2',
            !notification.isRead ? 'text-muted-foreground' : 'text-muted-foreground/70'
          )}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {category}
            </span>
            <span
              className="text-[11px] text-muted-foreground/60"
              title={formatFullDate(notification.createdAt)}
            >
              {formatNotificationDate(notification.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400"
              onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification._id); }}
            >
              <Check className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 hover:text-red-600"
            onClick={(e) => { e.stopPropagation(); onDelete(notification._id); }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}