"use client";

import * as React from "react";
import { AlertTriangle, ChevronLeft, Download, FileText, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Suprah Space–style Details for a conversation on the driver's Dispatch Chat
 * page. A dispatcher chat and a channel show the same tabs: Members, Media,
 * Files and Search. It covers the whole conversation area while open.
 */

export type ChatDetailsTab = "members" | "media" | "files" | "search";

export type ChatDetailsAttachment = {
  url: string;
  available?: boolean;
  originalName: string;
  mimeType: string;
  size: number;
};

/** A message (or update) the Media, Files and Search tabs look through. */
export type ChatDetailsMessage = {
  id: string;
  author: string;
  createdAt: string;
  text: string;
  attachments: ChatDetailsAttachment[];
};

const TABS: Array<{ key: ChatDetailsTab; label: string }> = [
  { key: "members", label: "Members" },
  { key: "media", label: "Media" },
  { key: "files", label: "Files" },
  { key: "search", label: "Search" },
];

const isMedia = (attachment: ChatDetailsAttachment) =>
  attachment.mimeType?.startsWith("image/") || attachment.mimeType?.startsWith("video/");
const isAvailable = (attachment: ChatDetailsAttachment) => attachment.available !== false && Boolean(attachment.url);

function sizeText(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dateText(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function dateTimeText(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

export function ChatDetailsPanel({
  onClose,
  avatar,
  name,
  subtitle,
  description,
  members,
  messages,
  loading,
  truncated,
  tab,
  onTabChange,
  query,
  onQueryChange,
  onSearchResultSelect,
}: {
  onClose: () => void;
  /** Large picture or icon (88px, rounded). */
  avatar: React.ReactNode;
  name: string;
  subtitle: string;
  description?: string;
  /** The Members tab. */
  members: React.ReactNode;
  messages: ChatDetailsMessage[];
  /** The conversation history for Media, Files and Search is loading. */
  loading: boolean;
  /** Only the most recent messages were loaded. */
  truncated: boolean;
  tab: ChatDetailsTab;
  onTabChange: (tab: ChatDetailsTab) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** Opens a search result in the conversation. */
  onSearchResultSelect?: (message: ChatDetailsMessage) => void;
}) {
  const attachmentRows = React.useMemo(
    () => messages.flatMap((message) => message.attachments.map((attachment, index) => ({ attachment, message, index }))),
    [messages],
  );
  const media = attachmentRows.filter((row) => isMedia(row.attachment));
  const files = attachmentRows.filter((row) => !isMedia(row.attachment));

  const needle = query.trim().toLowerCase();
  const results = React.useMemo(() => {
    if (!needle) return [];
    return messages
      .filter((message) =>
        [message.text, message.author, ...message.attachments.map((attachment) => attachment.originalName)]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages, needle]);

  const history = (content: React.ReactNode) =>
    loading ? (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin text-emerald-500" /> Loading the conversation history…
      </div>
    ) : (
      content
    );

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: "var(--bg-base, var(--background))" }}>
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4"
        style={{ background: "var(--bg-elevated, var(--card))" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back to the conversation"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-bold">Details</p>
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close details"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        <div className="flex flex-col items-center px-4 pb-4 pt-7 text-center">
          {avatar}
          <p className="mt-3 max-w-full break-words text-xl font-bold leading-tight [overflow-wrap:anywhere]">{name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          {description && (
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
          )}
        </div>

        <div className="sticky top-0 z-10 px-3 py-2 sm:px-4" style={{ background: "var(--bg-base, var(--background))" }}>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/40 p-1" role="tablist" aria-label="Conversation details">
            {TABS.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTabChange(item.key)}
                  className={cn(
                    "h-9 min-w-0 truncate rounded-md px-2 text-xs font-bold transition-colors",
                    active ? "bg-emerald-600 text-white shadow-sm" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-3 pb-6 pt-2 sm:px-4" role="tabpanel">
          {tab === "members"
            ? members
            : tab === "media"
              ? history(
                  media.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {media.map(({ attachment, message, index }) =>
                        isAvailable(attachment) ? (
                          <a
                            key={`${message.id}:${index}`}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                            title={`${attachment.originalName} · ${dateText(message.createdAt)}`}
                          >
                            {attachment.mimeType.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element -- short-lived private link
                              <img
                                src={attachment.url}
                                alt={attachment.originalName}
                                className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]"
                              />
                            ) : (
                              <video src={attachment.url} preload="metadata" className="aspect-square w-full bg-black object-cover" />
                            )}
                          </a>
                        ) : (
                          <div
                            key={`${message.id}:${index}`}
                            className="flex aspect-square flex-col items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-2 text-center"
                          >
                            <AlertTriangle className="mb-1 size-4 text-amber-600 dark:text-amber-400" />
                            <p className="text-[10px] leading-snug text-muted-foreground">Unavailable right now</p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyNote>No photos or videos have been shared here yet.</EmptyNote>
                  ),
                )
              : tab === "files"
                ? history(
                    files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map(({ attachment, message, index }) =>
                          isAvailable(attachment) ? (
                            <a
                              key={`${message.id}:${index}`}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-emerald-500/30"
                              style={{ background: "var(--bg-elevated, var(--card))" }}
                            >
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <FileText className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{attachment.originalName}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {[sizeText(attachment.size), message.author, dateText(message.createdAt)].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                              <Download className="size-4 shrink-0 text-muted-foreground" />
                            </a>
                          ) : (
                            <div
                              key={`${message.id}:${index}`}
                              className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3"
                            >
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{attachment.originalName}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">Unavailable right now</span>
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <EmptyNote>No files have been shared here yet.</EmptyNote>
                    ),
                  )
                : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Search messages, names or file names…"
                        aria-label="Search this conversation"
                        className="h-11 w-full rounded-xl border border-border/70 bg-background/60 pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-emerald-500/60 focus-visible:ring-[3px] focus-visible:ring-emerald-500/20 sm:text-sm"
                      />
                    </div>
                    {history(
                      !needle ? (
                        <EmptyNote>Search the messages, who sent them, and file names in this conversation.</EmptyNote>
                      ) : results.length === 0 ? (
                        <EmptyNote>Nothing matches “{query.trim()}”.</EmptyNote>
                      ) : (
                        <div className="space-y-2">
                          {results.map((message) => (
                            <button
                              key={message.id}
                              type="button"
                              onClick={() => onSearchResultSelect?.(message)}
                              disabled={!onSearchResultSelect}
                              className="w-full rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-emerald-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 disabled:cursor-default"
                              style={{ background: "var(--bg-elevated, var(--card))" }}
                              title="Show this message in the conversation"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-bold">{message.author}</span>
                                <span className="shrink-0 text-[10px] text-muted-foreground">{dateTimeText(message.createdAt)}</span>
                              </span>
                              <span className="mt-1 line-clamp-4 block whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                                {message.text || "Attachment"}
                              </span>
                              {message.attachments.length > 0 && (
                                <span className="mt-2 flex flex-wrap gap-1">
                                  {message.attachments.map((attachment, index) => (
                                    <span
                                      key={`${message.id}:${index}`}
                                      className="max-w-full truncate rounded-md border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                    >
                                      {attachment.originalName}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      ),
                    )}
                  </div>
                )}

          {tab !== "members" && truncated && !loading && (
            <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              This conversation is very long, so only the most recent 2,000 messages are included here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** A person in the Members tab, styled like Suprah Space's member rows. */
export function ChatDetailsMemberRow({
  avatar,
  name,
  note,
  noteTone = "muted",
  trailing,
}: {
  avatar: React.ReactNode;
  name: React.ReactNode;
  note: string;
  noteTone?: "muted" | "accent";
  trailing?: React.ReactNode;
}) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-2">
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span
          className={cn(
            "block truncate text-xs",
            noteTone === "accent" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}
        >
          {note}
        </span>
      </span>
      {trailing}
    </li>
  );
}
