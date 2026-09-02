import * as React from 'react';
import { useAuth, useUser } from '@/providers/AuthProvider';
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


function clearStoredCrmToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('crm_token');
  }
  syncCrmTokenToIndexedDB(null);
}

/**
 * Resolves the CRM JWT (`crm_token`) needed to authenticate against the
 * SupraSpace socket and `/api/supraspace/*` REST endpoints. Mirrors the
 * SSO flow in useOpenDm.ts / crm/supra-space/page.tsx.
 */
export function useCrmToken() {
  const { getToken, isLoaded, isSignedIn, orgId } = useAuth();
  const { user } = useUser();
  const [crmToken, setCrmToken] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  React.useEffect(() => {
    const refresh = () => {
      clearStoredCrmToken();
      setCrmToken(null);
      setRefreshNonce((n) => n + 1);
    };
    window.addEventListener('supraspace:refresh-crm-token', refresh);
    return () => window.removeEventListener('supraspace:refresh-crm-token', refresh);
  }, []);

  React.useEffect(() => {
    let active = true;

    // Wait until AuthProvider has resolved the account. Running the CRM SSO
    // flow before this point can misclassify a valid session while auth is
    // still being restored.
    if (!isLoaded) {
      return () => {
        active = false;
      };
    }

    // A signed-out browser must not retain a CRM token from a previous user.
    if (!isSignedIn) {
      clearStoredCrmToken();
      setCrmToken(null);
      return () => {
        active = false;
      };
    }

    // Drivers are a shared platform pool and may legitimately have no home
    // organization. That account can still use the Driver Portal, GPS,
    // available loads and Suprah Dispatch Chat, but it has no CRM/SupraSpace
    // organization identity to exchange for a crm_token.
    //
    // Do not call /api/supraspace/session-token or /api/auth/crm-sso for this
    // case. Also remove any stale token left by a previous account in the same
    // browser.
    const isStandaloneDriver = user?.role === 'driver' && !orgId;
    if (isStandaloneDriver) {
      clearStoredCrmToken();
      setCrmToken(null);
      return () => {
        active = false;
      };
    }

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
  }, [
    getToken,
    isLoaded,
    isSignedIn,
    orgId,
    refreshNonce,
    user?.id,
    user?.role,
  ]);

  return crmToken;
}