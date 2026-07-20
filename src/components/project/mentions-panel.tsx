"use client";

/**
 * MentionsPanel — the "Mentions" tab in Project Management.
 *
 * Centralized, paginated inbox of every comment the logged-in user has been
 * @-mentioned in, newest first, via GET /api/crm/projects/mentions.
 * Each row shows the project group, task, who mentioned them, a relative
 * timestamp, and a preview of the comment. Selecting a row opens the task's
 * detail dialog and scrolls to + flashes the exact comment.
 */

import * as React from "react";
import { AtSign, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { TaskStatusBadge, type ProjectTaskStatus } from "@/components/project/task-status-badge";
import { TaskDetailDialog, errMsg, initials } from "@/components/project/task-detail-dialog";

const PAGE_SIZE = 15;

type MentionItem = {
  commentId: string;
  taskId: string;
  groupId: string;
  groupName: string;
  taskTitle: string;
  taskStatus?: ProjectTaskStatus;
  mentionedBy: string;
  mentionedByAvatar?: string | null;
  preview: string;
  createdAt: string;
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MentionsPanel({ meId }: { meId: string }) {
  const [items, setItems] = React.useState<MentionItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [openTarget, setOpenTarget] = React.useState<{
    taskId: string;
    commentId: string;
  } | null>(null);

  const load = React.useCallback(async (targetPage: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/api/crm/projects/mentions", {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      const data = res.data?.data;
      setItems(data?.mentions || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
      setPage(targetPage);
    } catch (err: any) {
      setError(errMsg(err, "Failed to load your mentions."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AtSign className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold tracking-tight">Mentions</h2>
          <span className="rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70">
            {total}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          Every comment you were mentioned in, newest first
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
        ) : items.length === 0 ? (
          <p className="px-6 py-12 text-center text-xs text-muted-foreground/60">
            No mentions yet — when a teammate @-mentions you in a task
            discussion, it will show up here.
          </p>
        ) : (
          <div className="divide-y divide-border/30">
            {items.map((m) => (
              <button
                key={m.commentId}
                onClick={() => setOpenTarget({ taskId: m.taskId, commentId: m.commentId })}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
              >
                <Avatar className="mt-0.5 h-7 w-7 shrink-0 ring-1 ring-border">
                  <AvatarImage
                    src={resolveImageUrl(m.mentionedByAvatar || undefined)}
                    alt={m.mentionedBy}
                  />
                  <AvatarFallback className="text-[9px]">
                    {initials(m.mentionedBy)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {m.groupName}
                    </span>
                    <span className="truncate text-xs font-semibold">{m.taskTitle}</span>
                    {m.taskStatus && <TaskStatusBadge status={m.taskStatus} size="sm" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {m.mentionedBy}
                    </span>{" "}
                    mentioned you {relTime(m.createdAt)}
                  </span>
                  {m.preview && (
                    <span className="mt-1 block truncate rounded-lg bg-muted/30 px-2.5 py-1.5 text-[11px] italic text-foreground/70">
                      “{m.preview}
                      {m.preview.length >= 140 ? "…" : ""}”
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-border/30 px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground/60">
              Page {page} of {totalPages} · {total} mention{total === 1 ? "" : "s"}
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

      {/* Deep-link: opens the task and flashes the exact mentioned comment. */}
      <TaskDetailDialog
        taskId={openTarget?.taskId ?? null}
        meId={meId}
        highlightCommentId={openTarget?.commentId ?? null}
        onClose={() => setOpenTarget(null)}
        onChanged={() => load(page)}
        onDeleted={() => load(page)}
      />
    </div>
  );
}