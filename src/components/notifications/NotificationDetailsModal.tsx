'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notification } from '@/types/notification';
import { cn } from '@/lib/utils';
import {
    formatFullDate,
    getNotificationCategory,
    getNotificationMeta,
} from './notification-utils';

interface NotificationDetailsModalProps {
    notification: Notification | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function formatMetadataKey(key: string): string {
    const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => formatMetadataValue(item)).filter(Boolean).join(', ');
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export function NotificationDetailsModal({
    notification,
    open,
    onOpenChange,
}: NotificationDetailsModalProps) {
    if (!notification) return null;

    const meta = getNotificationMeta(notification.type);
    const category = getNotificationCategory(notification.type);
    const metadataEntries = Object.entries(notification.metadata ?? {})
        .map(([key, value]) => ({ key, value: formatMetadataValue(value) }))
        .filter((entry) => entry.value.length > 0);

    const Icon = meta.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span
                            className={cn(
                                'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
                                meta.gradient
                            )}
                        >
                            <Icon className="size-5" />
                        </span>
                        <span className="flex flex-col">
                            <span className="text-base font-semibold">{notification.title}</span>
                            <span className="text-xs text-muted-foreground">{formatFullDate(notification.createdAt)}</span>
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-[0.16em]">
                            {category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
                            {notification.type.replace(/_/g, ' ')}
                        </Badge>
                    </div>

                    <p className="text-sm text-foreground/80 leading-relaxed">
                        {notification.message}
                    </p>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Details
                        </p>
                        {metadataEntries.length > 0 ? (
                            <dl className="mt-3 grid gap-2 text-xs">
                                {metadataEntries.map((entry) => (
                                    <div key={entry.key} className="grid grid-cols-[120px_1fr] gap-3">
                                        <dt className="text-muted-foreground">{formatMetadataKey(entry.key)}</dt>
                                        <dd className="text-foreground wrap-break-word">{entry.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                                No additional details available for this notification.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
