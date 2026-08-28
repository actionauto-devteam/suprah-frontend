import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_PANEL_CLASS } from "./theme";
import { cn } from "@/lib/utils";

interface AdminErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function AdminErrorState({
  message = "Something went wrong while loading this data.",
  onRetry,
  className,
}: AdminErrorStateProps) {
  return (
    <div
      className={cn(
        ADMIN_PANEL_CLASS,
        "flex flex-col items-center gap-3 border-destructive/30 bg-destructive/5 py-12 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}
