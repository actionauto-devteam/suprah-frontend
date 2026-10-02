"use client";

import * as React from "react";

// Lets a driver screen hide the phone bottom navigation while it's showing
// something full-screen, like an open Dispatch Chat conversation. The driver
// layout reads it; screens ask for it with useHideDriverBottomNav.

let hideRequests = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => hideRequests > 0;
const getServerSnapshot = () => false;

/** True while some screen asked to hide the driver's bottom navigation. */
export function useDriverBottomNavHidden() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Hides the driver's bottom navigation while `active` is true. */
export function useHideDriverBottomNav(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    hideRequests += 1;
    emit();
    return () => {
      hideRequests -= 1;
      emit();
    };
  }, [active]);
}
