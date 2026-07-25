'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useProfileContext } from '@/context/ProfileContext';
import { useAuth } from '@/providers/AuthProvider';
import {
  NotificationPreferences,
  NotificationCategoryPreferences,
  defaultNotificationPreferences,
} from '@/types/notification';

export function useNotificationPreferences() {
  const { cachedProfile, setCachedProfile } = useProfileContext();
  const { getToken } = useAuth();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    () => (cachedProfile?.notificationPreferences as NotificationPreferences) || null,
  );
  const [role, setRole] = useState<string | undefined>(cachedProfile?.role);
  const [isLoading, setIsLoading] = useState(!cachedProfile);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/profile');
      const data = response.data.data;
      setPreferences({ ...defaultNotificationPreferences, ...data.notificationPreferences });
      setRole(data.role);
      setCachedProfile(data);
    } catch {
      // Non-fatal — the preferences section just stays empty/disabled.
    } finally {
      setIsLoading(false);
    }
  }, [setCachedProfile]);

  useEffect(() => {
    if (!cachedProfile) {
      fetchPreferences();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreferenceChange = useCallback(
    async (key: keyof NotificationCategoryPreferences, value: boolean) => {
      if (!preferences) return;

      const previous = { ...preferences };
      setPreferences({ ...preferences, [key]: value });
      setSavingKey(key);

      try {
        const token = await getToken();
        await apiClient.patch(
          '/api/profile/notification-preferences',
          { [key]: value },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        setPreferences(previous);
        toast.error('Failed to update preference');
      } finally {
        setSavingKey(null);
      }
    },
    [preferences, getToken],
  );

  const setAll = useCallback(
    async (value: boolean, keys: (keyof NotificationCategoryPreferences)[]) => {
      if (!preferences) return;

      const updates: Partial<NotificationCategoryPreferences> = {};
      keys.forEach((key) => {
        if (preferences[key] !== value) updates[key] = value;
      });
      if (Object.keys(updates).length === 0) return;

      const previous = { ...preferences };
      setPreferences({ ...preferences, ...updates });
      setSavingKey('__bulk__');

      try {
        const token = await getToken();
        await apiClient.patch('/api/profile/notification-preferences', updates, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        setPreferences(previous);
        toast.error('Failed to update preferences');
      } finally {
        setSavingKey(null);
      }
    },
    [preferences, getToken],
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

  // Toggles a whole logical sub-group of types (e.g. CRM_TYPE_GROUPS' "crm_messages")
  // on/off at once, independent of the category-level toggle — the category
  // stays enabled, only these specific types get added to/removed from the mute list.
  const toggleMutedTypes = useCallback(
    async (types: string[], muted: boolean) => {
      if (!preferences) return;

      const previous = { ...preferences };
      const nextSet = new Set(preferences.mutedTypes);
      types.forEach((t) => (muted ? nextSet.add(t) : nextSet.delete(t)));
      const mutedTypes = Array.from(nextSet);

      setPreferences({ ...preferences, mutedTypes });
      setSavingKey('__mutedTypes__');

      try {
        const token = await getToken();
        await apiClient.patch(
          '/api/profile/notification-preferences',
          { mutedTypes },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        setPreferences(previous);
        toast.error('Failed to update preference');
      } finally {
        setSavingKey(null);
      }
    },
    [preferences, getToken],
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
