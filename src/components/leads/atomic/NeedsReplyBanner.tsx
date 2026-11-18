import * as React from "react";
import { MessageSquareDot } from "lucide-react";
import { useWaitingClock } from "@/hooks/useWaitingClock";
import { needsReplyBannerLabel, needsReplyHint, needsReplyTime } from "@/lib/needsReply";

function WaitingBanner({
  since,
  onNoReplyNeeded,
  busy,
}: {
  since: unknown;
  onNoReplyNeeded?: () => void;
  busy: boolean;
}) {
  const now = useWaitingClock();

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
      title={needsReplyHint(since)}
      data-testid="lead-needs-reply-banner"
    >
      <MessageSquareDot className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <strong className="font-semibold">Needs reply.</strong> {needsReplyBannerLabel(since, now || undefined)}
      </span>
      {onNoReplyNeeded && (
        <button
          type="button"
          onClick={onNoReplyNeeded}
          disabled={busy}
          className="min-h-8 shrink-0 rounded-md border border-red-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/30 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/15"
          title="Use this when the customer's last message does not need an answer, like a thank-you."
          data-testid="lead-no-reply-needed"
        >
          {busy ? "Saving…" : "No reply needed"}
        </button>
      )}
    </div>
  );
}

export function NeedsReplyBanner({
  since,
  onNoReplyNeeded,
  busy = false,
}: {
  since: unknown;
  onNoReplyNeeded?: () => void;
  busy?: boolean;
}) {
  if (!needsReplyTime(since)) return null;
  return <WaitingBanner since={since} onNoReplyNeeded={onNoReplyNeeded} busy={busy} />;
}
