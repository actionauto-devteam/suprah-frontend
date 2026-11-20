"use client";

import * as React from "react";
import { Archive, ArrowRight, Loader2, Lock, LockOpen, Plus, Undo2 } from "lucide-react";
import { StatusReasonModal } from "./StatusReasonModal";
import { NOT_A_LEAD_STATUS } from "@/lib/leadStatus";

const MOVE_BACK_REASONS = ["Real customer", "Marked by mistake"];
import {
  errorMessage,
  getActiveLeadForClosedLead,
  startFreshLead,
  type ActiveLeadLookup,
  type ReviewLeadSummary,
} from "@/lib/api/leadIntake";

interface ClosedLeadComposerProps {
  leadId: string;
  status?: string;
  onOpenLead: (leadId: string) => void;
  onReopen: (reason: string) => void;
  onNotice: (type: "success" | "error" | "info", message: string) => void;
  linkedTo?: { leadId: string; name: string } | null;
}

function LeadButton({ lead, onOpen }: { lead: ReviewLeadSummary; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(lead._id)}
      className="flex h-8 max-w-full items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500"
    >
      <span className="truncate">Open active lead · {lead.name}</span>
      <span className="hidden shrink-0 opacity-80 sm:inline">({lead.status})</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

export function ClosedLeadComposer({ leadId, status, onOpenLead, onReopen, onNotice, linkedTo = null }: ClosedLeadComposerProps) {
  const [lookup, setLookup] = React.useState<ActiveLeadLookup | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [starting, setStarting] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const linkedLeadId = linkedTo?.leadId || "";
  const notALead = status === NOT_A_LEAD_STATUS;

  React.useEffect(() => {
    let cancelled = false;
    setLookup(null);
    if (linkedLeadId || notALead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getActiveLeadForClosedLead(leadId)
      .then((result) => {
        if (!cancelled) setLookup(result);
      })
      .catch(() => {
        if (!cancelled) setLookup({ leadClosed: true, status: "uncertain" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, linkedLeadId, notALead]);

  const handleFreshLead = async () => {
    setStarting(true);
    try {
      const result = await startFreshLead(leadId);
      if (result?.leadId) {
        onNotice("success", "A new lead was started for this customer.");
        onOpenLead(result.leadId);
      } else {
        onNotice("info", "This customer needs a quick review before a new lead is started. It's in Needs Review.");
      }
    } catch (error) {
      onNotice("error", errorMessage(error, "Couldn't start a new lead. Please try again."));
    } finally {
      setStarting(false);
    }
  };

  const activeLead = lookup && lookup.leadClosed && lookup.status === "single" ? lookup.lead : null;
  const candidates = lookup && lookup.leadClosed && lookup.status === "multiple" ? lookup.candidates : [];

  if (linkedLeadId) {
    const target = linkedTo?.name || "the customer's lead";
    return (
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-emerald-400/15 dark:bg-[#0f1f19] sm:px-5">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              This chat was added to {target}, so replies are turned off here.
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              New messages from this customer go to that lead.
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-6">
          <button
            type="button"
            onClick={() => onOpenLead(linkedLeadId)}
            className="flex h-8 max-w-full items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            <span className="truncate">Open {target}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  if (notALead) {
    return (
      <>
        <div
          className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-emerald-400/15 dark:bg-[#0f1f19] sm:px-5"
          data-testid="not-a-lead-composer"
        >
          <div className="flex items-start gap-2">
            <Archive className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                This is in Others because it was marked Not a lead, so replies are turned off here.
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                It is not counted as a lead. If this is a real customer, move it back to leads.
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-6">
            <button
              type="button"
              onClick={() => setReopenOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Move back to leads
            </button>
          </div>
        </div>

        <StatusReasonModal
          open={reopenOpen}
          onOpenChange={setReopenOpen}
          title="Move back to leads"
          description="This puts it back in the leads list as a new lead, and it counts as a lead again. Why is it a real lead?"
          confirmLabel="Move back"
          quickReasons={MOVE_BACK_REASONS}
          onConfirm={(reason) => {
            setReopenOpen(false);
            onReopen(reason);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-emerald-400/15 dark:bg-[#0f1f19] sm:px-5">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              This lead is {status ? `marked ${status}` : "closed"}, so replies are turned off here.
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {loading
                ? "Checking for this customer's active lead…"
                : activeLead
                  ? "New messages from this customer go to their active lead."
                  : candidates.length
                    ? "This customer has more than one active lead. Pick the right one."
                    : lookup && lookup.leadClosed && lookup.status === "uncertain"
                      ? "We can't safely tell which lead is active for this customer. An admin can sort it out in Needs Review."
                      : "This customer has no active lead right now."}
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
        </div>

        {!loading && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-6">
            {activeLead && <LeadButton lead={activeLead} onOpen={onOpenLead} />}
            {candidates.map((candidate) => (
              <LeadButton key={candidate._id} lead={candidate} onOpen={onOpenLead} />
            ))}
            {lookup && lookup.leadClosed && lookup.status === "none" && (
              <button
                type="button"
                onClick={() => void handleFreshLead()}
                disabled={starting}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Start a new lead
              </button>
            )}
            <button
              type="button"
              onClick={() => setReopenOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              <LockOpen className="h-3.5 w-3.5" />
              Reopen this lead
            </button>
          </div>
        )}
      </div>

      <StatusReasonModal
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen this lead"
        description="Why is this lead being reopened? This is saved on the lead for the team to see later."
        confirmLabel="Reopen lead"
        onConfirm={(reason) => {
          setReopenOpen(false);
          onReopen(reason);
        }}
      />
    </>
  );
}
