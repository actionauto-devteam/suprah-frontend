"use client";

import { useEffect, useState } from "react";
import { keepScreenOnDuringCall, type ScreenLockApi } from "@/lib/callWakeLock";

export function useCallWakeLock(active: boolean): boolean {
  const [screenOn, setScreenOn] = useState(false);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || typeof document === "undefined") return;
    const api = (navigator as unknown as { wakeLock?: ScreenLockApi }).wakeLock;
    const stop = keepScreenOnDuringCall(api, document, setScreenOn);
    return () => {
      stop();
      setScreenOn(false);
    };
  }, [active]);

  return screenOn;
}
