"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, mergeLeads } from "@/lib/api/leadIntake";
import { LeadSearchPicker, type PickedLead } from "./LeadSearchPicker";

export function MergeLeadDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onMerged: () => void;
}) {
  const [other, setOther] = React.useState<PickedLead | null>(null);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const excludeIds = React.useMemo(() => [leadId], [leadId]);

  React.useEffect(() => {
    if (!open) {
      setOther(null);
      setNote("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    if (!other) {
      setError("Pick the other card for this customer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await mergeLeads(leadId, other._id, note.trim() || undefined);
      onOpenChange(false);
      onMerged();
    } catch (err) {
      setError(errorMessage(err, "Couldn't merge the leads. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[120] w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto" overlayClassName="z-[120]" data-testid="merge-lead-dialog">
        <DialogHeader>
          <DialogTitle>Merge another card into this one</DialogTitle>
          <DialogDescription>
            Use this when two cards are the same customer. You keep this card ({leadName}). The other card is closed and its messages show here under Earlier conversations. Its upcoming appointments and Anna&apos;s open tasks move here, and its phone or email is added here if this card has none.
          </DialogDescription>
        </DialogHeader>
        <LeadSearchPicker value={other} onChange={setOther} excludeIds={excludeIds} />
        {other && (
          <p className="text-[12px] text-slate-500 dark:text-slate-400" data-testid="merge-lead-summary">
            Merging <strong className="text-slate-700 dark:text-slate-200">{other.name}</strong> ({other.status}) into <strong className="text-slate-700 dark:text-slate-200">{leadName}</strong>
          </p>
        )}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Why these are the same customer (optional)"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-emerald-400 dark:border-emerald-400/20 dark:bg-[#0a1410]"
        />
        <p className="text-[11px] text-slate-400 dark:text-slate-500">An admin can undo this from the card you keep.</p>
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !other}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            data-testid="merge-lead-confirm"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Merge cards
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
