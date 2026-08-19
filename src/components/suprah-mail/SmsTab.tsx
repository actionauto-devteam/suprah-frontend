"use client";

import * as React from "react";
import { ArrowLeft, MessageSquare, MessageSquarePlus, Pencil, Search, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/useContacts";
import { Avatar, EmptyState } from "./Shared";
import { NewMessageModal, type ConversationTarget } from "./NewMessageModal";
import { SaveContactModal } from "./SaveContactModal";

/**
 * SMS pane for Suprah One Desk. The carrier/Telnyx connection isn't
 * provisioned yet, so this stays an honest "not connected" surface. The
 * sidebar is styled as a conversation list (name + last-message preview,
 * ported from SupraSpace's DM list pattern). A conversation can target a
 * saved contact or a raw, never-saved number ("Send to {number}" from the
 * New Message screen) — naming it happens later, from inside the thread.
 */
export function SmsTab({ token }: { token: string }) {
  const { contacts, loading, createContact } = useContacts(token);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<ConversationTarget | null>(null);
  const [newMessageOpen, setNewMessageOpen] = React.useState(false);
  const [nameContactOpen, setNameContactOpen] = React.useState(false);

  // Saving a contact only adds it to the phonebook (Call tab's Contacts
  // view) — it must not appear here until the user actually opens a
  // conversation with them. This list is that separate, explicit set.
  const [openConversations, setOpenConversations] = React.useState<ConversationTarget[]>([]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return openConversations;
    return openConversations.filter(
      (target) =>
        (target.name ?? "").toLowerCase().includes(q) || target.phoneNumber.toLowerCase().includes(q),
    );
  }, [openConversations, query]);

  const handleOpenConversation = (target: ConversationTarget) => {
    setOpenConversations((current) => [target, ...current.filter((c) => c.id !== target.id)]);
    setSelected(target);
  };

  // The unsaved-number thread gets named/saved — replace it in place with
  // the now-real contact instead of adding a second, duplicate entry.
  const handleContactNamed = (previousId: string, contact: { _id: string; name: string; phoneNumber: string }) => {
    const target: ConversationTarget = {
      id: contact._id,
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      contactId: contact._id,
    };
    setOpenConversations((current) => [
      target,
      ...current.filter((c) => c.id !== previousId && c.id !== target.id),
    ]);
    setSelected(target);
  };

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
          {!loading && filtered.length === 0 && (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title={query.trim() ? `No match for "${query.trim()}"` : "No conversations yet"}
              hint="Tap Start Chat to message a saved contact or a new number."
            />
          )}

          {filtered.map((target) => {
            // No live SMS unread state yet — this becomes real once Telnyx
            // delivers message/unread data, mirroring SupraSpace's
            // isConvUnread pattern (bold name/preview + avatar corner dot).
            const isUnread = false;
            const label = target.name ?? target.phoneNumber;

            return (
              <button
                key={target.id}
                type="button"
                onClick={() => handleOpenConversation(target)}
                className={cn(
                  "sm5-conv-row group flex w-full items-center gap-2.5 px-3 py-3 text-left",
                  selected?.id === target.id && "sm5-conv-active",
                )}
              >
                <div className="relative shrink-0">
                  <Avatar seed={label} size={36} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-[13px]",
                        isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90",
                      )}
                    >
                      {label}
                    </p>
                    <span className="sm5-meta shrink-0">—</span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[11px]",
                      isUnread ? "font-semibold" : "font-normal",
                    )}
                    style={{ color: isUnread ? "var(--text-primary)" : "var(--text-tertiary)" }}
                  >
                    No messages yet
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
                onClick={() => setSelected(null)}
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
              {!selected.contactId && (
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

            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
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
                Texting {selected.name ?? selected.phoneNumber} will be available once the approved SMS
                integration is connected.
              </p>
            </div>

            <div
              className="flex shrink-0 items-center gap-2 px-3 pt-3"
              style={{
                borderTop: "1px solid var(--border-1)",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              <input
                disabled
                placeholder="Available after the approved SMS integration is connected"
                className="sm5-input h-10 flex-1 px-3 text-sm"
                title="Available after the approved SMS integration is connected"
              />
              <button
                type="button"
                disabled
                className="sm5-btn flex h-10 w-10 shrink-0 items-center justify-center !rounded-full"
                title="Available after the approved SMS integration is connected"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
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
              Select an open conversation, or tap Start Chat to message someone.
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
