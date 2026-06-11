"use client";

import * as React from "react";
import { CloudOff, X } from "lucide-react";

const REARM_AFTER_DISMISS_MS = 60_000;
const AUTO_HIDE_AFTER_QUIET_MS = 120_000;

const DEFAULT_MESSAGE =
  "We're experiencing technical difficulties right now — some features may not work. Your account and data are safe. We're on it!";

export function SystemStatusBanner() {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState(DEFAULT_MESSAGE);
  const dismissedAtRef = React.useRef(0);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onDegraded = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Date.now() - dismissedAtRef.current < REARM_AFTER_DISMISS_MS) return;
      setMessage(typeof detail?.message === "string" && detail.message ? detail.message : DEFAULT_MESSAGE);
      setVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_AFTER_QUIET_MS);
    };

    window.addEventListener("system:degraded", onDegraded);
    return () => {
      window.removeEventListener("system:degraded", onDegraded);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-100 border-b border-amber-500/30 bg-amber-50 dark:bg-amber-950/90 backdrop-blur-md animate-in slide-in-from-top duration-300"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2.5 px-4 py-2.5 sm:items-center">
        <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 sm:mt-0" />
        <p className="flex-1 text-xs font-medium leading-snug text-amber-800 dark:text-amber-200">
          {message}
        </p>
        <button
          type="button"
          onClick={() => {
            dismissedAtRef.current = Date.now();
            setVisible(false);
          }}
          aria-label="Dismiss notice"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
