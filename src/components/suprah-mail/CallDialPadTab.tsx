"use client";

import * as React from "react";
import {
  ChevronDown,
  Delete,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { useContacts, type OneDeskContact } from "@/hooks/useContacts";
import {
  useCommStore,
  connectCommunicationSocket,
  commActions,
  type CommCall,
} from "@/lib/communicationStore";
import { useTelnyxRTC } from "@/hooks/useTelnyxRTC";
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

const last10 = (phone: string) => (phone || "").replace(/\D/g, "").slice(-10);

const toE164 = (raw: string) => {
  const digits = (raw || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  const only = digits.replace(/\D/g, "");
  if (only.length === 10) return `+1${only}`;
  if (only.length === 11 && only.startsWith("1")) return `+${only}`;
  return only.length >= 7 ? `+${only}` : "";
};

const durationLabel = (sec?: number) => {
  if (!sec && sec !== 0) return "";
  const m = Math.floor((sec || 0) / 60);
  const s = (sec || 0) % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

const callTimeLabel = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

function CallTimer({ startedAt }: { startedAt?: number }) {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!startedAt) return <span className="sm5-mono">00:00</span>;
  const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <span className="sm5-mono">
      {mm}:{ss}
    </span>
  );
}

/** Standard phone keypad — now LIVE: the call button dials through Telnyx. */
function DialPad({
  value,
  onChange,
  contactName,
  onCall,
  canCall,
  softphoneReady,
}: {
  value: string;
  onChange: (value: string) => void;
  contactName?: string;
  onCall: () => void;
  canCall: boolean;
  softphoneReady: boolean;
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

      <div className="grid grid-cols-3 gap-2.5">
        {DIAL_KEYS.map((key) => (
          <button
            key={key.digit}
            type="button"
            onClick={() => pressKey(key.digit)}
            className="sm5-dial-key flex h-14 w-14 flex-col items-center justify-center rounded-full"
            style={{ background: "var(--bg-2, rgba(255,255,255,0.05))", border: "1px solid var(--border-1)" }}
          >
            <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {key.digit}
            </span>
            {key.letters && (
              <span className="text-[8px] tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                {key.letters}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCall}
        disabled={!canCall}
        className="sm5-btn flex h-12 w-12 items-center justify-center !rounded-full disabled:opacity-40"
        title={
          !softphoneReady
            ? "Softphone connecting…"
            : !canCall
              ? "Enter a number to call"
              : "Call"
        }
        aria-label="Call"
      >
        <Phone className="h-4.5 w-4.5" />
      </button>

      <p className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: softphoneReady ? "var(--accent)" : "var(--text-tertiary)" }}
        />
        {softphoneReady ? "Softphone ready — calls use the company number" : "Softphone connecting…"}
      </p>
    </div>
  );
}

/** Live in-call panel that replaces the dial pad while a call is active. */
function ActiveCallPanel({
  onMute,
  onHold,
  onHangup,
  onHold2,
}: {
  onMute: () => void;
  onHold: (hold: boolean) => boolean;
  onHangup: () => void;
  onHold2?: never;
}) {
  const { activeCall } = useCommStore();
  const [onHoldState, setOnHoldState] = React.useState(false);
  if (!activeCall) return null;

  const toggleHold = () => {
    const next = !onHoldState;
    if (onHold(next)) setOnHoldState(next);
    else toast.error("Hold isn't available right now");
  };

  return (
    <div className="mx-auto flex w-full max-w-[272px] flex-col items-center gap-4 py-2">
      <Avatar seed={activeCall.displayName || activeCall.phoneNumber} size={64} />
      <div className="text-center">
        <p className="sm5-title-sm">{activeCall.displayName || activeCall.phoneNumber}</p>
        <p className="sm5-meta mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          {activeCall.phase === "active" ? (
            <>
              {onHoldState ? "On hold · " : ""}
              <CallTimer startedAt={activeCall.startedAt} />
            </>
          ) : activeCall.phase === "ringing" ? (
            "Ringing…"
          ) : (
            "Connecting…"
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMute}
          className="sm5-icon-btn flex h-12 w-12 items-center justify-center !rounded-full"
          title={activeCall.muted ? "Unmute" : "Mute"}
          aria-label={activeCall.muted ? "Unmute" : "Mute"}
          style={activeCall.muted ? { borderColor: "rgba(251,191,36,0.5)", color: "#fbbf24" } : undefined}
        >
          {activeCall.muted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
        </button>

        <button
          type="button"
          onClick={onHangup}
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
          style={{ background: "#dc2626" }}
          title="End call"
          aria-label="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={toggleHold}
          className="sm5-icon-btn flex h-12 w-12 items-center justify-center !rounded-full"
          title={onHoldState ? "Resume" : "Hold"}
          aria-label={onHoldState ? "Resume" : "Hold"}
          style={onHoldState ? { borderColor: "rgba(52,201,125,0.5)", color: "var(--accent)" } : undefined}
        >
          {onHoldState ? <Play className="h-4.5 w-4.5" /> : <Pause className="h-4.5 w-4.5" />}
        </button>
      </div>
    </div>
  );
}

/** Recent view — real call log with the dial pad (or active call) on top. */
function RecentView({
  number,
  onNumberChange,
  contactName,
  minimized,
  onToggleMinimized,
  calls,
  onCallEntry,
  onCall,
  canCall,
  softphoneReady,
  inCall,
  onMute,
  onHold,
  onHangup,
  nameFor,
}: {
  number: string;
  onNumberChange: (value: string) => void;
  contactName?: string;
  minimized: boolean;
  onToggleMinimized: () => void;
  calls: CommCall[];
  onCallEntry: (call: CommCall) => void;
  onCall: () => void;
  canCall: boolean;
  softphoneReady: boolean;
  inCall: boolean;
  onMute: () => void;
  onHold: (hold: boolean) => boolean;
  onHangup: () => void;
  nameFor: (phone: string) => string | undefined;
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="sm5-scroll absolute inset-0 overflow-y-auto px-2 py-2 pb-[22rem]">
        {calls.length === 0 ? (
          <EmptyState
            icon={<Phone className="h-8 w-8" />}
            title="No recent calls yet"
            hint="Calls you make or receive on the company number will show up here for the whole team."
          />
        ) : (
          calls.map((call) => {
            const otherPhone = call.direction === "inbound" ? call.from : call.to;
            const missed = ["missed", "canceled", "failed"].includes(call.status);
            const Icon = missed
              ? PhoneMissed
              : call.direction === "inbound"
                ? PhoneIncoming
                : PhoneOutgoing;
            const label = nameFor(otherPhone) || call.customerName || otherPhone;
            const who =
              call.direction === "inbound"
                ? call.answeredBy?.name
                  ? `Answered by ${call.answeredBy.name}`
                  : "Unanswered"
                : call.placedBy?.name
                  ? `By ${call.placedBy.name}`
                  : "Outbound";

            return (
              <button
                key={call._id}
                type="button"
                onClick={() => onCallEntry(call)}
                className="sm5-conv-row group flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                title={`Call ${label}`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: missed ? "rgba(220,38,38,0.12)" : "var(--accent-muted)",
                    color: missed ? "#f87171" : "var(--accent)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[13px] font-semibold", missed && "text-red-400")}>
                    {label}
                  </p>
                  <p className="sm5-meta mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
                    {who}
                    {call.durationSec ? ` · ${durationLabel(call.durationSec)}` : ""}
                  </p>
                </div>
                <span className="sm5-meta shrink-0">{callTimeLabel(call.startedAt || call.createdAt)}</span>
              </button>
            );
          })
        )}
      </div>

      <div
        className={cn(
          "sm5-modal absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl rounded-b-none shadow-2xl transition-transform duration-200",
          minimized && !inCall && "translate-y-[calc(100%-3.25rem)]",
        )}
        style={{ maxHeight: "calc(100% - 24px)" }}
      >
        <button
          type="button"
          onClick={onToggleMinimized}
          disabled={inCall}
          className="flex h-[3.25rem] w-full shrink-0 items-center justify-center gap-2"
          title={inCall ? "Call in progress" : minimized ? "Expand dial pad" : "Minimize dial pad"}
        >
          <Phone className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span className="sm5-label">{inCall ? "On a call" : "Dial Pad"}</span>
          {!inCall && (
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", minimized && "rotate-180")}
            />
          )}
        </button>

        <div
          className="sm5-scroll overflow-y-auto px-6 pt-2"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {inCall ? (
            <ActiveCallPanel onMute={onMute} onHold={onHold} onHangup={onHangup} />
          ) : (
            <DialPad
              value={number}
              onChange={onNumberChange}
              contactName={contactName}
              onCall={onCall}
              canCall={canCall}
              softphoneReady={softphoneReady}
            />
          )}
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

/** Call channel pane for Suprah One Desk — LIVE Telnyx softphone.
 *  Same shared softphone/store singletons as the CRM's calls workspace, so
 *  One Desk and the Leads console never double-register or fight over the
 *  microphone. The contacts phonebook stays shared via /api/crm/contacts. */
export function CallDialPadTab({ token }: { token: string }) {
  const { contacts, loading, createContact, deleteContact } = useContacts(token);
  const authHeaders = React.useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const [view, setView] = React.useState<CallView>("recent");
  const [query, setQuery] = React.useState("");
  const [addContactOpen, setAddContactOpen] = React.useState(false);
  const [dialPadMinimized, setDialPadMinimized] = React.useState(false);
  const [number, setNumber] = React.useState("");
  const [contactName, setContactName] = React.useState<string | undefined>(undefined);
  const [recentCalls, setRecentCalls] = React.useState<CommCall[]>([]);

  const { incomingCalls, activeCall, softphoneReady } = useCommStore();
  const { dial, answerInbound, hangup, toggleMute, toggleHold } = useTelnyxRTC();

  /* -------------------------- socket + identity -------------------------- */

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
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, authHeaders]);

  /* ------------------------------ recent log ----------------------------- */

  const loadCalls = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/crm/communications/calls", {
        ...authHeaders,
        params: { limit: 30 },
      });
      const items: CommCall[] = res.data?.data?.items || [];
      setRecentCalls(
        items.filter((call) => ["completed", "missed", "failed", "canceled"].includes(call.status)),
      );
    } catch {
      /* keep last known */
    }
  }, [authHeaders]);

  React.useEffect(() => {
    void loadCalls();
    const interval = window.setInterval(() => void loadCalls(), 30_000);
    return () => window.clearInterval(interval);
  }, [loadCalls]);

  // Refresh the log shortly after a call ends.
  const wasInCall = React.useRef(false);
  React.useEffect(() => {
    if (wasInCall.current && !activeCall) {
      window.setTimeout(() => void loadCalls(), 1500);
    }
    wasInCall.current = Boolean(activeCall);
  }, [activeCall, loadCalls]);

  /* ------------------------------- helpers -------------------------------- */

  const nameFor = React.useCallback(
    (phone: string) => {
      const tail = last10(phone);
      if (!tail) return undefined;
      return contacts.find((contact) => last10(contact.phoneNumber) === tail)?.name;
    },
    [contacts],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(q) || contact.phoneNumber.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  /* -------------------------------- actions ------------------------------- */

  const startCall = async () => {
    const target = toE164(number);
    if (!target) {
      toast.error("Enter a valid phone number first.");
      return;
    }
    if (activeCall) {
      toast.error("You're already on a call.");
      return;
    }
    if (!softphoneReady) {
      toast.error("Softphone is still connecting — try again in a moment.");
      return;
    }
    try {
      await dial(target, { displayName: contactName || nameFor(target) });
      setDialPadMinimized(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't start the call."));
    }
  };

  const answerRinging = async (call: CommCall) => {
    try {
      await answerInbound(call._id, {
        phoneNumber: call.from,
        displayName: nameFor(call.from) || call.customerName || call.from,
      });
      setView("recent");
      setDialPadMinimized(false);
      toast.success("Call connected — bridging audio");
    } catch (error: any) {
      toast.error(
        error?.response?.status === 409
          ? "Another teammate answered this call."
          : getErrorMessage(error, "Couldn't answer the call."),
      );
    }
  };

  const handleNumberChange = (value: string) => {
    setNumber(value);
    setContactName(undefined);
  };

  const handleSelectContact = (contact: OneDeskContact) => {
    setNumber(contact.phoneNumber.replace(/[^\d*#+]/g, ""));
    setContactName(contact.name);
    setDialPadMinimized(false);
    setView("recent");
  };

  const handleCallEntry = (call: CommCall) => {
    const otherPhone = call.direction === "inbound" ? call.from : call.to;
    setNumber(otherPhone.replace(/[^\d*#+]/g, ""));
    setContactName(nameFor(otherPhone) || call.customerName || undefined);
    setDialPadMinimized(false);
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

  /* -------------------------------- render -------------------------------- */

  const ringing = incomingCalls[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Incoming call banner — every teammate sees it; first Answer wins. */}
      {ringing && !activeCall && (
        <div
          className="flex shrink-0 items-center gap-2.5 px-3 py-2.5"
          style={{
            background: "var(--accent-muted)",
            borderBottom: "1px solid rgba(52,201,125,0.25)",
          }}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--accent)", color: "#06130c" }}
          >
            <PhoneIncoming className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              Incoming call
            </p>
            <p className="sm5-title-sm truncate">
              {nameFor(ringing.from) || ringing.customerName || ringing.from}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void answerRinging(ringing)}
            className="sm5-btn flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold"
          >
            <Phone className="h-3.5 w-3.5" />
            Answer
          </button>
          <button
            type="button"
            onClick={() => commActions.dismissIncoming(ringing._id)}
            className="sm5-icon-btn h-9 w-9 shrink-0 !rounded-full"
            title="Dismiss for me (keeps ringing for teammates)"
            aria-label="Dismiss"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      )}

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
          calls={recentCalls}
          onCallEntry={handleCallEntry}
          onCall={() => void startCall()}
          canCall={Boolean(toE164(number)) && !activeCall && softphoneReady}
          softphoneReady={softphoneReady}
          inCall={Boolean(activeCall)}
          onMute={toggleMute}
          onHold={toggleHold}
          onHangup={hangup}
          nameFor={nameFor}
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