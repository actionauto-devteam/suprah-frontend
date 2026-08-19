"use client";

import * as React from "react";
import { MessageSquare, Search, Send, X } from "lucide-react";
import { Avatar, EmptyState } from "./Shared";
import type { OneDeskContact } from "@/hooks/useContacts";

/** A conversation can target a saved contact or a raw, never-saved number. */
export interface ConversationTarget {
  id: string;
  name: string | null;
  phoneNumber: string;
  contactId: string | null;
}

const onlyDigits = (value: string) => value.replace(/\D/g, "");

function matchesNumber(contactPhone: string, queryDigits: string) {
  const phoneDigits = onlyDigits(contactPhone);
  return phoneDigits.length > 0 && queryDigits.length > 0 && phoneDigits.endsWith(queryDigits);
}

/**
 * "New message" compose screen — a `To:` field that searches saved contacts
 * by name or number, plus a "Send to {number}" fallback for numbers that
 * aren't saved yet (naming them happens later, inside the thread).
 */
export function NewMessageModal({
  contacts,
  onStart,
  onClose,
}: {
  contacts: OneDeskContact[];
  onStart: (target: ConversationTarget) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");

  const trimmed = query.trim();
  const queryDigits = onlyDigits(trimmed);
  const isNumericQuery = trimmed.length > 0 && /^[\d+\-() ]+$/.test(trimmed);

  const results = React.useMemo(() => {
    if (!trimmed) return contacts;
    if (isNumericQuery) {
      return contacts.filter((contact) => matchesNumber(contact.phoneNumber, queryDigits));
    }
    const q = trimmed.toLowerCase();
    return contacts.filter((contact) => contact.name.toLowerCase().includes(q));
  }, [contacts, isNumericQuery, queryDigits, trimmed]);

  const sendToNumber = isNumericQuery && results.length === 0 && queryDigits.length >= 3 ? trimmed : null;

  const handlePickContact = (contact: OneDeskContact) => {
    onStart({ id: contact._id, name: contact.name, phoneNumber: contact.phoneNumber, contactId: contact._id });
    onClose();
  };

  const handleSendToNumber = () => {
    if (!sendToNumber) return;
    onStart({ id: sendToNumber, name: null, phoneNumber: sendToNumber, contactId: null });
    onClose();
  };

  return (
    <div
      className="sm5-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="sm5-modal sm5-sheet flex w-full max-w-md flex-col overflow-hidden rounded-2xl"
        style={{ maxHeight: "calc(100dvh - 32px)" }}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        <div
          className="sm5-modal-header flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-1)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
            <h2 className="sm5-title-lg truncate" style={{ fontSize: 16, color: "var(--text-primary)" }}>
              New Message
            </h2>
          </div>
          <button onClick={onClose} className="sm5-icon-btn h-7 w-7 shrink-0" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border-1)" }}>
          <span className="sm5-label shrink-0">To:</span>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              autoFocus
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Type names, phone numbers"
              className="sm5-input h-10 w-full pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 sm5-scroll"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {sendToNumber && (
            <button
              type="button"
              onClick={handleSendToNumber}
              className="sm5-conv-row flex w-full items-center gap-2.5 px-3 py-3 text-left"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
              >
                <Send className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="sm5-title-sm truncate">Send to {sendToNumber}</p>
                <p className="sm5-supporting mt-0.5 truncate">Not in your contacts yet</p>
              </div>
            </button>
          )}

          {results.length === 0 && !sendToNumber && (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title={trimmed ? "No match" : "No contacts yet"}
              hint={
                trimmed
                  ? "Type a full number to message someone who isn't saved yet."
                  : "Save a contact from a conversation to see them here."
              }
            />
          )}

          {results.map((contact) => (
            <button
              key={contact._id}
              type="button"
              onClick={() => handlePickContact(contact)}
              className="sm5-conv-row flex w-full items-center gap-2.5 px-3 py-3 text-left"
            >
              <Avatar seed={contact.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="sm5-title-sm truncate">{contact.name}</p>
                <p className="sm5-mono sm5-supporting mt-0.5 truncate">{contact.phoneNumber}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
