"use client";

import * as React from "react";
import { ArrowRight, Inbox, Mail, MessageSquare, PhoneCall, Smartphone, Truck } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";

type OverviewChannel = "inbox" | "conversation" | "dispatch" | "sms" | "call";

interface OverviewCard {
  key: OverviewChannel;
  label: string;
  description: string;
  icon: React.ElementType;
  stat: string;
}

/**
 * Suprah One Desk's landing pane. Shown on true first visit and reachable
 * again via the Channel Selector / Add Pane menu — a quick-status hub for
 * all 5 channels rather than defaulting straight into Inbox.
 */
export function OverviewTab({
  token,
  mailConnected,
  dispatchEnabled,
  inboxUnread,
  emailUnread,
  dispatchUnread,
  onSelectChannel,
}: {
  token: string;
  mailConnected: boolean;
  dispatchEnabled: boolean;
  inboxUnread: number;
  emailUnread: number;
  dispatchUnread: number;
  onSelectChannel: (channel: OverviewChannel) => void;
}) {
  const { contacts } = useContacts(token);
  const contactStat = `${contacts.length} saved contact${contacts.length === 1 ? "" : "s"}`;

  const cards: OverviewCard[] = [
    {
      key: "inbox",
      label: "Inbox",
      description: "Gmail folders, drafts and email threads",
      icon: Inbox,
      stat: !mailConnected
        ? "Connect Gmail to get started"
        : inboxUnread > 0
          ? `${inboxUnread} unread email${inboxUnread === 1 ? "" : "s"}`
          : "All caught up",
    },
    {
      key: "conversation",
      label: "Email Chat",
      description: "External email conversations in chat form",
      icon: MessageSquare,
      stat: !mailConnected
        ? "Connect Gmail to get started"
        : emailUnread > 0
          ? `${emailUnread} unread conversation${emailUnread === 1 ? "" : "s"}`
          : "All caught up",
    },
    {
      key: "dispatch",
      label: "Dispatch Chat",
      description: "Private dispatcher ↔ driver operations",
      icon: Truck,
      stat: !dispatchEnabled
        ? "Not available for your role"
        : dispatchUnread > 0
          ? `${dispatchUnread} unread message${dispatchUnread === 1 ? "" : "s"}`
          : "All caught up",
    },
    {
      key: "sms",
      label: "SMS",
      description: "Text saved contacts once the SMS integration is connected",
      icon: Smartphone,
      stat: contactStat,
    },
    {
      key: "call",
      label: "Call",
      description: "Dial saved contacts once the calling integration is connected",
      icon: PhoneCall,
      stat: contactStat,
    },
  ];

  return (
    <div className="sm5-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col items-center gap-2 text-center sm:mb-8">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(140deg,#16a34a,#34c97d)",
              boxShadow: "0 4px 16px rgba(52,201,125,0.25)",
            }}
          >
            <Mail className="h-5 w-5 text-white" />
          </div>
          <p className="sm5-display font-bold" style={{ fontSize: 18, color: "var(--text-primary)" }}>
            Suprah <span style={{ color: "var(--accent)" }}>One Desk</span>
          </p>
          <p className="sm5-supporting">Every Channel. Every Conversation. One Desk.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => onSelectChannel(card.key)}
                className="group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5"
                style={{ borderColor: "var(--border-2)", background: "var(--surface-1)" }}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </div>
                <div>
                  <p className="sm5-title-md">{card.label}</p>
                  <p className="sm5-supporting mt-1">{card.description}</p>
                </div>
                <p className="sm5-meta font-semibold" style={{ color: "var(--accent-text)" }}>
                  {card.stat}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
