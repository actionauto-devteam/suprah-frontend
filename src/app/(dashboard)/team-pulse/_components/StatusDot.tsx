"use client";

import { cn } from "@/lib/utils";
import type { OnlineStatus } from "@/hooks/useTeamPulse";
import { S } from "./team-pulse-constants";

export function StatusDot({
  s,
  size = "sm",
}: {
  s: OnlineStatus;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        S.dot[s],
        size === "sm" ? "size-2" : "size-2.5",
      )}
    />
  );
}

// Maps each avatar-corner dot's existing "size-*" class to a narrower phone-silhouette
// width/height pair — same visual footprint area, just not round, so a phone user's presence
// reads as "shaped like a phone" instead of a plain circle at a glance.
const PHONE_SHAPE: Record<string, string> = {
  "size-2.5": "w-[7px] h-2.5",
  "size-3": "w-2 h-3",
  "size-4": "w-2.5 h-4",
  "size-5": "w-3.5 h-5",
};

/**
 * Drop-in replacement for the ad-hoc `<span className="absolute -bottom-0.5 -right-0.5 {size}
 * rounded-full {border}" />` avatar-corner presence dot used across TeamPulse — same color and
 * position, but renders as a small phone silhouette instead of a circle when the member's most
 * recent presence heartbeat came from a mobile device.
 */
export function PresenceAvatarDot({
  status,
  deviceType,
  sizeClass = "size-2.5",
  borderClass = "border-2 border-background",
  positionClass = "absolute -bottom-0.5 -right-0.5",
  shadowClass,
}: {
  status: OnlineStatus;
  deviceType?: "mobile" | "desktop";
  sizeClass?: string;
  borderClass?: string;
  positionClass?: string;
  shadowClass?: string;
}) {
  const isMobile = deviceType === "mobile";
  const shapeClass = isMobile ? (PHONE_SHAPE[sizeClass] ?? sizeClass) : sizeClass;
  return (
    <span
      title={isMobile ? "Active on phone" : undefined}
      className={cn(
        positionClass,
        shapeClass,
        isMobile ? "rounded-[3px]" : "rounded-full",
        borderClass,
        shadowClass,
        S.dot[status] ?? "bg-gray-400",
      )}
    />
  );
}

export function PushPin({ color }: { color: string }) {
  return (
    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none">
      <div
        className={cn(
          "size-4 rounded-full border-2 border-white/60 shadow-md",
          color,
        )}
      />
      <div className="w-px h-2.5 bg-gray-400/60" />
    </div>
  );
}
