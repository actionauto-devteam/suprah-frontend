"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, linkUnverifiedLead } from "@/lib/api/leadIntake";
import { LeadSearchPicker, type PickedLead } from "./LeadSearchPicker";

export function LinkLeadDialog({
  open,
  onOpenChange,
  leadId,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onLinked: (targetLeadId: string) => void;
}) {
  const [target, setTarget] = React.useState<PickedLead | null>(null);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const excludeIds = React.useMemo(() => [leadId], [leadId]);

  React.useEffect(() => {
    if (!open) {
      setTarget(null);
      setNote("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    if (!target) {
      setError("Pick the lead this chat belongs to.");
      return;
    }
    if (!note.trim()) {
      setError("Please note how you confirmed it's the same customer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await linkUnverifiedLead(leadId, target._id, note.trim());
      onOpenChange(false);
      onLinked(result?.leadId || target._id);
    } catch (err) {
      setError(errorMessage(err, "Couldn't link the chat. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link this chat to a lead</DialogTitle>
          <DialogDescription>
            Only do this after you&apos;ve confirmed the visitor is the same customer, for example by calling them. The chat moves to that lead and this record is closed.
          </DialogDescription>
        </DialogHeader>
        <LeadSearchPicker value={target} onChange={setTarget} excludeIds={excludeIds} />
        {target && (
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            Linking to <strong className="text-slate-700 dark:text-slate-200">{target.name}</strong> ({target.status})
          </p>
        )}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="How did you confirm it's the same customer?"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-emerald-400 dark:border-emerald-400/20 dark:bg-[#0a1410]"
        />
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
            disabled={saving}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Link chat
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
