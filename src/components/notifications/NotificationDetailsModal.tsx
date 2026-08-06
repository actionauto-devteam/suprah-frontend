'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import {
  formatFullDate,
  getNotificationCategoryLabel,
  getNotificationMeta,
} from './notification-utils';

interface NotificationDetailsModalProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HIDDEN_METADATA_KEYS = new Set([
  'playSound',
  'soundFile',
  'route',
  'notificationId',
  'pushSource',
  'dedupeKey',
  'sentByUserId',
  'respondedByUserId',
]);

function formatMetadataKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(formatMetadataValue).filter(Boolean).join(', ');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function responseLabel(value?: string): string {
  if (!value || value === 'pending') return 'Pending response';
  if (value === 'on_my_way') return 'On My Way';
  if (value === 'unable') return 'Unable to Respond';
  return 'Acknowledged';
}

export function NotificationDetailsModal({
  notification,
  open,
  onOpenChange,
}: NotificationDetailsModalProps) {
  const pathname = usePathname();
  const { getToken } = useAuth();
  const [submitting, setSubmitting] = React.useState<string | null>(null);

  if (!notification) return null;

  const meta = getNotificationMeta(notification.type);
  const category = getNotificationCategoryLabel(notification);
  const isDriverAlert = notification.type === 'driver_dispatch_alert';
  const isDriverPortal = pathname.startsWith('/driver');
  const alertId = notification.metadata?.alertId || notification._id;
  const currentResponse = notification.metadata?.response as string | undefined;

  const metadataEntries = Object.entries(notification.metadata ?? {})
    .filter(([key]) => !HIDDEN_METADATA_KEYS.has(key))
    .map(([key, value]) => ({ key, value: formatMetadataValue(value) }))
    .filter((entry) => entry.value.length > 0);

  const Icon = meta.icon;

  const respond = async (response: 'acknowledged' | 'on_my_way' | 'unable') => {
    if (!alertId || submitting) return;
    setSubmitting(response);
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/driver-tracking/alerts/${alertId}/respond`,
        { response },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`Response sent: ${responseLabel(response)}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not send alert response');
    } finally {
      setSubmitting(null);
    }
  };

  const openDestination = () => {
    const destination = notification.metadata?.address || notification.metadata?.destinationName;
    if (!destination || typeof window === 'undefined') return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(destination))}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
                meta.gradient,
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold">{notification.title}</span>
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
            {isDriverAlert && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] uppercase tracking-[0.12em]',
                  currentResponse && currentResponse !== 'pending'
                    ? 'border-emerald-500/40 text-emerald-600'
                    : 'border-amber-500/40 text-amber-600',
                )}
              >
                {responseLabel(currentResponse)}
              </Badge>
            )}
          </div>

          <p className="text-sm leading-relaxed text-foreground/80">{notification.message}</p>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Details
            </p>
            {metadataEntries.length > 0 ? (
              <dl className="mt-3 grid gap-2 text-xs">
                {metadataEntries.map((entry) => (
                  <div key={entry.key} className="grid grid-cols-[120px_1fr] gap-3">
                    <dt className="text-muted-foreground">{formatMetadataKey(entry.key)}</dt>
                    <dd className="wrap-break-word text-foreground">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No additional details available for this notification.
              </p>
            )}
          </div>

          {isDriverAlert && isDriverPortal && currentResponse === 'pending' && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                size="sm"
                onClick={() => respond('acknowledged')}
                disabled={Boolean(submitting)}
              >
                {submitting === 'acknowledged' && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Acknowledge
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => respond('on_my_way')}
                disabled={Boolean(submitting)}
              >
                {submitting === 'on_my_way' && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                On My Way
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond('unable')}
                disabled={Boolean(submitting)}
              >
                {submitting === 'unable' && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Unable
              </Button>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {isDriverAlert && (notification.metadata?.address || notification.metadata?.destinationName) && (
              <Button variant="secondary" size="sm" onClick={openDestination}>
                <MapPin className="mr-1.5 size-3.5" />
                Open Destination
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
