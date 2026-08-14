"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Send,
  Check,
  CheckCheck,
  Clock3,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useCommStore, commActions, CommMessage, CommCall } from "@/lib/communicationStore";
import { useTelnyxRTC } from "@/hooks/useTelnyxRTC";

/* ------------------------------- MT helpers ------------------------------ */

const mtTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  hour: "numeric",
  minute: "2-digit",
});
const mtDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const mtDayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const fmtDuration = (sec?: number) => {
  if (!sec && sec !== 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

/* ------------------------------ status icon ------------------------------ */

function StatusIcon({ status }: { status: CommMessage["status"] }) {
  switch (status) {
    case "queued":
      return <Clock3 className="h-3 w-3 opacity-70" aria-label="Queued" />;
    case "sent":
      return <Check className="h-3 w-3 opacity-80" aria-label="Sent" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-cyan-300" aria-label="Delivered" />;
    case "failed":
      return <AlertTriangle className="h-3 w-3 text-red-400" aria-label="Failed" />;
    default:
      return null;
  }
}

/* --------------------------------- panel --------------------------------- */

interface Props {
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  className?: string;
}

export default function CommunicationPanel({
  customerId,
  customerName,
  customerPhone,
  className = "",
}: Props) {
  const [tab, setTab] = useState<"messages" | "calls">("messages");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { messagesByConversation, callsByCustomer, activeCall, softphoneReady } = useCommStore();
  const { dial } = useTelnyxRTC();
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversationId ? messagesByConversation[conversationId] || [] : [];
  const calls = callsByCustomer[customerId] || [];

  /* ------------------------------ initial load --------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await apiClient.get(
        `/api/crm/communications/customers/${customerId}/thread`,
        { params: customerPhone ? { phone: customerPhone } : {} }
      );
      const payload = data?.data || data;
      if (payload.conversation) {
        setConversationId(payload.conversation._id);
        commActions.seedMessages(payload.conversation._id, payload.messages || []);
      }
      commActions.seedCalls(customerId, payload.calls || []);
    } catch {
      setLoadError("Couldn't load the conversation. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [customerId, customerPhone]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------- autoscroll thread ------------------------ */

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, tab]);

  /* --------------------------------- send -------------------------------- */

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    if (!customerPhone && !conversationId) {
      setSendError("This customer has no phone number on file.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      if (conversationId) {
        const { data } = await apiClient.post(
          `/api/crm/communications/conversations/${conversationId}/reply`,
          { body }
        );
        const msg = data?.data?.message || data?.message;
        if (msg) commActions.upsertMessage(msg);
      } else {
        const { data } = await apiClient.post(`/api/crm/communications/messages`, {
          toPhone: customerPhone,
          body,
          customerId,
          customerName,
        });
        const payload = data?.data || data;
        if (payload.conversationId) setConversationId(payload.conversationId);
        if (payload.message) commActions.upsertMessage(payload.message);
      }
      setDraft("");
    } catch (err: any) {
      setSendError(
        err?.response?.data?.message || "Message failed to send. Try again."
      );
    } finally {
      setSending(false);
    }
  }, [draft, sending, conversationId, customerPhone, customerId, customerName]);

  const onComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* --------------------------------- call -------------------------------- */

  const canCall = Boolean(customerPhone) && !activeCall;

  const startCall = () => {
    if (!customerPhone || activeCall) return;
    dial(customerPhone, { customerId, displayName: customerName });
  };

  /* ------------------------------ day groups ----------------------------- */

  const grouped = useMemo(() => {
    const out: { day: string; items: CommMessage[] }[] = [];
    for (const m of messages) {
      const key = mtDayKey.format(new Date(m.createdAt));
      const last = out[out.length - 1];
      if (last && last.day === key) last.items.push(m);
      else out.push({ day: key, items: [m] });
    }
    return out;
  }, [messages]);

  /* --------------------------------- render ------------------------------ */

  return (
    <section
      className={`flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-emerald-400/15 dark:bg-slate-950/70 dark:shadow-[0_0_40px_-18px_rgba(16,185,129,0.35)] ${className}`}
      aria-label="Customer communications"
    >
      {/* header */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-emerald-500/[0.06] via-transparent to-cyan-500/[0.06] px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/25">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              Communications
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {customerName || "Customer"}
              {customerPhone ? ` · ${customerPhone}` : " · no phone on file"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={startCall}
          disabled={!canCall}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          title={
            !customerPhone
              ? "No phone number on file"
              : activeCall
              ? "A call is already in progress"
              : `Call ${customerPhone}`
          }
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Call</span>
        </button>
      </header>

      {/* tabs */}
      <nav className="flex gap-1 border-b border-slate-200 px-3 pt-2 dark:border-white/10" role="tablist">
        {(
          [
            { id: "messages", label: "Messages", icon: MessageSquare },
            { id: "calls", label: "Calls", icon: Phone },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 ${
              tab === id
                ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 pb-2 pr-1 text-[10px] text-slate-400 dark:text-slate-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              softphoneReady ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-slate-300 dark:bg-slate-600"
            }`}
          />
          {softphoneReady ? "Softphone ready" : "Softphone connecting"}
        </span>
      </nav>

      {/* body */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
        </div>
      ) : loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
          <button
            onClick={load}
            className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            Retry
          </button>
        </div>
      ) : tab === "messages" ? (
        <>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {grouped.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  No messages yet
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Send the first text to start this customer's shared thread.
                </p>
              </div>
            )}

            {grouped.map((group) => (
              <div key={group.day} className="space-y-2">
                <div className="sticky top-0 z-[1] flex justify-center">
                  <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400">
                    {mtDate.format(new Date(group.items[0].createdAt))} · MT
                  </span>
                </div>
                {group.items.map((m) => {
                  const out = m.direction === "outbound";
                  return (
                    <div key={m._id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                          out
                            ? m.status === "failed"
                              ? "rounded-br-md bg-red-500/90 text-white"
                              : "rounded-br-md bg-gradient-to-br from-emerald-600 to-emerald-500 text-white dark:from-emerald-500 dark:to-cyan-600"
                            : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <div
                          className={`mt-1 flex items-center gap-1.5 text-[10px] ${
                            out ? "justify-end text-white/80" : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {out && m.sentBy?.name && (
                            <span className="font-medium">{m.sentBy.name}</span>
                          )}
                          <span>{mtTime.format(new Date(m.createdAt))}</span>
                          {out && <StatusIcon status={m.status} />}
                          {m.status === "failed" && <span>Not delivered</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* composer */}
          <footer className="border-t border-slate-200 p-3 dark:border-white/10">
            {sendError && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle className="h-3.5 w-3.5" /> {sendError}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onComposerKey}
                rows={1}
                placeholder={
                  customerPhone || conversationId
                    ? "Reply to this customer… (Enter to send)"
                    : "No phone number on file"
                }
                disabled={(!customerPhone && !conversationId) || sending}
                className="max-h-32 min-h-[42px] flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                aria-label="Message text"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending || (!customerPhone && !conversationId)}
                className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/25 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </footer>
        </>
      ) : (
        /* --------------------------- calls tab --------------------------- */
        <div className="flex-1 overflow-y-auto p-3">
          {calls.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <Phone className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No calls yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Inbound and outbound calls with this customer will appear here for the whole team.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {calls.map((c: CommCall) => {
                const missed = c.status === "missed" || c.status === "canceled" || c.status === "failed";
                const Icon = missed
                  ? PhoneMissed
                  : c.direction === "inbound"
                  ? PhoneIncoming
                  : PhoneOutgoing;
                const who =
                  c.direction === "inbound"
                    ? c.answeredBy?.name
                      ? `Answered by ${c.answeredBy.name}`
                      : "Unanswered"
                    : c.placedBy?.name
                    ? `Placed by ${c.placedBy.name}`
                    : "Outbound";
                return (
                  <li
                    key={c._id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900/50"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        missed
                          ? "bg-red-500/10 text-red-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {c.direction === "inbound" ? "Inbound call" : "Outbound call"}
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide ${
                            c.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : c.status === "in-progress"
                              ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                              : missed
                              ? "bg-red-500/10 text-red-500"
                              : "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {c.status}
                        </span>
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {who} · {fmtDuration(c.durationSec)}
                      </p>
                    </div>
                    <time className="shrink-0 text-right text-[10px] leading-tight text-slate-400 dark:text-slate-500">
                      {mtDate.format(new Date(c.createdAt))}
                      <br />
                      {mtTime.format(new Date(c.createdAt))} MT
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
