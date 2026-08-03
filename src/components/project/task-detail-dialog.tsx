"use client";

/**
 * Shared Project Management pieces used by both the /projects workspace and
 * the My Tasks / Completed Tasks panels:
 *
 *   - TaskDetailDialog  — full task view: status control, EDIT + DELETE
 *                         actions, attachments, comment thread
 *   - EditTaskDialog    — title / description / assignee / dates
 *   - ConfirmDialog     — reusable destructive-action confirmation
 *   - AttachmentChip / MemberAvatar / helpers / shared types
 *
 * Permission checks here only mirror the backend rules for UX — the backend
 * (projectManagement.controller.ts) is always the source of truth:
 *   status change → task creator or assignee ONLY
 *   edit details  → creator, assignee, or admin
 *   delete task   → creator, group creator, or admin
 */

import * as React from "react";
import type { Socket } from "socket.io-client";
import {
  CalendarDays,
  Check,
  Clock,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  TaskStatusSelect,
  type ProjectTaskStatus,
} from "@/components/project/task-status-badge";
import {
  PrioritySelect,
  type ProjectTaskPriority,
} from "@/components/project/task-priority-badge";
import { MentionTextarea, MentionText } from "@/components/project/mention-textarea";
import { AttachmentLightbox, type LightboxAttachment } from "@/components/chat/AttachmentLightbox";

/* ── Shared types (mirror backend lean shapes) ─────────────────────────── */

export type Member = {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string | null;
  role?: string;
  department?: string;
};

export type Attachment = {
  _id?: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type TaskDetail = {
  _id: string;
  groupId: string;
  sectionId: string;
  folderId: string;
  title: string;
  description?: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority | null;
  createdBy: Member;
  assigneeIds: Member[];
  startDate?: string | null;
  deadline?: string | null;
  attachments: Attachment[];
  commentCount: number;
};

export type Comment = {
  _id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string | null;
  message: string;
  mentions?: string[];
  attachments: Attachment[];
  isEdited?: boolean;
  createdAt: string;
};

/* ── Shared helpers ────────────────────────────────────────────────────── */

export const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

export const fmtTime = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const initials = (name?: string | null) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

export const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.response?.data?.data?.message || fallback;

/** Safe visible name — populated users can arrive without fullName. */
export const displayName = (m?: Partial<Member> | null) =>
  m?.fullName || m?.username || m?.email || "Team member";

/** ISO date → value usable by <input type="date"> */
const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/* ── Small shared UI bits ──────────────────────────────────────────────── */

export function MemberAvatar({ member, size = "sm" }: { member?: Member | null; size?: "sm" | "xs" }) {
  if (!member) return null;
  // Populated docs can arrive without fullName (e.g. the synthetic admin user
  // from the main-app token path) — fall back through username/email.
  const displayName = member.fullName || member.username || member.email || "";
  return (
    <Avatar className={cn("ring-1 ring-border", size === "sm" ? "h-6 w-6" : "h-5 w-5")}>
      <AvatarImage src={resolveImageUrl(member.avatar || undefined)} alt={displayName} />
      <AvatarFallback className="text-[9px]">{initials(displayName)}</AvatarFallback>
    </Avatar>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
      {children}
    </p>
  );
}

export function AttachmentChip({
  attachment,
  compact,
  onPreview,
  onRemove,
  removing,
}: {
  attachment: Attachment;
  compact?: boolean;
  /** Opens the shared lightbox instead of a new tab, for images/videos. */
  onPreview?: (attachment: Attachment) => void;
  /** Shows a small hover "x" that deletes this attachment from its parent. */
  onRemove?: (attachment: Attachment) => void;
  removing?: boolean;
}) {
  const isImage = attachment.mimeType?.startsWith("image/");
  const isVideo = attachment.mimeType?.startsWith("video/");

  const removeButton = onRemove && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onRemove(attachment);
      }}
      disabled={removing}
      title="Remove attachment"
      className={cn(
        "absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground/70 shadow-sm transition-opacity hover:border-rose-500/50 hover:text-rose-500",
        // Always visible on touch (no hover there to reveal it); desktop keeps
        // the hover-reveal declutter.
        removing ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover/att:opacity-100",
      )}
    >
      {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
    </button>
  );

  if (isImage || isVideo) {
    const size = compact ? "h-16 w-16" : "h-20 w-20";
    return (
      <div className="group/att relative shrink-0">
        <button
          type="button"
          onClick={() => onPreview?.(attachment)}
          title={attachment.originalName}
          className={cn(
            "group relative block overflow-hidden rounded-xl border border-border/40 bg-muted/20 transition-colors hover:border-emerald-500/40",
            size,
          )}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url}
              alt={attachment.originalName}
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <video
                src={attachment.url}
                muted
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
                  <Play className="h-3.5 w-3.5 fill-current text-foreground" />
                </span>
              </span>
            </>
          )}
        </button>
        {removeButton}
      </div>
    );
  }

  return (
    <div className="group/att relative">
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group flex items-center gap-2 rounded-xl border border-border/40 bg-background/60 transition-colors hover:border-emerald-500/40",
          compact ? "py-1.5 pl-2.5 pr-2.5" : "py-2 pl-3 pr-3",
          onRemove && (compact ? "pr-6" : "pr-7"),
        )}
      >
        <FileText
          className={cn("shrink-0 text-muted-foreground/60", compact ? "h-4 w-4" : "h-5 w-5")}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-medium", compact ? "text-[10px]" : "text-xs")}>
            {attachment.originalName}
          </span>
          <span className="block text-[9px] text-muted-foreground/50">
            {fmtSize(attachment.size)}
          </span>
        </span>
        <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-emerald-600" />
      </a>
      {removeButton}
    </div>
  );
}

/* ── AssigneeMultiSelect — chips + checkbox list of group members ──────── */

export function AssigneeMultiSelect({
  members,
  selected,
  onChange,
  disabled,
}: {
  members: Member[];
  selected: Member[];
  onChange: (next: Member[]) => void;
  disabled?: boolean;
}) {
  const toggle = (m: Member) =>
    onChange(
      selected.some((s) => s._id === m._id)
        ? selected.filter((s) => s._id !== m._id)
        : [...selected, m],
    );

  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {selected.map((m) => (
            <span
              key={m._id}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 py-1 pl-1.5 pr-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
            >
              <MemberAvatar member={m} size="xs" />
              {displayName(m)}
              {!disabled && (
                <button onClick={() => toggle(m)} className="opacity-60 hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="max-h-40 overflow-y-auto rounded-xl border border-border/40 [scrollbar-width:thin]">
        {members.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground/50">
            No group members available.
          </p>
        ) : (
          members.map((m) => {
            const isSelected = selected.some((s) => s._id === m._id);
            return (
              <button
                key={m._id}
                type="button"
                onClick={() => !disabled && toggle(m)}
                disabled={disabled}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/40",
                  isSelected && "bg-emerald-500/5",
                )}
              >
                <MemberAvatar member={m} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{displayName(m)}</span>
                  <span className="block truncate text-[10px] text-muted-foreground/60">
                    {m.username}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-border/70",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── ConfirmDialog — reusable destructive confirmation ─────────────────── */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onCancel()}>
      <DialogContent className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{title}</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground/60">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="h-10 flex-1 rounded-xl border-border/50 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="h-10 flex-1 gap-2 rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── EditTaskDialog — title / description / assignee / dates ───────────── */

export function EditTaskDialog({
  task,
  members,
  onClose,
  onSaved,
}: {
  task: TaskDetail | null;
  members: Member[];
  onClose: () => void;
  onSaved: (task: TaskDetail) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assignees, setAssignees] = React.useState<Member[]>([]);
  const [startDate, setStartDate] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAssignees(task.assigneeIds || []);
      setStartDate(toDateInput(task.startDate));
      setDeadline(toDateInput(task.deadline));
      setError("");
    }
  }, [task]);

  const submit = async () => {
    if (!task) return;
    setError("");
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.patch(`/api/crm/projects/tasks/${task._id}`, {
        title: title.trim(),
        description: description.trim(),
        assigneeIds: assignees.map((m) => m._id),
        startDate: startDate || null,
        deadline: deadline || null,
      });
      onSaved(res.data?.data?.task);
    } catch (err: any) {
      setError(errMsg(err, "Failed to update the task."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="flex h-full max-h-dvh w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[85vh] sm:w-auto sm:max-w-md sm:rounded-2xl sm:border">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/40 px-6 pb-4 pt-6">
          <DialogTitle className="text-sm font-bold">Edit Task</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground/60">
            Only the task creator, the assignee, or an admin can save changes.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              className="h-10 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={saving}
              className="w-full resize-none rounded-xl border border-border/70 bg-background p-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">
              Assignees <span className="text-muted-foreground/50">(select one or more)</span>
            </Label>
            <AssigneeMultiSelect
              members={members}
              selected={assignees}
              onChange={setAssignees}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/75">Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving}
                className="h-10 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/75">Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={saving}
                className="h-10 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-border/40 px-6 py-4">
          {error && <p className="text-[11px] text-rose-500">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="h-10 flex-1 rounded-xl border-border/50 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="h-10 flex-1 gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  TASK DETAIL DIALOG — details, status, EDIT, DELETE, comments           */
/* ══════════════════════════════════════════════════════════════════════ */

export function TaskDetailDialog({
  taskId,
  meId,
  socket,
  highlightCommentId,
  onClose,
  onChanged,
  onDeleted,
}: {
  taskId: string | null;
  meId: string;
  /** Connected socket (from useProjectSocket) — enables live comment/task updates while open. */
  socket?: Socket | null;
  /** Scrolls to and flashes this comment once the thread loads (mention deep-link). */
  highlightCommentId?: string | null;
  onClose: () => void;
  onChanged: () => void;
  onDeleted?: () => void;
}) {
  const [task, setTask] = React.useState<TaskDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [prioritySaving, setPrioritySaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Edit / delete
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMembers, setEditMembers] = React.useState<Member[]>([]);
  const [editLoading, setEditLoading] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Comments
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [mentionIds, setMentionIds] = React.useState<string[]>([]);
  const [groupMembers, setGroupMembers] = React.useState<Member[]>([]);
  const [flashCommentId, setFlashCommentId] = React.useState<string | null>(null);
  const [commentFiles, setCommentFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const commentFileRef = React.useRef<HTMLInputElement>(null);
  const threadEndRef = React.useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = React.useState<LightboxAttachment | null>(null);

  // Attachments directly on the task (separate from comment attachments) —
  // upload more any time, not just when the task is first created.
  const taskFileRef = React.useRef<HTMLInputElement>(null);
  const [attachUploading, setAttachUploading] = React.useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = React.useState<string | null>(null);
  const [dragOverAttachments, setDragOverAttachments] = React.useState(false);

  // Edit / delete a single comment (author only — mirrors the backend rule).
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [editingMentionIds, setEditingMentionIds] = React.useState<string[]>([]);
  const [editSaving, setEditSaving] = React.useState(false);
  const [deletingCommentId, setDeletingCommentId] = React.useState<string | null>(null);
  const [commentDeleting, setCommentDeleting] = React.useState(false);

  const openPreview = (a: Attachment) =>
    setLightbox({
      src: a.url,
      type: a.mimeType?.startsWith("video/") ? "video" : "image",
      name: a.originalName,
    });

  const addTaskAttachments = async (list: FileList | File[] | null) => {
    const picked = list ? Array.from(list) : [];
    if (!task || picked.length === 0) return;
    setAttachUploading(true);
    setError("");
    try {
      const form = new FormData();
      picked.forEach((f) => form.append("attachments", f));
      const res = await apiClient.post(`/api/crm/projects/tasks/${task._id}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTask(res.data?.data?.task);
      onChanged();
    } catch (err: any) {
      setError(errMsg(err, "Failed to upload attachment(s)."));
    } finally {
      setAttachUploading(false);
    }
  };

  const removeTaskAttachment = async (attachment: Attachment) => {
    if (!task || !attachment._id) return;
    setRemovingAttachmentId(attachment._id);
    setError("");
    try {
      const res = await apiClient.delete(
        `/api/crm/projects/tasks/${task._id}/attachments/${attachment._id}`,
      );
      setTask(res.data?.data?.task);
      onChanged();
    } catch (err: any) {
      setError(errMsg(err, "Failed to remove the attachment."));
    } finally {
      setRemovingAttachmentId(null);
    }
  };

  const loadTask = React.useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/api/crm/projects/tasks/${taskId}`);
      setTask(res.data?.data?.task);
    } catch (err: any) {
      setError(errMsg(err, "Failed to load task."));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadComments = React.useCallback(async () => {
    if (!taskId) return;
    setCommentsLoading(true);
    try {
      const res = await apiClient.get(`/api/crm/projects/tasks/${taskId}/comments`);
      setComments(res.data?.data?.comments || []);
    } catch {
      /* thread stays empty */
    } finally {
      setCommentsLoading(false);
    }
  }, [taskId]);

  React.useEffect(() => {
    // Runs on every taskId change, including the dialog closing (taskId →
    // null) — the lightbox in particular must never survive that, or the
    // last-viewed image reappears the next time a task (any task) is opened.
    setLightbox(null);
    if (taskId) {
      setTask(null);
      setComments([]);
      setMessage("");
      setMentionIds([]);
      setGroupMembers([]);
      setCommentFiles([]);
      setEditOpen(false);
      setDeleteOpen(false);
      loadTask();
      loadComments();
    }
  }, [taskId, loadTask, loadComments]);

  // Group members power the @-mention picker (and the edit dialog reuses them).
  React.useEffect(() => {
    if (!task?.groupId) return;
    let cancelled = false;
    apiClient
      .get(`/api/crm/projects/groups/${task.groupId}/tree`)
      .then((res) => {
        if (!cancelled) setGroupMembers(res.data?.data?.members || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [task?.groupId]);

  // Mention deep-link: scroll to + flash the target comment once loaded.
  React.useEffect(() => {
    if (!highlightCommentId || comments.length === 0) return;
    const el = document.getElementById(`pm-comment-${highlightCommentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashCommentId(highlightCommentId);
      const t = setTimeout(() => setFlashCommentId(null), 2600);
      return () => clearTimeout(t);
    }
  }, [highlightCommentId, comments.length]);

  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  // Live: comment/task activity on THIS open task, from other members.
  React.useEffect(() => {
    if (!socket || !taskId) return;

    const onCommentNew = (payload: { taskId: string; comment: Comment }) => {
      if (payload.taskId !== taskId) return;
      setComments((prev) =>
        prev.some((c) => c._id === payload.comment._id) ? prev : [...prev, payload.comment],
      );
    };
    const onCommentUpdated = (payload: { taskId: string; comment: Comment }) => {
      if (payload.taskId !== taskId) return;
      setComments((prev) => prev.map((c) => (c._id === payload.comment._id ? payload.comment : c)));
    };
    const onCommentDeleted = (payload: { taskId: string; commentId: string }) => {
      if (payload.taskId !== taskId) return;
      setComments((prev) => prev.filter((c) => c._id !== payload.commentId));
    };
    // pm:task:updated carries the full task (id only nested at task._id);
    // pm:task:status carries a flat { taskId, status } instead.
    const onTaskUpdated = (payload: { task?: TaskDetail }) => {
      if (payload.task?._id !== taskId) return;
      setTask(payload.task!);
    };
    const onTaskStatus = (payload: { taskId: string; status: ProjectTaskStatus }) => {
      if (payload.taskId !== taskId) return;
      setTask((t) => (t ? { ...t, status: payload.status } : t));
    };

    socket.on("pm:comment:new", onCommentNew);
    socket.on("pm:comment:updated", onCommentUpdated);
    socket.on("pm:comment:deleted", onCommentDeleted);
    socket.on("pm:task:updated", onTaskUpdated);
    socket.on("pm:task:status", onTaskStatus);

    return () => {
      socket.off("pm:comment:new", onCommentNew);
      socket.off("pm:comment:updated", onCommentUpdated);
      socket.off("pm:comment:deleted", onCommentDeleted);
      socket.off("pm:task:updated", onTaskUpdated);
      socket.off("pm:task:status", onTaskStatus);
    };
  }, [socket, taskId]);

  // Mirror the backend rule: only the creator or an assignee can change the status.
  const canChangeStatus =
    !!task &&
    !!meId &&
    (task.createdBy?._id === meId || (task.assigneeIds || []).some((a) => a._id === meId));

  const changeStatus = async (next: ProjectTaskStatus) => {
    if (!task) return;
    setStatusSaving(true);
    setError("");
    const previous = task.status;
    setTask({ ...task, status: next }); // optimistic
    try {
      await apiClient.patch(`/api/crm/projects/tasks/${task._id}/status`, { status: next });
      onChanged();
    } catch (err: any) {
      setTask((t) => (t ? { ...t, status: previous } : t)); // rollback
      setError(errMsg(err, "Failed to change the status."));
    } finally {
      setStatusSaving(false);
    }
  };

  const changePriority = async (next: ProjectTaskPriority | null) => {
    if (!task) return;
    setPrioritySaving(true);
    setError("");
    const previous = task.priority;
    setTask({ ...task, priority: next }); // optimistic
    try {
      const res = await apiClient.patch(`/api/crm/projects/tasks/${task._id}`, { priority: next ?? "" });
      setTask(res.data?.data?.task);
      onChanged();
    } catch (err: any) {
      setTask((t) => (t ? { ...t, priority: previous } : t)); // rollback
      setError(errMsg(err, "Failed to change the priority."));
    } finally {
      setPrioritySaving(false);
    }
  };

  /** Load the group's members (for the assignee picker), then open the edit dialog. */
  const openEdit = async () => {
    if (!task) return;
    if (groupMembers.length > 0) {
      setEditMembers(groupMembers);
      setEditOpen(true);
      return;
    }
    setEditLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/api/crm/projects/groups/${task.groupId}/tree`);
      setEditMembers(res.data?.data?.members || []);
      setEditOpen(true);
    } catch (err: any) {
      setError(errMsg(err, "Failed to load group members."));
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!task) return;
    setDeleting(true);
    setError("");
    try {
      await apiClient.delete(`/api/crm/projects/tasks/${task._id}`);
      setDeleteOpen(false);
      (onDeleted ?? onChanged)();
      onClose();
    } catch (err: any) {
      setDeleteOpen(false);
      setError(errMsg(err, "Failed to delete the task."));
    } finally {
      setDeleting(false);
    }
  };

  const sendComment = async () => {
    if (!task || (!message.trim() && commentFiles.length === 0)) return;
    setSending(true);
    setError("");
    try {
      const form = new FormData();
      form.append("message", message.trim());
      mentionIds.forEach((id) => form.append("mentions", id));
      commentFiles.forEach((f) => form.append("attachments", f));
      const res = await apiClient.post(
        `/api/crm/projects/tasks/${task._id}/comments`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const created: Comment | undefined = res.data?.data?.comment;
      if (created) setComments((prev) => [...prev, created]);
      setMessage("");
      setMentionIds([]);
      setCommentFiles([]);
      onChanged();
    } catch (err: any) {
      setError(errMsg(err, "Failed to send the comment."));
    } finally {
      setSending(false);
    }
  };

  const startEditComment = (c: Comment) => {
    setEditingCommentId(c._id);
    setEditingText(c.message);
    setEditingMentionIds(c.mentions || []);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingText("");
    setEditingMentionIds([]);
  };

  const saveEditComment = async () => {
    if (!editingCommentId || !editingText.trim()) return;
    setEditSaving(true);
    setError("");
    try {
      const res = await apiClient.patch(`/api/crm/projects/comments/${editingCommentId}`, {
        message: editingText.trim(),
        mentions: editingMentionIds,
      });
      const updated: Comment | undefined = res.data?.data?.comment;
      if (updated) {
        setComments((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      }
      cancelEditComment();
    } catch (err: any) {
      setError(errMsg(err, "Failed to update the comment."));
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteComment = async () => {
    if (!deletingCommentId) return;
    setCommentDeleting(true);
    setError("");
    try {
      await apiClient.delete(`/api/crm/projects/comments/${deletingCommentId}`);
      setComments((prev) => prev.filter((c) => c._id !== deletingCommentId));
      setTask((t) => (t ? { ...t, commentCount: Math.max(0, t.commentCount - 1) } : t));
      setDeletingCommentId(null);
    } catch (err: any) {
      setError(errMsg(err, "Failed to delete the comment."));
      setDeletingCommentId(null);
    } finally {
      setCommentDeleting(false);
    }
  };

  return (
    <Dialog open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-full max-h-dvh w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[85vh] sm:w-auto sm:max-w-2xl sm:rounded-2xl sm:border"
      >
        {loading || !task ? (
          <div className="flex items-center justify-center py-16">
            {error ? (
              <p className="text-xs text-rose-500">{error}</p>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="space-y-2.5 border-b border-border/40 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <DialogTitle className="min-w-0 text-base font-bold leading-snug">
                  {task.title}
                </DialogTitle>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <PrioritySelect
                      priority={task.priority}
                      loading={prioritySaving}
                      onChange={changePriority}
                    />
                    <TaskStatusSelect
                      status={task.status}
                      disabled={!canChangeStatus}
                      loading={statusSaving}
                      onChange={changeStatus}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={openEdit}
                      disabled={editLoading}
                      title="Edit task"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-emerald-600"
                    >
                      {editLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteOpen(true)}
                      title="Delete task"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className="mx-0.5 h-5 w-px shrink-0 bg-border/60" />
                    <button
                      onClick={onClose}
                      title="Close"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/70">
                  <span className="inline-flex items-center gap-1.5">
                    Created by <MemberAvatar member={task.createdBy} size="xs" />
                    <span className="font-medium text-foreground/80">
                      {displayName(task.createdBy)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    Assignees{" "}
                    {task.assigneeIds?.length ? (
                      <>
                        <span className="flex -space-x-1">
                          {task.assigneeIds.slice(0, 4).map((a) => (
                            <MemberAvatar key={a._id} member={a} size="xs" />
                          ))}
                        </span>
                        <span className="font-medium text-foreground/80">
                          {task.assigneeIds
                            .slice(0, 2)
                            .map((a) => displayName(a))
                            .join(", ")}
                          {task.assigneeIds.length > 2 && ` +${task.assigneeIds.length - 2}`}
                        </span>
                      </>
                    ) : (
                      <span className="italic">Unassigned</span>
                    )}
                  </span>
                  {task.startDate && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Starts {fmtDate(task.startDate)}
                    </span>
                  )}
                  {task.deadline && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Due {fmtDate(task.deadline)}
                    </span>
                  )}
                </div>
              </DialogDescription>
              {error && <p className="text-[11px] text-rose-500">{error}</p>}
            </DialogHeader>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 [scrollbar-width:thin]">
              {task.description && (
                <div className="space-y-1.5">
                  <SectionEyebrow>Description</SectionEyebrow>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                    {task.description}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <SectionEyebrow>
                    Attachments{task.attachments?.length > 0 && ` · ${task.attachments.length}`}
                  </SectionEyebrow>
                  <button
                    type="button"
                    onClick={() => taskFileRef.current?.click()}
                    disabled={attachUploading}
                    className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-bold text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-emerald-600 disabled:opacity-50"
                  >
                    {attachUploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Add
                  </button>
                </div>
                <input
                  ref={taskFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void addTaskAttachments(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverAttachments(true);
                  }}
                  onDragLeave={() => setDragOverAttachments(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverAttachments(false);
                    void addTaskAttachments(e.dataTransfer.files);
                  }}
                  className={cn(
                    "rounded-xl transition-shadow",
                    dragOverAttachments && "ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-background",
                  )}
                >
                  {task.attachments?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-0.5">
                      {task.attachments.map((a, i) => (
                        <AttachmentChip
                          key={a._id || i}
                          attachment={a}
                          onPreview={openPreview}
                          onRemove={removeTaskAttachment}
                          removing={removingAttachmentId === a._id}
                        />
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => taskFileRef.current?.click()}
                      disabled={attachUploading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-4 text-[11px] font-medium text-muted-foreground/50 transition-colors hover:border-emerald-500/40 hover:text-emerald-600"
                    >
                      <Paperclip className="h-3.5 w-3.5" /> Drop files here, or click to attach
                    </button>
                  )}
                </div>
              </div>

              {/* Comment thread */}
              <div className="space-y-2">
                <SectionEyebrow>
                  Discussion {comments.length > 0 && `· ${comments.length}`}
                </SectionEyebrow>
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/50 py-5 text-center text-xs text-muted-foreground/50">
                    No messages yet. Start the discussion for this task.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => {
                      const mine = c.userId === meId;
                      const isEditing = editingCommentId === c._id;
                      return (
                        <div
                          key={c._id}
                          id={`pm-comment-${c._id}`}
                          className={cn("group/cmt flex gap-2.5", mine && "flex-row-reverse")}
                        >
                          <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                            <AvatarImage
                              src={resolveImageUrl(c.authorAvatar || undefined)}
                              alt={c.authorName}
                            />
                            <AvatarFallback className="text-[9px]">
                              {initials(c.authorName)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "max-w-[78%] space-y-1.5 rounded-2xl border px-3.5 py-2.5 transition-shadow duration-500",
                              mine
                                ? "rounded-tr-sm border-emerald-500/25 bg-emerald-500/10"
                                : "rounded-tl-sm border-border/40 bg-muted/30",
                              flashCommentId === c._id &&
                                "ring-2 ring-emerald-500/70 shadow-[0_0_18px_-4px_rgba(16,185,129,0.6)]",
                            )}
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="text-[11px] font-semibold">{c.authorName}</span>
                              <span className="text-[9px] text-muted-foreground/50">
                                {fmtTime(c.createdAt)}
                                {c.isEdited && " · edited"}
                              </span>
                              {mine && !isEditing && (
                                <span className="ml-auto flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover/cmt:opacity-100">
                                  <button
                                    onClick={() => startEditComment(c)}
                                    title="Edit comment"
                                    className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-black/5 hover:text-emerald-600 dark:hover:bg-white/10"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingCommentId(c._id)}
                                    title="Delete comment"
                                    className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-rose-500/10 hover:text-rose-500"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </span>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="space-y-1.5">
                                <MentionTextarea
                                  value={editingText}
                                  onChange={setEditingText}
                                  members={groupMembers.filter((m) => m._id !== meId)}
                                  mentionIds={editingMentionIds}
                                  onMentionIdsChange={setEditingMentionIds}
                                  onSubmit={saveEditComment}
                                  disabled={editSaving}
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={cancelEditComment}
                                    disabled={editSaving}
                                    className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-muted-foreground/70 hover:bg-muted/40"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={saveEditComment}
                                    disabled={editSaving || !editingText.trim()}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    {editSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {c.message && (
                                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                                    <MentionText
                                      text={c.message}
                                      mentionNames={(c.mentions || [])
                                        .map((id) => {
                                          const m = groupMembers.find((x) => x._id === id);
                                          return m ? (m.fullName || m.username || m.email || "") : "";
                                        })
                                        .filter(Boolean)}
                                    />
                                  </p>
                                )}
                                {c.attachments?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {c.attachments.map((a, i) => (
                                      <AttachmentChip
                                        key={a._id || i}
                                        attachment={a}
                                        compact
                                        onPreview={openPreview}
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={threadEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="border-t border-border/40 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-end gap-2">
                <input
                  ref={commentFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    setCommentFiles((prev) => [...prev, ...picked].slice(0, 5));
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => commentFileRef.current?.click()}
                  disabled={sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 text-muted-foreground/60 transition-colors hover:border-emerald-500/40 hover:text-emerald-600"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500/30">
                  {commentFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-b border-border/30 pb-1.5">
                      {commentFiles.map((f, i) => (
                        <span
                          key={`${f.name}-${i}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-[10px]"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="max-w-32 truncate">{f.name}</span>
                          <button
                            onClick={() =>
                              setCommentFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="opacity-60 hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <MentionTextarea
                    value={message}
                    onChange={setMessage}
                    members={groupMembers.filter((m) => m._id !== meId)}
                    mentionIds={mentionIds}
                    onMentionIdsChange={setMentionIds}
                    onSubmit={sendComment}
                    placeholder="Write a message… @ to mention a teammate"
                    disabled={sending}
                    bare
                  />
                </div>

                <Button
                  onClick={sendComment}
                  disabled={sending || (!message.trim() && commentFiles.length === 0)}
                  className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 p-0 text-white hover:bg-emerald-700"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Edit + delete overlays */}
            <EditTaskDialog
              task={editOpen ? task : null}
              members={editMembers}
              onClose={() => setEditOpen(false)}
              onSaved={(updated) => {
                setEditOpen(false);
                setTask(updated);
                onChanged();
              }}
            />
            <ConfirmDialog
              open={deleteOpen}
              title="Delete this task?"
              description={`"${task.title}" and its discussion thread will be removed for everyone in the group. Attached files are deleted from storage.`}
              loading={deleting}
              onCancel={() => setDeleteOpen(false)}
              onConfirm={confirmDelete}
            />
            <ConfirmDialog
              open={!!deletingCommentId}
              title="Delete this comment?"
              description="This can't be undone. Any attachments on it are removed from storage too."
              loading={commentDeleting}
              onCancel={() => setDeletingCommentId(null)}
              onConfirm={confirmDeleteComment}
            />
            <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}