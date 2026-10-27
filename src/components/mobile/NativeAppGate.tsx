"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isNativeApp, isNativeAllowedPath } from "@/lib/native-app";

export function NativeAppGate() {
  const router = useRouter();
  const pathname = usePathname();

  // Inside the native app, the PWA service worker only causes stale builds —
  // the shell loads the live site directly. Unregister it once per session.
  useEffect(() => {
    if (!isNativeApp()) return;
    navigator.serviceWorker
      ?.getRegistrations?.()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;
    if (!pathname) return;
    if (!isNativeAllowedPath(pathname)) {
      router.replace("/");
    }
  }, [pathname, router]);

  return null;
}