'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useCrmToken } from '@/hooks/useCrmToken';
import {
  NotificationPreferences,
  NotificationCategoryPreferences,
  defaultNotificationPreferences,
} from '@/types/notification';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function useCrmNotificationPreferences() {
  const crmToken = useCrmToken();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!crmToken) return;
    try {
      const res = await fetch(`${API_URL}/api/crm/notifications/preferences`, {
        headers: { Authorization: `Bearer ${crmToken}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreferences({ ...defaultNotificationPreferences, ...data?.data?.preferences });
      setRole(data?.data?.role);
    } catch {
      // Non-fatal — the preferences section just stays empty/disabled.
    } finally {
      setIsLoading(false);
    }
  }, [crmToken]);

  useEffect(() => {
    if (crmToken) fetchPreferences();
    else setIsLoading(false);
  }, [crmToken, fetchPreferences]);

  const handlePreferenceChange = useCallback(
    async (key: keyof NotificationCategoryPreferences, value: boolean) => {
      if (!preferences || !crmToken) return;

      const previous = { ...preferences };
      setPreferences({ ...preferences, [key]: value });
      setSavingKey(key);

      try {
        const res = await fetch(`${API_URL}/api/crm/notifications/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setPreferences(previous);
        toast.error('Failed to update preference');
      } finally {
        setSavingKey(null);
      }
    },
    [preferences, crmToken],
  );

  const setAll = useCallback(
    async (value: boolean, keys: (keyof NotificationCategoryPreferences)[]) => {
      if (!preferences || !crmToken) return;

      const updates: Partial<NotificationCategoryPreferences> = {};
      keys.forEach((key) => {
        if (preferences[key] !== value) updates[key] = value;
      });
      if (Object.keys(updates).length === 0) return;

      const previous = { ...preferences };
      setPreferences({ ...preferences, ...updates });
      setSavingKey('__bulk__');

      try {
        const res = await fetch(`${API_URL}/api/crm/notifications/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error();
      } catch {
        setPreferences(previous);
        toast.error('Failed to update preferences');
      } finally {
        setSavingKey(null);
      }
    },
    [preferences, crmToken],
  );

  const getStats = useCallback(
    (keys: (keyof NotificationCategoryPreferences)[]) => {
      if (!preferences) return { enabled: 0, total: keys.length };
      return {
        enabled: keys.filter((key) => preferences[key]).length,
        total: keys.length,
      };
    },
    [preferences],
  );

  const toggleMutedTypes = useCallback(
    async (types: string[], muted: boolean) => {
      if (!preferences || !crmToken) return;

      const previous = { ...preferences };
      const nextSet = new Set(preferences.mutedTypes);
      types.forEach((t) => (muted ? nextSet.add(t) : nextSet.delete(t)));
      const mutedTypes = Array.from(nextSet);

      setPreferences({ ...preferences, mutedTypes });
      setSavingKey('__mutedTypes__');

      try {
        const res = await fetch(`${API_URL}/api/crm/notifications/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${crmToken}` },
          body: JSON.stringify({ mutedTypes }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setPreferences(previous);
        toast.error('Failed to update preference');
      } finally {
        setSavingKey(null);
      }
    },
    [preferences, crmToken],
  );

  return {
    preferences,
    role,
    isLoading,
    savingKey,
    handlePreferenceChange,
    setAll,
    getStats,
    toggleMutedTypes,
  };
}
