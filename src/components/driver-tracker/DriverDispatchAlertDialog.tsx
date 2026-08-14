'use client';

import * as React from 'react';
import { BellRing, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface DriverDispatchAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
}

type DestinationType = 'site' | 'carshop' | 'specific-shop';

const DESTINATION_PRESETS: Record<DestinationType, string> = {
  site: 'Current Job Site',
  carshop: 'Lehi Carshop',
  'specific-shop': '',
};

export function DriverDispatchAlertDialog({
  open,
  onOpenChange,
  driver,
}: DriverDispatchAlertDialogProps) {
  const { getToken } = useAuth();
  const [destinationType, setDestinationType] = React.useState<DestinationType>('carshop');
  const [destinationName, setDestinationName] = React.useState('Lehi Carshop');
  const [address, setAddress] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDestinationType('carshop');
    setDestinationName('Lehi Carshop');
    setAddress('');
    setMessage('');
  }, [open, driver?.id]);

  const handleDestinationType = (value: DestinationType) => {
    setDestinationType(value);
    setDestinationName(DESTINATION_PRESETS[value]);
  };

  const sendAlert = async () => {
    const driverId = driver?.driver?.id;
    if (!driverId || !destinationName.trim()) return;

    setSending(true);
    try {
      const token = await getToken();
      await apiClient.post(
        `/api/driver-tracking/drivers/${driverId}/alert`,
        {
          destinationType,
          destinationName: destinationName.trim(),
          address: address.trim() || undefined,
          message: message.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`Alert sent to ${driver.driver?.name || 'driver'}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not send driver alert');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-md duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0" overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-6 sm:py-5">
          <DialogTitle className="flex min-w-0 items-start gap-2 pr-7 text-lg font-black">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <BellRing className="size-4.5" />
            </span>
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              Alert {driver?.driver?.name || 'Driver'}
            </span>
          </DialogTitle>
          <DialogDescription className="break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
            Sends an urgent in-app, push, vibration, and audible warning alert to this driver.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="driver-alert-destination-type">Destination type</Label>
              <Select value={destinationType} onValueChange={(value) => handleDestinationType(value as DestinationType)}>
                <SelectTrigger id="driver-alert-destination-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Current Site</SelectItem>
                  <SelectItem value="carshop">Lehi Carshop</SelectItem>
                  <SelectItem value="specific-shop">Specific Shop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driver-alert-destination">Destination</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="driver-alert-destination"
                  value={destinationName}
                  onChange={(event) => setDestinationName(event.target.value)}
                  placeholder="Enter destination name"
                  className="w-full pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driver-alert-address">Address or directions</Label>
              <Input
                id="driver-alert-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Optional street address or directions"
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="driver-alert-message">Message</Label>
                <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
              </div>
              <Textarea
                id="driver-alert-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional instruction for the driver"
                maxLength={500}
                rows={4}
                className="min-h-24 resize-y break-words [overflow-wrap:anywhere]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={sendAlert} disabled={sending || !destinationName.trim()}>
              {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <BellRing className="mr-2 size-4" />}
              <span className="break-words text-center [overflow-wrap:anywhere]">Send Alert</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}