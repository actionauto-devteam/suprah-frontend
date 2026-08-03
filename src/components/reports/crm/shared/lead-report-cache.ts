import type { Lead } from "@/types/lead";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface LeadReportCacheEntry {
  savedAt: number;
  leads: Lead[];
}

const memoryCaches = new Map<string, LeadReportCacheEntry>();
let activeAuthenticatedScopeKey: string | null = null;

function isFresh(entry: LeadReportCacheEntry, maxAgeMs: number): boolean {
  return Date.now() - entry.savedAt <= maxAgeMs;
}

/**
 * Produces a short, non-reversible in-memory key without retaining the supplied
 * authentication token or account identifier. Lead records are deliberately
 * not written to localStorage or sessionStorage.
 */
function cacheKey(scope: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < scope.length; index += 1) {
    hash ^= scope.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

const DEFAULT_SCOPE_KEY = cacheKey("default-report-session");

/**
 * Resolves a cache partition and clears data when the authenticated account
 * changes. An unscoped cache written by the Reports overview is adopted by the
 * first authenticated workspace that reads it, preserving the fast overview →
 * Lead Status/Source navigation without allowing data to cross accounts.
 */
function resolveScopeKey(scope?: string): string {
  const value = String(scope ?? "").trim();

  if (!value) {
    return activeAuthenticatedScopeKey ?? DEFAULT_SCOPE_KEY;
  }

  const nextKey = cacheKey(value);

  if (
    activeAuthenticatedScopeKey &&
    activeAuthenticatedScopeKey !== nextKey
  ) {
    memoryCaches.clear();
  }

  if (!activeAuthenticatedScopeKey) {
    const overviewEntry = memoryCaches.get(DEFAULT_SCOPE_KEY);
    if (overviewEntry) {
      memoryCaches.set(nextKey, overviewEntry);
      memoryCaches.delete(DEFAULT_SCOPE_KEY);
    }
  }

  activeAuthenticatedScopeKey = nextKey;
  return nextKey;
}

/**
 * Returns recently loaded lead records from a short-lived, memory-only cache.
 * A page reload clears the data. Pass an authentication token or account ID as
 * the scope when available. Existing unscoped callers remain compatible.
 */
export function readLeadReportCache(maxAgeMs?: number): Lead[] | null;
export function readLeadReportCache(
  scope?: string,
  maxAgeMs?: number,
): Lead[] | null;
export function readLeadReportCache(
  scopeOrMaxAge?: string | number,
  maxAgeMs = CACHE_TTL_MS,
): Lead[] | null {
  const scope =
    typeof scopeOrMaxAge === "string" ? scopeOrMaxAge : undefined;
  const resolvedMaxAge =
    typeof scopeOrMaxAge === "number" ? scopeOrMaxAge : maxAgeMs;
  const key = resolveScopeKey(scope);
  const entry = memoryCaches.get(key);
  if (!entry) return null;
  if (!isFresh(entry, resolvedMaxAge)) {
    memoryCaches.delete(key);
    return null;
  }

  return entry.leads;
}

/** Stores lead records only in memory; no lead PII is persisted in web storage. */
export function writeLeadReportCache(
  leads: Lead[],
  scope?: string,
): void {
  const key = resolveScopeKey(scope);
  memoryCaches.set(key, {
    savedAt: Date.now(),
    leads,
  });
}

export function clearLeadReportCache(scope?: string): void {
  if (scope === undefined) {
    memoryCaches.clear();
    activeAuthenticatedScopeKey = null;
    return;
  }

  const key = cacheKey(scope);
  memoryCaches.delete(key);
  if (activeAuthenticatedScopeKey === key) {
    activeAuthenticatedScopeKey = null;
  }
}
