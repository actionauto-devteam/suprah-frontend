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
