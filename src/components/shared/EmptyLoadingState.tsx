import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Replaces the hand-rolled `<div className="flex h-screen items-center
// justify-center">` spinner duplicated across every admin list page.
// `h-screen` inside content already wrapped by AdminLayout's own
// header/sidebar chrome pushes total height over 100vh, causing a layout
// jump — these two stay within the content area's own flow instead.

export function TableLoadingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PageLoadingState({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-100 items-center justify-center", className)}
      role="status"
      aria-label="Loading"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
