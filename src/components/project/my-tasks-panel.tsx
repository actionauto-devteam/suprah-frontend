"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { TaskStatusBadge, type ProjectTaskStatus } from "@/components/project/task-status-badge";
import { TaskDetailDialog, errMsg, fmtDate } from "@/components/project/task-detail-dialog";

const PAGE_SIZE = 10;

type MyTask = {
  _id: string;
  title: string;
  status: ProjectTaskStatus;
  startDate?: string | null;
  deadline?: string | null;
  completedAt?: string | null;
  createdAt: string;
  commentCount: number;
  attachmentCount: number;
  groupName: string;
  folderName: string;
};

export function MyTasksPanel({
  view,
  meId,
}: {
  view: "active" | "completed";
  meId: string;
}) {
  const [tasks, setTasks] = React.useState<MyTask[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);

  const load = React.useCallback(async (targetPage: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/api/crm/projects/my-tasks", {
        params: { view, page: targetPage, limit: PAGE_SIZE },
      });
      const data = res.data?.data;
      const list: MyTask[] = data?.tasks || [];
      const pages: number = data?.totalPages || 1;

      // If deleting/completing emptied the current page, step back one.
      if (list.length === 0 && targetPage > 1) {
        return load(targetPage - 1);
      }

      setTasks(list);
      setTotal(data?.total || 0);
      setTotalPages(pages);
      setPage(targetPage);
    } catch (err: any) {
      setError(errMsg(err, "Failed to load tasks."));
    } finally {
      setLoading(false);
    }
  }, [view]);

  React.useEffect(() => {
    load(1);
  }, [load]);

  const isCompletedView = view === "completed";
  const now = Date.now();

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
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
        <p className="text-[11px] text-muted-foreground/60">
          {isCompletedView
            ? "Tasks you finished, newest first"
            : "Everything assigned to you that isn't completed yet, newest first"}
        </p>
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
        ) : (
          <div className="divide-y divide-border/30">
            {tasks.map((task) => {
              const overdue =
                !isCompletedView &&
                task.deadline &&
                new Date(task.deadline).getTime() < now;
              return (
                <button
                  key={task._id}
                  onClick={() => setOpenTaskId(task._id)}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <TaskStatusBadge status={task.status} />
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
            })}
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
        onClose={() => setOpenTaskId(null)}
        onChanged={() => load(page)}
        onDeleted={() => load(page)}
      />
    </div>
  );
}