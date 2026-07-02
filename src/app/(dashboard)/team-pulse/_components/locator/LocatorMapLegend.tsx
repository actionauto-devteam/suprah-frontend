"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { SharingState } from "@/hooks/useLocator";

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

export function LocatorMapLegend({ activeCount = 0 }: { activeCount?: number }) {
  return (
    <details className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg w-48 sm:w-56 group">
      <summary className="flex items-center justify-between p-2.5 sm:p-3 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Sharing Status
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-1 space-y-2 text-xs">
        {(Object.entries(SHARING_STATE_META) as [SharingState, (typeof SHARING_STATE_META)[SharingState]][]).map(
          ([key, item]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="relative flex size-2.5 shrink-0 mt-0.5">
                {item.pulse && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${item.color} opacity-40`} />
                )}
                <span className={`relative inline-flex size-2.5 rounded-full ${item.color}`} />
              </span>
              <div className="min-w-0">
                <p className="text-foreground/80 font-semibold leading-tight">{item.label}</p>
                <p className="text-[10px] text-muted-foreground/60 leading-snug">{item.description}</p>
              </div>
            </div>
          ),
        )}
        {activeCount > 0 && (
          <div className="mt-1 pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground">
              <span className="font-bold text-foreground">{activeCount}</span> sharing now
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
