'use client';

import * as React from 'react';
import { apiClient } from '@/lib/api-client';
import { resolveImageUrl } from '@/lib/utils';

export interface CrmHeaderUser {
  fullName: string;
  email: string;
  role: string;
  avatarSrc?: string;
  onlineStatus?: 'online' | 'idle' | 'away' | 'busy' | 'offline' | 'do_not_disturb';
  lastDeviceType?: 'mobile' | 'desktop';
}

function withAvatarCacheBust(avatar?: string | null) {
  if (!avatar) return undefined;
  return `${avatar}${avatar.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

/**
 * Fetches the logged-in CRM employee (`/api/crm/me`) for chrome that needs
 * to display who's logged in — e.g. the shared CrmHeader. Self-contained and
 * read-only: unlike each page's own auth-guard effect, this never redirects
 * on failure, it just renders nothing for that slot.
 */
export function useCrmUser() {
  const [user, setUser] = React.useState<CrmHeaderUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    (async () => {
      const t = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
      if (!t) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const res = await apiClient.get('/api/crm/me', {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = res.data?.data || res.data;

        const profileRes = await apiClient.get('/api/profile').catch(() => null);
        const profile = profileRes?.data?.data || profileRes?.data;
        const profileAvatar = profile?.avatarUrl || profile?.avatar;

        if (!active) return;
        setToken(t);
        setUser({
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          avatarSrc: resolveImageUrl(
            withAvatarCacheBust(profileAvatar || data.avatarUrl || data.avatar),
          ),
          onlineStatus: profile?.onlineStatus,
          lastDeviceType: profile?.lastDeviceType,
        });
      } catch {
        // Read-only: leave user null, let each page's own auth guard handle redirects.
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { user, token, isLoading };
}
