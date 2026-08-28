"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkActionBar({ count, onClear, children, className }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      <span className="text-sm font-medium">
        {count} selected
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-muted-foreground"
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
