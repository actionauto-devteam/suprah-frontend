'use client';

import React, { useEffect, useState } from 'react';
import {
  BellRing, Loader2, CheckCircle2, ShieldAlert, Share, PlusSquare,
  MonitorSmartphone, Smartphone, Apple, Settings2, Sparkles, Info, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getNotificationPlatform, isStandalonePwa, type NotificationPlatform } from '@/lib/device';

interface NotificationSetupGuideProps {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  swDisabledInDev?: boolean;
  subscribe: () => void | Promise<void>;
  unsubscribe: () => void | Promise<void>;
}

type PermissionState = 'granted' | 'denied' | 'default' | 'unknown';

const PLATFORM_META: Record<NotificationPlatform, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  desktop: { label: 'Windows / Mac', icon: MonitorSmartphone },
  android: { label: 'Android', icon: Smartphone },
  ios: { label: 'iPhone / iPad', icon: Apple },
};

export function NotificationSetupGuide({ isSupported, isSubscribed, isLoading, swDisabledInDev, subscribe, unsubscribe }: NotificationSetupGuideProps) {
  const [platform, setPlatform] = useState<NotificationPlatform>('desktop');
  const [standalone, setStandalone] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('unknown');

  useEffect(() => {
    setPlatform(getNotificationPlatform());
    setStandalone(isStandalonePwa());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as PermissionState);
    }
  }, []);

  const needsIosInstall = platform === 'ios' && !standalone;
  const isBlocked = permission === 'denied';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Bell className="size-5" />
            {isSubscribed && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                <CheckCircle2 className="size-3 text-white" />
              </span>
            )}
          </div>

          <div className="flex-1 space-y-1">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              {isSubscribed ? "You're all set" : 'Get notified anywhere'}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isSubscribed
                ? 'This device is connected — you\'ll get alerts on the lock screen and notification tray even with everything closed.'
                : 'Turn this on to get real alerts on the lock screen and notification tray, even when this site is closed.'}
            </p>
          </div>

          {needsIosInstall ? (
            <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
              One extra step below ↓
            </Badge>
          ) : isBlocked ? null : (
            <Button
              onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
              disabled={!isSupported || isLoading}
              variant={isSubscribed ? 'outline' : 'default'}
              className="shrink-0 gap-2 rounded-xl"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
              {isSubscribed ? 'Turn off on this device' : 'Enable Notifications'}
            </Button>
          )}
        </div>

        {isBlocked && (
          <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Notifications are blocked for this site</p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
              Click the lock or site-info icon next to the address bar → Notifications → Allow, then refresh this page.
            </p>
          </div>
        )}

        {swDisabledInDev && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <Info className="size-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Push is disabled on localhost — this works automatically once deployed.
            </p>
          </div>
        )}
      </div>

      {/* Per-platform setup reference — flat, all visible, current device highlighted */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(PLATFORM_META) as NotificationPlatform[]).map((key) => {
          const meta = PLATFORM_META[key];
          const Icon = meta.icon;
          const isCurrent = key === platform;
          return (
            <div
              key={key}
              className={cn(
                'rounded-2xl border p-4 space-y-3 transition-all',
                isCurrent ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm' : 'border-border/50 bg-background/60',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isCurrent ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                </div>
                {isCurrent && (
                  <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[9px] uppercase tracking-wide">
                    Your device
                  </Badge>
                )}
              </div>

              {key === 'ios' ? (
                <ol className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Share className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
                    <span>Open this site in <strong className="text-foreground">Safari</strong>, tap the Share icon</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <PlusSquare className="size-3.5 mt-0.5 shrink-0 text-foreground/70" />
                    <span>Tap <strong className="text-foreground">Add to Home Screen</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BellRing className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    <span>Open the app from your Home Screen, then tap <strong className="text-foreground">Enable Notifications</strong> above</span>
                  </li>
                </ol>
              ) : key === 'android' ? (
                <ol className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2">
                    <BellRing className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    <span>Tap <strong className="text-foreground">Enable Notifications</strong> above and choose <strong className="text-foreground">Allow</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <span>Optional: browser menu → <strong className="text-foreground">Install app</strong> for a full-screen, app-like experience</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-2">
                    <BellRing className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    <span>Tap <strong className="text-foreground">Enable Notifications</strong> above and choose <strong className="text-foreground">Allow</strong> in the browser prompt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Settings2 className="size-3.5 mt-0.5 shrink-0 text-foreground/70" />
                    <span>Blocked by mistake? Click the lock/site-info icon in the address bar → Notifications → Allow</span>
                  </li>
                </ol>
              )}
            </div>
          );
        })}
      </div>

      {!isSupported && !needsIosInstall && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20 px-3.5 py-2.5">
          <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            This browser doesn&apos;t support push notifications. Try the latest Chrome, Edge, or Safari.
          </p>
        </div>
      )}
    </div>
  );
}
