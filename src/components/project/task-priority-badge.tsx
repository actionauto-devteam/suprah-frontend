"use client";
import * as React from "react";
import { Ban, Check, ChevronDown, Flag, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ProjectTaskPriority = "urgent" | "high" | "normal" | "low";

export const PROJECT_TASK_PRIORITIES: ProjectTaskPriority[] = ["urgent", "high", "normal", "low"];

type PriorityConfig = {
  label: string;
  icon: LucideIcon;
  /** Icon-only tint (list rows, chips). */
  iconTint: string;
  /** Full chip background/border/text (selector trigger, detail header). */
  chip: string;
};

export const PRIORITY_CONFIG: Record<ProjectTaskPriority, PriorityConfig> = {
  urgent: {
    label: "Urgent",
    icon: Flag,
    iconTint: "fill-rose-500 text-rose-500",
    chip: "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400",
  },
  high: {
    label: "High",
    icon: Flag,
    iconTint: "fill-amber-500 text-amber-500",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  },
  normal: {
    label: "Normal",
    icon: Flag,
    iconTint: "fill-blue-500 text-blue-500",
    chip: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
  },
  low: {
    label: "Low",
    icon: Flag,
    iconTint: "fill-zinc-400 text-zinc-400",
    chip: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
  },
};

/** Bare colored flag — used in list rows to flag High/Urgent tasks at a glance. */
export function PriorityIcon({
  priority,
  className,
}: {
  priority: ProjectTaskPriority | null | undefined;
  className?: string;
}) {
  if (!priority) return null;
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;
  return (
    <span title={`${config.label} priority`} className="inline-flex shrink-0">
      <Icon className={cn("h-3 w-3", config.iconTint, className)} />
    </span>
  );
}

export function PriorityBadge({
  priority,
  size = "sm",
  className,
}: {
  priority: ProjectTaskPriority | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!priority) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap border-border/40 text-muted-foreground/50",
          size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
          className,
        )}
      >
        <Ban className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        No priority
      </span>
    );
  }
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.chip,
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", config.iconTint)} />
      {config.label}
    </span>
  );
}

export function PrioritySelect({
  priority,
  onChange,
  disabled,
  loading,
}: {
  priority: ProjectTaskPriority | null;
  onChange: (next: ProjectTaskPriority | null) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  if (disabled) {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title="Only the task creator, an assignee, or an admin can change priority"
      >
        <PriorityBadge priority={priority} size="md" />
        <Lock className="h-3 w-3 text-muted-foreground/50" />
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
            "hover:brightness-110 disabled:opacity-60",
            priority ? PRIORITY_CONFIG[priority].chip : "border-border/40 text-muted-foreground/60",
          )}
        >
          {priority ? (
            <PriorityIcon priority={priority} className="h-3.5 w-3.5" />
          ) : (
            <Ban className="h-3.5 w-3.5" />
          )}
          {priority ? PRIORITY_CONFIG[priority].label : "No priority"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 rounded-xl">
        {PROJECT_TASK_PRIORITIES.map((p) => {
          const config = PRIORITY_CONFIG[p];
          const Icon = config.icon;
          return (
            <DropdownMenuItem
              key={p}
              onClick={() => p !== priority && onChange(p)}
              className="gap-2 text-xs"
            >
              <Icon className={cn("h-3.5 w-3.5", config.iconTint)} />
              {config.label}
              {priority === p && <Check className="ml-auto h-3 w-3" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem onClick={() => onChange(null)} className="gap-2 text-xs">
          <Ban className="h-3.5 w-3.5 text-muted-foreground/60" />
          Clear
          {!priority && <Check className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
