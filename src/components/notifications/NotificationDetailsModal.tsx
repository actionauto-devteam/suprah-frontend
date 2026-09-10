'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, BellRing, Loader2, MapPin, Truck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  DriverDispatchAlertLoadContext,
  DriverDispatchAlertResponse,
} from '@/types/notification';
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
  'soundProfile',
  'route',
  'notificationId',
  'pushSource',
  'dedupeKey',
  'sentByUserId',
  'respondedByUserId',
  'dispatchOwnerId',
  'alertSchemaVersion',
  'allowedResponses',
  'loadContext',
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

function responseButtonLabel(value: DriverDispatchAlertResponse) {
  if (value === 'on_my_way') return 'On My Way';
  if (value === 'unable') return 'Unable';
  return 'Acknowledge';
}

function locationLabel(location: DriverDispatchAlertLoadContext['pickup']) {
  if (!location) return 'Unknown location';
  if (location.name?.trim()) return location.name.trim();
  return [location.city, location.state].filter(Boolean).join(', ') || location.address || 'Unknown location';
}

function locationAddress(location: DriverDispatchAlertLoadContext['pickup']) {
  if (!location) return '';
  const cityStateZip = [
    [location.city, location.state].filter(Boolean).join(', '),
    location.zip,
  ]
    .filter(Boolean)
    .join(' ');
  return [location.address, cityStateZip].filter(Boolean).join(', ');
}

function formatAlertDate(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Denver',
  });
}

function priorityClass(priority?: string) {
  if (priority === 'urgent') return 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300';
  if (priority === 'important') return 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300';
  return 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300';
}

function getAlertMapTarget(notification: Notification) {
  const metadata = notification.metadata ?? {};
  const load = metadata.loadContext as DriverDispatchAlertLoadContext | undefined;
  const alertType = String(metadata.alertType ?? '');
  const location =
    alertType === 'proceed_to_pickup' || alertType === 'pickup_instructions_updated'
      ? load?.pickup
      : load?.delivery;
  return locationAddress(location) || String(metadata.address ?? metadata.destinationName ?? '').trim();
}

function DriverAlertLoadDetails({ load }: { load: DriverDispatchAlertLoadContext }) {
  const vehiclePreview = load.vehicles.slice(0, 6);
  const extraVehicles = Math.max(0, load.vehicles.length - vehiclePreview.length);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-emerald-500" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Related load</p>
            <p className="text-sm font-black">{load.loadNumber || load.id}</p>
          </div>
        </div>
        <Badge variant="outline">{load.status || 'Active'}</Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[{ label: 'Pickup', value: load.pickup }, { label: 'Delivery', value: load.delivery }].map((entry) => (
          <div key={entry.label} className="rounded-lg border border-border/50 bg-background/60 p-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{entry.label}</p>
            <p className="mt-1 text-xs font-semibold">{locationLabel(entry.value)}</p>
            {locationAddress(entry.value) && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{locationAddress(entry.value)}</p>
            )}
            {entry.value?.contactName && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Contact: {entry.value.contactName}{entry.value.phone ? ` · ${entry.value.phone}` : ''}
              </p>
            )}
            {entry.value?.notes && (
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">{entry.value.notes}</p>
            )}
          </div>
        ))}
      </div>

      {(load.dates?.firstAvailable || load.dates?.pickupDeadline || load.dates?.deliveryDeadline) && (
        <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
          {load.dates?.firstAvailable && (
            <div className="rounded-lg border border-border/50 bg-background/60 p-2">
              <p className="font-black uppercase tracking-[0.1em] text-muted-foreground">First available</p>
              <p className="mt-1">{formatAlertDate(load.dates.firstAvailable)}</p>
            </div>
          )}
          {load.dates?.pickupDeadline && (
            <div className="rounded-lg border border-border/50 bg-background/60 p-2">
              <p className="font-black uppercase tracking-[0.1em] text-muted-foreground">Pickup deadline</p>
              <p className="mt-1">{formatAlertDate(load.dates.pickupDeadline)}</p>
            </div>
          )}
          {load.dates?.deliveryDeadline && (
            <div className="rounded-lg border border-border/50 bg-background/60 p-2">
              <p className="font-black uppercase tracking-[0.1em] text-muted-foreground">Delivery deadline</p>
              <p className="mt-1">{formatAlertDate(load.dates.deliveryDeadline)}</p>
            </div>
          )}
        </div>
      )}

      {vehiclePreview.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Vehicles</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {vehiclePreview.map((vehicle, index) => {
              const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || `Vehicle ${index + 1}`;
              return (
                <span key={`${vehicle.vin || label}:${index}`} className="rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[11px]">
                  {label}{vehicle.vin ? ` · ${vehicle.vin}` : ''}
                </span>
              );
            })}
            {extraVehicles > 0 && (
              <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[11px]">+{extraVehicles} more</span>
            )}
          </div>
        </div>
      )}

      {(load.additionalInfo?.instructions || load.additionalInfo?.referenceNumber) && (
        <div className="mt-3 rounded-lg border border-border/50 bg-background/60 p-2.5 text-xs">
          {load.additionalInfo.referenceNumber && (
            <p><span className="font-semibold text-muted-foreground">Reference:</span> {load.additionalInfo.referenceNumber}</p>
          )}
          {load.additionalInfo.instructions && (
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">
              <span className="font-semibold text-muted-foreground">Existing instructions:</span> {load.additionalInfo.instructions}
            </p>
          )}
        </div>
      )}
    </div>
  );
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
  const isSchemaV2Alert = isDriverAlert && Number(notification.metadata?.alertSchemaVersion ?? 0) >= 2;
  const alertLoadContext = notification.metadata?.loadContext as DriverDispatchAlertLoadContext | undefined;
  const alertPriority = String(notification.metadata?.priority ?? 'important');
  const alertLabel = String(notification.metadata?.alertLabel ?? notification.title ?? 'Dispatch Alert');
  const sentByName = String(notification.metadata?.sentByName ?? 'Dispatch');
  const dispatcherMessage = String(notification.metadata?.dispatcherMessage ?? '').trim();
  const allowedResponses: DriverDispatchAlertResponse[] = isSchemaV2Alert && Array.isArray(notification.metadata?.allowedResponses)
    ? notification.metadata.allowedResponses.filter((value: unknown): value is DriverDispatchAlertResponse =>
        value === 'acknowledged' || value === 'on_my_way' || value === 'unable',
      )
    : ['acknowledged', 'on_my_way', 'unable'];

  const metadataEntries = Object.entries(notification.metadata ?? {})
    .filter(([key]) => !HIDDEN_METADATA_KEYS.has(key))
    .map(([key, value]) => ({ key, value: formatMetadataValue(value) }))
    .filter((entry) => entry.value.length > 0);

  const Icon = meta.icon;

  const respond = async (response: DriverDispatchAlertResponse) => {
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
    const destination = getAlertMapTarget(notification);
    if (!destination || typeof window === 'undefined') return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const mapTarget = isDriverAlert ? getAlertMapTarget(notification) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
                meta.gradient,
              )}
            >
              {isSchemaV2Alert && notification.metadata?.alertMode === 'quick_attention' ? (
                <BellRing className="size-5" />
              ) : isSchemaV2Alert && alertPriority === 'urgent' ? (
                <AlertTriangle className="size-5" />
              ) : (
                <Icon className="size-5" />
              )}
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
            {isSchemaV2Alert ? (
              <>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.12em]">
                  {alertLabel}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px] uppercase tracking-[0.12em]', priorityClass(alertPriority))}>
                  {alertPriority}
                </Badge>
              </>
            ) : (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
                {notification.type.replace(/_/g, ' ')}
              </Badge>
            )}
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

          {isSchemaV2Alert ? (
            <>
              <div
                className={cn(
                  'rounded-xl border p-3.5',
                  alertPriority === 'urgent'
                    ? 'border-red-500/30 bg-red-500/[0.07]'
                    : notification.metadata?.alertMode === 'quick_attention'
                      ? 'border-amber-500/30 bg-amber-500/[0.07]'
                      : 'border-border/60 bg-muted/20',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">From</p>
                    <p className="mt-0.5 text-sm font-semibold">{sentByName}</p>
                  </div>
                  {notification.metadata?.loadNumber && (
                    <Badge variant="outline">Load {String(notification.metadata.loadNumber)}</Badge>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {notification.message}
                </p>
                {dispatcherMessage && dispatcherMessage !== notification.message && (
                  <div className="mt-3 rounded-lg border border-border/50 bg-background/60 p-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Dispatcher message</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{dispatcherMessage}</p>
                  </div>
                )}
              </div>

              {alertLoadContext && <DriverAlertLoadDetails load={alertLoadContext} />}
            </>
          ) : (
            <>
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
            </>
          )}

          {isDriverAlert && isDriverPortal && currentResponse === 'pending' && allowedResponses.length > 0 && (
            <div className={cn('grid gap-2', allowedResponses.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              {allowedResponses.map((response) => (
                <Button
                  key={response}
                  size="sm"
                  variant={response === 'acknowledged' ? 'default' : response === 'on_my_way' ? 'secondary' : 'outline'}
                  onClick={() => respond(response)}
                  disabled={Boolean(submitting)}
                >
                  {submitting === response && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  {responseButtonLabel(response)}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {isDriverAlert && mapTarget && notification.metadata?.alertMode !== 'quick_attention' && (
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