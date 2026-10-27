"use client";

import { useIsNativeApp } from "./useIsNativeApp";

/**
 * Hides children when running inside the native (Capacitor) iOS app.
 *
 * Wrap PWA-only UI with this — InstallPrompt, PushPrompt, IOSInstallHint,
 * CrmPushPrompt — so the app doesn't offer "Install this app" / browser
 * web-push to someone already inside the native app. (Native push comes
 * later via APNs + the Capacitor Push Notifications plugin.)
 */
export function HideInNativeApp({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isNative = useIsNativeApp();
  if (isNative) return null;
  return <>{children}</>;
}
