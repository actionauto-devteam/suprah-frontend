"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, History, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DriverLoadChange {
  id: string;
  createdAt: string | null;
  loadStatusAtChange: string | null;
  status: "pending" | "acknowledged" | "informational";
  acknowledgedAt: string | null;
  seenAt: string | null;
  changes: Array<{ field: string; label: string; before: string; after: string }>;
}

interface DriverLoadChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadReference: string;
  changes: DriverLoadChange[];
}

function formatWhen(value: string | null) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ change }: { change: DriverLoadChange }) {
  if (change.status === "pending") {
    return (
      <Badge className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300" variant="outline">
        <AlertTriangle className="size-3" /> Needs your acknowledgement
      </Badge>
    );
  }
  if (change.status === "acknowledged") {
    return (
      <Badge className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" variant="outline">
        <CheckCircle2 className="size-3" /> Acknowledged {change.acknowledgedAt ? formatWhen(change.acknowledgedAt) : ""}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300" variant="outline">
      <Info className="size-3" /> Info
    </Badge>
  );
}

/**
 * Every change Dispatch made to the driver's current load during this
 * assignment, newest first, with previous and updated values.
 */
export function DriverLoadChangesDialog({
  open,
  onOpenChange,
  loadReference,
  changes,
}: DriverLoadChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" /> Load changes
          </DialogTitle>
          <DialogDescription>
            {loadReference} — changes Dispatch made while this load is assigned to you, newest first.
          </DialogDescription>
        </DialogHeader>

        {changes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No changes have been made to this load.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {changes.map((change) => (
              <li key={change.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {formatWhen(change.createdAt)}
                    {change.loadStatusAtChange ? (
                      <span className="font-normal text-muted-foreground"> · while {change.loadStatusAtChange}</span>
                    ) : null}
                  </p>
                  <StatusBadge change={change} />
                </div>

                {change.status === "informational" && change.loadStatusAtChange === "Assigned" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Changed before you accepted. Dispatch reconfirms the assignment before you can accept it.
                  </p>
                ) : null}

                <div className="mt-3 space-y-2">
                  {change.changes.map((item, index) => (
                    <div key={`${change.id}-${item.field}-${index}`} className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <p className="text-xs font-black uppercase tracking-wide">{item.label || "Load Details"}</p>
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="font-bold text-muted-foreground">Previous</p>
                          <p className="mt-0.5 break-words leading-relaxed text-foreground/80 [overflow-wrap:anywhere]">
                            {item.before || "Not set"}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-amber-700 dark:text-amber-300">Updated</p>
                          <p className="mt-0.5 break-words leading-relaxed text-foreground [overflow-wrap:anywhere]">
                            {item.after || "Not set"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
