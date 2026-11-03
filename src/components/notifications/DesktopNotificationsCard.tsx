'use client';

import * as React from 'react';
import { BellOff, BellRing, Loader2, MonitorSmartphone, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useCrmWebPush } from '@/hooks/useCrmWebPush';
import { useCrmToken } from '@/hooks/useCrmToken';

type Permission = NotificationPermission | 'unsupported';

const readPermission = (): Permission =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

const errorMessage = (error: unknown) => {
  const candidate = error as { response?: { data?: { message?: unknown } } };
  return typeof candidate.response?.data?.message === 'string' ? candidate.response.data.message : null;
};

export function DesktopNotificationsCard() {
  const crmToken = useCrmToken();
  const { isSupported, isSubscribed, isLoading, subscribe } = useCrmWebPush();
  const [permission, setPermission] = React.useState<Permission>('default');
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    setPermission(readPermission());
    let status: PermissionStatus | null = null;
    const update = () => setPermission(readPermission());
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((result) => {
          status = result;
          result.addEventListener('change', update);
        })
        .catch(() => undefined);
    }
    return () => status?.removeEventListener('change', update);
  }, [isSubscribed]);

  const turnOn = async () => {
    await subscribe();
    setPermission(readPermission());
  };

  const sendTest = async () => {
    const token = crmToken || (typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null);
    setTesting(true);
    try {
      const response = await apiClient.post('/api/crm/timeproof/push/test', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const result = response.data?.data || {};
      if (!result.devices) {
        toast.info('No device is set up for desktop notifications yet.', { description: 'Click Turn on first, then send a test.' });
      } else if (result.sent > 0) {
        toast.success(`Test sent to ${result.sent} device${result.sent === 1 ? '' : 's'}.`, {
          description: "It should pop up in a few seconds. If it doesn't, check this computer's notification settings for your browser.",
        });
      } else {
        toast.error("The test couldn't reach your devices.", { description: 'Click Turn on again on this device.' });
      }
    } catch (error) {
      toast.error(errorMessage(error) || "Couldn't send a test notification.");
    } finally {
      setTesting(false);
    }
  };

  const unsupported = permission === 'unsupported' || (!isLoading && !isSupported);
  const blocked = !unsupported && permission === 'denied';
  const on = !unsupported && !blocked && isSubscribed && permission === 'granted';
  const checking = isLoading && !unsupported && !blocked;

  const state = unsupported
    ? { label: 'Not available in this browser', tone: 'muted', help: 'On an iPhone, add Suprah to your Home Screen first, then open it from there.' }
    : blocked
      ? { label: 'Blocked in this browser', tone: 'red', help: 'Click the lock icon next to the web address, set Notifications to Allow, then reload this page.' }
      : on
        ? { label: 'On for this device', tone: 'green', help: 'New leads, texts, emails and calls show here even when Suprah is in the background.' }
        : checking
          ? { label: 'Checking this device…', tone: 'muted', help: 'One moment.' }
          : { label: 'Off on this device', tone: 'amber', help: 'Turn on to get new leads, texts, emails and calls even when Suprah is in the background.' };

  const Icon = on ? BellRing : unsupported ? MonitorSmartphone : BellOff;

  return (
    <section
      aria-label="Desktop notifications"
      className={cn(
        'shrink-0 border-b px-4 py-3',
        state.tone === 'green' && 'border-emerald-500/20 bg-emerald-500/5',
        state.tone === 'amber' && 'border-amber-500/25 bg-amber-500/5',
        state.tone === 'red' && 'border-red-500/25 bg-red-500/5',
        state.tone === 'muted' && 'border-border/60 bg-muted/20',
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn(
            'mt-0.5 size-4 shrink-0',
            state.tone === 'green' && 'text-emerald-600 dark:text-emerald-400',
            state.tone === 'amber' && 'text-amber-600 dark:text-amber-400',
            state.tone === 'red' && 'text-red-600 dark:text-red-400',
            state.tone === 'muted' && 'text-muted-foreground',
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Desktop notifications</p>
          <p className="text-xs font-semibold text-foreground">{state.label}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{state.help}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!on && !unsupported && !blocked && (
              <Button size="sm" className="h-7 rounded-lg px-2.5 text-[11px]" onClick={() => void turnOn()} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <BellRing className="mr-1 size-3" />}
                Turn on
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-lg px-2.5 text-[11px]"
              onClick={() => void sendTest()}
              disabled={testing}
              title="Sends a test notification to every device where you turned them on"
            >
              {testing ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Send className="mr-1 size-3" />}
              Send test
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
