"use client";

import * as React from "react";
import {
  AlertCircle,
  ChevronDown,
  Delete,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useContacts, type OneDeskContact } from "@/hooks/useContacts";
import { Avatar, EmptyState } from "./Shared";
import { SaveContactModal } from "./SaveContactModal";
import { getErrorMessage } from "./utils";

type CallView = "recent" | "contacts";

const DIAL_KEYS: Array<{ digit: string; letters?: string }> = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*" },
  { digit: "0", letters: "+" },
  { digit: "#" },
];

/**
 * Standard phone keypad. Controlled — the same instance stays mounted (just
 * minimized) across tab switches, so picking a contact updates it in place.
 * Presentation-only — no useTelnyxRTC/backend wiring yet, matches the
 * honest "not connected" pattern this module uses until the approved
 * calling integration lands.
 */
function DialPad({
  value,
  onChange,
  contactName,
}: {
  value: string;
  onChange: (value: string) => void;
  contactName?: string;
}) {
  const displayRef = React.useRef<HTMLInputElement>(null);

  const pressKey = (digit: string) => {
    onChange((value + digit).slice(0, 32));
    displayRef.current?.focus();
  };

  const backspace = () => onChange(value.slice(0, -1));
  const clear = () => onChange("");

  return (
    <div className="mx-auto flex w-full max-w-[272px] flex-col items-center gap-3">
      {contactName && (
        <p className="sm5-supporting" style={{ color: "var(--text-secondary)" }}>
          Calling <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{contactName}</span>
        </p>
      )}
      <div className="flex w-full items-center gap-2">
        <input
          ref={displayRef}
          value={value}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value.replace(/[^\d*#+]/g, "").slice(0, 32))
          }
          placeholder="Enter a number"
          inputMode="tel"
          autoComplete="off"
          className="sm5-input sm5-mono h-11 flex-1 px-3 text-center text-lg font-semibold tracking-wider"
        />
        {value && (
          <button
            type="button"
            onClick={backspace}
            onDoubleClick={clear}
            className="sm5-icon-btn h-10 w-10 shrink-0"
            title="Backspace (double-click to clear)"
            aria-label="Backspace"
          >
            <Delete className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Fixed key size (not aspect-square-of-container) — keeps the whole
          pad compact enough to fit without scrolling on short phone screens. */}
      <div className="grid grid-cols-3 gap-2.5">
        {DIAL_KEYS.map((key) => (
          <button
            key={key.digit}
            type="button"
            onClick={() => pressKey(key.digit)}
            className="sm5-pill flex h-14 w-14 flex-col items-center justify-center gap-0.5 !rounded-full"
          >
            <span style={{ fontSize: 18, fontWeight: 700 }}>{key.digit}</span>
            {key.letters && (
              <span
                className="font-semibold"
                style={{ fontSize: 7, letterSpacing: "0.12em", color: "var(--text-tertiary)" }}
              >
                {key.letters}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="sm5-btn flex h-12 w-12 items-center justify-center !rounded-full"
        title="Available after the approved calling integration is connected"
        aria-label="Call"
      >
        <Phone className="h-4.5 w-4.5" />
      </button>

      <div
        className="sm5-helper-card flex items-start gap-2 px-3 py-2"
        style={{ background: "var(--accent-muted)", borderColor: "rgba(52,201,125,0.2)" }}
      >
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          This dial pad is presentation-only until the approved calling integration is connected.
          Nothing is dialed yet.
        </p>
      </div>
    </div>
  );
}

/**
 * Recent tab — a recent-calls list in the background with the dial pad as a
 * bottom-anchored panel on top, expanded by default, minimizable via the
 * handle bar (mirrors a real phone's dial screen over the call log).
 */
function RecentView({
  number,
  onNumberChange,
  contactName,
  minimized,
  onToggleMinimized,
}: {
  number: string;
  onNumberChange: (value: string) => void;
  contactName?: string;
  minimized: boolean;
  onToggleMinimized: () => void;
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="sm5-scroll absolute inset-0 overflow-y-auto">
        <EmptyState
          icon={<Phone className="h-8 w-8" />}
          title="No recent calls yet"
          hint="Calls you make or receive will show up here once the approved calling integration is connected."
        />
      </div>

      <div
        className={cn(
          "sm5-modal absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl rounded-b-none shadow-2xl transition-transform duration-200",
          minimized && "translate-y-[calc(100%-3.25rem)]",
        )}
        style={{ maxHeight: "calc(100% - 24px)" }}
      >
        <button
          type="button"
          onClick={onToggleMinimized}
          className="flex h-[3.25rem] w-full shrink-0 items-center justify-center gap-2"
          title={minimized ? "Expand dial pad" : "Minimize dial pad"}
        >
          <Phone className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span className="sm5-label">Dial Pad</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", minimized && "rotate-180")}
          />
        </button>

        <div
          className="sm5-scroll overflow-y-auto px-6 pt-2"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <DialPad value={number} onChange={onNumberChange} contactName={contactName} />
        </div>
      </div>
    </div>
  );
}

function ContactsView({
  contacts,
  loading,
  query,
  onSelect,
  onDelete,
}: {
  contacts: OneDeskContact[];
  loading: boolean;
  query: string;
  onSelect: (contact: OneDeskContact) => void;
  onDelete: (contact: OneDeskContact, event: React.MouseEvent) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm5-scroll">
      {!loading && contacts.length === 0 && (
        <EmptyState
          icon={<Phone className="h-8 w-8" />}
          title={query.trim() ? `No contact matches "${query.trim()}"` : "No contacts yet"}
          hint="Save a contact, then tap it to fill the dial pad."
        />
      )}

      {contacts.map((contact) => (
        <button
          key={contact._id}
          type="button"
          onClick={() => onSelect(contact)}
          className="sm5-conv-row group flex w-full items-center gap-2.5 px-3 py-3 text-left"
        >
          <Avatar seed={contact.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="sm5-title-sm truncate">{contact.name}</p>
            <p className="sm5-mono sm5-supporting mt-0.5 truncate">{contact.phoneNumber}</p>
          </div>
          <button
            type="button"
            onClick={(event) => onDelete(contact, event)}
            className="sm5-icon-btn h-9 w-9 shrink-0 lg:h-7 lg:w-7 lg:opacity-0 lg:group-hover:opacity-100"
            title="Remove contact"
            aria-label="Remove contact"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <Phone className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** Call channel pane for Suprah One Desk — a phone-app-style Recent/Contacts
 *  layout with a collapsible dial pad. Dialing itself stays presentation-only
 *  (Telnyx account/number not provisioned yet), but the contacts phonebook
 *  is real and shared with the SMS pane via /api/crm/contacts. */
export function CallDialPadTab({ token }: { token: string }) {
  const { contacts, loading, createContact, deleteContact } = useContacts(token);
  const [view, setView] = React.useState<CallView>("recent");
  const [query, setQuery] = React.useState("");
  const [addContactOpen, setAddContactOpen] = React.useState(false);
  const [dialPadMinimized, setDialPadMinimized] = React.useState(false);
  const [number, setNumber] = React.useState("");
  const [contactName, setContactName] = React.useState<string | undefined>(undefined);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(q) || contact.phoneNumber.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  const handleNumberChange = (value: string) => {
    setNumber(value);
    setContactName(undefined);
  };

  const handleSelectContact = (contact: OneDeskContact) => {
    setNumber(contact.phoneNumber);
    setContactName(contact.name);
    setDialPadMinimized(false);
    setView("recent");
  };

  const handleDelete = async (contact: OneDeskContact, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await deleteContact(contact._id);
      toast.success(`Removed "${contact.name}"`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove this contact."));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="sm5-toolbar gap-2 px-3">
        <div className="sm5-tab-bar flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setView("recent")}
            className={cn("sm5-tab whitespace-nowrap px-3 py-1.5 text-xs", view === "recent" && "sm5-tab-active")}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setView("contacts")}
            className={cn(
              "sm5-tab whitespace-nowrap px-3 py-1.5 text-xs",
              view === "contacts" && "sm5-tab-active",
            )}
          >
            Contacts
          </button>
        </div>

        {view === "contacts" && (
          <>
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              />
              <input
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="Search contacts…"
                className="sm5-input h-9 w-full pl-9 pr-3 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setAddContactOpen(true)}
              className="sm5-icon-btn h-10 w-10 shrink-0 !rounded-full"
              title="Add Contact"
              aria-label="Add Contact"
            >
              <Plus className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {view === "recent" ? (
        <RecentView
          number={number}
          onNumberChange={handleNumberChange}
          contactName={contactName}
          minimized={dialPadMinimized}
          onToggleMinimized={() => setDialPadMinimized((current) => !current)}
        />
      ) : (
        <ContactsView
          contacts={filtered}
          loading={loading}
          query={query}
          onSelect={handleSelectContact}
          onDelete={handleDelete}
        />
      )}

      {addContactOpen && (
        <SaveContactModal onClose={() => setAddContactOpen(false)} onSave={createContact} />
      )}
    </div>
  );
}
