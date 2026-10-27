import { Capacitor } from "@capacitor/core";

/** True when running inside the Capacitor iOS (or Android) app shell. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // 1) User-agent marker appended by capacitor.config.ts (appendUserAgent)
    if (navigator.userAgent.includes("SuprahiOSApp")) return true;
  } catch {}
  try {
    // 2) Capacitor runtime, when the bridge injects it
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch {}
  return false;
}
/** Routes reachable inside the native app. "/" is matched exactly. */
export const NATIVE_ROUTE_PREFIXES: string[] = [
  // ── The seven v1 features ──
  "/crm/timeproof-clock",
  "/crm/suprah-meet",
  "/meet", // public meeting-join links (also in PUBLIC_PATHS)
  "/transportation",
  "/driver-tracker",
  "/crm/suprah-space",
  "/crm/supra-space", // older spelling used by some nav links
  "/supraspace", // standalone (chat) entry point
  "/crm/notifications",
  "/notifications",

  // ── Account & auth (so sign-in and the user menu keep working) ──
  "/profile",
  "/settings",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/org-selection",

  // ── Role homes the dashboard layout itself redirects to.
  //    Blocking these would create a redirect loop with the layout. ──
  "/admin",
  "/driver",
  "/customer",

  // ── Public/legal ──
  "/privacy-policy",
  "/terms",
];

export function isNativeAllowedPath(pathname: string): boolean {
  if (!pathname) return true;
  if (pathname === "/") return true; // Dashboard
  return NATIVE_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Filter a nav config (MobileBottomNav items / modules, QUICK_NAV, …)
 * down to the native-app scope. Entries without an href are kept.
 */
export function filterNavForNativeApp<T extends { href?: string }>(
  items: readonly T[],
): T[] {
  return items.filter((i) => !i.href || isNativeAllowedPath(i.href));
}
