"use client";

/**
 * NotificationsBell — the Project Management notification center.
 *
 * Bell button (with the live unread badge from ProjectNotificationContext)
 * that opens a dropdown of recent notifications from
 * GET /api/crm/projects/notifications: assignments, comments, mentions,
 * status changes, edits, group adds, and deadline reminders.
 *
 * Clicking an item marks it read and opens the related task directly —
 * mention notifications additionally deep-link to (and flash) the exact
 * comment. Real-time: the badge updates via the pm:notification socket
 * event / polling in the context; reopening the panel refetches the list.
 */

import * as React from "react";
import type { Socket } from "socket.io-client";
import {
  AtSign,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Pencil,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useProjectNotifications } from "@/context/ProjectNotificationContext";
import { TaskDetailDialog } from "@/components/project/task-detail-dialog";

type Notification = {
  _id: string;
  type:
  | "task_assigned"
  | "task_comment"
  | "task_status"
  | "task_updated"
  | "group_added"
  | "task_mention"
  | "task_deadline";
  title: string;
  message: string;
  taskId?: string | null;
  commentId?: string | null;
  actorName: string;
  readAt?: string | null;
  createdAt: string;
};

const TYPE_ICON: Record<Notification["type"], React.ElementType> = {
  task_assigned: UserPlus,
  task_comment: MessageSquare,
  task_status: CheckCircle2,
  task_updated: Pencil,
  group_added: Users,
  task_mention: AtSign,
  task_deadline: CalendarClock,
};

const TYPE_TINT: Record<Notification["type"], string> = {
  task_assigned: "text-emerald-600 bg-emerald-500/10",
  task_comment: "text-sky-600 bg-sky-500/10",
  task_status: "text-violet-600 bg-violet-500/10",
  task_updated: "text-zinc-500 bg-zinc-500/10",
  group_added: "text-teal-600 bg-teal-500/10",
  task_mention: "text-amber-600 bg-amber-500/10",
  task_deadline: "text-rose-600 bg-rose-500/10",
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
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationsBell({ meId, socket }: { meId: string; socket?: Socket | null }) {
  const { unreadCount, refresh } = useProjectNotifications();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [openTask, setOpenTask] = React.useState<{ taskId: string; commentId?: string | null } | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/crm/projects/notifications", {
        params: { limit: 30 },
      });
      setItems(res.data?.data?.notifications || []);
    } catch {
      /* panel just stays empty */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Live: a new notification while the panel is open drops straight into the list.
  React.useEffect(() => {
    if (!socket) return;
    const onNotification = (n: Notification) => setItems((prev) => [n, ...prev]);
    socket.on("pm:notification", onNotification);
    return () => {
      socket.off("pm:notification", onNotification);
    };
  }, [socket]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markRead = async (ids?: string[]) => {
    try {
      await apiClient.post("/api/crm/projects/notifications/read", ids ? { ids } : {});
      setItems((prev) =>
        prev.map((n) =>
          !ids || ids.includes(n._id) ? { ...n, readAt: n.readAt || new Date().toISOString() } : n,
        ),
      );
      refresh();
    } catch {
      /* badge poll self-corrects */
    }
  };

  const openItem = (n: Notification) => {
    if (!n.readAt) markRead([n._id]);
    if (n.taskId) {
      setOpenTask({ taskId: n.taskId, commentId: n.commentId });
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
          open
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
            : "border-border/40 text-muted-foreground/70 hover:border-emerald-500/40 hover:text-emerald-600",
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-96 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-xl">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
            <p className="text-xs font-bold tracking-tight">Notifications</p>
            <button
              onClick={() => markRead()}
              className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          </div>

          <div className="max-h-105 overflow-y-auto [scrollbar-width:thin]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-6 py-10 text-center text-xs text-muted-foreground/50">
                You're all caught up — no notifications.
              </p>
            ) : (
              items.map((n) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                return (
                  <button
                    key={n._id}
                    onClick={() => openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                      !n.readAt && "bg-emerald-500/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        TYPE_TINT[n.type] || "text-muted-foreground bg-muted/40",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold leading-snug">
                        {n.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground/70">
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-[9px] text-muted-foreground/50">
                        {relTime(n.createdAt)}
                      </span>
                    </span>
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Click-through: opens the task; mentions flash the exact comment. */}
      <TaskDetailDialog
        taskId={openTask?.taskId ?? null}
        meId={meId}
        socket={socket}
        highlightCommentId={openTask?.commentId ?? null}
        onClose={() => setOpenTask(null)}
        onChanged={refresh}
        onDeleted={refresh}
      />
    </div>
  );
}