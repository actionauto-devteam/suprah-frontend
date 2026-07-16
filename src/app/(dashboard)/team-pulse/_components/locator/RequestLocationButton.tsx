"use client";

import * as React from "react";
import { Navigation, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRequestLocationShare } from "@/hooks/useLocator";

interface Props {
  userId: string;
  userName: string;
}

export function RequestLocationButton({ userId, userName }: Props) {
  const { mutate, isPending } = useRequestLocationShare();
  const [sent, setSent] = React.useState(false);

  function request() {
    if (isPending || sent) return;
    mutate(userId, {
      onSuccess: () => {
        toast.success(`Location request sent to ${userName}`);
        setSent(true);
        setTimeout(() => setSent(false), 30_000);
      },
      onError: () => toast.error("Could not send location request"),
    });
  }

  return (
    <button
      onClick={request}
      disabled={isPending || sent}
      title={sent ? "Request sent" : `Ask ${userName} to share their location`}
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border/40 text-[9px] font-bold transition-all shrink-0",
        sent ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "text-muted-foreground/60 hover:text-foreground",
      )}
    >
      {isPending ? (
        <Loader2 className="size-2.5 animate-spin" />
      ) : sent ? (
        <Check className="size-2.5" />
      ) : (
        <Navigation className="size-2.5" />
      )}
      <span className="hidden sm:inline">{sent ? "Sent" : "Request Location"}</span>
    </button>
  );
}
