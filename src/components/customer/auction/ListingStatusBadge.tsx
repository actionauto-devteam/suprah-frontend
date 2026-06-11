import { STATUS_META, ListingStatus } from "@/lib/api/auctionListings";
import { cn } from "@/lib/utils";

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        meta.badgeClass,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dotClass)} />
      {meta.label}
    </span>
  );
}
