"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Search,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { useContacts } from "@/hooks/useContacts";
import {
  useCommStore,
  commActions,
  connectCommunicationSocket,
  type CommMessage,
} from "@/lib/communicationStore";
import { Avatar, EmptyState } from "./Shared";
import { NewMessageModal, type ConversationTarget } from "./NewMessageModal";
import { SaveContactModal } from "./SaveContactModal";

/**
 * SMS pane for Suprah One Desk — LIVE Telnyx integration.
 *
 * Conversations are the org-wide shared threads from /crm/communications
 * (the same data the Leads workspace uses), so every teammate sees the same
 * history. "Start Chat" can target a saved contact or a raw number; the
 * conversation materializes server-side on the first send. Inbound texts,
 * teammate replies, and delivery-status changes stream in live via the
 * shared communication socket.
 */

const last10 = (phone: string) => (phone || "").replace(/\D/g, "").slice(-10);

const toE164 = (raw: string) => {
  const digits = (raw || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  const only = digits.replace(/\D/g, "");
  if (only.length === 10) return `+1${only}`;
  if (only.length === 11 && only.startsWith("1")) return `+${only}`;
  return only ? `+${only}` : "";
};

const timeLabel = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

interface ServerConversation {
  _id: string;
  customerPhone: string;
  customerName?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastDirection?: "inbound" | "outbound";
}

function StatusGlyph({ status }: { status: CommMessage["status"] }) {
  if (status === "queued") return <Clock3 className="h-3 w-3 opacity-70" />;
  if (status === "sent") return <Check className="h-3 w-3 opacity-80" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3" style={{ color: "var(--accent)" }} />;
  if (status === "failed") return <AlertCircle className="h-3 w-3 text-red-400" />;
  return null;
}

export function SmsTab({ token }: { token: string }) {
  const { contacts, loading, createContact } = useContacts(token);
  const authHeaders = React.useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<ConversationTarget | null>(null);
  const [newMessageOpen, setNewMessageOpen] = React.useState(false);
  const [nameContactOpen, setNameContactOpen] = React.useState(false);

  // Server-side org conversations + locally opened (not-yet-messaged) targets.
  const [serverConversations, setServerConversations] = React.useState<ServerConversation[]>([]);
  const [pendingTargets, setPendingTargets] = React.useState<ConversationTarget[]>([]);

  // Selected thread state
  const [selectedConvId, setSelectedConvId] = React.useState<string | null>(null);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  // Session-level read tracking (server has no per-user read state yet).
  const [readAt, setReadAt] = React.useState<Record<string, number>>({});

  const { messagesByConversation } = useCommStore();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const selectedPhoneRef = React.useRef<string | null>(null);

  /* ------------------------- socket + org wiring ------------------------- */

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await apiClient.get("/api/auth/me", authHeaders);
        const user = me.data?.data || me.data;
        const orgId = user?.organizationId || user?.orgId;
        if (cancelled || !orgId) return;
        const socket = initializeSocket(token);
        if (socket) connectCommunicationSocket(socket, String(orgId));
      } catch {
        /* socket wiring is best-effort; polling still keeps data fresh */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, authHeaders]);

  /* --------------------------- conversations ---------------------------- */

  const loadConversations = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/crm/communications/conversations", {
        ...authHeaders,
        params: { limit: 50 },
      });
      const items: ServerConversation[] = res.data?.data?.items || [];
      setServerConversations(items);
    } catch {
      /* keep last known list on transient failures */
    }
  }, [authHeaders]);

  React.useEffect(() => {
    void loadConversations();
    const interval = window.setInterval(() => void loadConversations(), 30_000);
    return () => window.clearInterval(interval);
  }, [loadConversations]);

  // Any live message refreshes the list (new conversations appear, previews
  // update) and, when it belongs to the open thread, is already in the store.
  React.useEffect(() => {
    const socket = initializeSocket(token);
    if (!socket) return;
    const onNew = () => void loadConversations();
    socket.on("comm:message:new", onNew);
    return () => {
      socket.off("comm:message:new", onNew);
    };
  }, [token, loadConversations]);

  /* ------------------------ merged sidebar list -------------------------- */

  const contactNameFor = React.useCallback(
    (phone: string) => {
      const tail = last10(phone);
      if (!tail) return undefined;
      return contacts.find((contact) => last10(contact.phoneNumber) === tail)?.name;
    },
    [contacts],
  );

  interface Row {
    key: string;
    target: ConversationTarget;
    preview: string;
    at?: string;
    unread: boolean;
  }

  const rows: Row[] = React.useMemo(() => {
    const seen = new Set<string>();
    const out: Row[] = [];

    for (const conv of serverConversations) {
      const phoneKey = last10(conv.customerPhone) || conv.customerPhone;
      seen.add(phoneKey);
      const name = contactNameFor(conv.customerPhone) || conv.customerName || null;
      const lastAt = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
      const unread =
        conv.lastDirection === "inbound" &&
        lastAt > (readAt[phoneKey] || 0) &&
        selectedPhoneRef.current !== phoneKey;
      out.push({
        key: phoneKey,
        target: {
          id: conv._id,
          name,
          phoneNumber: conv.customerPhone,
          contactId: null,
        },
        preview: conv.lastMessagePreview || "No messages yet",
        at: conv.lastMessageAt,
        unread,
      });
    }

    for (const target of pendingTargets) {
      const phoneKey = last10(target.phoneNumber) || target.phoneNumber;
      if (seen.has(phoneKey)) continue;
      out.push({ key: phoneKey, target, preview: "No messages yet", at: undefined, unread: false });
    }

    const q = query.trim().toLowerCase();
    const filtered = q
      ? out.filter(
          (row) =>
            (row.target.name ?? "").toLowerCase().includes(q) ||
            row.target.phoneNumber.toLowerCase().includes(q),
        )
      : out;

    return filtered.sort((a, b) => (b.at ? new Date(b.at).getTime() : Date.now()) - (a.at ? new Date(a.at).getTime() : Date.now()));
  }, [serverConversations, pendingTargets, query, contactNameFor, readAt]);

  /* ----------------------------- open thread ----------------------------- */

  const openThread = React.useCallback(
    async (target: ConversationTarget) => {
      const phoneKey = last10(target.phoneNumber) || target.phoneNumber;
      selectedPhoneRef.current = phoneKey;
      setSelected(target);
      setSendError(null);
      setReadAt((current) => ({ ...current, [phoneKey]: Date.now() }));
      setSelectedConvId(null);
      setThreadLoading(true);
      try {
        const res = await apiClient.get("/api/crm/communications/threads/by-phone", {
          ...authHeaders,
          params: { phone: toE164(target.phoneNumber) || target.phoneNumber },
        });
        const data = res.data?.data || res.data;
        if (selectedPhoneRef.current !== phoneKey) return; // switched away
        if (data?.conversation?._id) {
          setSelectedConvId(data.conversation._id);
          commActions.seedMessages(data.conversation._id, data.messages || []);
        }
      } catch {
        /* thread stays empty; sending still works and will create it */
      } finally {
        if (selectedPhoneRef.current === phoneKey) setThreadLoading(false);
      }
    },
    [authHeaders],
  );

  const handleOpenConversation = (target: ConversationTarget) => {
    setPendingTargets((current) => [target, ...current.filter((c) => c.id !== target.id)]);
    void openThread(target);
  };

  const handleContactNamed = (
    previousId: string,
    contact: { _id: string; name: string; phoneNumber: string },
  ) => {
    const target: ConversationTarget = {
      id: contact._id,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      contactId: contact._id,
    };
    setPendingTargets((current) => [
      target,
      ...current.filter((c) => c.id !== previousId && c.id !== target.id),
    ]);
    setSelected(target);
  };

  const messages: CommMessage[] = selectedConvId
    ? messagesByConversation[selectedConvId] || []
    : [];

  // New inbound message for the open phone can CREATE the conversation —
  // pick up its id from the refreshed conversation list.
  React.useEffect(() => {
    if (!selected || selectedConvId) return;
    const phoneKey = last10(selected.phoneNumber);
    const match = serverConversations.find((conv) => last10(conv.customerPhone) === phoneKey);
    if (match) void openThread(selected);
  }, [serverConversations, selected, selectedConvId, openThread]);

  // Mark read + autoscroll as messages arrive in the open thread.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (selected) {
      const phoneKey = last10(selected.phoneNumber) || selected.phoneNumber;
      setReadAt((current) => ({ ...current, [phoneKey]: Date.now() }));
    }
  }, [messages.length, selected]);

  /* -------------------------------- send --------------------------------- */

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !selected || sending) return;
    const toPhone = toE164(selected.phoneNumber);
    if (!toPhone) {
      setSendError("This number doesn't look valid.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await apiClient.post(
        "/api/crm/communications/messages",
        { toPhone, body, customerName: selected.name },
        authHeaders,
      );
      const data = res.data?.data || res.data;
      if (data?.conversationId) {
        setSelectedConvId((current) => current || data.conversationId);
        if (data.message) commActions.upsertMessage(data.message);
      }
      setDraft("");
      void loadConversations();
    } catch (error: any) {
      setSendError(
        error?.response?.data?.message ||
          "Message failed to send. Check the number and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const onComposerKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  };

  /* -------------------------------- render -------------------------------- */

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <aside
        className={cn(
          "sm5-rail relative flex w-full flex-col lg:w-80 lg:shrink-0",
          selected && "hidden lg:flex",
        )}
      >
        <div className="sm5-toolbar gap-2 px-3">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Search conversations…"
              className="sm5-input h-9 w-full pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm5-scroll">
          {!loading && rows.length === 0 && (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title={query.trim() ? `No match for "${query.trim()}"` : "No conversations yet"}
              hint="Tap Start Chat, or wait — customer texts to the company number appear here automatically."
            />
          )}

          {rows.map(({ key, target, preview, at, unread }) => {
            const label = target.name ?? target.phoneNumber;
            const isActive =
              selected && (last10(selected.phoneNumber) || selected.phoneNumber) === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleOpenConversation(target)}
                className={cn(
                  "sm5-conv-row group flex w-full items-center gap-2.5 px-3 py-3 text-left",
                  isActive && "sm5-conv-active",
                )}
              >
                <div className="relative shrink-0">
                  <Avatar seed={label} size={36} />
                  {unread && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--bg-1, #0b1512)" }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-[13px]",
                        unread ? "font-bold text-foreground" : "font-semibold text-foreground/90",
                      )}
                    >
                      {label}
                    </p>
                    <span className="sm5-meta shrink-0">{timeLabel(at) || "—"}</span>
                  </div>
                  <p
                    className={cn("mt-0.5 truncate text-[11px]", unread ? "font-semibold" : "font-normal")}
                    style={{ color: unread ? "var(--text-primary)" : "var(--text-tertiary)" }}
                  >
                    {preview}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setNewMessageOpen(true)}
          className="sm5-btn absolute bottom-4 right-4 z-10 flex h-11 items-center gap-2 rounded-full px-4 shadow-lg"
          style={{ fontSize: 13 }}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Start Chat
        </button>
      </aside>

      <main className={cn("min-w-0 flex-1 flex-col", selected ? "flex" : "hidden lg:flex")}>
        {selected ? (
          <>
            <div
              className="sm5-toolbar shrink-0 gap-2 px-3"
              style={{ borderBottom: "1px solid var(--border-1)" }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  selectedPhoneRef.current = null;
                }}
                className="sm5-icon-btn h-8 w-8 shrink-0 lg:hidden"
                title="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Avatar seed={selected.name ?? selected.phoneNumber} size={30} />
              <div className="min-w-0 flex-1">
                <p className="sm5-title-sm truncate">{selected.name ?? selected.phoneNumber}</p>
                {selected.name && <p className="sm5-mono sm5-meta truncate">{selected.phoneNumber}</p>}
              </div>
              {!selected.contactId && !contactNameFor(selected.phoneNumber) && (
                <button
                  type="button"
                  onClick={() => setNameContactOpen(true)}
                  className="sm5-icon-btn h-8 w-8 shrink-0"
                  title="Save to Contacts"
                  aria-label="Save to Contacts"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Thread */}
            <div ref={scrollRef} className="sm5-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {threadLoading && messages.length === 0 ? (
                <p className="pt-8 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Loading conversation…
                </p>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "var(--accent-muted)", border: "1px solid rgba(52,201,125,0.22)" }}
                  >
                    <MessageSquare className="h-5 w-5" style={{ color: "var(--accent)" }} />
                  </div>
                  <p className="sm5-display font-bold" style={{ fontSize: 15, color: "var(--text-primary)" }}>
                    No messages yet
                  </p>
                  <p className="max-w-sm text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                    Send the first text — the whole team will see this conversation.
                  </p>
                </div>
              ) : (
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
                  {messages.map((message) => {
                    const outbound = message.direction === "outbound";
                    return (
                      <div key={message._id} className={cn("flex w-full", outbound ? "justify-end" : "justify-start")}>
                        <div className={cn("flex max-w-[82%] flex-col", outbound ? "items-end" : "items-start")}>
                          <div
                            className="whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13px] leading-relaxed"
                            style={
                              outbound
                                ? {
                                    background: "var(--accent)",
                                    color: "#06130c",
                                    borderBottomRightRadius: 6,
                                  }
                                : {
                                    background: "var(--bg-2, rgba(255,255,255,0.05))",
                                    border: "1px solid var(--border-1)",
                                    color: "var(--text-primary)",
                                    borderBottomLeftRadius: 6,
                                  }
                            }
                          >
                            {message.body}
                          </div>
                          <span
                            className="mt-0.5 flex items-center gap-1 text-[10px]"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {outbound && message.sentBy?.name && <span>{message.sentBy.name}</span>}
                            <span>{timeLabel(message.createdAt)}</span>
                            {outbound && <StatusGlyph status={message.status} />}
                            {message.status === "failed" && <span className="text-red-400">Not delivered</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Composer */}
            <div
              className="flex shrink-0 flex-col gap-1 px-3 pt-3"
              style={{
                borderTop: "1px solid var(--border-1)",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              {sendError && (
                <p className="flex items-center gap-1.5 text-[11px] text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {sendError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
                  onKeyDown={onComposerKey}
                  placeholder={`Text ${selected.name ?? selected.phoneNumber}…`}
                  className="sm5-input h-10 flex-1 px-3 text-sm"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || sending}
                  className="sm5-btn flex h-10 w-10 shrink-0 items-center justify-center !rounded-full disabled:opacity-40"
                  title="Send"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "var(--accent-muted)", border: "1px solid rgba(52,201,125,0.22)" }}
            >
              <MessageSquarePlus className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>
            <p className="sm5-display font-bold" style={{ fontSize: 15, color: "var(--text-primary)" }}>
              Pick a conversation
            </p>
            <p className="max-w-sm text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Select a conversation, or tap Start Chat to text a contact or any number from the
              company line.
            </p>
          </div>
        )}
      </main>

      {newMessageOpen && (
        <NewMessageModal
          contacts={contacts}
          onStart={handleOpenConversation}
          onClose={() => setNewMessageOpen(false)}
        />
      )}

      {nameContactOpen && selected && (
        <SaveContactModal
          initialPhoneNumber={selected.phoneNumber}
          onSave={createContact}
          onSaved={(contact) => handleContactNamed(selected.id, contact)}
          onClose={() => setNameContactOpen(false)}
        />
      )}
    </div>
  );
}