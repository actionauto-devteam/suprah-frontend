"use client";

import * as React from "react";
import type { Socket } from "socket.io-client";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Layers,
  Loader2,
  MessageSquare,
  Paperclip,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  TaskStatusBadge,
  STATUS_CONFIG,
  type ProjectTaskStatus,
} from "@/components/project/task-status-badge";
import { PriorityIcon, type ProjectTaskPriority } from "@/components/project/task-priority-badge";
import { TaskDetailDialog, errMsg, fmtDate } from "@/components/project/task-detail-dialog";

const PAGE_SIZE = 10;

type MyTask = {
  _id: string;
  title: string;
  status: ProjectTaskStatus;
  priority?: ProjectTaskPriority | null;
  startDate?: string | null;
  deadline?: string | null;
  completedAt?: string | null;
  createdAt: string;
  commentCount: number;
  attachmentCount: number;
  groupName: string;
  folderName: string;
  assigneeIds?: Array<{ _id: string; fullName?: string; username?: string; avatar?: string | null }>;
};

type SortOption = {
  label: string;
  sortBy: "createdAt" | "deadline" | "title" | "group" | "priority";
  sortDir: "asc" | "desc";
};

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest created", sortBy: "createdAt", sortDir: "desc" },
  { label: "Oldest created", sortBy: "createdAt", sortDir: "asc" },
  { label: "Priority (urgent first)", sortBy: "priority", sortDir: "asc" },
  { label: "Deadline (soonest first)", sortBy: "deadline", sortDir: "asc" },
  { label: "Title (A–Z)", sortBy: "title", sortDir: "asc" },
  { label: "Project group (A–Z)", sortBy: "group", sortDir: "asc" },
];

type GroupOption = "none" | "group" | "assignee" | "status";

const assigneeLabel = (t: MyTask) => {
  const names = (t.assigneeIds || []).map((a) => a.fullName || a.username || "").filter(Boolean);
  return names.length > 0 ? names.join(", ") : "Unassigned";
};

function TaskRow({
  task,
  isCompletedView,
  now,
  onOpen,
}: {
  task: MyTask;
  isCompletedView: boolean;
  now: number;
  onOpen: () => void;
}) {
  const overdue = !isCompletedView && task.deadline && new Date(task.deadline).getTime() < now;
  return (
    <button
      onClick={onOpen}
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <TaskStatusBadge status={task.status} />
      {(task.priority === "urgent" || task.priority === "high") && (
        <PriorityIcon priority={task.priority} className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="min-w-0 flex-1 basis-52">
        <span
          className={cn(
            "block truncate text-xs font-medium",
            isCompletedView && "text-muted-foreground/70 line-through decoration-border",
          )}
        >
          {task.title}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground/50">
          {task.groupName}
          {task.folderName ? ` · ${task.folderName}` : ""}
        </span>
      </span>

      {/* Start Date */}
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
        <Clock className="h-3 w-3" />
        {task.startDate ? `Start ${fmtDate(task.startDate)}` : "No start date"}
      </span>

      {/* Due Date */}
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px]",
          overdue ? "font-semibold text-rose-500" : "text-muted-foreground/60",
        )}
      >
        <CalendarDays className="h-3 w-3" />
        {task.deadline ? `Due ${fmtDate(task.deadline)}` : "No due date"}
      </span>

      {isCompletedView && task.completedAt && (
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          Done {fmtDate(task.completedAt)}
        </span>
      )}

      {task.attachmentCount > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Paperclip className="h-3 w-3" />
          {task.attachmentCount}
        </span>
      )}
      {task.commentCount > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <MessageSquare className="h-3 w-3" />
          {task.commentCount}
        </span>
      )}
    </button>
  );
}

export function MyTasksPanel({
  view,
  meId,
  socket,
}: {
  view: "active" | "completed";
  meId: string;
  socket?: Socket | null;
}) {
  const [tasks, setTasks] = React.useState<MyTask[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);
  const [sortIndex, setSortIndex] = React.useState(0);
  const [groupBy, setGroupBy] = React.useState<GroupOption>("none");
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const isCompletedView = view === "completed";
  const sort = SORT_OPTIONS[sortIndex];
  const now = Date.now();

  // `silent` refreshes (background socket activity, or the detail dialog's
  // own onChanged/onDeleted after a status/comment change the user already
  // sees reflected live) swap the data in place instead of blanking the list
  // behind a spinner — that full-panel flash is what read as "the whole page
  // refreshes" every time a task was touched.
  const load = React.useCallback(async (targetPage: number, opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/api/crm/projects/my-tasks", {
        params: {
          view,
          page: targetPage,
          limit: PAGE_SIZE,
          sortBy: sort.sortBy,
          sortDir: sort.sortDir,
        },
      });
      const data = res.data?.data;
      const list: MyTask[] = data?.tasks || [];
      const pages: number = data?.totalPages || 1;

      if (list.length === 0 && targetPage > 1) {
        return load(targetPage - 1, opts);
      }

      setTasks(list);
      setTotal(data?.total || 0);
      setTotalPages(pages);
      setPage(targetPage);
    } catch (err: any) {
      setError(errMsg(err, "Failed to load tasks."));
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }, [view, sort.sortBy, sort.sortDir]);

  React.useEffect(() => {
    load(1);
  }, [load]);

  // Live: any task/comment activity that might affect this cross-group list
  // reloads the current page (payloads don't carry enough to filter cheaply
  // against "is this actually one of my tasks") — silently, so a teammate's
  // update elsewhere doesn't flash a spinner over the list you're reading.
  React.useEffect(() => {
    if (!socket) return;
    const onChange = () => load(page, { silent: true });
    const events = [
      "pm:task:new", "pm:task:updated", "pm:task:status", "pm:task:deleted",
      "pm:comment:new", "pm:comment:deleted",
    ];
    events.forEach((e) => socket.on(e, onChange));
    return () => events.forEach((e) => socket.off(e, onChange));
  }, [socket, load, page]);

  // Reset to "None" when switching to a view where a chosen grouping no longer applies.
  React.useEffect(() => {
    if (isCompletedView && groupBy === "status") setGroupBy("none");
  }, [isCompletedView, groupBy]);

  const groupKeyOf = React.useCallback((t: MyTask): string => {
    if (groupBy === "group") return t.groupName || "No project group";
    if (groupBy === "assignee") return assigneeLabel(t);
    if (groupBy === "status") return STATUS_CONFIG[t.status]?.label || t.status;
    return "";
  }, [groupBy]);

  const sections = React.useMemo(() => {
    if (groupBy === "none") return null;
    const buckets = new Map<string, MyTask[]>();
    for (const t of tasks) {
      const key = groupKeyOf(t);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(t);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks, groupBy, groupKeyOf]);

  return (
    <div className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {isCompletedView ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <ClipboardList className="h-4 w-4 text-emerald-600" />
          )}
          <h2 className="text-sm font-bold tracking-tight">
            {isCompletedView ? "Completed Tasks" : "My Tasks"}
          </h2>
          <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70">
            {total}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:border-emerald-500/40 hover:text-emerald-600">
                <span className="hidden sm:inline">Sort: </span>{sort.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              {SORT_OPTIONS.map((opt, i) => (
                <DropdownMenuItem
                  key={opt.label}
                  onClick={() => setSortIndex(i)}
                  className="text-xs"
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:border-emerald-500/40 hover:text-emerald-600">
                <Layers className="h-3 w-3" />
                <span className="hidden sm:inline">Group: </span>{groupBy === "none" ? "None" : groupBy === "group" ? "Project group" : groupBy === "assignee" ? "Assignee" : "Status"}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuItem onClick={() => setGroupBy("none")} className="text-xs">
                None
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("group")} className="gap-2 text-xs">
                <Layers className="h-3.5 w-3.5 opacity-70" /> Project group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("assignee")} className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5 opacity-70" /> Assignee
              </DropdownMenuItem>
              {!isCompletedView && (
                <DropdownMenuItem onClick={() => setGroupBy("status")} className="gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 opacity-70" /> Status
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-xs text-muted-foreground/60">
              {isCompletedView
                ? "No completed tasks yet — finished tasks will move here automatically."
                : "You're all caught up! Tasks assigned to you will appear here."}
            </p>
          </div>
        ) : sections ? (
          <div className="divide-y divide-border/30">
            {sections.map(([key, sectionTasks]) => {
              const isCollapsed = collapsedGroups[key];
              return (
                <div key={key}>
                  <button
                    onClick={() =>
                      setCollapsedGroups((c) => ({ ...c, [key]: !c[key] }))
                    }
                    className="flex w-full items-center gap-2 bg-muted/20 px-4 py-2 text-left transition-colors hover:bg-muted/30"
                  >
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform", isCollapsed && "-rotate-90")}
                    />
                    <span className="text-[11px] font-semibold">{key}</span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {sectionTasks.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="divide-y divide-border/30">
                      {sectionTasks.map((task) => (
                        <TaskRow
                          key={task._id}
                          task={task}
                          isCompletedView={isCompletedView}
                          now={now}
                          onOpen={() => setOpenTaskId(task._id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {tasks.map((task) => (
              <TaskRow
                key={task._id}
                task={task}
                isCompletedView={isCompletedView}
                now={now}
                onOpen={() => setOpenTaskId(task._id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground/60">
              Page {page} of {totalPages} · {total} task{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="h-7 gap-1 rounded-lg border-border/50 px-2 text-[11px]"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button
                variant="outline"
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                className="h-7 gap-1 rounded-lg border-border/50 px-2 text-[11px]"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <TaskDetailDialog
        taskId={openTaskId}
        meId={meId}
        socket={socket}
        onClose={() => setOpenTaskId(null)}
        onChanged={() => load(page, { silent: true })}
        onDeleted={() => load(page, { silent: true })}
      />
    </div>
  );
}