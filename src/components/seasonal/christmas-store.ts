"use client";

/**
 * Christmas effects — singleton store (no provider needed).
 *
 * Same useSyncExternalStore pattern as the Feeds / YapLine badges. Two
 * things decide whether the festive layer renders:
 *
 *   1. Availability — the season window (Nov 15 → Jan 6, local time), or the
 *      NEXT_PUBLIC_CHRISTMAS_EFFECTS kill switch:
 *        "on"   → always available (handy for QA / previews)
 *        "off"  → never available (instant kill switch, no code change)
 *        unset  → follow the season window
 *   2. The user's own preference — persisted in localStorage, synced across
 *      tabs. Defaults to ON so everyone sees it the first time.
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "suprah:christmas-effects";
const FLAG = process.env.NEXT_PUBLIC_CHRISTMAS_EFFECTS;

export function isChristmasSeason(d: Date = new Date()): boolean {
  const month = d.getMonth(); // 0 = Jan … 11 = Dec
  const day = d.getDate();
  return (month === 10 && day >= 15) || month === 11 || (month === 0 && day <= 6);
}

export function isChristmasAvailable(d: Date = new Date()): boolean {
  if (FLAG === "off") return false;
  if (FLAG === "on") return true;
  return isChristmasSeason(d);
}

/* ── user preference ── */

let pref: "on" | "off" | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

function readPref(): "on" | "off" {
  if (pref) return pref;
  try {
    pref = window.localStorage.getItem(STORAGE_KEY) === "off" ? "off" : "on";
  } catch {
    pref = "on";
  }
  return pref;
}

function emit() {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  pref = null; // re-read on next snapshot
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!storageBound && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    storageBound = true;
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && storageBound) {
      window.removeEventListener("storage", onStorage);
      storageBound = false;
    }
  };
}

export function setChristmasEffects(on: boolean) {
  pref = on ? "on" : "off";
  try {
    window.localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* private mode — preference just lasts for this page view */
  }
  emit();
}

const noopSubscribe = () => () => {};

/**
 * `available` — it's the season (or forced on): show the toggle.
 * `enabled`   — available AND the user hasn't switched it off: render effects.
 * Both are false during SSR so there's never a hydration mismatch.
 */
export function useChristmasEffects() {
  const available = useSyncExternalStore(
    noopSubscribe,
    () => isChristmasAvailable(),
    () => false,
  );
  const prefOn = useSyncExternalStore(
    subscribe,
    () => readPref() === "on",
    () => false,
  );
  return {
    available,
    enabled: available && prefOn,
    setEnabled: setChristmasEffects,
  };
}

/** prefers-reduced-motion as a live hook (SSR → false). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}