"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Navigation2, Send, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const REASONS = [
  ["vehicle_issue", "Vehicle / equipment issue"],
  ["personal_emergency", "Personal emergency"],
  ["route_issue", "Route / travel issue"],
  ["load_issue", "Load / vehicle issue"],
  ["safety_concern", "Safety concern"],
  ["other", "Other"],
] as const;

interface DriverReleaseLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: any | null;
  isSubmitting?: boolean;
  onSubmit: (
    load: any,
    request: {
      reason: string;
      message: string;
      priority: "standard" | "emergency";
    },
  ) => Promise<void> | void;
}

export function DriverReleaseLoadDialog({
  open,
  onOpenChange,
  load,
  isSubmitting = false,
  onSubmit,
}: DriverReleaseLoadDialogProps) {
  const [reason, setReason] = React.useState("");
  const [message, setMessage] = React.useState("");

  const isEmergencyLifecycle = ["Picked Up", "In-Transit"].includes(
    String(load?.status ?? ""),
  );
  const loadLabel =
    load?.loadNumber || load?.trackingNumber || (load?._id ? String(load._id) : "this load");

  React.useEffect(() => {
    if (!open) return;
    setReason("");
    setMessage("");
  }, [open, load?._id]);

  const submit = async () => {
    if (!load || !reason || isSubmitting) return;
    await onSubmit(load, {
      reason,
      message: message.trim(),
      priority: isEmergencyLifecycle ? "emergency" : "standard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg p-0 overflow-hidden">
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3 pr-7">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black">
                {isEmergencyLifecycle ? "Request Emergency Release" : "Request Load Release"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed sm:text-sm">
                Request Dispatch review for {loadLabel}. This does not immediately remove the load from your account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-3.5 text-xs leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p>
                Dispatch has final authority over the load record. The load stays assigned to you until the responsible dispatcher or an organization administrator approves a return or reassignment.
              </p>
            </div>
          </div>

          {["Accepted", "Picked Up", "In-Transit"].includes(String(load?.status ?? "")) && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5 text-xs leading-relaxed text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <Navigation2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p>
                  Location sharing remains required while this accepted active load stays assigned. If this is an emergency, stop driving safely as needed and contact Dispatch; this request does not require you to continue driving while waiting for a decision.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="release-reason" className="text-xs font-bold">Reason</label>
            <select
              id="release-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={isSubmitting}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a reason</option>
              {REASONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="release-message" className="text-xs font-bold">
              Details <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="release-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 1500))}
              disabled={isSubmitting}
              rows={4}
              placeholder="Give Dispatch any information needed to make the decision."
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-right text-[10px] text-muted-foreground">{message.length}/1500</p>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isSubmitting || !reason} className="gap-2">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {isSubmitting ? "Sending..." : "Send Request to Dispatch"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}