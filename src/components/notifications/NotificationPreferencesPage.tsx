'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useCrmNotificationPreferences } from '@/hooks/useCrmNotificationPreferences';
import { useCrmToken } from '@/hooks/useCrmToken';
import { useWebPush } from '@/hooks/useWebPush';
import { NotificationSetupGuide } from './NotificationSetupGuide';
import { NotificationCategoryGrid, NotificationAdminOverlay } from './NotificationCategoryGrid';
import {
  notificationPreferenceCategories,
  adminNotificationPreferenceCategories,
  crmNotificationPreferenceCategories,
  isAdminRole,
} from './notification-preference-categories';
import { NotificationCategoryPreferences } from '@/types/notification';

/**
 * One page, always — no mode/route-dependent switching. A person can hold a
 * main-site User account AND a separate CrmUser account, each with its OWN
 * notificationPreferences document; both are fetched here (the CRM hook is
 * always called — it internally no-ops without a CRM token, no Provider
 * dependency to worry about, unlike the CRM notification INBOX hook) and
 * rendered as stacked sections rather than swapping the whole page's content
 * based on which portal you arrived from.
 *
 * Admin categories (Broadcasts/System Alerts/Staff Activity/Security & Audit)
 * live on BOTH documents — a person who's admin in both places would
 * otherwise see the exact same 4 toggles twice, looking like a bug. When
 * that's the case, they're merged into one shared control here that writes
 * to both documents at once instead.
 */
export function NotificationPreferencesPage() {
  const router = useRouter();
  const crmToken = useCrmToken();
  const hasCrmAccess = !!crmToken;

  const general = useNotificationPreferences();
  const crm = useCrmNotificationPreferences();
  const { isSupported, isSubscribed, subscribe, unsubscribe, isLoading: isPushLoading, swDisabledInDev } = useWebPush();

  const generalIsAdmin = isAdminRole(general.role);
  const crmIsAdmin = hasCrmAccess && isAdminRole(crm.role);
  const mergeAdmin = generalIsAdmin && crmIsAdmin;

  const generalCategories = hasCrmAccess
    ? notificationPreferenceCategories.filter((c) => c.key !== 'crm')
    : notificationPreferenceCategories;

  const mergedAdminPreferences = useMemo(() => {
    if (!mergeAdmin || !general.preferences || !crm.preferences) return null;
    const merged = { ...general.preferences };
    adminNotificationPreferenceCategories.forEach((c) => {
      merged[c.key] = general.preferences![c.key] && crm.preferences![c.key];
    });
    return merged;
  }, [mergeAdmin, general.preferences, crm.preferences]);

  const handleMergedAdminChange = useCallback(
    (key: keyof NotificationCategoryPreferences, value: boolean) => {
      general.handlePreferenceChange(key, value);
      crm.handlePreferenceChange(key, value);
    },
    [general, crm],
  );

  const mergedAdminSavingKey = general.savingKey ?? crm.savingKey;

  const generalStats = general.getStats([
    ...generalCategories.map((c) => c.key),
    ...(generalIsAdmin && !mergeAdmin ? adminNotificationPreferenceCategories.map((c) => c.key) : []),
  ]);
  const crmStats = crm.getStats([
    ...crmNotificationPreferenceCategories.map((c) => c.key),
    ...(crmIsAdmin && !mergeAdmin ? adminNotificationPreferenceCategories.map((c) => c.key) : []),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-9 w-9 p-0 rounded-xl border border-border/40 hover:bg-muted/50 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Settings className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Notification Preferences</h1>
            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
              Choose what you get notified about, and on which device
            </p>
          </div>
        </div>

        <NotificationSetupGuide
          isSupported={isSupported}
          isSubscribed={isSubscribed}
          isLoading={isPushLoading}
          swDisabledInDev={swDisabledInDev}
          subscribe={subscribe}
          unsubscribe={unsubscribe}
        />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">General</h2>
            {general.preferences && (
              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground">
                {generalStats.enabled}/{generalStats.total} enabled
              </Badge>
            )}
          </div>
          {general.isLoading || !general.preferences ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : (
            <NotificationCategoryGrid
              categories={generalCategories}
              preferences={general.preferences}
              role={general.role}
              savingKey={general.savingKey}
              handlePreferenceChange={general.handlePreferenceChange}
              setAll={general.setAll}
              onToggleTypeGroup={general.toggleMutedTypes}
              hideAdminOverlay={mergeAdmin}
            />
          )}
        </section>

        {hasCrmAccess && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">CRM</h2>
              </div>
              {crm.preferences && (
                <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground">
                  {crmStats.enabled}/{crmStats.total} enabled
                </Badge>
              )}
            </div>
            {crm.isLoading || !crm.preferences ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" />
                Loading…
              </div>
            ) : (
              <NotificationCategoryGrid
                categories={crmNotificationPreferenceCategories}
                preferences={crm.preferences}
                role={crm.role}
                savingKey={crm.savingKey}
                handlePreferenceChange={crm.handlePreferenceChange}
                setAll={crm.setAll}
                onToggleTypeGroup={crm.toggleMutedTypes}
                hideAdminOverlay={mergeAdmin}
              />
            )}
          </section>
        )}

        {mergeAdmin && mergedAdminPreferences && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">Admin</h2>
              <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground">
                Applies to both General &amp; CRM
              </Badge>
            </div>
            <NotificationAdminOverlay
              preferences={mergedAdminPreferences}
              savingKey={mergedAdminSavingKey}
              handlePreferenceChange={handleMergedAdminChange}
              onToggleTypeGroup={() => {}}
              label="Shared across your general and CRM admin roles"
            />
          </section>
        )}
      </div>
    </div>
  );
}
