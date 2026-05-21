"use client";

import * as React from "react";
import { UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OffboardUser {
  _id: string;
  fullName: string;
  role: string;
}

interface OffboardModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  user: OffboardUser | null;
  onOffboarded?: () => void;
}

const CHECKLIST = [
  "Access credentials have been revoked or will be revoked immediately.",
  "Company equipment and assets have been or will be returned.",
  "Outstanding tasks and handovers have been completed.",
  "Final payroll and benefits have been reviewed.",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function OffboardModal({
  open,
  onClose,
  token,
  user,
  onOffboarded,
}: OffboardModalProps) {
  const [confirmed, setConfirmed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const handleClose = () => {
    if (submitting) return;
    setConfirmed(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !confirmed || submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/crm/users/${user._id}/offboard`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`${user.fullName} has been offboarded.`);
      onOffboarded?.();
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Failed to offboard user. Try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/40 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <UserMinus className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold">
                Offboard Employee
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground/50 mt-0.5">
                {user?.fullName
                  ? `Offboarding ${user.fullName}`
                  : "Review checklist before proceeding."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Warning */}
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
            <p className="text-xs font-semibold text-amber-600">
              This action deactivates the account permanently.
            </p>
            <p className="text-[11px] text-amber-600/70 mt-0.5 leading-relaxed">
              The employee will lose CRM access immediately. This cannot be
              undone from the UI.
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Offboarding Checklist
            </p>
            <ul className="space-y-2">
              {CHECKLIST.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px] font-bold text-amber-600">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground/80 leading-relaxed transition-colors">
              I confirm that all offboarding steps above have been reviewed and
              this employee should be offboarded.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 h-10 rounded-xl text-sm font-semibold border-border/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!confirmed || submitting}
            className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold shadow-md shadow-amber-500/20 gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Offboarding…
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4" /> Offboard Employee
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
