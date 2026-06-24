import * as React from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';

function getJwtType(token: string | null): string | null {
  if (!token || typeof atob === 'undefined') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded)) as { type?: string };
    return decoded.type || null;
  } catch {
    return null;
  }
}

/**
 * Resolves the CRM JWT (`crm_token`) needed to authenticate against the
 * SupraSpace socket and `/api/supraspace/*` REST endpoints. Mirrors the
 * SSO flow in useOpenDm.ts / crm/supra-space/page.tsx.
 */
export function useCrmToken() {
  const { getToken } = useAuth();
  const [crmToken, setCrmToken] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  React.useEffect(() => {
    const refresh = () => {
      if (typeof window !== 'undefined') localStorage.removeItem('crm_token');
      setCrmToken(null);
      setRefreshNonce((n) => n + 1);
    };
    window.addEventListener('supraspace:refresh-crm-token', refresh);
    return () => window.removeEventListener('supraspace:refresh-crm-token', refresh);
  }, []);

  React.useEffect(() => {
    let active = true;

    (async () => {
      let t: string | null = null;
      if (typeof window !== 'undefined') {
        t = localStorage.getItem('crm_token');
        if (t && getJwtType(t) !== 'crm') {
          localStorage.removeItem('crm_token');
          t = null;
        }
      }

      if (!t) {
        try {
          const mainToken = await getToken();
          if (mainToken) {
            const sso = await apiClient.post(
              '/api/supraspace/session-token',
              {},
              { headers: { Authorization: `Bearer ${mainToken}` } }
            );
            t = sso.data?.data?.token ?? null;
            if (t) localStorage.setItem('crm_token', t);
          }
        } catch {
          try {
            const mainToken = await getToken();
            if (mainToken) {
              const sso = await apiClient.get('/api/auth/crm-sso', {
                headers: { Authorization: `Bearer ${mainToken}` },
              });
              t = sso.data?.data?.token ?? null;
              if (t) localStorage.setItem('crm_token', t);
            }
          } catch {}
        }
      }

      if (active) setCrmToken(t);
    })();

    return () => {
      active = false;
    };
  }, [getToken, refreshNonce]);

  return crmToken;
}
