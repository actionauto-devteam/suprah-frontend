/**
 * Deal Desk HTTP client.
 *
 * ⚠️ INTEGRATION SEAM — the only place that knows how the app talks to the
 * API. It works out of the box with the crm_token cookie (same-site
 * suprah-app.com → api.suprah-app.com). If your app keeps a main-app
 * access token in memory, register it once with setDealDeskTokenGetter()
 * (e.g. in AuthProvider) and it is sent as a Bearer token — crmAuth on the
 * backend accepts either.
 */

export class DealDeskError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type TokenGetter = () => string | null | undefined | Promise<string | null | undefined>;
let tokenGetter: TokenGetter | null = null;

export function setDealDeskTokenGetter(fn: TokenGetter | null) {
  tokenGetter = fn;
}

export async function getDealDeskToken(): Promise<string | null> {
  try {
    return (await tokenGetter?.()) || null;
  } catch {
    return null;
  }
}

export function apiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
  if (env) return env.replace(/\/+$/, '').replace(/\/api$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:5000`;
  return `${protocol}//api.${hostname.replace(/^www\./, '')}`;
}

export const DEAL_DESK_PREFIX = '/api/crm/deal-desk';

export async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal; prefix?: string } = {},
): Promise<T> {
  const token = await getDealDeskToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined && !opts.form) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${opts.prefix ?? DEAL_DESK_PREFIX}${path}`, {
      method: opts.method || (opts.body !== undefined || opts.form ? 'POST' : 'GET'),
      credentials: 'include',
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
      cache: 'no-store',
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new DealDeskError('Can’t reach the server. Check your connection and try again.', 0);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const message = json?.message || (Array.isArray(json?.errors) && json.errors[0]?.message) || `Request failed (${res.status})`;
    throw new DealDeskError(message, res.status);
  }
  return (json && 'data' in json ? json.data : json) as T;
}

/** Absolute URL for opening a document in a new tab (cookie auth). */
export function documentUrl(dealId: string, docId: string, download = false) {
  return `${apiBase()}${DEAL_DESK_PREFIX}/deals/${dealId}/documents/${docId}${download ? '?download=1' : ''}`;
}
