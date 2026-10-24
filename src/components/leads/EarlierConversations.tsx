"use client";

import * as React from "react";
import { ChevronDown, History, Loader2, Lock, Mail, MessageCircle, MessageSquare, Phone, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchEarlierConversation,
  type ConversationItem,
  type EarlierConversations as EarlierInfo,
} from "@/lib/api/leadConversation";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const formatDate = (value?: string) => {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
};

const formatTime = (value?: string) => {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : timeFormat.format(date);
};

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  sms: MessageSquare,
  email: Mail,
  webchat: MessageCircle,
  call: Phone,
  inquiry: ClipboardList,
};

const CHANNEL_NAME: Record<string, string> = {
  sms: "Text",
  email: "Email",
  webchat: "Web Chat",
  call: "Call",
  inquiry: "Inquiry",
};

function EarlierItems({ items }: { items: ConversationItem[] }) {
  const visible = items.filter((item) => item.kind !== "note");
  if (!visible.length) {
    return <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No messages in this conversation.</p>;
  }
  return (
    <ul className="space-y-1.5 px-3 py-2">
      {visible.map((item) => {
        const Icon = CHANNEL_ICON[item.channel] || MessageSquare;
        const outbound = item.direction === "outbound";
        const text = item.kind === "call" ? `${item.body} · ${item.call?.label || ""}` : item.body || item.subject || "";
        return (
          <li key={item.id} className="flex items-start gap-2 text-[12px] leading-snug">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {CHANNEL_NAME[item.channel] || "Message"} · {outbound ? item.author.name : item.author.kind === "customer" ? "Customer" : item.author.name} · {formatTime(item.occurredAt)}
              </p>
              <p className={cn("whitespace-pre-wrap [overflow-wrap:anywhere]", outbound ? "text-slate-600 dark:text-slate-300" : "text-slate-800 dark:text-slate-100")}>
                {text || "No message text"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function EarlierConversations({ leadId, earlier }: { leadId: string; earlier: EarlierInfo | null | undefined }) {
  const [open, setOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState<Record<string, ConversationItem[]>>({});
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [errorId, setErrorId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setOpen(false);
    setExpandedId(null);
    setLoaded({});
    setErrorId(null);
  }, [leadId]);

  const entries = React.useMemo(() => {
    if (!earlier?.available) return [];
    const list = earlier.leads.map((entry) => ({
      id: entry._id,
      title: `${entry.closed ? "Closed lead" : "Open lead"} · ${entry.status}`,
      detail: [entry.source, formatDate(entry.createdAt)].filter(Boolean).join(" · "),
    }));
    if (earlier.unlinkedCount > 0) {
      list.push({
        id: "unlinked",
        title: "Messages not linked to any lead",
        detail: `${earlier.unlinkedCount} older ${earlier.unlinkedCount === 1 ? "message" : "messages"} for this phone number`,
      });
    }
    return list;
  }, [earlier]);

  if (!entries.length) return null;

  const toggleEntry = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (loaded[id]) return;
    setLoadingId(id);
    setErrorId(null);
    try {
      const data = await fetchEarlierConversation(leadId, id);
      setLoaded((previous) => ({ ...previous, [id]: data?.items || [] }));
    } catch {
      setErrorId(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white dark:border-emerald-400/15 dark:bg-[#0f1f19]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <History className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          Earlier conversations with this customer ({entries.length})
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-slate-100 dark:border-emerald-400/10">
          <p className="flex items-center gap-1.5 px-3.5 pt-2 text-[11px] text-slate-400 dark:text-slate-500">
            <Lock className="h-3 w-3" />
            Read only. These messages belong to other leads and are shown for history.
          </p>
          <ul className="divide-y divide-slate-100 dark:divide-emerald-400/10">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => void toggleEntry(entry.id)}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-emerald-400/5"
                  aria-expanded={expandedId === entry.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-slate-700 dark:text-slate-200">{entry.title}</p>
                    {entry.detail && <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{entry.detail}</p>}
                  </div>
                  {loadingId === entry.id ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
                  ) : (
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition", expandedId === entry.id && "rotate-180")} />
                  )}
                </button>
                {expandedId === entry.id && (
                  <div className="bg-slate-50/70 dark:bg-black/10">
                    {errorId === entry.id ? (
                      <p className="px-3 py-2 text-xs text-red-500">These messages couldn&apos;t be loaded. Try again in a moment.</p>
                    ) : loaded[entry.id] ? (
                      <EarlierItems items={loaded[entry.id]} />
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
