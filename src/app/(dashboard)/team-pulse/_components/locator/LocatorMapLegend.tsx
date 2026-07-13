"use client";

import * as React from "react";
import { ChevronDown, SignalHigh, SignalMedium, SignalLow, SignalZero, Smartphone, Monitor, Wifi } from "lucide-react";
import type { SharingState } from "@/hooks/useLocator";
import { DEPT_COLORS, deptLabel } from "@/lib/departments";

const STATIONARY_MIN_MINUTES = 8;

export function stationaryMinutes(loc: { sharingState?: string; stationarySince?: string }): number | null {
  if (loc.sharingState !== "sharing" || !loc.stationarySince) return null;
  const since = new Date(loc.stationarySince).getTime();
  if (Number.isNaN(since)) return null;
  return Math.max(0, Math.round((Date.now() - since) / 60000));
}

export function isNotablyStationary(loc: { sharingState?: string; stationarySince?: string }): boolean {
  const min = stationaryMinutes(loc);
  return min !== null && min >= STATIONARY_MIN_MINUTES;
}

export function formatStationaryDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export const SHARING_STATE_META: Record<SharingState, { color: string; label: string; description: string; pulse?: boolean }> = {
  sharing: {
    color: "bg-green-500",
    label: "Sharing",
    description: "Your live position is visible to the team right now.",
    pulse: true,
  },
  paused_break: {
    color: "bg-orange-500",
    label: "Paused — Break",
    description: "Sharing is temporarily paused.",
  },
  paused_manual: {
    color: "bg-amber-500",
    label: "Paused",
    description: "Paused manually — resume anytime.",
  },
  declined_permission: {
    color: "bg-red-500",
    label: "Permission Denied",
    description: "Browser blocked location access. Check site permissions to share.",
  },
  off_duty: {
    color: "bg-gray-400",
    label: "Not Sharing",
    description: "Location is off and invisible to the team.",
  },
};

/** Safe lookup — never returns undefined even for legacy/unknown states. */
export function sharingMeta(state?: string) {
  return (state && SHARING_STATE_META[state as SharingState]) || SHARING_STATE_META.off_duty;
}

// Same per-color badge classes as DEPT_STYLES in DayPulsePage.tsx (kept literal, not
// template-built from the color name, so Tailwind's scanner can see and generate them).
const DEPT_BADGE_CLASS: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  lime: "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
};

/** Small uppercase department pill — same color coding as the Team Directory/DayPulse
 * department tags, so a member's department is visible at a glance here too. Renders
 * nothing when the member has no department set. */
export function DepartmentBadge({ department }: { department?: string | null }) {
  if (!department) return null;
  const className = DEPT_BADGE_CLASS[DEPT_COLORS[department] ?? "emerald"];
  return (
    <span className={`text-[8px] font-black px-1 rounded shrink-0 uppercase tracking-wide border ${className}`}>
      {deptLabel(department)}
    </span>
  );
}

interface SignalSource {
  connectivity?: "online" | "offline";
  connectionType?: string;
  effectiveType?: string;
  downlinkMbps?: number;
  deviceType?: "mobile" | "desktop";
}

const CONNECTION_LABEL: Record<string, string> = {
  wifi: "Wi-Fi", ethernet: "Ethernet", cellular: "Cellular", bluetooth: "Bluetooth", wimax: "WiMAX",
};

// effectiveType is a bandwidth-CLASS heuristic (RTT/downlink bucketed into these four names),
// not a real radio technology — "4g" is simply its fastest bucket, which is why a desktop on
// Wi-Fi/Ethernet reports it too. Only call it out by that cellular-sounding name for a device
// we know is actually mobile; for desktop/unknown devices, describe the class in a device-
// neutral way instead of implying a cell connection that isn't there.
const EFFECTIVE_LABEL_MOBILE: Record<string, string> = { "4g": "4G", "3g": "3G", "2g": "2G", "slow-2g": "2G (slow)" };
const EFFECTIVE_LABEL_GENERIC: Record<string, string> = {
  "4g": "Fast Connection", "3g": "Moderate Connection", "2g": "Slow Connection", "slow-2g": "Very Slow Connection",
};

/** Real per-device signal quality from the Network Information API (Chromium-only) —
 * falls back to a plain online/offline read on browsers that don't expose it (Safari/iOS)
 * instead of pretending to know more than we do. Device-aware so a desktop on fast Wi-Fi/
 * Ethernet is never mislabeled "4G" just because that's the fastest bandwidth-class bucket. */
export function signalMeta(loc: SignalSource) {
  if (loc.connectivity === "offline") {
    return { label: "Offline", icon: SignalZero, className: "text-muted-foreground/50" };
  }

  const physical = loc.connectionType?.toLowerCase();
  const withSpeed = (label: string) => (typeof loc.downlinkMbps === "number" ? `${label} · ${loc.downlinkMbps} Mbps` : label);

  // Real physical medium takes priority whenever the browser exposes it.
  if (physical && CONNECTION_LABEL[physical]) {
    if (physical === "wifi" || physical === "ethernet") {
      return { label: withSpeed(CONNECTION_LABEL[physical]), icon: Wifi, className: "text-green-600 dark:text-green-400" };
    }
    if (physical === "cellular") {
      return { label: withSpeed(CONNECTION_LABEL[physical]), icon: SignalMedium, className: "text-amber-600 dark:text-amber-400" };
    }
    return { label: withSpeed(CONNECTION_LABEL[physical]), icon: SignalHigh, className: "text-muted-foreground/70" };
  }

  const tier = loc.effectiveType?.toLowerCase();
  if (tier) {
    const isMobile = loc.deviceType === "mobile";
    const label = withSpeed((isMobile ? EFFECTIVE_LABEL_MOBILE : EFFECTIVE_LABEL_GENERIC)[tier] ?? tier.toUpperCase());
    if (tier === "4g") return { label, icon: isMobile ? SignalHigh : Wifi, className: "text-green-600 dark:text-green-400" };
    if (tier === "3g") return { label, icon: SignalMedium, className: "text-amber-600 dark:text-amber-400" };
    return { label, icon: SignalLow, className: "text-red-600 dark:text-red-400" };
  }

  // No signal data at all (browser doesn't support the Network Information API) — just "online".
  return { label: "Online", icon: SignalHigh, className: "text-muted-foreground/70" };
}

/** Small green phone pill shown when the member's last ping came from a mobile device. */
export function DeviceBadge({ deviceType }: { deviceType?: "mobile" | "desktop" }) {
  if (!deviceType) return null;
  const Icon = deviceType === "mobile" ? Smartphone : Monitor;
  return (
    <span
      title={deviceType === "mobile" ? "On a phone" : "On a computer"}
      className={
        deviceType === "mobile"
          ? "flex items-center justify-center size-3.5 rounded shrink-0 text-green-600 dark:text-green-400 bg-green-500/10"
          : "flex items-center justify-center size-3.5 rounded shrink-0 text-muted-foreground/50 bg-muted/50"
      }
    >
      <Icon className="size-2.5" />
    </span>
  );
}

interface LocatorMapLegendProps {
  activeCount?: number;
  stateCounts?: Partial<Record<SharingState, number>>;
}

export function LocatorMapLegend({ activeCount = 0, stateCounts }: LocatorMapLegendProps) {
  return (
    <details className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg w-52 sm:w-64 group">
      <summary className="flex items-center justify-between p-2.5 sm:p-3 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Sharing Status
          {activeCount > 0 && (
            <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black tabular-nums">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1 space-y-2 text-xs">
        {(Object.entries(SHARING_STATE_META) as [SharingState, (typeof SHARING_STATE_META)[SharingState]][]).map(
          ([key, item]) => {
            const count = stateCounts?.[key] ?? 0;
            return (
              <div key={key} className="flex items-start gap-2">
                <span className="relative flex size-2.5 shrink-0 mt-0.5">
                  {item.pulse && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${item.color} opacity-40`} />
                  )}
                  <span className={`relative inline-flex size-2.5 rounded-full ${item.color}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-foreground/80 font-semibold leading-tight">{item.label}</p>
                    {count > 0 && <span className="text-[9px] font-black text-foreground/60 tabular-nums shrink-0">{count}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 leading-snug">{item.description}</p>
                </div>
              </div>
            );
          },
        )}
        <div className="flex items-start gap-2 pt-1 border-t border-border/30">
          <span className="flex items-center justify-center size-2.5 shrink-0 mt-0.5 rounded-full border border-dashed border-gray-400" />
          <div className="min-w-0">
            <p className="text-foreground/80 font-semibold leading-tight">Dashed pin</p>
            <p className="text-[10px] text-muted-foreground/60 leading-snug">Last known spot — not live right now.</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="flex items-center justify-center size-2.5 shrink-0 mt-0.5 rounded-full border-2 border-blue-400/60 bg-blue-400/10" />
          <div className="min-w-0">
            <p className="text-foreground/80 font-semibold leading-tight">Faint blue ring</p>
            <p className="text-[10px] text-muted-foreground/60 leading-snug">GPS precision — the pin itself is always their exact spot.</p>
          </div>
        </div>
      </div>
    </details>
  );
}
