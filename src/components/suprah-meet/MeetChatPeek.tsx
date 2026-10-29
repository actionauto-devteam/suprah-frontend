"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import type { ChatMessage } from "@/hooks/useSuprahMeet";

/** A short-lived, non-blocking preview so chat is visible outside the drawer. */
export function MeetChatPeek({ message, onOpen, compact = false }: { message: ChatMessage | null; onOpen: () => void; compact?: boolean }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!message || message.isSelf) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5_500);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!visible || !message || message.isSelf) return null;
  return (
    <button onClick={onOpen} data-mini-control={compact || undefined}
      className={compact
        ? "absolute inset-x-2 bottom-12 z-20 flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-[#071410]/95 px-2.5 py-2 text-left shadow-xl backdrop-blur transition hover:border-emerald-400/55"
        : "absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-20 flex w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-2 rounded-xl border border-emerald-400/30 bg-[#0a1410]/95 px-3 py-2 text-left shadow-xl shadow-emerald-950/50 backdrop-blur transition hover:border-emerald-400/55"}>
      <MessageSquare className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-emerald-200">{message.name}</span>
        <span className={compact ? "block truncate text-xs text-emerald-50/90" : "block truncate text-sm text-emerald-50/90"}>{message.text}</span>
      </span>
      {!compact && <span className="shrink-0 text-[10px] text-emerald-200/50">Open chat</span>}
    </button>
  );
}
