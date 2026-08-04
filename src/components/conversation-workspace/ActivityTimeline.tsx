"use client";

import * as React from "react";
import {
  Check,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWorkspaceFullDate } from "./workspace-utils";
import type { WorkspaceActivityItem } from "./workspace-types";

const COLLAPSED_DESCRIPTION_LENGTH = 180;

const activityIcon = (kind: WorkspaceActivityItem["kind"]) => {
  switch (kind) {
    case "note":
      return StickyNote;
    case "call":
      return Phone;
    case "status":
      return Check;
    case "email":
      return Mail;
    case "inquiry":
      return FileText;
    default:
      return MessageSquare;
  }
};

const activityTone = (kind: WorkspaceActivityItem["kind"]) => {
  if (kind === "note") {
    return {
      icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }

  if (kind === "call") {
    return {
      icon: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      dot: "bg-sky-500",
    };
  }

  if (kind === "status") {
    return {
      icon: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
      dot: "bg-violet-500",
    };
  }

  return {
    icon: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  };
};

function ActivityDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const canCollapse = text.length > COLLAPSED_DESCRIPTION_LENGTH;

  return (
    <div className="mt-1.5 min-w-0">
      <p
        className={cn(
          "min-w-0 whitespace-pre-wrap break-words text-xs leading-[1.45] [overflow-wrap:anywhere]",
          canCollapse && !expanded && "line-clamp-3",
        )}
        style={{ color: "var(--text-secondary)" }}
      >
        {text}
      </p>

      {canCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-[10px] font-semibold"
          style={{ color: "var(--accent-text)" }}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export function ActivityTimeline({
  items,
  emptyLabel = "No activity has been recorded yet.",
}: {
  items: WorkspaceActivityItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div
        className="rounded-lg border px-3 py-4 text-center text-xs leading-relaxed"
        style={{
          borderColor: "var(--border-1)",
          background: "var(--bg-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="cw-activity-list relative min-w-0 pl-5">
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-[5px] top-3 w-px"
        style={{ background: "var(--border-2)" }}
      />

      {items.map((item) => {
        const Icon = activityIcon(item.kind);
        const tone = activityTone(item.kind);

        return (
          <article
            key={item.id}
            className="relative min-w-0 pb-2.5 last:pb-0"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-[19px] top-[17px] z-10 h-2.5 w-2.5 rounded-full ring-4",
                tone.dot,
              )}
              style={{
                boxShadow: "0 0 0 4px var(--bg-elevated)",
              }}
            />

            <div
              className="cw-activity-card min-w-0 overflow-hidden rounded-lg border px-3 py-2.5 transition-colors hover:bg-(--bg-hover)"
              style={{
                borderColor: "var(--border-1)",
                background: "var(--bg-subtle)",
              }}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    tone.icon,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <strong className="block min-w-0 break-words text-[13px] font-semibold leading-[1.3] [overflow-wrap:anywhere]">
                    {item.title}
                  </strong>

                  {item.description ? (
                    <ActivityDescription text={item.description} />
                  ) : null}

                  <time
                    className="mt-1.5 block text-[10px] leading-none"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {formatWorkspaceFullDate(item.createdAt)}
                  </time>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}