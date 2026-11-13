import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_SEES_DRIVER_NOTICE,
  DISPATCH_SEES_DISTANCE_NOTICE,
  DRIVER_PRIVACY_HEADING,
} from "@/lib/driver-privacy";

/**
 * Who sees a driver's details, as a heading and two short points, on the
 * driver's profile, Equipment page and the sign-up agreement step.
 */
export function DriverPrivacyNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Eye className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-foreground">{DRIVER_PRIVACY_HEADING}</p>
        <ul className="list-disc space-y-1 pl-4 break-words [overflow-wrap:anywhere]">
          <li>{CUSTOMER_SEES_DRIVER_NOTICE}</li>
          <li>{DISPATCH_SEES_DISTANCE_NOTICE}</li>
        </ul>
      </div>
    </div>
  );
}
