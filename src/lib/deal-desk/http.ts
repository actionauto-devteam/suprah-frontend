/**
 * Deal Desk HTTP client.
 *
 * The only place that knows how the app authenticates API calls. Sends the
 * same Bearer token the rest of Suprah uses (localStorage["crm_token"]),
 * plus cookies. The socket connection uses the same token.
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

/**
 * Suprah keeps the CRM login in localStorage["crm_token"] and sends it as
 * "Authorization: Bearer …" — the Deal Desk does the same, so it works with
 * no extra wiring. A getter registered with setDealDeskTokenGetter() wins.
 */
const STORAGE_KEY = 'crm_token';

function storedToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // tolerate a JSON-quoted value ("eyJ…") as well as the raw token
    const t = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return typeof t === 'string' && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}

export async function getDealDeskToken(): Promise<string | null> {
  try {
    return (await tokenGetter?.()) || storedToken();
  } catch {
    return storedToken();
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