"use client";
import * as React from "react";
import {
  Lightbulb,
  Circle,
  Timer,
  Archive,
  Rocket,
  CheckCircle2,
  ChevronDown,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ProjectTaskStatus =
  | "ideation"
  | "todo"
  | "in-progress"
  | "backlog"
  | "to-deploy"
  | "completed";

export const PROJECT_TASK_STATUSES: ProjectTaskStatus[] = [
  "ideation",
  "todo",
  "in-progress",
  "backlog",
  "to-deploy",
  "completed",
];

type StatusConfig = {
  label: string;
  icon: LucideIcon;
  /** Chip styling: bg / text / border / dot, light + dark aware. */
  chip: string;
  dot: string;
};

export const STATUS_CONFIG: Record<ProjectTaskStatus, StatusConfig> = {
  ideation: {
    label: "Ideation",
    icon: Lightbulb,
    chip: "bg-yellow-500/10 text-yellow-700 border-yellow-500/25 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  todo: {
    label: "To Do",
    icon: Circle,
    chip: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
  "in-progress": {
    label: "In Progress",
    icon: Timer,
    chip: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  backlog: {
    label: "Backlog",
    icon: Archive,
    chip: "bg-orange-500/10 text-orange-700 border-orange-500/25 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  "to-deploy": {
    label: "To Deploy",
    icon: Rocket,
    chip: "bg-purple-500/10 text-purple-700 border-purple-500/25 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

/* ── Read-only badge — task cards, lists, detail headers ─────────────────── */

export function TaskStatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: ProjectTaskStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo;
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
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
    </span>
  );
}

/* ── Plain colored dot — compact indicators (calendar, kanban headers) ───── */

export function TaskStatusDot({
  status,
  className,
}: {
  status: ProjectTaskStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo;
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full shrink-0", config.dot, className)}
      title={config.label}
    />
  );
}

/* ── Interactive selector — task detail view ─────────────────────────────── */

/**
 * Status dropdown. When `disabled`, renders the read-only badge with a lock
 * hint instead — the real permission check lives on the backend
 * (PATCH /tasks/:id/status → creator or assignee only); this only mirrors it.
 */
export function TaskStatusSelect({
  status,
  onChange,
  disabled,
  loading,
}: {
  status: ProjectTaskStatus;
  onChange: (next: ProjectTaskStatus) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1.5" title="Only the task creator or assignee can change the status">
        <TaskStatusBadge status={status} size="md" />
        <Lock className="h-3 w-3 text-muted-foreground/50" />
      </span>
    );
  }

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.todo;
  const Icon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
            "hover:brightness-110 disabled:opacity-60",
            config.chip,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {config.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 rounded-xl">
        {PROJECT_TASK_STATUSES.map((s) => {
          const c = STATUS_CONFIG[s];
          const ItemIcon = c.icon;
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => s !== status && onChange(s)}
              className="gap-2 text-xs"
            >
              <span className={cn("h-2 w-2 rounded-full", c.dot)} />
              <ItemIcon className="h-3.5 w-3.5 opacity-70" />
              {c.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}