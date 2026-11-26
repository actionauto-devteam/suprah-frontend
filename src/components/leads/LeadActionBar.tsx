"use client";

import * as React from "react";
import { CalendarDays, Phone, StickyNote } from "lucide-react";
import { LeadStatusSelect } from "./atomic/LeadStatusSelect";
import { AssigneePicker } from "./atomic/AssigneePicker";
import { assigneeIdOf } from "./useConfirmedAssign";
import { getLeadStatusStyle } from "@/lib/leadStatus";
import { cn } from "@/lib/utils";

const cell =
  "flex h-12 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 px-1 text-[10px] font-medium leading-tight text-slate-600 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:text-emerald-300";

export function LeadActionBar({
  status,
  assignedTo,
  onStatusChange,
  onAssign,
  onSchedule,
  onNote,
  noteActive,
  onCall,
  canCall,
}: {
  status: string;
  assignedTo: unknown;
  onStatusChange: (status: string) => void;
  onAssign: (userId: string | null) => Promise<void>;
  onSchedule: () => void;
  onNote?: () => void;
  noteActive: boolean;
  onCall: () => void;
  canCall: boolean;
}) {
  const statusStyle = getLeadStatusStyle(status);
  const owner = assigneeIdOf(assignedTo);

  return (
    <div
      className="grid grid-cols-5 gap-1.5 border-b border-slate-200 bg-white px-2 py-1.5 dark:border-emerald-400/10 dark:bg-[#0f1f19]"
      data-testid="lead-action-bar"
    >
      <LeadStatusSelect
        value={status}
        excludeCurrent
        onChange={onStatusChange}
        triggerIcon={<span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusStyle.dot)} />}
        triggerLabel={statusStyle.label}
        triggerClassName={cn(cell, "sm:h-12 sm:w-full sm:shrink sm:px-1 sm:text-[10px] [&>svg:last-child]:hidden")}
      />
      <AssigneePicker
        key={owner || "none"}
        currentAssignedTo={owner}
        onAssign={onAssign}
        className={cn(cell, "py-0 text-[10px] font-medium [&>span]:max-w-full")}
      />
      <button type="button" onClick={onSchedule} className={cell} data-testid="action-bar-schedule">
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="max-w-full truncate">Schedule</span>
      </button>
      <button
        type="button"
        onClick={onNote}
        disabled={!onNote}
        aria-pressed={noteActive}
        className={cn(cell, noteActive && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:border-amber-400/40 dark:text-amber-300")}
        data-testid="action-bar-note"
      >
        <StickyNote className="h-4 w-4 shrink-0" />
        <span className="max-w-full truncate">Note</span>
      </button>
      <button type="button" onClick={onCall} disabled={!canCall} className={cell} data-testid="action-bar-call">
        <Phone className="h-4 w-4 shrink-0" />
        <span className="max-w-full truncate">Call</span>
      </button>
    </div>
  );
}
