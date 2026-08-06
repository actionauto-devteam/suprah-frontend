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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <BellRing className="size-4.5" />
            </span>
            Alert {driver?.driver?.name || 'Driver'}
          </DialogTitle>
          <DialogDescription>
            Sends an urgent in-app, push, vibration, and audible warning alert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="driver-alert-destination-type">Destination type</Label>
            <Select value={destinationType} onValueChange={(value) => handleDestinationType(value as DestinationType)}>
              <SelectTrigger id="driver-alert-destination-type">
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
                className="pl-9"
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
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="driver-alert-message">Message</Label>
            <Textarea
              id="driver-alert-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Optional instruction for the driver"
              maxLength={500}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={sendAlert} disabled={sending || !destinationName.trim()}>
            {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <BellRing className="mr-2 size-4" />}
            Send Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
