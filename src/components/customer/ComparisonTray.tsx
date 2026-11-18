"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCompareArrows, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImageUrl, cn } from "@/lib/utils";
import type { Vehicle } from "@/types/inventory";

const CARD_FALLBACK = "/vehicle-placeholder.jpg";

interface ComparisonTrayProps {
  vehicles: Vehicle[];
  onRemove: (vehicleId: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

export function ComparisonTray({ vehicles, onRemove, onClear, onCompare }: ComparisonTrayProps) {
  const isVisible = vehicles.length > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="comparison-tray"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.85 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40",
            // on mobile, sit above the bottom nav (~72px)
            "pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-4",
          )}
        >
          <div className="mx-auto max-w-4xl px-4">
            <div className="rounded-2xl border border-border/60 bg-background/90 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.18)] px-4 py-3">
              {/* Nothing scrolls sideways (2026-11-17): on phones the cars show
                  as photos with the buttons on their own line. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {/* Vehicle thumbnails */}
                <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-1.5 sm:basis-0 sm:gap-2">
                  {vehicles.map((vehicle) => {
                    const imgSrc = resolveImageUrl(vehicle.image) || CARD_FALLBACK;
                    return (
                      <div
                        key={vehicle.id}
                        className="relative flex min-w-0 items-center gap-2 rounded-xl border border-border/50 bg-muted/60 px-2 py-1.5 pr-6 sm:px-2.5 sm:pr-7"
                      >
                        <img
                          src={imgSrc}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="h-9 w-11 object-cover rounded-lg sm:w-14"
                          onError={(e) => { (e.target as HTMLImageElement).src = CARD_FALLBACK; }}
                        />
                        <div className="hidden min-w-0 sm:block">
                          <p className="text-xs font-bold text-foreground leading-tight min-w-0 break-words [overflow-wrap:anywhere] max-w-25 whitespace-normal">
                            {vehicle.year} {vehicle.make}
                          </p>
                          <p className="text-[11px] text-muted-foreground min-w-0 break-words [overflow-wrap:anywhere] max-w-25 whitespace-normal">
                            {vehicle.model}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemove(vehicle.id)}
                          className="absolute right-0.5 top-0.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-destructive/20 transition-colors"
                          aria-label="Remove from comparison"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, 3 - vehicles.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="hidden shrink-0 h-13 w-37 items-center justify-center rounded-xl border border-dashed sm:flex border-border/50 text-[11px] text-muted-foreground/50"
                    >
                      Add vehicle
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <button
                    onClick={onClear}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                  <Button
                    onClick={onCompare}
                    disabled={vehicles.length < 2}
                    className="gap-1.5 text-sm font-bold"
                    size="sm"
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    Compare {vehicles.length > 0 && `(${vehicles.length})`}
                  </Button>
                </div>
              </div>

              {vehicles.length < 2 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground/60 text-center">
                  Select at least 2 vehicles to compare
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
