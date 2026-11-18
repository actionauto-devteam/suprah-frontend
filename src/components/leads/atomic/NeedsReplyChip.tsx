import * as React from "react";
import { cn } from "@/lib/utils";
import { useWaitingClock } from "@/hooks/useWaitingClock";
import { needsReplyHint, needsReplyTime, waitingLabel } from "@/lib/needsReply";

function WaitingChip({ since, short, className }: { since: unknown; short: boolean; className?: string }) {
  const now = useWaitingClock();
  const waited = waitingLabel(since, now || undefined);

  return (
    <span
      className={cn(
        "rounded border border-red-500/40 bg-red-500/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300",
        className,
      )}
      title={needsReplyHint(since)}
      data-testid="lead-needs-reply"
    >
      {short || !waited ? "Needs reply" : `Needs reply · ${waited}`}
    </span>
  );
}

export const NeedsReplyChip = React.memo(function NeedsReplyChip({
  since,
  short = false,
  className,
}: {
  since: unknown;
  short?: boolean;
  className?: string;
}) {
  if (!needsReplyTime(since)) return null;
  return <WaitingChip since={since} short={short} className={className} />;
});
