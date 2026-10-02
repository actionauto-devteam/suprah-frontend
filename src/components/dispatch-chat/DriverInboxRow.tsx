"use client";

import * as React from "react";
import { ChevronLeft, Loader2, Pin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export function inboxListTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** A rounded section label, like Suprah Space's ("PINNED", "DIRECT MESSAGES"). */
export function InboxPill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

/** A list section; Direct messages and Channels can be folded away. */
export function InboxSection({
  label,
  icon,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  /** Omit to make the section always open (Pinned). */
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label}>
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex w-full items-center justify-between px-3 pb-1.5 pt-3"
        >
          <InboxPill icon={icon}>{label}</InboxPill>
          <ChevronLeft
            className={cn("size-3 text-muted-foreground transition-transform", collapsed ? "rotate-0" : "-rotate-90")}
            aria-hidden="true"
          />
        </button>
      ) : (
        <div className="px-3 pb-1.5 pt-2">
          <InboxPill icon={icon}>{label}</InboxPill>
        </div>
      )}
      {!collapsed && children}
    </section>
  );
}

/**
 * One conversation or channel in the driver's Dispatch Chat list, styled like
 * Suprah Space's rows. The pin button sits beside the row (never inside it).
 */
export function DriverInboxRow({
  selected,
  onSelect,
  avatar,
  title,
  chips,
  subtitle,
  time,
  unread,
  busy = false,
  pin,
}: {
  selected: boolean;
  onSelect: () => void;
  avatar: React.ReactNode;
  title: string;
  chips?: React.ReactNode;
  subtitle: string;
  time: string;
  unread: number;
  busy?: boolean;
  /**
   * "load": pinned automatically while the driver has this dispatcher's load.
   * A toggle otherwise; omitted when the row can't be pinned yet.
   */
  pin?: { kind: "load" } | { kind: "toggle"; pinned: boolean; onToggle: () => void };
}) {
  const pinned = pin?.kind === "load" || (pin?.kind === "toggle" && pin.pinned);
  return (
    <div
      className={cn(
        "group relative flex min-w-0 items-center rounded-[10px] transition-colors hover:bg-muted/60",
        selected && "bg-emerald-500/20 hover:bg-emerald-500/20",
        unread > 0 && !selected && "bg-emerald-500/5",
      )}
    >
      {selected && (
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-3/5 w-[3px] -translate-y-1/2 rounded-r-[3px] bg-emerald-500" />
      )}
      <button
        type="button"
        onClick={onSelect}
        disabled={busy}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-3 pr-1 text-left disabled:cursor-wait"
      >
        <span className="relative shrink-0">
          {avatar}
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-elevated,var(--card))]"
            />
          )}
          {pinned && (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -left-0.5 flex size-3.5 items-center justify-center rounded-full bg-[var(--bg-elevated,var(--card))]"
            >
              <Pin className="size-2.5 text-emerald-600 dark:text-emerald-400" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn("min-w-0 flex-1 truncate text-[17px] leading-snug text-foreground", unread > 0 ? "font-bold" : "font-semibold")}>
              {title}
            </span>
            {busy ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-500" />
            ) : (
              time && <span className="shrink-0 text-[11px] text-muted-foreground/70">{time}</span>
            )}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
            {chips}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[15px] leading-snug",
                unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </span>
            {unread > 0 && (
              <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-600 px-[5px] text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
        </span>
      </button>
      {pin?.kind === "load" ? (
        <span
          className="mr-1 flex size-7 shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400"
          title="Pinned while you have a load with this dispatcher"
        >
          <Truck className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Pinned while you have a load with this dispatcher</span>
        </span>
      ) : pin?.kind === "toggle" ? (
        <button
          type="button"
          onClick={pin.onToggle}
          aria-pressed={pin.pinned}
          aria-label={pin.pinned ? `Unpin ${title}` : `Pin ${title}`}
          title={pin.pinned ? "Unpin" : "Pin to the top"}
          className={cn(
            "mr-1 flex size-7 shrink-0 items-center justify-center rounded-md transition-opacity hover:bg-muted focus-visible:opacity-100",
            pin.pinned
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground md:opacity-0 md:group-hover:opacity-100",
          )}
        >
          <Pin className={cn("size-3.5", pin.pinned && "fill-current")} />
        </button>
      ) : (
        <span className="mr-1 size-7 shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}
