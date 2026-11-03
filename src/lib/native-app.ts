/**
 * Native iOS app (Capacitor) helpers.
 *
 * UPDATE (Nov 2026): the v1 feature restrictions are LIFTED — the iOS app
 * now exposes the full Suprah platform, same as the website. The gating
 * plumbing (route allowlist + nav filter) is kept but neutralized, so
 * re-scoping later is a one-line change (flip RESTRICT_NATIVE_APP).
 *
 * isNativeApp() is still used for real platform differences and stays
 * fully active: hiding PWA install/web-push prompts in-app, unregistering
 * the service worker inside the shell, and routing geolocation through
 * the native plugin (src/lib/geolocation.ts).
 */

/** Master switch: true = scope the native app to NATIVE_ROUTE_PREFIXES. */
const RESTRICT_NATIVE_APP = false;

/** True when running inside the Suprah iOS app shell. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // 1) User-agent marker appended by capacitor.config.ts (appendUserAgent)
    if (navigator.userAgent.includes("SuprahiOSApp")) return true;
  } catch {}
  try {
    // 2) Capacitor runtime, when the bridge injects it
    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch {}
  return false;
}

/**
 * Former v1 scope, kept for a possible future re-scoping.
 * Unused while RESTRICT_NATIVE_APP is false.
 */
export const NATIVE_ROUTE_PREFIXES: string[] = [
  "/crm/timeproof-clock",
  "/crm/suprah-meet",
  "/meet",
  "/transportation",
  "/driver-tracker",
  "/crm/suprah-space",
  "/crm/supra-space",
  "/supraspace",
  "/crm/notifications",
  "/notifications",
  "/profile",
  "/settings",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/org-selection",
  "/admin",
  "/driver",
  "/customer",
  "/privacy-policy",
  "/terms",
];

export function isNativeAllowedPath(pathname: string): boolean {
  if (!RESTRICT_NATIVE_APP) return true; // all routes open in the app
  if (!pathname) return true;
  if (pathname === "/") return true;
  return NATIVE_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Nav filter: with restrictions lifted this is a pass-through, so every
 * caller (sidebar, quick-nav, bottom nav) shows its full item set.
 */
export function filterNavForNativeApp<
  T extends { href?: string; url?: string },
>(items: readonly T[]): T[] {
  if (!RESTRICT_NATIVE_APP) return [...items];
  return items.filter((i) => {
    const target = i.href ?? i.url;
    return !target || isNativeAllowedPath(target);
  });
}