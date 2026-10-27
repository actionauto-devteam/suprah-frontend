"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isNativeApp, isNativeAllowedPath } from "@/lib/native-app";

/**
 * Keeps native-app (iOS/Capacitor) users inside the v1 feature scope.
 *
 * Rendered once in the ROOT layout. On the website it's a no-op. Inside
 * the app, navigating to a route outside NATIVE_ROUTE_PREFIXES bounces
 * back to "/" (the dashboard). Works together with the filtered
 * MobileBottomNav / QUICK_NAV — those hide out-of-scope links, this
 * catches deep links (e.g. from a notification tap).
 */
export function NativeAppGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isNativeApp()) return;
    if (!pathname) return;
    if (!isNativeAllowedPath(pathname)) {
      router.replace("/");
    }
  }, [pathname, router]);

  return null;
}
