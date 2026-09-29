"use client";

import * as React from "react";
import { Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/lib/api/dispatch-channels";

function listTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** A channel in a list, styled like a Dispatch Chat conversation row. */
export function ChannelListRow({
  channel,
  selected,
  collapsed = false,
  onSelect,
}: {
  channel: ChannelSummary;
  selected: boolean;
  collapsed?: boolean;
  onSelect: () => void;
}) {
  const unread = channel.unreadCount;
  const closed = channel.status === "closed";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={collapsed ? channel.name : undefined}
      className={cn(
        "group relative flex w-full min-w-0 items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
        selected && "bg-emerald-500/10 hover:bg-emerald-500/10",
        unread > 0 && !selected && "bg-emerald-500/5",
      )}
    >
      {selected && (
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-3/5 w-[3px] -translate-y-1/2 rounded-r-[3px] bg-emerald-500" />
      )}
      <span
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-150 group-hover:scale-[1.04]",
          closed ? "border-border/60 bg-muted/50" : "border-emerald-500/25 bg-emerald-500/10",
        )}
      >
        {closed ? (
          <Lock className="size-3.5 text-muted-foreground" />
        ) : (
          <Hash className="size-4 text-emerald-600 dark:text-emerald-400" />
        )}
        {collapsed && unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-emerald-600 px-1 text-center text-[8px] font-black leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cn("truncate text-[13.5px] text-foreground", unread > 0 ? "font-bold" : "font-semibold")}>
                {channel.name}
              </span>
              {closed ? (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">Closed</span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                  {channel.memberCount} {channel.memberCount === 1 ? "person" : "people"}
                </span>
              )}
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate text-[11.5px]",
                unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {channel.pendingSuggestionCount > 0 ? (
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {channel.pendingSuggestionCount} waiting for approval
                </span>
              ) : (
                channel.lastMessagePreview || "No messages yet"
              )}
            </span>
          </span>
          <span className="ml-1 flex shrink-0 flex-col items-end gap-1.5 self-stretch py-0.5">
            <span className="min-h-4 whitespace-nowrap text-[11px] font-semibold tabular-nums text-muted-foreground">
              {listTime(channel.lastMessageAt)}
            </span>
            {unread > 0 && (
              <span
                className="min-w-[18px] rounded-full bg-emerald-600 px-1.5 text-center text-[9px] font-bold leading-[18px] text-white"
                aria-label={`${unread} unread channel message${unread === 1 ? "" : "s"}`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
        </>
      )}
    </button>
  );
}
