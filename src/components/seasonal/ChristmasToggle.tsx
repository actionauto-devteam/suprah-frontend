"use client";

/**
 * Header button that turns the festive layer on/off for this user.
 * Only renders during the season (or when forced on via env flag).
 */

import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChristmasEffects } from "./christmas-store";

export function ChristmasToggle({ className }: { className?: string }) {
  const { available, enabled, setEnabled } = useChristmasEffects();
  if (!available) return null;

  const label = enabled ? "Turn off holiday effects" : "Turn on holiday effects";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      onClick={() => setEnabled(!enabled)}
      className={cn("h-9 w-9", className)}
    >
      <Snowflake
        className={cn(
          "size-4 transition-all duration-500",
          enabled
            ? "rotate-180 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
            : "text-muted-foreground",
        )}
      />
    </Button>
  );
}