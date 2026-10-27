"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native-app";

/**
 * SSR/hydration-safe "am I inside the iOS app?" hook.
 *
 * Returns false on the server and on the first client render, then flips
 * to true after mount when running in the Capacitor shell — so server
 * and client markup always match.
 */
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);
  return isNative;
}
