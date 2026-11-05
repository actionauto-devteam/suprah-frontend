"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { starsLabel } from "@/lib/shipment-review";

// Stars for a driver review: a 1–5 picker built on radio buttons (keyboard
// and screen readers work like any radio group), and a read-only display.

export function StarRatingInput({
  value,
  onChange,
  name,
  legend,
  disabled,
}: {
  value: number | null;
  onChange: (stars: number) => void;
  name: string;
  legend: string;
  disabled?: boolean;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="text-sm font-semibold text-foreground">{legend}</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((stars) => (
          <label
            key={stars}
            className="relative flex size-11 cursor-pointer items-center justify-center rounded-xl has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-500"
            onMouseEnter={() => setHover(stars)}
          >
            <input
              type="radio"
              name={name}
              value={stars}
              checked={value === stars}
              onChange={() => onChange(stars)}
              className="sr-only"
            />
            <span className="sr-only">{starsLabel(stars)}</span>
            <Star
              className={cn(
                "size-7 transition-colors",
                stars <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
              aria-hidden="true"
            />
          </label>
        ))}
        <span className="ml-1 text-xs text-muted-foreground" aria-live="polite">
          {value ? starsLabel(value) : "Not rated yet"}
        </span>
      </div>
    </fieldset>
  );
}

export function StarRatingDisplay({ stars, className }: { stars: number; className?: string }) {
  const rounded = Math.round(stars);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={starsLabel(rounded)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("size-4", n <= rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
