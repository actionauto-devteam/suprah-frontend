"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  claimPwaNag,
  getPwaNagServerSnapshot,
  getPwaNagSnapshot,
  releasePwaNag,
  subscribePwaNag,
} from "@/lib/pwa-nag-store";

// Only one PWA "nag" (install prompt, iOS install hint, push opt-in) may
// occupy screen space at a time — without this, InstallPrompt/PushPrompt/
// IOSInstallHint each fire on their own independent setTimeout and can land
// on top of each other within seconds of a first mobile visit. A denied
// lower-priority nag automatically retries once the slot frees up, so it
// still gets a turn instead of silently never showing for the session.
export function usePwaNagSlot(id: string, priority: number) {
  const snapshot = useSyncExternalStore(subscribePwaNag, getPwaNagSnapshot, getPwaNagServerSnapshot);
  const wantsRef = useRef(false);
  const isActive = snapshot.activeId === id;

  const request = useCallback(() => {
    wantsRef.current = true;
    return claimPwaNag(id, priority);
  }, [id, priority]);

  const release = useCallback(() => {
    wantsRef.current = false;
    releasePwaNag(id);
  }, [id]);

  useEffect(() => {
    if (snapshot.activeId === null && wantsRef.current) {
      claimPwaNag(id, priority);
    }
  }, [snapshot.activeId, id, priority]);

  useEffect(() => () => releasePwaNag(id), [id]);

  return { isActive, request, release };
}
