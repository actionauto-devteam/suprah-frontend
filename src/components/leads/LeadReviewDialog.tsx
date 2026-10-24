"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Inbox, Loader2, Mail, MessageCircle, MessageSquare, Phone, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  errorMessage,
  getIntakeControl,
  getLeadReviews,
  resolveLeadReview,
  setIntakeControl,
  type IntakeMode,
  type LeadReviewItem,
  type ReviewResolution,
} from "@/lib/api/leadIntake";
import { LeadSearchPicker, type PickedLead } from "./LeadSearchPicker";

const REASONS: Record<string, string> = {
  multiple_active_leads: "This phone number or email belongs to more than one open lead.",
  lookup_incomplete: "We couldn't finish checking for matching leads.",
  identity_ambiguous: "These contact details match more than one customer.",
  reply_after_lead_closed: "The customer replied to an email from a lead that is closed.",
  reply_without_open_lead: "An email reply arrived, but no open lead matches it.",
  email_after_lead_closed: "A customer whose lead is closed sent a new email.",
  context_conflicts_with_contact: "The email thread and the contact details point to different leads.",
  context_differs_from_contact_match: "The email thread and the contact details point to different leads.",
  unknown_lead_status: "A matching lead has a status we don't recognize.",
  processing_failed: "We couldn't file this inquiry automatically after several tries.",
  unverified_contact_kept_separate: "A website chat visitor typed contact details that match an open lead. They weren't verified, so the chat was kept separate.",
};

const RESOLUTION_LABELS: Record<string, string> = {
  associated: "Added to a lead",
  created_lead: "New lead created",
  not_customer_inquiry: "Not a customer inquiry",
  kept_separate: "Kept separate",
};

const timeFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const formatTime = (value?: string | null) => {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : timeFormat.format(date);
};

const channelIcon = (channel?: string | null) =>
  channel === "sms" ? MessageSquare : channel === "phone" || channel === "call" ? Phone : channel === "webchat" ? MessageCircle : Mail;

function ReviewCard({
  item,
  canResolve,
  onResolved,
  onOpenLead,
}: {
  item: LeadReviewItem;
  canResolve: boolean;
  onResolved: () => void;
  onOpenLead: (leadId: string) => void;
}) {
  const possibleMatch = item.review.kind === "possible_match";
  const [target, setTarget] = React.useState<PickedLead | null>(
    item.candidates.length === 1 ? { _id: item.candidates[0]._id, name: item.candidates[0].name, status: item.candidates[0].status } : null,
  );
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<ReviewResolution | null>(null);
  const [error, setError] = React.useState("");
  const Icon = channelIcon(item.channel);
  const resolved = item.review.state === "resolved";

  const submit = async (resolution: ReviewResolution) => {
    if (resolution === "associate" && !target) {
      setError("Pick the lead this belongs to first.");
      return;
    }
    setBusy(resolution);
    setError("");
    try {
      await resolveLeadReview(item.inquiryId, {
        resolution,
        leadId: resolution === "associate" ? target?._id : undefined,
        note: note.trim() || undefined,
      });
      onResolved();
    } catch (err) {
      setError(errorMessage(err, "This couldn't be saved. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const excludeIds = React.useMemo(() => (item.lead ? [item.lead._id] : []), [item.lead]);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-emerald-400/15 dark:bg-[#0f1f19]">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {item.contact.name || item.contact.phone || item.contact.email || "Unknown customer"}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {[item.contact.phone, item.contact.email, item.source, formatTime(item.receivedAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {REASONS[item.review.reason || ""] || "This inquiry needs a person to decide where it belongs."}
      </p>

      {(item.subject || item.message) && (
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap [overflow-wrap:anywhere] text-[13px] text-slate-700 dark:text-slate-200">
          {item.subject ? `${item.subject} — ` : ""}
          {item.message}
        </p>
      )}

      {item.lead && (
        <button
          type="button"
          onClick={() => onOpenLead(item.lead!._id)}
          className="mt-2 flex items-center gap-1 text-[12px] font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <ExternalLink className="h-3 w-3" />
          Open the chat lead ({item.lead.status})
        </button>
      )}

      {resolved ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          {RESOLUTION_LABELS[item.review.resolution || ""] || "Handled"}
          {item.review.resolvedBy?.name ? ` by ${item.review.resolvedBy.name}` : ""}
          {item.review.resolvedAt ? ` · ${formatTime(item.review.resolvedAt)}` : ""}
          {item.review.note ? ` · "${item.review.note}"` : ""}
        </p>
      ) : canResolve ? (
        <div className="mt-3 space-y-2.5">
          {item.candidates.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {possibleMatch ? "Possible match" : "Matching open leads"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.candidates.map((candidate) => (
                  <button
                    key={candidate._id}
                    type="button"
                    onClick={() => setTarget({ _id: candidate._id, name: candidate.name, status: candidate.status })}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[12px]",
                      target?._id === candidate._id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-emerald-400/15 dark:text-slate-300",
                    )}
                  >
                    {candidate.name} · {candidate.status}
                  </button>
                ))}
              </div>
            </div>
          )}
          <LeadSearchPicker value={target} onChange={setTarget} excludeIds={excludeIds} />
          {target && (
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Selected: <strong className="text-slate-700 dark:text-slate-200">{target.name}</strong> ({target.status})
            </p>
          )}
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Note for the team (optional)"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-emerald-400 dark:border-emerald-400/20 dark:bg-[#0a1410]"
          />
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submit("associate")}
              disabled={Boolean(busy)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy === "associate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {possibleMatch ? "Same person — link the chat to this lead" : "Add to the selected lead"}
            </button>
            <button
              type="button"
              onClick={() => void submit(possibleMatch ? "keep_separate" : "create_lead")}
              disabled={Boolean(busy)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {(busy === "keep_separate" || busy === "create_lead") && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {possibleMatch ? "Different person — keep separate" : "Create a new lead"}
            </button>
            <button
              type="button"
              onClick={() => void submit("not_customer_inquiry")}
              disabled={Boolean(busy)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {busy === "not_customer_inquiry" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Not a customer inquiry
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
          Only an admin or an approved manager can decide where this belongs.
        </p>
      )}
    </li>
  );
}

const MODE_OPTIONS: Array<{ value: IntakeMode; label: string; help: string }> = [
  { value: "off", label: "Off", help: "Leads are handled the way they are today." },
  { value: "active", label: "On", help: "New inquiries join the customer's open lead, closed leads get a fresh lead, and unclear cases come here." },
  { value: "paused", label: "Paused", help: "New inquiries are saved and held. They are filed when you turn this back on." },
];

function IntakeSwitch() {
  const [control, setControl] = React.useState<{ mode: IntakeMode; canManage: boolean; heldEvents?: number | null } | null>(null);
  const [mode, setMode] = React.useState<IntakeMode>("off");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    getIntakeControl()
      .then((data) => {
        setControl({ mode: data.mode, canManage: data.canManage, heldEvents: data.heldEvents });
        setMode(data.mode);
      })
      .catch(() => setControl(null));
  }, []);

  if (!control?.canManage) return null;

  const save = async () => {
    if (!reason.trim()) {
      setMessage("Please add a short reason.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await setIntakeControl(mode, reason.trim());
      setControl((previous) => ({ mode: result.mode, canManage: true, heldEvents: previous?.heldEvents }));
      setReason("");
      setMessage("Saved.");
    } catch (err) {
      setMessage(errorMessage(err, "Couldn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3.5 dark:border-emerald-400/15">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        Automatic lead matching (admins only)
      </p>
      {Boolean(control.heldEvents) && (
        <p className="mt-1 text-[12px] text-amber-700 dark:text-amber-300">
          {control.heldEvents} {control.heldEvents === 1 ? "inquiry is" : "inquiries are"} saved and waiting to be filed. They are filed when matching is On.
        </p>
      )}
      <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={cn(
              "rounded-lg border px-2.5 py-2 text-left",
              mode === option.value
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-400/10"
                : "border-slate-200 hover:bg-slate-50 dark:border-emerald-400/15 dark:hover:bg-emerald-400/5",
            )}
          >
            <span className="block text-[12px] font-semibold text-slate-700 dark:text-slate-200">
              {option.label}
              {control.mode === option.value ? " (current)" : ""}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">{option.help}</span>
          </button>
        ))}
      </div>
      {mode !== control.mode && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            placeholder="Reason for the change (saved permanently)"
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-emerald-400 dark:border-emerald-400/20 dark:bg-[#0a1410]"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </div>
      )}
      {message && <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{message}</p>}
    </div>
  );
}

export function LeadReviewDialog({
  open,
  onOpenChange,
  onOpenLead,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLead: (leadId: string) => void;
  onChanged?: () => void;
}) {
  const [tab, setTab] = React.useState<"pending" | "resolved">("pending");
  const [items, setItems] = React.useState<LeadReviewItem[]>([]);
  const [canResolve, setCanResolve] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLeadReviews(tab);
      setItems(data?.items || []);
      setCanResolve(Boolean(data?.canResolve));
    } catch (err) {
      setError(errorMessage(err, "Couldn't load the review list."));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-emerald-500" />
            Needs review
          </DialogTitle>
          <DialogDescription>
            Inquiries we couldn&apos;t safely match to a lead on our own. Nothing here is guessed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5">
          {(["pending", "resolved"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold",
                tab === value
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {value === "pending" ? "Waiting" : "Handled"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-[13px] text-red-500">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
            {tab === "pending" ? "Nothing needs review right now." : "Nothing has been handled yet."}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <ReviewCard
                key={item.inquiryId}
                item={item}
                canResolve={canResolve}
                onOpenLead={(leadId) => {
                  onOpenChange(false);
                  onOpenLead(leadId);
                }}
                onResolved={() => {
                  void load();
                  onChanged?.();
                }}
              />
            ))}
          </ul>
        )}

        <IntakeSwitch />
      </DialogContent>
    </Dialog>
  );
}
