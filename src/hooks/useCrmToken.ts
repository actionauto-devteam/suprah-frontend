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

// Mirrors the CRM token into the same IndexedDB store AuthProvider.tsx uses
// for the main accessToken — the service worker's `pushsubscriptionchange`
// handler (sw.ts) needs to re-register a renewed push subscription with the
// CRM-specific /api/crm/timeproof/push/subscribe endpoint with no page open,
// and localStorage (where crm_token normally lives) isn't reachable from a
// service worker at all.
function syncCrmTokenToIndexedDB(token: string | null) {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    const request = indexedDB.open('action-auto-auth', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tokens')) {
        db.createObjectStore('tokens');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tokens')) return;
      const tx = db.transaction('tokens', 'readwrite');
      const store = tx.objectStore('tokens');
      if (token) {
        store.put(token, 'crmAccessToken');
      } else {
        store.delete('crmAccessToken');
      }
    };
  } catch (e) {
    console.warn('[Auth] CRM token IndexedDB sync failed', e);
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
      syncCrmTokenToIndexedDB(null);
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

      if (active) {
        setCrmToken(t);
        syncCrmTokenToIndexedDB(t);
      }
    })();

    return () => {
      active = false;
    };
  }, [getToken, refreshNonce]);

  return crmToken;
}
