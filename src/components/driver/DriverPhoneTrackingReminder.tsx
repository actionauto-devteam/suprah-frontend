"use client";

import * as React from "react";
import Link from "next/link";
import { Info, Smartphone, TriangleAlert } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { phoneTrackingApi, type PhoneTrackingReminder } from "@/lib/api/phone-tracking";

const CHECK_INTERVAL_MS = 60_000;

const MESSAGES: Record<Exclude<PhoneTrackingReminder, null | "keep_on">, { title: string; body: string; tone: "amber" | "red" | "blue" }> = {
  turn_on: {
    title: "Turn on Traccar Client",
    body: "Turn tracking on in Traccar Client so Dispatch can follow your trip, even while you use Google Maps or lock your screen.",
    tone: "amber",
  },
  not_receiving: {
    title: "Traccar Client isn't sending your location",
    body: "Suprah hasn't received your location from Traccar Client for a few minutes. Open the app and check that tracking is on and location is allowed all the time.",
    tone: "red",
  },
  turn_off: {
    title: "You can turn Traccar Client off",
    body: "You have no active loads, so Dispatch doesn't need your location. Turn tracking off in Traccar Client until your next load.",
    tone: "blue",
  },
};

const TONES = {
  amber: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  red: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
  blue: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
};

/**
 * Driver Page reminder about Traccar Client: turn it on after accepting a
 * load, a warning when its locations stop, and "you can turn it off" after
 * the last delivery. Shows nothing if phone tracking isn't set up.
 */
export function DriverPhoneTrackingReminder() {
  const { getToken } = useAuth();
  const [reminder, setReminder] = React.useState<PhoneTrackingReminder>(null);

  React.useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const state = await phoneTrackingApi.mine(getToken);
        if (!cancelled) setReminder(state.reminder);
      } catch {
        // A reminder is a convenience; keep the last one if a check fails.
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [getToken]);

  if (!reminder || reminder === "keep_on") return null;
  const message = MESSAGES[reminder];
  const Icon = message.tone === "red" ? TriangleAlert : message.tone === "blue" ? Info : Smartphone;
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 ${TONES[message.tone]}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-base font-semibold">{message.title}</p>
        <p className="text-sm leading-relaxed">
          {message.body}{" "}
          <Link href="/driver/settings" className="font-bold underline">
            Phone tracking settings
          </Link>
        </p>
      </div>
    </div>
  );
}
