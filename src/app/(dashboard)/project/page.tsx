"use client";

/**
 * Project Management workspace
 * Route: /projects
 *
 * Views (tabs):
 *   Workspace        → Project Group → Sections → Folder Groups → Tasks
 *   My Tasks         → paginated, cross-group, every NOT-yet-completed task
 *   Completed Tasks  → paginated; tasks move here the moment they complete
 *
 * Edit + delete is available at every level (group / section / folder /
 * task). Completed tasks are removed from the workspace task lists (a
 * per-group "Show completed" toggle brings them back inline). Tasks are
 * always listed newest first (sorted by the backend).
 *
 * All data is org-scoped and group-membership-gated by the backend
 * (routes/projectManagement.route.ts). Permission checks here only mirror
 * the server rules for UX — the backend is the source of truth.
 */

import * as React from "react";
import {
  AtSign,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Folder,
  FolderKanban,
  Layers,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
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
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  TaskStatusBadge,
  type ProjectTaskStatus,
} from "@/components/project/task-status-badge";
import {
  PriorityIcon,
  PrioritySelect,
  type ProjectTaskPriority,
} from "@/components/project/task-priority-badge";
import {
  TaskDetailDialog,
  ConfirmDialog,
  AssigneeMultiSelect,
  MemberAvatar,
  SectionEyebrow,
  errMsg,
  fmtDate,
  fmtSize,
  displayName,
  type Member,
} from "@/components/project/task-detail-dialog";
import { MyTasksPanel } from "@/components/project/my-tasks-panel";
import { MentionsPanel } from "@/components/project/mentions-panel";
import { NotificationsBell } from "@/components/project/notifications-bell";
import {
  ProjectNotificationProvider,
  useProjectNotifications,
} from "@/context/ProjectNotificationContext";
import { useProjectSocket } from "@/hooks/useProjectSocket";
import type { Socket } from "socket.io-client";

/* ── Types (mirror backend lean shapes) ────────────────────────────────── */

type Group = {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
  memberIds: Member[] | string[];
  updatedAt: string;
};

type Section = { _id: string; name: string; order: number };
type FolderGroup = { _id: string; sectionId: string; name: string; order: number };

type TaskSummary = {
  _id: string;
  folderId: string;
  sectionId: string;
  title: string;
  status: ProjectTaskStatus;
  priority?: ProjectTaskPriority | null;
  assigneeIds?: string[];
  createdBy: string;
  startDate?: string | null;
  deadline?: string | null;
  createdAt?: string;
  commentCount: number;
  attachmentCount: number;
  /** True when the viewer is involved and hasn't opened the task since its last activity. */
  unseenForMe?: boolean;
};

/* ══════════════════════════════════════════════════════════════════════ */
/*  PAGE                                                                    */
/* ══════════════════════════════════════════════════════════════════════ */

type PageTab = "workspace" | "mine" | "done" | "mentions";

const TABS: Array<{ id: PageTab; label: string; icon: React.ElementType }> = [
  { id: "workspace", label: "Workspace", icon: LayoutGrid },
  { id: "mine", label: "My Tasks", icon: ClipboardList },
  { id: "done", label: "Completed Tasks", icon: CheckCircle2 },
  { id: "mentions", label: "Mentions", icon: AtSign },
];

export default function ProjectManagementPage() {
  const socket = useProjectSocket();
  return (
    <ProjectNotificationProvider socket={socket}>
      <ProjectManagementPageInner socket={socket} />
    </ProjectNotificationProvider>
  );
}

function ProjectManagementPageInner({ socket }: { socket: Socket | null }) {
  const { refresh: refreshBadge, markAllRead } = useProjectNotifications();

  const [tab, setTab] = React.useState<PageTab>("workspace");
  const [meId, setMeId] = React.useState<string>("");
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(true);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [pageError, setPageError] = React.useState("");

  // Group dialogs
  const [groupDialogMode, setGroupDialogMode] = React.useState<"closed" | "create" | "edit">("closed");
  const [groupBeingEdited, setGroupBeingEdited] = React.useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = React.useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = React.useState(false);

  /* ── Bootstrap: identity + groups; visiting the page clears the badge ── */
  React.useEffect(() => {
    apiClient
      .get("/api/crm/me")
      .then((res) => setMeId(res.data?.data?._id || ""))
      .catch(() => {});
    markAllRead().then(refreshBadge);
  }, [markAllRead, refreshBadge]);

  const loadGroups = React.useCallback(async () => {
    setGroupsLoading(true);
    setPageError("");
    try {
      const res = await apiClient.get("/api/crm/projects/groups");
      const list: Group[] = res.data?.data?.groups || [];
      setGroups(list);
      setSelectedGroupId((prev) =>
        prev && list.some((g) => g._id === prev) ? prev : list[0]?._id ?? null,
      );
    } catch (err: any) {
      setPageError(errMsg(err, "Failed to load project groups."));
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Live: a group I'm in was created/renamed/deleted (membership changes too).
  React.useEffect(() => {
    if (!socket) return;
    const onGroupChange = () => loadGroups();
    socket.on("pm:group:new", onGroupChange);
    socket.on("pm:group:updated", onGroupChange);
    socket.on("pm:group:deleted", onGroupChange);
    return () => {
      socket.off("pm:group:new", onGroupChange);
      socket.off("pm:group:updated", onGroupChange);
      socket.off("pm:group:deleted", onGroupChange);
    };
  }, [socket, loadGroups]);

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setDeletingGroup(true);
    setPageError("");
    try {
      await apiClient.delete(`/api/crm/projects/groups/${groupToDelete._id}`);
      setGroupToDelete(null);
      loadGroups();
    } catch (err: any) {
      setGroupToDelete(null);
      setPageError(errMsg(err, "Failed to delete the project group."));
    } finally {
      setDeletingGroup(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10">
            <FolderKanban className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold tracking-tight">Project Management</h1>
            <p className="text-[11px] text-muted-foreground/60">
              Plan, assign, and track work across your team
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
                tab === t.id
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "text-muted-foreground/70 hover:text-foreground",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell meId={meId} socket={socket} />
          {tab === "workspace" && (
            <Button
              onClick={() => {
                setGroupBeingEdited(null);
                setGroupDialogMode("create");
              }}
              className="h-9 gap-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              New Project Group
            </Button>
          )}
        </div>
      </div>

      {pageError && (
        <div className="mx-5 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
          {pageError}
        </div>
      )}

      {/* ── Tab bodies ── */}
      {tab === "mine" && (
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          <MyTasksPanel view="active" meId={meId} socket={socket} />
        </div>
      )}

      {tab === "done" && (
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          <MyTasksPanel view="completed" meId={meId} socket={socket} />
        </div>
      )}

      {tab === "mentions" && (
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          <MentionsPanel meId={meId} />
        </div>
      )}

      {tab === "workspace" && (
        <div className="flex min-h-0 flex-1">
          {/* ── Group rail ── */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-border/40">
            <div className="px-4 pb-2 pt-4">
              <SectionEyebrow>My Project Groups</SectionEyebrow>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
              {groupsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
              ) : groups.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-xs text-muted-foreground/60">
                    No project groups yet. Create one to start planning work with your team.
                  </p>
                </div>
              ) : (
                groups.map((g) => (
                  <div
                    key={g._id}
                    className={cn(
                      "group/grow flex w-full items-center gap-2 rounded-xl pr-1.5 transition-all",
                      selectedGroupId === g._id
                        ? "bg-emerald-600/10 shadow-sm shadow-emerald-600/10"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <button
                      onClick={() => setSelectedGroupId(g._id)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left",
                        selectedGroupId === g._id
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-foreground/80",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          selectedGroupId === g._id ? "bg-emerald-500" : "bg-border",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{g.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground/60">
                          {(g.memberIds as unknown[]).length} member
                          {(g.memberIds as unknown[]).length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                    {/* Group edit / delete — permission enforced by the backend
                        (creator or admin); others get a clear error message. */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/grow:opacity-100">
                      <button
                        onClick={() => {
                          setGroupBeingEdited(g);
                          setGroupDialogMode("edit");
                        }}
                        title="Edit group"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted/50 hover:text-emerald-600"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setGroupToDelete(g)}
                        title="Delete group"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ── Workspace ── */}
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            {selectedGroupId ? (
              <GroupWorkspace key={selectedGroupId} groupId={selectedGroupId} meId={meId} socket={socket} />
            ) : (
              !groupsLoading && (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/10">
                    <FolderKanban className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="max-w-sm text-sm text-muted-foreground/70">
                    Create your first project group, invite teammates from your organization, and
                    organize work into sections, folders, and tasks.
                  </p>
                  <Button
                    onClick={() => {
                      setGroupBeingEdited(null);
                      setGroupDialogMode("create");
                    }}
                    className="h-9 gap-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" /> New Project Group
                  </Button>
                </div>
              )
            )}
          </main>
        </div>
      )}

      {/* ── Group create / edit dialog ── */}
      <GroupDialog
        mode={groupDialogMode}
        group={groupBeingEdited}
        onClose={() => setGroupDialogMode("closed")}
        onSaved={(g, wasCreate) => {
          setGroupDialogMode("closed");
          if (wasCreate) {
            setGroups((prev) => [g, ...prev]);
            setSelectedGroupId(g._id);
          } else {
            loadGroups();
          }
        }}
      />

      <ConfirmDialog
        open={!!groupToDelete}
        title="Delete this project group?"
        description={`"${groupToDelete?.name ?? ""}" — its sections, folders, tasks, and discussions will no longer be visible to any member. Only the group creator or an admin can do this.`}
        loading={deletingGroup}
        onCancel={() => setGroupToDelete(null)}
        onConfirm={confirmDeleteGroup}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  GROUP DIALOG — create AND edit (name, description, members)            */
/* ══════════════════════════════════════════════════════════════════════ */

function GroupDialog({
  mode,
  group,
  onClose,
  onSaved,
}: {
  mode: "closed" | "create" | "edit";
  group: Group | null;
  onClose: () => void;
  onSaved: (group: Group, wasCreate: boolean) => void;
}) {
  const open = mode !== "closed";
  const isEdit = mode === "edit" && !!group;

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Member[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<Member[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (isEdit && group) {
        setName(group.name);
        setDescription(group.description || "");
        // getGroups populates memberIds with member objects.
        const members = (group.memberIds as Member[]).filter(
          (m): m is Member => typeof m === "object" && !!m?._id,
        );
        setSelected(members);
      } else {
        setName("");
        setDescription("");
        setSelected([]);
      }
      setQuery("");
      setResults([]);
      setError("");
    }
  }, [open, isEdit, group]);

  // Debounced, org-scoped member search (backend enforces the org boundary).
  React.useEffect(() => {
    if (!open) return;
    setSearching(true);
    const t = setTimeout(() => {
      apiClient
        .get("/api/crm/projects/members/search", { params: { q: query.trim() } })
        .then((res) => setResults(res.data?.data?.users || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  const toggleMember = (m: Member) =>
    setSelected((prev) =>
      prev.some((s) => s._id === m._id)
        ? prev.filter((s) => s._id !== m._id)
        : [...prev, m],
    );

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        memberIds: selected.map((m) => m._id),
      };
      const res = isEdit
        ? await apiClient.patch(`/api/crm/projects/groups/${group!._id}`, body)
        : await apiClient.post("/api/crm/projects/groups", body);
      onSaved(res.data?.data?.group, !isEdit);
    } catch (err: any) {
      setError(errMsg(err, isEdit ? "Failed to update the project group." : "Failed to create the project group."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-border/40 px-6 pb-4 pt-6">
          <DialogTitle className="text-sm font-bold">
            {isEdit ? "Edit Project Group" : "New Project Group"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground/60">
            {isEdit
              ? "Rename the group or manage its members. The creator always stays a member."
              : "Only the members you add here will be able to see this group."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">Group name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Suprah AI v2 Launch"
              disabled={saving}
              className="h-10 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">
              Description <span className="text-muted-foreground/50">(optional)</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
              disabled={saving}
              className="w-full resize-none rounded-xl border border-border/70 bg-background p-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">Members</Label>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {selected.map((m) => (
                  <span
                    key={m._id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 py-1 pl-1.5 pr-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                  >
                    <MemberAvatar member={m} size="xs" />
                    {displayName(m)}
                    <button onClick={() => toggleMember(m)} className="opacity-60 hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teammates in your organization…"
                disabled={saving}
                className="h-10 rounded-xl border-border/70 pl-9 text-sm focus-visible:ring-emerald-500/30"
              />
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-border/40 [scrollbar-width:thin]">
              {searching ? (
                <div className="flex justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
              ) : results.length === 0 ? (
                <p className="px-3 py-5 text-center text-xs text-muted-foreground/50">
                  No teammates found.
                </p>
              ) : (
                results.map((m) => {
                  const isSelected = selected.some((s) => s._id === m._id);
                  return (
                    <button
                      key={m._id}
                      onClick={() => toggleMember(m)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/40",
                        isSelected && "bg-emerald-500/5",
                      )}
                    >
                      <MemberAvatar member={m} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{displayName(m)}</span>
                        <span className="block truncate text-[10px] text-muted-foreground/60">
                          {m.username} · {m.email}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-border/70",
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

          {error && <p className="text-[11px] text-rose-500">{error}</p>}

          <div className="flex gap-2 pt-1">
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
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  GROUP WORKSPACE — sections → folders → tasks                           */
/* ══════════════════════════════════════════════════════════════════════ */

function GroupWorkspace({
  groupId,
  meId,
  socket,
}: {
  groupId: string;
  meId: string;
  socket: Socket | null;
}) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [group, setGroup] = React.useState<Group | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [sections, setSections] = React.useState<Section[]>([]);
  const [folders, setFolders] = React.useState<FolderGroup[]>([]);
  const [tasks, setTasks] = React.useState<TaskSummary[]>([]);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [showCompleted, setShowCompleted] = React.useState(false);

  // Create dialogs
  const [sectionDialogOpen, setSectionDialogOpen] = React.useState(false);
  const [folderDialogFor, setFolderDialogFor] = React.useState<Section | null>(null);
  const [taskDialogFor, setTaskDialogFor] = React.useState<FolderGroup | null>(null);
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);

  // Rename / delete dialogs
  const [sectionToRename, setSectionToRename] = React.useState<Section | null>(null);
  const [folderToRename, setFolderToRename] = React.useState<FolderGroup | null>(null);
  const [sectionToDelete, setSectionToDelete] = React.useState<Section | null>(null);
  const [folderToDelete, setFolderToDelete] = React.useState<FolderGroup | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadTree = React.useCallback(async () => {
    setError("");
    try {
      const res = await apiClient.get(`/api/crm/projects/groups/${groupId}/tree`);
      const data = res.data?.data;
      setGroup(data.group);
      setMembers(data.members || []);
      setSections(data.sections || []);
      setFolders(data.folders || []);
      setTasks(data.tasks || []); // already newest first from the backend
    } catch (err: any) {
      setError(errMsg(err, "Failed to load this project group."));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  React.useEffect(() => {
    setLoading(true);
    loadTree();
  }, [loadTree]);

  // Keep the tree fresh when the tab regains focus (cheap fallback for
  // whatever the socket misses, e.g. a dropped connection).
  React.useEffect(() => {
    const onFocus = () => loadTree();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadTree]);

  // Live: any task/section/folder change inside THIS group refreshes the tree.
  React.useEffect(() => {
    if (!socket) return;
    const onChange = (payload: { groupId?: string }) => {
      if (payload?.groupId === groupId) loadTree();
    };
    const events = [
      "pm:task:new", "pm:task:updated", "pm:task:status", "pm:task:deleted",
      "pm:comment:new", "pm:comment:deleted",
      "pm:section:new", "pm:section:updated", "pm:section:deleted",
      "pm:folder:new", "pm:folder:updated", "pm:folder:deleted",
    ];
    events.forEach((e) => socket.on(e, onChange));
    return () => events.forEach((e) => socket.off(e, onChange));
  }, [socket, groupId, loadTree]);

  const membersById = React.useMemo(
    () => new Map(members.map((m) => [m._id, m])),
    [members],
  );

  const completedCount = React.useMemo(
    () => tasks.filter((t) => t.status === "completed").length,
    [tasks],
  );

  const deleteSection = async () => {
    if (!sectionToDelete) return;
    setDeleting(true);
    setError("");
    try {
      await apiClient.delete(`/api/crm/projects/sections/${sectionToDelete._id}`);
      setSectionToDelete(null);
      loadTree();
    } catch (err: any) {
      setSectionToDelete(null);
      setError(errMsg(err, "Failed to delete the section."));
    } finally {
      setDeleting(false);
    }
  };

  const deleteFolder = async () => {
    if (!folderToDelete) return;
    setDeleting(true);
    setError("");
    try {
      await apiClient.delete(`/api/crm/projects/folders/${folderToDelete._id}`);
      setFolderToDelete(null);
      loadTree();
    } catch (err: any) {
      setFolderToDelete(null);
      setError(errMsg(err, "Failed to delete the folder group."));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
      </div>
    );
  }

  if ((error && !group) || !group) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
          {error || "Project group not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* ── Group header ── */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight">{group.name}</h2>
            {group.description && (
              <p className="mt-0.5 text-xs text-muted-foreground/70">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {members.slice(0, 6).map((m) => (
                <MemberAvatar key={m._id} member={m} />
              ))}
            </div>
            {members.length > 6 && (
              <span className="text-[10px] text-muted-foreground/60">
                +{members.length - 6}
              </span>
            )}
            <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-1 text-[10px] font-medium text-muted-foreground/70">
              <Users className="h-3 w-3" /> {members.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sections toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionEyebrow>Sections</SectionEyebrow>
        <div className="flex items-center gap-2">
          {/* Completed tasks are removed from the workspace lists by default —
              they live in the "Completed Tasks" tab. This toggle shows them
              inline for context. */}
          {completedCount > 0 && (
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors",
                showCompleted
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-border/40 text-muted-foreground/60 hover:text-foreground",
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              {showCompleted ? "Hide" : "Show"} completed ({completedCount})
            </button>
          )}
          <Button
            variant="ghost"
            onClick={() => setSectionDialogOpen(true)}
            className="h-7 gap-1.5 rounded-lg px-2 text-[11px] text-emerald-600 hover:bg-emerald-600/10 hover:text-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" /> Add Section
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Layers className="mx-auto h-6 w-6 text-muted-foreground/40" />
          <p className="mt-2 text-xs text-muted-foreground/60">
            No sections yet. Add a section for each department, phase, or work category.
          </p>
        </div>
      ) : (
        sections.map((section) => {
          const sectionFolders = folders.filter((f) => f.sectionId === section._id);
          const isCollapsed = collapsed[section._id];
          return (
            <div key={section._id} className="rounded-2xl border border-border/50 bg-card shadow-sm">
              {/* Section header */}
              <div className="group/sec flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [section._id]: !c[section._id] }))
                  }
                  className="flex items-center gap-2 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                  )}
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold">{section.name}</span>
                </button>
                <span className="text-[10px] text-muted-foreground/50">
                  {sectionFolders.length} folder{sectionFolders.length === 1 ? "" : "s"}
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    onClick={() => setSectionToRename(section)}
                    title="Rename section"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-muted/50 hover:text-emerald-600 group-hover/sec:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setSectionToDelete(section)}
                    title="Delete section"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-500 group-hover/sec:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <Button
                    variant="ghost"
                    onClick={() => setFolderDialogFor(section)}
                    className="h-7 gap-1.5 rounded-lg px-2 text-[11px] text-muted-foreground/70 hover:text-emerald-600"
                  >
                    <Plus className="h-3.5 w-3.5" /> Folder Group
                  </Button>
                </div>
              </div>

              {/* Folders */}
              {!isCollapsed && (
                <div className="space-y-3 border-t border-border/30 p-4">
                  {sectionFolders.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground/50">
                      No folder groups in this section yet.
                    </p>
                  ) : (
                    sectionFolders.map((folder) => {
                      // Completed tasks are hidden here by default — they move
                      // to the Completed Tasks tab. Backend already sorts
                      // newest first.
                      const folderTasks = tasks.filter(
                        (t) =>
                          t.folderId === folder._id &&
                          (showCompleted || t.status !== "completed"),
                      );
                      const hiddenDone = showCompleted
                        ? 0
                        : tasks.filter(
                            (t) => t.folderId === folder._id && t.status === "completed",
                          ).length;
                      return (
                        <div
                          key={folder._id}
                          className="rounded-xl border border-border/40 bg-background/60"
                        >
                          <div className="group/fold flex items-center gap-2 px-3.5 py-2.5">
                            <Folder className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span className="text-xs font-semibold">{folder.name}</span>
                            <span className="text-[10px] text-muted-foreground/50">
                              {folderTasks.length} task{folderTasks.length === 1 ? "" : "s"}
                              {hiddenDone > 0 && ` · ${hiddenDone} completed`}
                            </span>
                            <div className="ml-auto flex items-center gap-0.5">
                              <button
                                onClick={() => setFolderToRename(folder)}
                                title="Rename folder group"
                                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-muted/50 hover:text-emerald-600 group-hover/fold:opacity-100"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setFolderToDelete(folder)}
                                title="Delete folder group"
                                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-500 group-hover/fold:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setTaskDialogFor(folder)}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-600/10"
                              >
                                <Plus className="h-3 w-3" /> Task
                              </button>
                            </div>
                          </div>

                          {folderTasks.length > 0 && (
                            <div className="divide-y divide-border/30 border-t border-border/30">
                              {folderTasks.map((task) => {
                                const assignees = (task.assigneeIds || [])
                                  .map((id) => membersById.get(id))
                                  .filter(Boolean);
                                const overdue =
                                  task.deadline &&
                                  task.status !== "completed" &&
                                  new Date(task.deadline) < new Date();
                                return (
                                  <button
                                    key={task._id}
                                    onClick={() => setOpenTaskId(task._id)}
                                    className={cn(
                                      "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/30",
                                      task.unseenForMe &&
                                        "border-l-2 border-l-emerald-500 bg-emerald-500/6",
                                    )}
                                  >
                                    <TaskStatusBadge status={task.status} />
                                    {(task.priority === "urgent" || task.priority === "high") && (
                                      <PriorityIcon priority={task.priority} className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    {task.unseenForMe && (
                                      <span
                                        title="New activity since you last opened this task"
                                        className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                                      />
                                    )}
                                    <span
                                      className={cn(
                                        "min-w-0 flex-1 truncate text-xs font-medium",
                                        task.unseenForMe && "font-semibold",
                                      )}
                                    >
                                      {task.title}
                                    </span>
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
                                    {task.deadline && (
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 text-[10px]",
                                          overdue
                                            ? "font-semibold text-rose-500"
                                            : "text-muted-foreground/60",
                                        )}
                                      >
                                        <CalendarDays className="h-3 w-3" />
                                        {fmtDate(task.deadline)}
                                      </span>
                                    )}
                                    {assignees.length > 0 && (
                                      <span className="flex shrink-0 -space-x-1">
                                        {assignees.slice(0, 3).map((a) => (
                                          <MemberAvatar key={a!._id} member={a} size="xs" />
                                        ))}
                                        {assignees.length > 3 && (
                                          <span className="z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-[8px] font-semibold text-muted-foreground">
                                            +{assignees.length - 3}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* ── Create dialogs ── */}
      <NameDialog
        open={sectionDialogOpen}
        title="New Section"
        description="Sections organize your project by department, phase, or work category."
        placeholder="e.g. Backend Development"
        onClose={() => setSectionDialogOpen(false)}
        onSubmit={async (name) => {
          await apiClient.post(`/api/crm/projects/groups/${groupId}/sections`, { name });
          setSectionDialogOpen(false);
          loadTree();
        }}
      />

      <NameDialog
        open={!!folderDialogFor}
        title={`New Folder Group${folderDialogFor ? ` · ${folderDialogFor.name}` : ""}`}
        description="Folder groups hold related tasks inside a section."
        placeholder="e.g. API Endpoints"
        onClose={() => setFolderDialogFor(null)}
        onSubmit={async (name) => {
          await apiClient.post(
            `/api/crm/projects/sections/${folderDialogFor!._id}/folders`,
            { name },
          );
          setFolderDialogFor(null);
          loadTree();
        }}
      />

      {/* ── Rename dialogs ── */}
      <NameDialog
        open={!!sectionToRename}
        title="Rename Section"
        description="Any group member can rename a section."
        placeholder="Section name"
        initialValue={sectionToRename?.name ?? ""}
        submitLabel="Save"
        onClose={() => setSectionToRename(null)}
        onSubmit={async (name) => {
          await apiClient.patch(`/api/crm/projects/sections/${sectionToRename!._id}`, { name });
          setSectionToRename(null);
          loadTree();
        }}
      />

      <NameDialog
        open={!!folderToRename}
        title="Rename Folder Group"
        description="Any group member can rename a folder group."
        placeholder="Folder group name"
        initialValue={folderToRename?.name ?? ""}
        submitLabel="Save"
        onClose={() => setFolderToRename(null)}
        onSubmit={async (name) => {
          await apiClient.patch(`/api/crm/projects/folders/${folderToRename!._id}`, { name });
          setFolderToRename(null);
          loadTree();
        }}
      />

      {/* ── Delete confirmations ── */}
      <ConfirmDialog
        open={!!sectionToDelete}
        title="Delete this section?"
        description={`"${sectionToDelete?.name ?? ""}" and the folder groups and tasks inside it will no longer be visible. Only the section creator, the group creator, or an admin can do this.`}
        loading={deleting}
        onCancel={() => setSectionToDelete(null)}
        onConfirm={deleteSection}
      />

      <ConfirmDialog
        open={!!folderToDelete}
        title="Delete this folder group?"
        description={`"${folderToDelete?.name ?? ""}" and the tasks inside it will no longer be visible. Only the folder creator, the group creator, or an admin can do this.`}
        loading={deleting}
        onCancel={() => setFolderToDelete(null)}
        onConfirm={deleteFolder}
      />

      <CreateTaskDialog
        folder={taskDialogFor}
        members={members}
        onClose={() => setTaskDialogFor(null)}
        onCreated={() => {
          setTaskDialogFor(null);
          loadTree();
        }}
      />

      <TaskDetailDialog
        taskId={openTaskId}
        meId={meId}
        socket={socket}
        onClose={() => setOpenTaskId(null)}
        onChanged={loadTree}
        onDeleted={loadTree}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  GENERIC NAME DIALOG (create / rename sections & folders)               */
/* ══════════════════════════════════════════════════════════════════════ */

function NameDialog({
  open,
  title,
  description,
  placeholder,
  initialValue = "",
  submitLabel = "Create",
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  placeholder: string;
  initialValue?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(initialValue);
      setError("");
    }
  }, [open, initialValue]);

  const submit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(name.trim());
    } catch (err: any) {
      setError(errMsg(err, "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{title}</DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground/60">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={placeholder}
            disabled={saving}
            autoFocus
            className="h-10 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
          />
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
              className="h-10 flex-1 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  CREATE TASK DIALOG                                                     */
/* ══════════════════════════════════════════════════════════════════════ */

const CREATE_TASK_MAX_FILES = 10;
const CREATE_TASK_MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Thumbnail for a not-yet-uploaded File — image preview or a filename chip. */
function PendingFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isImage) return;
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [file, isImage]);

  if (isImage) {
    return (
      <div className="group/pf relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/20">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="h-full w-full object-cover" />
        )}
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground/70 opacity-0 shadow-sm transition-opacity hover:border-rose-500/50 hover:text-rose-500 group-hover/pf:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5 text-[11px]">
      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span className="min-w-0 flex-1 truncate">{file.name}</span>
      <span className="shrink-0 text-muted-foreground/50">{fmtSize(file.size)}</span>
      <button onClick={onRemove} title="Remove" className="shrink-0 text-muted-foreground/50 hover:text-rose-500">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CreateTaskDialog({
  folder,
  members,
  onClose,
  onCreated,
}: {
  folder: FolderGroup | null;
  members: Member[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assignees, setAssignees] = React.useState<Member[]>([]);
  const [priority, setPriority] = React.useState<ProjectTaskPriority | null>("normal");
  const [startDate, setStartDate] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileNote, setFileNote] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!folder) {
      setTitle(""); setDescription(""); setAssignees([]); setPriority("normal");
      setStartDate(""); setDeadline(""); setFiles([]); setFileNote(""); setError("");
    }
  }, [folder]);

  const addFiles = (list: FileList | File[] | null) => {
    const picked = list ? Array.from(list) : [];
    if (picked.length === 0) return;
    const tooBig = picked.filter((f) => f.size > CREATE_TASK_MAX_FILE_BYTES);
    const ok = picked.filter((f) => f.size <= CREATE_TASK_MAX_FILE_BYTES);
    setFiles((prev) => [...prev, ...ok].slice(0, CREATE_TASK_MAX_FILES));
    setFileNote(
      tooBig.length > 0
        ? `${tooBig.map((f) => f.name).join(", ")} ${tooBig.length > 1 ? "are" : "is"} over 25 MB and ${tooBig.length > 1 ? "were" : "was"} skipped.`
        : "",
    );
  };

  const submit = async () => {
    setError("");
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      if (description.trim()) form.append("description", description.trim());
      form.append("priority", priority ?? "");
      // Repeated multipart fields — the backend normalizes string | string[].
      assignees.forEach((m) => form.append("assigneeIds", m._id));
      if (startDate) form.append("startDate", startDate);
      if (deadline) form.append("deadline", deadline);
      files.forEach((f) => form.append("attachments", f));

      await apiClient.post(`/api/crm/projects/folders/${folder!._id}/tasks`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onCreated();
    } catch (err: any) {
      setError(errMsg(err, "Failed to create the task."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!folder} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="relative gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/60 to-transparent" />

        <DialogHeader className="space-y-0 border-b border-border/40 px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-inset ring-white/20">
              <Plus className="h-5 w-5" />
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-sm font-bold">New Task</DialogTitle>
              <DialogDescription asChild>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60">
                  <Folder className="h-3 w-3 shrink-0" />
                  <span className="truncate">{folder ? folder.name : ""}</span>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              disabled={saving}
              autoFocus
              className="h-11 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, requirements, links…"
              rows={3}
              disabled={saving}
              className="w-full resize-none rounded-xl border border-border/70 bg-background p-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="h-px bg-border/40" />

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-foreground/75">
              <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
              Assignees <span className="text-muted-foreground/50">(select one or more)</span>
            </Label>
            <AssigneeMultiSelect
              members={members}
              selected={assignees}
              onChange={setAssignees}
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground/75">Priority</Label>
            <PrioritySelect priority={priority} onChange={setPriority} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-foreground/75">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/50" /> Start date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving}
                className="h-10 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-foreground/75">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/50" /> Deadline
              </Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={saving}
                className="h-10 rounded-xl border-border/70 text-sm focus-visible:ring-emerald-500/30"
              />
            </div>
          </div>

          <div className="h-px bg-border/40" />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-foreground/75">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50" /> Attachments
              </Label>
              {files.length > 0 && (
                <span className="text-[10px] font-semibold text-muted-foreground/50">
                  {files.length}/{CREATE_TASK_MAX_FILES}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => !saving && fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                if (!saving) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!saving) addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed py-4 text-center transition-colors",
                saving && "pointer-events-none opacity-60",
                dragOver
                  ? "border-emerald-500/60 bg-emerald-500/5"
                  : "border-border/60 hover:border-emerald-500/40 hover:bg-muted/20",
              )}
            >
              <Paperclip className={cn("h-4 w-4", dragOver ? "text-emerald-500" : "text-muted-foreground/50")} />
              <p className="text-xs font-medium text-muted-foreground/70">
                <span className="text-emerald-600">Click to upload</span> or drag & drop
              </p>
              <p className="text-[10px] text-muted-foreground/45">
                Up to {CREATE_TASK_MAX_FILES} files, 25 MB each · images, docs, videos
              </p>
            </div>
            {fileNote && <p className="text-[10px] text-amber-600">{fileNote}</p>}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {files.map((f, i) => (
                  <PendingFilePreview
                    key={`${f.name}-${f.size}-${i}`}
                    file={f}
                    onRemove={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-[11px] text-rose-500">{error}</p>}

          <div className="flex gap-2 pt-1">
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Creating…" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}