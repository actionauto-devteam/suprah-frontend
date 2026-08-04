"use client";

import * as React from "react";
import {
  ArrowRight,
  Mail,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Avatar } from "@/components/leads/atomic/Avatar";
import { StatusPill } from "@/components/leads/atomic/StatusPill";

export interface WorkspaceEmptyAction {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

export interface WorkspaceEmptyContact {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  secondary?: string;
  status?: string;
}

interface WorkspaceEmptyStateProps {
  title?: string;
  description: string;
  sourceLabel?: string;

  actions: WorkspaceEmptyAction[];

  recentContacts?: WorkspaceEmptyContact[];
  onContactSelect?: (contactId: string) => void;

  footerTitle?: string;
  footerDescription?: string;
}

export function WorkspaceEmptyState({
  title = "Select a lead to start",
  description,
  sourceLabel,
  actions,
  recentContacts = [],
  onContactSelect,
  footerTitle = "Autrix is standing by",
  footerDescription,
}: WorkspaceEmptyStateProps) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:max-w-3xl">
        {/* Main introduction */}
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative shrink-0">
            <div className="ss4-empty-icon flex h-14 w-14 items-center justify-center">
              <MessageSquare
                className="h-6 w-6"
                style={{
                  color: "var(--accent)",
                  opacity: 0.55,
                }}
              />
            </div>

            <div className="ss4-logo-mark absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center">
              <Mail
                className="h-3 w-3"
                style={{
                  color: "#ffffff",
                }}
              />
            </div>
          </div>

          <div className="min-w-0">
            <h2
              className="font-bold"
              style={{
                fontSize: 18,
                color: "var(--text-primary)",
              }}
            >
              {title}
            </h2>

            <p
              className="mt-1 max-w-xl leading-relaxed"
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              {description}
            </p>

            {sourceLabel && (
              <p
                className="ss4-mono mt-2 break-words [overflow-wrap:anywhere]"
                style={{
                  fontSize: 10,
                  color: "var(--text-disabled)",
                }}
              >
                {sourceLabel}
              </p>
            )}
          </div>
        </div>

        {/* Shortcut actions */}
        <div className="grid gap-3 sm:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="min-w-0 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background: "var(--surface-1)",
                  borderColor: "var(--border-1)",
                }}
              >
                <Icon
                  className="mb-3 h-4 w-4"
                  style={{
                    color: "var(--accent)",
                  }}
                />

                <p
                  className="font-semibold"
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                  }}
                >
                  {action.label}
                </p>

                <p
                  className="mt-1 leading-relaxed"
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {action.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Recent conversations */}
        {recentContacts.length > 0 && (
          <section
            className="rounded-2xl border p-4"
            style={{
              background: "var(--surface-1)",
              borderColor: "var(--border-1)",
            }}
          >
            <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
              <p
                className="font-semibold"
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                Recent conversations
              </p>

              <span
                className="shrink-0"
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                Select one to open
              </span>
            </div>

            <div className="grid gap-2">
              {recentContacts.slice(0, 3).map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() =>
                    onContactSelect?.(contact.id)
                  }
                  className="flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    borderColor: "var(--border-1)",
                  }}
                >
                  <Avatar
                    first={contact.firstName}
                    last={contact.lastName}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-semibold"
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-primary)",
                      }}
                    >
                      {contact.name}
                    </p>

                    <p
                      className="truncate"
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {contact.secondary ||
                        "No contact information"}
                    </p>
                  </div>

                  {contact.status && (
                    <div className="shrink-0">
                      <StatusPill status={contact.status} />
                    </div>
                  )}

                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0"
                    style={{
                      color: "var(--text-tertiary)",
                    }}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Autrix message */}
        {footerDescription && (
          <section
            className="rounded-2xl border px-4 py-3"
            style={{
              background: "var(--accent-muted)",
              borderColor: "rgba(16, 185, 129, 0.18)",
            }}
          >
            <p
              className="font-semibold"
              style={{
                fontSize: 12,
                color: "var(--accent-text)",
              }}
            >
              {footerTitle}
            </p>

            <p
              className="mt-1 leading-relaxed"
              style={{
                fontSize: 11.5,
                color: "var(--text-secondary)",
              }}
            >
              {footerDescription}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}