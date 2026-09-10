'use client';

import * as React from 'react';
import {
  AlertTriangle,
  BellRing,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { DriverTrackingItem } from '@/types/driver-tracking';
import type {
  DriverDispatchAlertLoadContext,
  DriverDispatchAlertPriority,
  DriverDispatchAlertType,
  DriverDispatchQuickPreset,
} from '@/types/notification';

interface DriverDispatchAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
}

type ComposeMode = 'quick' | 'alert';

type AlertOption = {
  type: Exclude<DriverDispatchAlertType, 'quick_attention'>;
  label: string;
  description: string;
  requiresLoad: boolean;
  critical?: boolean;
  defaultPriority: DriverDispatchAlertPriority;
};

const ALERT_OPTIONS: AlertOption[] = [
  {
    type: 'proceed_to_pickup',
    label: 'Proceed to Pickup',
    description: 'Direct the driver to the current load pickup using saved pickup details.',
    requiresLoad: true,
    defaultPriority: 'important',
  },
  {
    type: 'proceed_to_delivery',
    label: 'Proceed to Delivery',
    description: 'Direct the driver to delivery using the current saved delivery details.',
    requiresLoad: true,
    defaultPriority: 'important',
  },
  {
    type: 'route_changed',
    label: 'Route / Destination Changed',
    description: 'Call attention to an updated route or destination on the load.',
    requiresLoad: true,
    defaultPriority: 'important',
  },
  {
    type: 'pickup_instructions_updated',
    label: 'Pickup Instructions Updated',
    description: 'Tell the driver to review the latest pickup instructions.',
    requiresLoad: true,
    defaultPriority: 'important',
  },
  {
    type: 'delivery_instructions_updated',
    label: 'Delivery Instructions Updated',
    description: 'Tell the driver to review the latest delivery instructions.',
    requiresLoad: true,
    defaultPriority: 'important',
  },
  {
    type: 'schedule_changed',
    label: 'Schedule Changed',
    description: 'Highlight updated pickup or delivery timing.',
    requiresLoad: true,
    defaultPriority: 'important',
  },
  {
    type: 'hold_position',
    label: 'Hold Position',
    description: 'Ask the driver to stop progression and wait for instructions.',
    requiresLoad: false,
    defaultPriority: 'important',
  },
  {
    type: 'resume_route',
    label: 'Resume Route',
    description: 'Tell the driver they may continue.',
    requiresLoad: false,
    defaultPriority: 'important',
  },
  {
    type: 'return_to_dealership',
    label: 'Return to Dealership',
    description: 'Ask the driver to return to the dealership.',
    requiresLoad: false,
    defaultPriority: 'important',
  },
  {
    type: 'contact_dispatch',
    label: 'Contact Dispatch',
    description: 'Ask the driver to contact Dispatch when safely parked.',
    requiresLoad: false,
    defaultPriority: 'important',
  },
  {
    type: 'check_in',
    label: 'Check In',
    description: 'Request a routine status check from the driver.',
    requiresLoad: false,
    defaultPriority: 'normal',
  },
  {
    type: 'load_updated',
    label: 'Load Updated',
    description: 'Tell the driver to review current authoritative load information.',
    requiresLoad: true,
    defaultPriority: 'normal',
  },
  {
    type: 'load_cancelled',
    label: 'Load Cancelled',
    description: 'Critical instruction to stop work on the selected active load.',
    requiresLoad: true,
    critical: true,
    defaultPriority: 'urgent',
  },
  {
    type: 'safety_warning',
    label: 'Safety Warning',
    description: 'Urgent safety instruction that must be acknowledged.',
    requiresLoad: false,
    critical: true,
    defaultPriority: 'urgent',
  },
  {
    type: 'stop_do_not_proceed',
    label: 'Stop / Do Not Proceed',
    description: 'Urgent instruction to stop and wait for Dispatch.',
    requiresLoad: false,
    critical: true,
    defaultPriority: 'urgent',
  },
  {
    type: 'custom',
    label: 'Custom Alert',
    description: 'Send a custom operational alert with an optional related load.',
    requiresLoad: false,
    defaultPriority: 'normal',
  },
];

const QUICK_PRESETS: Array<{
  value: DriverDispatchQuickPreset;
  label: string;
  preview: string;
}> = [
  {
    value: 'check_dispatch_chat',
    label: 'Check Dispatch Chat',
    preview: 'Dispatch needs your attention. Please check your Dispatch Chat.',
  },
  {
    value: 'please_respond',
    label: 'Please Respond',
    preview: 'Dispatch needs your attention. Please respond when it is safe to do so.',
  },
  {
    value: 'contact_dispatch',
    label: 'Contact Dispatch',
    preview: 'Please contact Dispatch when safely parked.',
  },
  {
    value: 'custom',
    label: 'Custom Message',
    preview: 'Write a short attention message below.',
  },
];

function locationLabel(location: DriverDispatchAlertLoadContext['pickup']) {
  if (!location) return 'Unknown location';
  if (location.name?.trim()) return location.name.trim();
  const cityState = [location.city, location.state].filter(Boolean).join(', ');
  return cityState || location.address || 'Unknown location';
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

function formatDate(value: string | Date | null | undefined) {
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

export function DriverDispatchAlertDialog({
  open,
  onOpenChange,
  driver,
}: DriverDispatchAlertDialogProps) {
  const { getToken } = useAuth();
  const [mode, setMode] = React.useState<ComposeMode>('quick');
  const [alertType, setAlertType] = React.useState<AlertOption['type']>('proceed_to_pickup');
  const [priority, setPriority] = React.useState<DriverDispatchAlertPriority>('important');
  const [quickPreset, setQuickPreset] = React.useState<DriverDispatchQuickPreset>('check_dispatch_chat');
  const [message, setMessage] = React.useState('');
  const [selectedLoadId, setSelectedLoadId] = React.useState('none');
  const [loads, setLoads] = React.useState<DriverDispatchAlertLoadContext[]>([]);
  const [contextLoading, setContextLoading] = React.useState(false);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  const selectedAlert = React.useMemo(
    () => ALERT_OPTIONS.find((option) => option.type === alertType) ?? ALERT_OPTIONS[0],
    [alertType],
  );
  const selectedLoad = React.useMemo(
    () => loads.find((load) => load.id === selectedLoadId) ?? null,
    [loads, selectedLoadId],
  );
  const selectedQuickPreset = React.useMemo(
    () => QUICK_PRESETS.find((preset) => preset.value === quickPreset) ?? QUICK_PRESETS[0],
    [quickPreset],
  );

  React.useEffect(() => {
    if (!open) return;
    setMode('quick');
    setAlertType('proceed_to_pickup');
    setPriority('important');
    setQuickPreset('check_dispatch_chat');
    setMessage('');
    setSelectedLoadId('none');
    setLoads([]);
    setContextError(null);
  }, [open, driver?.id]);

  React.useEffect(() => {
    if (!open) return;
    const driverId = driver?.driver?.id;
    if (!driverId) {
      setContextError('Driver information is unavailable.');
      return;
    }

    let cancelled = false;
    const loadContext = async () => {
      setContextLoading(true);
      setContextError(null);
      try {
        const token = await getToken();
        const response = await apiClient.get(
          `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/alert-context`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (cancelled) return;
        const payload = response.data?.data ?? {};
        const nextLoads = Array.isArray(payload.loads)
          ? (payload.loads as DriverDispatchAlertLoadContext[])
          : [];
        setLoads(nextLoads);
      } catch (error: any) {
        if (cancelled) return;
        setLoads([]);
        setContextError(
          error.response?.data?.message ||
            'Could not verify the active dispatcher-driver relationship.',
        );
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    };

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [open, driver?.driver?.id, getToken]);

  React.useEffect(() => {
    if (mode !== 'alert') return;
    if (selectedAlert.requiresLoad && selectedLoadId === 'none' && loads[0]) {
      setSelectedLoadId(loads[0].id);
    }
  }, [mode, selectedAlert.requiresLoad, selectedLoadId, loads]);

  const handleAlertType = (value: string) => {
    const next = ALERT_OPTIONS.find((option) => option.type === value);
    if (!next) return;
    setAlertType(next.type);
    setPriority(next.defaultPriority);
    if (next.requiresLoad && selectedLoadId === 'none' && loads[0]) {
      setSelectedLoadId(loads[0].id);
    }
  };

  const sendAlert = async () => {
    const driverId = driver?.driver?.id;
    if (!driverId || contextLoading || contextError) return;

    if (mode === 'quick' && quickPreset === 'custom' && !message.trim()) {
      toast.error('Enter a short message for the custom Quick Attention alert.');
      return;
    }
    if (mode === 'alert' && selectedAlert.requiresLoad && selectedLoadId === 'none') {
      toast.error('Select the related load for this alert.');
      return;
    }
    if (mode === 'alert' && alertType === 'custom' && !message.trim()) {
      toast.error('Enter a message for the custom alert.');
      return;
    }

    setSending(true);
    try {
      const token = await getToken();
      const payload =
        mode === 'quick'
          ? {
              alertType: 'quick_attention' as const,
              quickPreset,
              message: message.trim() || undefined,
            }
          : {
              alertType,
              priority: selectedAlert.critical ? 'urgent' : priority,
              loadId: selectedLoadId !== 'none' ? selectedLoadId : undefined,
              message: message.trim() || undefined,
            };

      await apiClient.post(
        `/api/driver-tracking/drivers/${encodeURIComponent(driverId)}/alert`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(
        mode === 'quick'
          ? `Attention alert sent to ${driver.driver?.name || 'driver'}`
          : `${selectedAlert.label} sent to ${driver.driver?.name || 'driver'}`,
      );
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not send driver alert');
    } finally {
      setSending(false);
    }
  };

  const quickCustomNeedsMessage = mode === 'quick' && quickPreset === 'custom' && !message.trim();
  const alertNeedsLoad = mode === 'alert' && selectedAlert.requiresLoad && selectedLoadId === 'none';
  const customAlertNeedsMessage = mode === 'alert' && alertType === 'custom' && !message.trim();
  const canSend = Boolean(
    driver?.driver?.id &&
      !sending &&
      !contextLoading &&
      !contextError &&
      !quickCustomNeedsMessage &&
      !alertNeedsLoad &&
      !customAlertNeedsMessage,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[90] flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl"
        overlayClassName="z-[80] bg-black/70 backdrop-blur-[3px]"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-6 sm:py-5">
          <DialogTitle className="flex min-w-0 items-start gap-2 pr-7 text-lg font-black">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <BellRing className="size-4.5" />
            </span>
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              Alert {driver?.driver?.name || 'Driver'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Use Quick Attention for a fast nudge, or send an operational alert that reuses the driver&apos;s current authorized load details.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === 'quick'
                    ? 'border-amber-500/45 bg-amber-500/10'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BellRing className="size-4 text-amber-500" />
                  <span className="text-sm font-black">Quick Attention</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Get the driver&apos;s attention immediately without choosing a load.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('alert')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === 'alert'
                    ? 'border-emerald-500/45 bg-emerald-500/10'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-emerald-500" />
                  <span className="text-sm font-black">Operational Alert</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Route, load, schedule, operations, or safety instructions.
                </p>
              </button>
            </div>

            {contextLoading && (
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Verifying your active dispatch relationship and load context…
              </div>
            )}

            {contextError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{contextError}</span>
              </div>
            )}

            {mode === 'quick' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-black">Fast attention alert</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        This appears as an unread Dispatch Alert in the driver&apos;s notifications and in both sides of the private Dispatch Chat. It uses the short attention sound rather than the safety warning sound.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="driver-alert-quick-preset">Attention message</Label>
                  <Select
                    value={quickPreset}
                    onValueChange={(value) => setQuickPreset(value as DriverDispatchQuickPreset)}
                  >
                    <SelectTrigger id="driver-alert-quick-preset" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUICK_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{selectedQuickPreset.preview}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="driver-alert-quick-message">
                      {quickPreset === 'custom' ? 'Message' : 'Additional message (optional)'}
                    </Label>
                    <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
                  </div>
                  <Textarea
                    id="driver-alert-quick-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={
                      quickPreset === 'custom'
                        ? 'Example: Please call me when safely parked.'
                        : 'Optional extra context for the driver'
                    }
                    maxLength={500}
                    rows={3}
                    className="min-h-20 resize-y"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-alert-type">Alert type</Label>
                  <Select value={alertType} onValueChange={handleAlertType}>
                    <SelectTrigger id="driver-alert-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {ALERT_OPTIONS.map((option) => (
                        <SelectItem key={option.type} value={option.type}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {selectedAlert.description}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="driver-alert-priority">Priority</Label>
                    {selectedAlert.critical ? (
                      <div className="flex h-9 items-center rounded-md border border-red-500/35 bg-red-500/10 px-3">
                        <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-300">
                          Urgent
                        </Badge>
                        <span className="ml-2 text-xs text-muted-foreground">Warning sound</span>
                      </div>
                    ) : (
                      <Select
                        value={priority}
                        onValueChange={(value) => setPriority(value as DriverDispatchAlertPriority)}
                      >
                        <SelectTrigger id="driver-alert-priority" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="important">Important</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="driver-alert-load">
                      Related load {selectedAlert.requiresLoad ? '' : '(optional)'}
                    </Label>
                    <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
                      <SelectTrigger id="driver-alert-load" className="w-full">
                        <SelectValue placeholder="Select a load" />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedAlert.requiresLoad && (
                          <SelectItem value="none">No specific load</SelectItem>
                        )}
                        {loads.map((load) => (
                          <SelectItem key={load.id} value={load.id}>
                            {load.loadNumber || load.id} · {locationLabel(load.pickup)} → {locationLabel(load.delivery)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedLoad && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                          Related load
                        </p>
                        <p className="mt-0.5 text-sm font-black">{selectedLoad.loadNumber}</p>
                      </div>
                      <Badge variant="outline">{selectedLoad.status}</Badge>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/50 bg-background/60 p-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                          <MapPin className="size-3" /> Pickup
                        </div>
                        <p className="mt-1 text-xs font-semibold">{locationLabel(selectedLoad.pickup)}</p>
                        {locationAddress(selectedLoad.pickup) && (
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {locationAddress(selectedLoad.pickup)}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg border border-border/50 bg-background/60 p-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                          <MapPin className="size-3" /> Delivery
                        </div>
                        <p className="mt-1 text-xs font-semibold">{locationLabel(selectedLoad.delivery)}</p>
                        {locationAddress(selectedLoad.delivery) && (
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {locationAddress(selectedLoad.delivery)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1">
                        {selectedLoad.vehicles.length} vehicle{selectedLoad.vehicles.length === 1 ? '' : 's'}
                      </span>
                      {selectedLoad.trailerType && (
                        <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1">
                          {selectedLoad.trailerType}
                        </span>
                      )}
                      {selectedLoad.dates?.pickupDeadline && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1">
                          <Clock className="size-3" /> Pickup by {formatDate(selectedLoad.dates.pickupDeadline)}
                        </span>
                      )}
                      {selectedLoad.dates?.deliveryDeadline && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1">
                          <Clock className="size-3" /> Deliver by {formatDate(selectedLoad.dates.deliveryDeadline)}
                        </span>
                      )}
                    </div>

                    {selectedLoad.additionalInfo?.instructions && (
                      <div className="mt-3 rounded-lg border border-border/50 bg-background/60 p-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                          Existing instructions
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">
                          {selectedLoad.additionalInfo.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="driver-alert-message">
                      {alertType === 'custom' ? 'Alert message' : 'Additional instruction (optional)'}
                    </Label>
                    <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
                  </div>
                  <Textarea
                    id="driver-alert-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Add only the new instruction the driver needs to know"
                    maxLength={500}
                    rows={4}
                    className="min-h-24 resize-y"
                  />
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                  The load details above are read-only and come from the current server record. Pricing and internal dispatch fields are not included in the alert.
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={sendAlert} disabled={!canSend}>
              {sending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : mode === 'quick' ? (
                <BellRing className="mr-2 size-4" />
              ) : selectedAlert.critical ? (
                <AlertTriangle className="mr-2 size-4" />
              ) : (
                <Truck className="mr-2 size-4" />
              )}
              {mode === 'quick' ? 'Send Attention Alert' : 'Send Alert'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}