"use client";

import * as React from "react";

export type TrackerMobileView = "map" | "drivers" | "loads";

/** Finds the actual app-shell scroll container instead of assuming window scroll. */
export function trackerScrollContainer(node: HTMLElement | null): HTMLElement {
  let ancestor = node?.parentElement ?? null;
  while (ancestor && ancestor !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(ancestor).overflowY)) return ancestor;
    ancestor = ancestor.parentElement;
  }
  return document.scrollingElement as HTMLElement || document.documentElement;
}

export function useTrackerMobileNavigation() {
  const [mobileWorkspace, setView] = React.useState<TrackerMobileView>("map");
  const mobileNavigationRef = React.useRef<HTMLDivElement | null>(null);
  const currentView = React.useRef<TrackerMobileView>("map");
  const positions = React.useRef<Record<TrackerMobileView, number>>({ map: 0, drivers: 0, loads: 0 });
  const pendingRestore = React.useRef(false);
  const setMobileWorkspace = React.useCallback((next: TrackerMobileView) => {
    if (next === currentView.current) return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      positions.current[currentView.current] = trackerScrollContainer(mobileNavigationRef.current).scrollTop;
      pendingRestore.current = true;
    }
    currentView.current = next;
    setView(next);
  }, []);
  React.useLayoutEffect(() => {
    if (!pendingRestore.current) return;
    pendingRestore.current = false;
    trackerScrollContainer(mobileNavigationRef.current).scrollTop = positions.current[mobileWorkspace];
  }, [mobileWorkspace]);
  return { mobileWorkspace, setMobileWorkspace, mobileNavigationRef };
}