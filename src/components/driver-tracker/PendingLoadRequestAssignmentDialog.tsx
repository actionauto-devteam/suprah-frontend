"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PendingLoadRequestAssignmentRequester {
  driverId: string;
  driverName: string;
  requestedAt: string | null;
  selected: boolean;
}

export interface PendingLoadRequestAssignmentConflict {
  type: "pending_load_request_assignment_confirmation";
  loadId: string;
  loadNumber: string;
  fingerprint: string;
  selectedDriverId: string;
  selectedDriverName: string;
  selectedDriverRequested: boolean;
  creatorDispatcherId: string | null;
  creatorDispatcherName: string | null;
  pendingRequesters: PendingLoadRequestAssignmentRequester[];
}

interface PendingLoadRequestAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: PendingLoadRequestAssignmentConflict | null;
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
}

function requestedAtLabel(value: string | null) {
  if (!value) return "Pending request";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending request";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PendingLoadRequestAssignmentDialog({
  open,
  onOpenChange,
  conflict,
  isSubmitting = false,
  onConfirm,
}: PendingLoadRequestAssignmentDialogProps) {
  if (!conflict) return null;

  const otherRequestCount = conflict.pendingRequesters.filter(
    (requester) => !requester.selected,
  ).length;

  const consequence = conflict.selectedDriverRequested
    ? otherRequestCount > 0
      ? `This will fulfill ${conflict.selectedDriverName}'s request and mark ${otherRequestCount} other pending request${otherRequestCount === 1 ? "" : "s"} as not selected.`
      : `This will fulfill ${conflict.selectedDriverName}'s pending request instead of silently cancelling it.`
    : `This will assign the load to ${conflict.selectedDriverName}. All ${conflict.pendingRequesters.length} pending request${conflict.pendingRequesters.length === 1 ? "" : "s"} will be marked not selected.`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" />
            <span className="text-xs font-black uppercase tracking-[0.16em]">
              Pending Load Request
            </span>
          </div>
          <DialogTitle>Confirm Assignment</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Load <strong>{conflict.loadNumber}</strong> already has active driver
            {conflict.pendingRequesters.length === 1 ? " request" : " requests"}.
            Assignment is allowed, but each request must receive an explicit outcome.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3.5">
          <p className="text-sm font-bold text-foreground">{consequence}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Affected drivers and the dispatcher responsible for this requested load
            will be notified about the final assignment outcome.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            Pending Requests
          </p>

          {conflict.pendingRequesters.map((requester) => (
            <div
              key={requester.driverId}
              className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3 ${
                requester.selected
                  ? "border-emerald-500/25 bg-emerald-500/[0.05]"
                  : "border-red-500/20 bg-red-500/[0.04]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    requester.selected
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}
                >
                  {requester.selected ? (
                    <UserRoundCheck className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                    {requester.driverName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {requestedAtLabel(requester.requestedAt)}
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={
                  requester.selected
                    ? "shrink-0 border-emerald-500/25 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                    : "shrink-0 border-red-500/25 bg-red-500/10 text-[10px] text-red-700 dark:text-red-400"
                }
              >
                {requester.selected ? (
                  <CheckCircle2 className="mr-1 size-3" />
                ) : (
                  <XCircle className="mr-1 size-3" />
                )}
                {requester.selected ? "Will be fulfilled" : "Not selected"}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : conflict.selectedDriverRequested ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertTriangle className="size-4" />
            )}
            {isSubmitting
              ? "Assigning…"
              : conflict.selectedDriverRequested
                ? "Assign & Fulfill Request"
                : "Assign to Another Driver"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}