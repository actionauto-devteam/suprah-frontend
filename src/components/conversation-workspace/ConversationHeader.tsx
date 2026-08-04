"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/leads/atomic/Avatar";
import { StatusPill } from "@/components/leads/atomic/StatusPill";
import type { WorkspaceContact } from "./workspace-types";
import {
  workspaceContactName,
  workspaceContactSubtitle,
} from "./workspace-utils";

export function ConversationHeader({
  contact,
  status,
  meta = [],
  actions,
  leadingInset = false,
  trailingInset = false,
  className,
}: {
  contact?: WorkspaceContact | null;
  status?: string;
  meta?: Array<string | undefined | null>;
  actions?: React.ReactNode;
  leadingInset?: boolean;
  trailingInset?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("cw-conversation-header shrink-0", className)}>
      <header
        className={cn(
          "flex min-h-[62px] min-w-0 items-center gap-3 border-b px-3 py-2.5 sm:min-h-[70px] sm:px-4",
          leadingInset && "pl-14",
          trailingInset && "pr-14",
        )}
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-1)",
        }}
      >
        <Avatar
          first={contact?.firstName}
          last={contact?.lastName}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 truncate text-sm font-bold sm:text-base">
              {contact ? workspaceContactName(contact) : "Select a conversation"}
            </h2>
            {status ? <StatusPill status={status} /> : null}
          </div>
          <p
            className="truncate text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {contact
              ? workspaceContactSubtitle(contact)
              : "Choose a contact from the inbox to begin"}
          </p>
        </div>

        {actions ? (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {actions}
          </div>
        ) : null}
      </header>

      {meta.filter(Boolean).length > 0 ? (
        <div
          className="flex min-h-8 min-w-0 items-center gap-3 overflow-hidden border-b px-3 text-[10px] sm:px-4"
          style={{
            background: "var(--bg-overlay)",
            borderColor: "var(--border-1)",
            color: "var(--text-tertiary)",
          }}
        >
          {meta.filter(Boolean).map((item, index) => (
            <span key={`${item}-${index}`} className="min-w-0 truncate">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
