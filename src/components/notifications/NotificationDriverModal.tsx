'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { formatNotificationDate } from './notification-utils';
import { Notification } from '@/types/notification';
import { toast } from 'sonner';

interface DriverRequestModalProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDriverModal({ notification, open, onOpenChange }: DriverRequestModalProps) {
  const { getToken } = useAuth();
  const { deleteNotification } = useNotifications();
  const [isActioning, setIsActioning] = useState(false);
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);

  const driverName = notification?.metadata?.driverName || 'Unknown Driver';
  const driverEmail = notification?.metadata?.driverEmail || '—';
  const requestId = notification?.metadata?.driverRequestId;

  useEffect(() => {
    if (!open) setResult(null);
  }, [open]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!requestId) return;
    setIsActioning(true);
    try {
      const token = await getToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (action === 'approve') {
        await apiClient.approveDriverRequest(requestId, config);
        setResult('approved');
      } else {
        await apiClient.rejectDriverRequest(requestId, config);
        setResult('rejected');
      }

      if (notification) {
        await deleteNotification(notification._id);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Action failed. The request may have already been processed.';
      toast.error(msg);
    } finally {
      setIsActioning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-emerald-500" />
            Driver Request
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center py-6 gap-3">
            {result === 'approved' ? (
              <>
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <CheckCircle2 className="size-7 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-green-600">Request Approved</p>
                <p className="text-xs text-muted-foreground text-center">
                  {driverName} can now access the driver dashboard.
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                  <XCircle className="size-7 text-red-600" />
                </div>
                <p className="text-sm font-semibold text-red-600">Request Rejected</p>
                <p className="text-xs text-muted-foreground text-center">
                  {driverName}&apos;s request has been rejected.
                </p>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  {driverName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-semibold">{driverName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {driverEmail}
                </p>
                {notification && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested {formatNotificationDate(notification.createdAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              This driver wants to join your organization. Approving will give them access to the driver dashboard and allow them to receive load assignments.
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200"
                onClick={() => handleAction('reject')}
                disabled={isActioning}
              >
                {isActioning ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <XCircle className="size-4 mr-1.5" />}
                Reject
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleAction('approve')}
                disabled={isActioning}
              >
                {isActioning ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
                Approve
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
