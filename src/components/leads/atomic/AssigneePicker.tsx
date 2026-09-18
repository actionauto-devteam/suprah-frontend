"use client";

import * as React from "react";
import { Check, UserRound, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTeamMembers } from "@/hooks/useTeamPulse";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

interface AssigneePickerProps {
  currentAssignedTo?: string | null;
  onAssign: (userId: string | null) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function AssigneePicker({
  currentAssignedTo,
  onAssign,
  disabled,
  className,
}: AssigneePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { data: members = [] } = useTeamMembers();
  const { userId: currentUserId } = useAuth();

  const currentMember = React.useMemo(
    () => members.find((member) => member._id === currentAssignedTo),
    [members, currentAssignedTo]
  );

  const handlePick = async (userId: string | null) => {
    if ((userId || null) === (currentAssignedTo || null)) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onAssign(userId);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50",
            className
          )}
        >
          <UserRound className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{currentMember ? currentMember.name : "Unassigned"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5" align="start">
        <div className="max-h-64 overflow-y-auto">
          {currentUserId ? (
            <button
              type="button"
              onClick={() => void handlePick(currentUserId)}
              disabled={saving}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                currentAssignedTo === currentUserId && "bg-muted font-semibold"
              )}
            >
              <span>Assign to me</span>
              {currentAssignedTo === currentUserId ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          ) : null}

          {currentAssignedTo ? (
            <button
              type="button"
              onClick={() => void handlePick(null)}
              disabled={saving}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              Unassign
            </button>
          ) : null}

          <div className="my-1 border-t border-border" />

          {members.map((member) => (
            <button
              key={member._id}
              type="button"
              onClick={() => void handlePick(member._id)}
              disabled={saving}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                currentAssignedTo === member._id && "bg-muted font-semibold"
              )}
            >
              <span className="truncate">{member.name}</span>
              {currentAssignedTo === member._id ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          ))}

          {members.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No team members found</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
