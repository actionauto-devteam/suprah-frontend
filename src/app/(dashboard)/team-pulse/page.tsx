"use client";

import * as React from "react";
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isSameDay,
  isThisWeek,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Timer,
  Trash2,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  useTeamMembers,
  useTeamAbsences,
  useCreateAbsence,
  useDeleteAbsence,
  useBoardNotes,
  useCreateBoardNote,
  useDeleteBoardNote,
  useTogglePinNote,
  useUpdateMyStatus,
  type TeamMember,
  type Absence,
  type AbsenceType,
  type BoardNote,
  type NoteColor,
  type OnlineStatus,
} from "@/hooks/useTeamPulse";
import { useUser } from "@/providers/AuthProvider";
import { onlineStatusOptions } from "@/components/profile/profile-constants";
import { cn } from "@/lib/utils";

// ── Status config ─────────────────────────────────────────────────────────────

const S = {
  dot: { online: "bg-green-500", idle: "bg-amber-500", away: "bg-yellow-500", busy: "bg-red-500", do_not_disturb: "bg-purple-500", offline: "bg-gray-400" } as Record<OnlineStatus, string>,
  label: { online: "Online", idle: "Idle", away: "Away", busy: "Busy", do_not_disturb: "DND", offline: "Offline" } as Record<OnlineStatus, string>,
  ring: { online: "ring-green-500/40", idle: "ring-amber-500/40", away: "ring-yellow-500/40", busy: "ring-red-500/40", do_not_disturb: "ring-purple-500/40", offline: "ring-border/20" } as Record<OnlineStatus, string>,
  badge: {
    online: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40",
    idle: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40",
    away: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40",
    busy: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40",
    do_not_disturb: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40",
    offline: "bg-muted/60 text-muted-foreground border-border/30",
  } as Record<OnlineStatus, string>,
  border: { online: "border-l-green-500", idle: "border-l-amber-500", away: "border-l-yellow-500", busy: "border-l-red-500", do_not_disturb: "border-l-purple-500", offline: "border-l-border/40" } as Record<OnlineStatus, string>,
};

const ROLE_STYLE: Record<string, string> = {
  super_admin: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
  admin: "bg-primary/10 text-primary border-primary/20",
  employee: "bg-muted/60 text-muted-foreground border-border/30",
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  employee: "Employee",
};

// ── Absence config ────────────────────────────────────────────────────────────

const A: Record<AbsenceType, { label: string; dot: string; pill: string; card: string }> = {
  absence: { label: "Absent", dot: "bg-red-400", pill: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", card: "bg-red-50/80 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30" },
  day_off: { label: "Day Off", dot: "bg-blue-400", pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400", card: "bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30" },
  vacation: { label: "Vacation", dot: "bg-purple-400", pill: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400", card: "bg-purple-50/80 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/30" },
  sick: { label: "Sick", dot: "bg-orange-400", pill: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400", card: "bg-orange-50/80 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30" },
  wfh: { label: "WFH", dot: "bg-teal-400", pill: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400", card: "bg-teal-50/80 dark:bg-teal-950/20 border-teal-200/50 dark:border-teal-800/30" },
  other: { label: "Other", dot: "bg-gray-400", pill: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400", card: "bg-gray-50/80 dark:bg-gray-900/20 border-gray-200/50 dark:border-gray-700/30" },
};

// ── Note config ───────────────────────────────────────────────────────────────

const N: Record<NoteColor, { bg: string; top: string; pin: string; pinHex: string }> = {
  yellow: { bg: "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200/80 dark:border-yellow-800/40", top: "bg-yellow-100/90 dark:bg-yellow-900/60", pin: "bg-yellow-400", pinHex: "#facc15" },
  blue: { bg: "bg-sky-50 dark:bg-sky-950/50 border-sky-200/80 dark:border-sky-800/40", top: "bg-sky-100/90 dark:bg-sky-900/60", pin: "bg-sky-400", pinHex: "#38bdf8" },
  green: { bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/40", top: "bg-emerald-100/90 dark:bg-emerald-900/60", pin: "bg-emerald-400", pinHex: "#34d399" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950/50 border-pink-200/80 dark:border-pink-800/40", top: "bg-pink-100/90 dark:bg-pink-900/60", pin: "bg-pink-400", pinHex: "#f472b6" },
  purple: { bg: "bg-violet-50 dark:bg-violet-950/50 border-violet-200/80 dark:border-violet-800/40", top: "bg-violet-100/90 dark:bg-violet-900/60", pin: "bg-violet-400", pinHex: "#a78bfa" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/50 border-orange-200/80 dark:border-orange-800/40", top: "bg-orange-100/90 dark:bg-orange-900/60", pin: "bg-orange-400", pinHex: "#fb923c" },
};

const NOTE_SKEWS = ["-rotate-[1.1deg]", "rotate-[0.9deg]", "-rotate-[0.5deg]", "rotate-[1.4deg]", "-rotate-[0.7deg]", "rotate-[0.4deg]"];

const DURATION_OPTS = [
  { label: "1 day", v: 1 },
  { label: "3 days", v: 3 },
  { label: "1 week", v: 7 },
  { label: "2 weeks", v: 14 },
  { label: "1 month", v: 30 },
  { label: "Permanent", v: 0 },
];

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function StatusDot({ status, size = "sm" }: { status: OnlineStatus; size?: "sm" | "md" }) {
  return (
    <span className={cn(
      "rounded-full shrink-0 ring-2 ring-background",
      S.dot[status],
      size === "sm" ? "size-2.5" : "size-3.5",
    )} />
  );
}

function PushPin({ color }: { color: string }) {
  return (
    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center drop-shadow-md">
      <div className={cn("size-4 rounded-full border-2 border-white/60 shadow-inner", color)} />
      <div className="w-px h-2.5 bg-gray-500/50" />
    </div>
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────

function MemberCard({
  member, isMe, onLeaveToday,
}: {
  member: TeamMember; isMe: boolean; onLeaveToday: Absence | undefined;
}) {
  const status = (member.onlineStatus ?? "offline") as OnlineStatus;
  const since = member.lastActive
    ? formatDistanceToNow(parseISO(member.lastActive), { addSuffix: true })
    : null;

  return (
    <div className={cn(
      "group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-l-[3px]",
      "bg-card hover:bg-accent/20 transition-all duration-150 cursor-default",
      S.border[status],
      isMe && "ring-1 ring-primary/20",
    )}>
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className={cn("size-10 ring-2 ring-offset-2 ring-offset-background", S.ring[status])}>
          <AvatarImage src={member.avatar} />
          <AvatarFallback className="text-sm font-black bg-muted/60">{member.name[0]}</AvatarFallback>
        </Avatar>
        <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-[1.5px] border-background", S.dot[status])} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="font-bold text-sm tracking-tight truncate max-w-40">{member.name}</span>
          {isMe && <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">(you)</span>}
          <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border ml-auto", ROLE_STYLE[member.role] ?? ROLE_STYLE.employee)}>
            {ROLE_LABEL[member.role] ?? member.role}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {member.personalInfo?.jobTitle ? (
            <>
              <Briefcase className="size-2.5 shrink-0 opacity-50" />
              <span className="truncate max-w-30">{member.personalInfo.jobTitle}</span>
            </>
          ) : null}
          {member.personalInfo?.department && (
            <>
              <span className="opacity-30 mx-0.5">·</span>
              <Building2 className="size-2.5 shrink-0 opacity-50" />
              <span className="truncate max-w-25">{member.personalInfo.department}</span>
            </>
          )}
        </div>
        {member.customStatus && (
          <p className="text-[10px] italic text-muted-foreground/50 truncate mt-0.5">"{member.customStatus}"</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {onLeaveToday ? (
          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide", A[onLeaveToday.type]?.pill)}>
            {A[onLeaveToday.type]?.label}
          </span>
        ) : (
          <Badge variant="outline" className={cn("text-[10px] font-semibold h-5 px-2 gap-1 border", S.badge[status])}>
            <StatusDot status={status} size="sm" />
            {S.label[status]}
          </Badge>
        )}
        {status === "offline" && since && (
          <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5 tabular-nums">
            <Clock className="size-2.5" />{since}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Note Card (bulletin board) ────────────────────────────────────────────────

function NoteCard({
  note, index, isMe, isAdmin, onDelete, onPin,
}: {
  note: BoardNote; index: number; isMe: boolean; isAdmin: boolean;
  onDelete: () => void; onPin: () => void;
}) {
  const style = N[note.color] ?? N.yellow;
  const skew = NOTE_SKEWS[index % NOTE_SKEWS.length];
  const daysLeft = note.expiresAt
    ? differenceInCalendarDays(parseISO(note.expiresAt), new Date())
    : null;

  return (
    <div className={cn(
      "relative pt-4 transition-all duration-200 hover:rotate-0! hover:scale-[1.03] hover:z-20",
      skew,
    )}>
      <PushPin color={style.pin} />
      <div className={cn("rounded-xl border shadow-md overflow-hidden flex flex-col min-h-30", style.bg)}>
        {/* Note header */}
        <div className={cn("px-3 pt-2.5 pb-2 flex items-start gap-2", style.top)}>
          <Avatar className="size-5 shrink-0 mt-0.5">
            <AvatarImage src={note.userAvatar} />
            <AvatarFallback className="text-[8px] font-bold">{note.userName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {note.title && <p className="text-[11px] font-black tracking-tight truncate leading-tight">{note.title}</p>}
            <p className="text-[10px] text-muted-foreground/70 truncate">{note.userName}</p>
          </div>
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {note.pinned && <Pin className="size-2.5 text-muted-foreground mt-0.5" />}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onPin}
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    {note.pinned ? <PinOff className="size-3 text-muted-foreground" /> : <Pin className="size-3 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{note.pinned ? "Unpin" : "Pin to top"}</TooltipContent>
              </Tooltip>
            )}
            {(isMe || isAdmin) && (
              <button onClick={onDelete} className="p-0.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500">
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-3 py-2.5 flex-1">
          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">{note.content}</p>
        </div>

        {/* Footer */}
        <div className="px-3 pb-2.5 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground/50">{format(parseISO(note.createdAt), "MMM d · h:mm a")}</span>
          {daysLeft !== null && (
            <span className={cn(
              "text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
              daysLeft <= 0 ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400" :
                daysLeft <= 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" :
                  "bg-muted/60 text-muted-foreground",
            )}>
              <Timer className="size-2.5" />
              {daysLeft <= 0 ? "Expiring soon" : `${daysLeft}d left`}
            </span>
          )}
          {daysLeft === null && (
            <span className="text-[9px] text-muted-foreground/30 font-medium italic">Permanent</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type TabId = "team" | "calendar" | "board";

export default function TeamPulsePage() {
  const { user } = useUser();

  // ── State ────────────────────────────────────────────────────────────────
  const [tab, setTab] = React.useState<TabId>("team");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [deptFilter, setDeptFilter] = React.useState<string>("all");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  const [calMonth, setCalMonth] = React.useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [absType, setAbsType] = React.useState<AbsenceType>("day_off");
  const [absNote, setAbsNote] = React.useState("");

  const [noteDialog, setNoteDialog] = React.useState(false);
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");
  const [noteColor, setNoteColor] = React.useState<NoteColor>("yellow");
  const [noteDuration, setNoteDuration] = React.useState(7);

  const [myStatus, setMyStatus] = React.useState<OnlineStatus>("offline");
  const [myCustomStatus, setMyCustomStatus] = React.useState("");

  const calYear = calMonth.getFullYear();
  const calMonthNum = calMonth.getMonth() + 1;

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: members = [], isLoading: membersLoading } = useTeamMembers();
  const { data: absences = [] } = useTeamAbsences(calYear, calMonthNum);
  const { data: boardNotes = [], isLoading: boardLoading } = useBoardNotes();

  const createAbsence = useCreateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const createNote = useCreateBoardNote();
  const deleteNote = useDeleteBoardNote();
  const pinNote = useTogglePinNote();
  const updateStatus = useUpdateMyStatus();

  React.useEffect(() => {
    const me = members.find((m) => m.name === user?.fullName);
    if (me) { setMyStatus(me.onlineStatus ?? "offline"); setMyCustomStatus(me.customStatus ?? ""); }
  }, [members, user?.fullName]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const myMember = members.find((m) => m.name === user?.fullName);
  const isAdmin = ["admin", "super_admin"].includes(myMember?.role ?? "");

  const counts = React.useMemo(() => ({
    all: members.length,
    online: members.filter((m) => m.onlineStatus === "online").length,
    idle: members.filter((m) => m.onlineStatus === "idle").length,
    away: members.filter((m) => m.onlineStatus === "away").length,
    busy: members.filter((m) => m.onlineStatus === "busy").length,
    do_not_disturb: members.filter((m) => m.onlineStatus === "do_not_disturb").length,
    offline: members.filter((m) => m.onlineStatus === "offline").length,
  }), [members]);

  const departments = React.useMemo(
    () => [...new Set(members.map((m) => m.personalInfo?.department).filter(Boolean))] as string[],
    [members]
  );

  const roles = React.useMemo(
    () => [...new Set(members.map((m) => m.role))],
    [members]
  );

  const todayAbsences = React.useMemo(
    () => absences.filter((a) => isSameDay(parseISO(a.date), new Date())),
    [absences]
  );

  const filtered = React.useMemo(() => members.filter((m) => {
    const q = search.toLowerCase();
    const ms = !q || m.name.toLowerCase().includes(q) ||
      (m.personalInfo?.jobTitle ?? "").toLowerCase().includes(q) ||
      (m.personalInfo?.department ?? "").toLowerCase().includes(q);
    const ss = statusFilter === "all" || m.onlineStatus === statusFilter;
    const ds = deptFilter === "all" || m.personalInfo?.department === deptFilter;
    const rs = roleFilter === "all" || m.role === roleFilter;
    return ms && ss && ds && rs;
  }), [members, search, statusFilter, deptFilter, roleFilter]);

  const dayAbsences = selectedDay ? absences.filter((a) => isSameDay(parseISO(a.date), selectedDay)) : [];
  const myDayAbsence = dayAbsences.find((a) => a.userName === user?.fullName);
  const myMonthAbsences = absences.filter((a) => a.userName === user?.fullName);
  const weekAbsences = absences.filter((a) => isThisWeek(parseISO(a.date)));

  const pinnedNotes = boardNotes.filter((n) => n.pinned);
  const unpinnedNotes = boardNotes.filter((n) => !n.pinned);

  const currentStatus = onlineStatusOptions.find((o) => o.value === myStatus) ?? onlineStatusOptions[0];
  const hasFilters = search || statusFilter !== "all" || deptFilter !== "all" || roleFilter !== "all";

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAddAbsence() {
    if (!selectedDay) return;
    try {
      await createAbsence.mutateAsync({ date: selectedDay.toISOString(), type: absType, note: absNote.trim() || undefined });
      toast.success(`${A[absType].label} marked for ${format(selectedDay, "MMM d")}`);
      setAbsNote("");
    } catch (err: any) { toast.error(err?.response?.data?.message ?? "Failed to save"); }
  }

  async function handleDeleteAbsence(id: string) {
    try { await deleteAbsence.mutateAsync(id); toast.success("Entry removed"); }
    catch { toast.error("Failed to remove"); }
  }

  async function handlePostNote() {
    if (!noteBody.trim()) return;
    try {
      await createNote.mutateAsync({ title: noteTitle.trim() || undefined, content: noteBody.trim(), color: noteColor, durationDays: noteDuration === 0 ? null : noteDuration });
      toast.success("Note posted to the board");
      setNoteTitle(""); setNoteBody(""); setNoteColor("yellow"); setNoteDuration(7);
      setNoteDialog(false);
    } catch { toast.error("Failed to post"); }
  }

  async function handleStatusChange(s: OnlineStatus) {
    const prev = myStatus;
    setMyStatus(s);
    try {
      await updateStatus.mutateAsync({ status: s, customStatus: myCustomStatus });
      toast.success(`Status set to ${S.label[s]}`);
    } catch { setMyStatus(prev); toast.error("Failed to update status"); }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 sm:p-8 space-y-0 container mx-auto pb-16 animate-in fade-in duration-500">

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/8 border border-primary/15">
                <Zap className="size-3 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live</span>
              </div>
              <div className="flex gap-1 items-center text-[11px] text-muted-foreground font-medium">
                <StatusDot status="online" size="sm" />
                <span className="font-black text-foreground">{counts.online}</span> online
                <span className="mx-1 opacity-30">·</span>
                <span className="font-black text-foreground">{members.filter(m => m.onlineStatus !== "offline").length}</span> active
                <span className="mx-1 opacity-30">·</span>
                <span className="font-black text-foreground">{members.length}</span> total
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
              Team <span className="text-primary">Pulse</span>
            </h1>
          </div>

          {/* My status changer */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 font-semibold border-border/60 hover:border-primary/30 self-start sm:self-auto">
                <span className={cn("size-2.5 rounded-full", currentStatus.color)} />
                {currentStatus.label}
                {myCustomStatus && <span className="text-muted-foreground/60 text-xs truncate max-w-20 hidden md:inline">· {myCustomStatus}</span>}
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1">Your status</p>
              {onlineStatusOptions.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value as OnlineStatus)} className="gap-3 rounded-lg cursor-pointer py-2 px-2">
                  <span className={cn("size-2.5 rounded-full shrink-0", opt.color)} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                  </div>
                  {myStatus === opt.value && <span className="text-primary font-black text-sm">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ══ TAB NAV ═══════════════════════════════════════════════════════ */}
        <div className="border-b border-border/40 mb-6">
          <div className="flex gap-0">
            {([
              { id: "team" as TabId, icon: Users, label: "Team Directory", count: members.length },
              { id: "calendar" as TabId, icon: CalendarDays, label: "Team Calendar", count: null },
              { id: "board" as TabId, icon: StickyNote, label: "Bulletin Board", count: boardNotes.length },
            ] as const).map(({ id, icon: Icon, label, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                  tab === id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
                )}
              >
                <Icon className={cn("size-4", tab === id ? "text-primary" : "")} />
                {label}
                {count !== null && count > 0 && (
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-4.5 text-center",
                    tab === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}>
                    {count}
                  </span>
                )}
                {tab === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TEAM TAB ══════════════════════════════════════════════════════ */}
        {tab === "team" && (
          <div className="space-y-4">
            {/* Compact status filter row */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { key: "all", label: "All", dot: "bg-foreground/40" },
                { key: "online", label: "Online", dot: S.dot.online },
                { key: "busy", label: "Busy", dot: S.dot.busy },
                { key: "away", label: "Away", dot: S.dot.away },
                { key: "idle", label: "Idle", dot: S.dot.idle },
                { key: "do_not_disturb", label: "DND", dot: S.dot.do_not_disturb },
                { key: "offline", label: "Offline", dot: S.dot.offline },
              ].map((s) => {
                const c = s.key === "all" ? counts.all : counts[s.key as keyof typeof counts] ?? 0;
                const on = statusFilter === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setStatusFilter(s.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0",
                      on
                        ? "bg-foreground text-background shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", on ? "bg-background/80" : s.dot)} />
                    {s.label}
                    <span className={cn("font-black tabular-nums", on ? "text-background/70" : "text-muted-foreground/60")}>
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + extended filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative min-w-50 flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, title, dept…"
                  className="h-8 pl-8 pr-7 text-sm bg-muted/30 border-border/40 focus:border-primary/30"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {departments.length > 0 && (
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-8 text-xs w-auto min-w-32.5 bg-muted/30 border-border/40 gap-1.5">
                    <Building2 className="size-3 text-muted-foreground" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {roles.length > 1 && (
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 text-xs w-auto min-w-27.5 bg-muted/30 border-border/40 gap-1.5">
                    <Filter className="size-3 text-muted-foreground" />
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                    {roles.map((r) => <SelectItem key={r} value={r} className="text-xs capitalize">{ROLE_LABEL[r] ?? r}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground"
                  onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setRoleFilter("all"); }}>
                  <X className="size-3" /> Clear
                </Button>
              )}

              <span className="ml-auto text-[11px] text-muted-foreground/50 font-semibold tabular-nums">
                {filtered.length} / {members.length}
              </span>
            </div>

            {/* Today's absences mini-strip */}
            {todayAbsences.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400 shrink-0">Out today</span>
                {todayAbsences.map((a) => (
                  <div key={a._id} className="flex items-center gap-1.5">
                    <Avatar className="size-4 shrink-0">
                      <AvatarImage src={a.userAvatar} />
                      <AvatarFallback className="text-[8px]">{a.userName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{a.userName.split(" ")[0]}</span>
                    <span className={cn("text-[9px] font-bold px-1 py-0 rounded", A[a.type as AbsenceType]?.pill)}>{A[a.type as AbsenceType]?.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Member list */}
            {membersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-17 rounded-2xl bg-muted/20 animate-pulse border border-border/10" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 border border-dashed border-border/30 rounded-2xl">
                <WifiOff className="size-8 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No members match your filters</p>
                <Button variant="link" size="sm" className="text-xs" onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setRoleFilter("all"); }}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto pr-0.5 no-scrollbar" style={{ maxHeight: 520 }}>
                {filtered.map((m) => (
                  <MemberCard
                    key={m._id}
                    member={m}
                    isMe={m.name === user?.fullName}
                    onLeaveToday={todayAbsences.find((a) => a.userName === m.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CALENDAR TAB ══════════════════════════════════════════════════ */}
        {tab === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Calendar card */}
            <Card className="lg:col-span-7 border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="pb-0 pt-5 px-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-lg tracking-tight">Team Calendar</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Shared · Click any date to view or mark
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg"
                      onClick={() => setCalMonth(new Date(calYear, calMonthNum - 2, 1))}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm font-black px-2 min-w-27.5 text-center">{format(calMonth, "MMMM yyyy")}</span>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg"
                      onClick={() => setCalMonth(new Date(calYear, calMonthNum, 1))}>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                <Calendar
                  mode="single"
                  month={calMonth}
                  onMonthChange={setCalMonth}
                  selected={selectedDay ?? undefined}
                  onDayClick={(day) => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  showOutsideDays={false}
                  hideNavigation
                  className="w-full [--cell-size:--spacing(12)]"
                  classNames={{ month_caption: "hidden" }}
                  components={{
                    DayButton: ({ day, modifiers, ...props }: any) => {
                      const hits = absences.filter((a) => isSameDay(parseISO(a.date), day.date));
                      const isSel = selectedDay && isSameDay(day.date, selectedDay);
                      const isToday = isSameDay(day.date, new Date());
                      const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                      return (
                        <button
                          {...props}
                          className={cn(
                            "flex flex-col items-center justify-start w-full h-full rounded-xl pt-1.5 pb-1 transition-all group/day",
                            "hover:bg-primary/8 active:scale-95 cursor-pointer",
                            isSel ? "bg-primary text-primary-foreground shadow-md" : "",
                            isToday && !isSel ? "ring-2 ring-primary/40 ring-inset" : "",
                            isWeekend && !isSel ? "bg-muted/20" : "",
                            modifiers.outside ? "opacity-20 pointer-events-none" : "",
                          )}
                        >
                          <span className={cn("text-xs font-bold leading-none", isToday && !isSel ? "text-primary" : "")}>
                            {day.date.getDate()}
                          </span>
                          {hits.length > 0 && (
                            <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center px-1 max-w-full">
                              {hits.slice(0, 4).map((a) => (
                                <span key={a._id} className={cn("size-1.5 rounded-full", A[a.type as AbsenceType]?.dot ?? "bg-gray-400", isSel ? "opacity-80" : "")} />
                              ))}
                              {hits.length > 4 && (
                                <span className={cn("text-[7px] leading-none font-black", isSel ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                                  +{hits.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                          {hits.length === 0 && isToday && (
                            <span className={cn("size-1 rounded-full mt-1.5", isSel ? "bg-primary-foreground/50" : "bg-primary/40")} />
                          )}
                        </button>
                      );
                    },
                  }}
                />

                {/* Legend */}
                <div className="mt-3 pt-3 border-t border-border/20 flex flex-wrap gap-x-4 gap-y-1.5">
                  {(Object.entries(A) as [AbsenceType, { label: string; dot: string }][]).map(([type, cfg]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", cfg.dot)} />
                      <span className="text-[10px] text-muted-foreground/70 font-medium">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Right panel */}
            <div className="lg:col-span-5 flex flex-col gap-4">

              {/* Who's out this week */}
              {weekAbsences.length > 0 && (
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="py-3.5 px-4 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Out this week</h3>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-1.5">
                    {weekAbsences.slice(0, 5).map((a) => (
                      <div key={a._id} className="flex items-center gap-2.5">
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={a.userAvatar} />
                          <AvatarFallback className="text-[9px]">{a.userName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold">{a.userName.split(" ")[0]}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">{format(parseISO(a.date), "EEE d")}</span>
                        </div>
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0", A[a.type as AbsenceType]?.pill)}>
                          {A[a.type as AbsenceType]?.label}
                        </span>
                      </div>
                    ))}
                    {weekAbsences.length > 5 && (
                      <p className="text-[10px] text-muted-foreground/50 text-center pt-1">+{weekAbsences.length - 5} more</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Day detail */}
              {selectedDay ? (
                <Card className="border-border/40 shadow-sm flex-1">
                  <CardHeader className="py-3.5 px-4 border-b border-border/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-base tracking-tight">{format(selectedDay, "EEEE, MMMM d")}</h3>
                        <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">
                          {dayAbsences.length} {dayAbsences.length === 1 ? "entry" : "entries"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/50 -mt-0.5" onClick={() => setSelectedDay(null)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {dayAbsences.length > 0 ? (
                      <div className="space-y-2">
                        {dayAbsences.map((a) => {
                          const cfg = A[a.type as AbsenceType];
                          const canDel = a.userName === user?.fullName || isAdmin;
                          return (
                            <div key={a._id} className={cn("flex items-start gap-3 p-3 rounded-xl border", cfg.card)}>
                              <Avatar className="size-8 shrink-0">
                                <AvatarImage src={a.userAvatar} />
                                <AvatarFallback className="text-xs font-bold">{a.userName[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold">{a.userName}</span>
                                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1", cfg.pill)}>
                                    <span className={cn("size-1.5 rounded-full", cfg.dot)} />{cfg.label}
                                  </span>
                                </div>
                                {a.note && <p className="text-xs text-muted-foreground/70 mt-0.5">{a.note}</p>}
                              </div>
                              {canDel && (
                                <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-40 hover:opacity-100 hover:text-destructive"
                                  onClick={() => handleDeleteAbsence(a._id)}>
                                  <Trash2 className="size-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-5 border border-dashed border-border/25 rounded-xl text-center">
                        <CalendarDays className="size-5 text-muted-foreground/20 mb-1.5" />
                        <p className="text-xs text-muted-foreground/50">No entries for this day</p>
                      </div>
                    )}

                    {!myDayAbsence && (
                      <div className="space-y-3 pt-1 border-t border-border/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Mark this day</p>
                        <Select value={absType} onValueChange={(v) => setAbsType(v as AbsenceType)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(A) as [AbsenceType, { label: string; dot: string }][]).map(([t, cfg]) => (
                              <SelectItem key={t} value={t} className="text-sm">
                                <span className="flex items-center gap-2">
                                  <span className={cn("size-2 rounded-full", cfg.dot)} />{cfg.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Textarea value={absNote} onChange={(e) => setAbsNote(e.target.value)} placeholder="Optional note…" className="text-sm resize-none h-14 bg-muted/20" maxLength={500} />
                        <Button className="w-full h-8 text-sm" onClick={handleAddAbsence} disabled={createAbsence.isPending}>
                          <Plus className="size-3.5 mr-1.5" />
                          {createAbsence.isPending ? "Saving…" : "Add Entry"}
                        </Button>
                      </div>
                    )}
                    {myDayAbsence && (
                      <p className="text-[10px] text-center text-muted-foreground/40 pt-1 border-t border-border/20">You already have an entry for this day</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/30 border-dashed flex-1">
                  <CardContent className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <div className="size-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
                      <CalendarDays className="size-5 text-primary" />
                    </div>
                    <p className="font-bold text-sm">Select a date</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1 leading-relaxed">Click any date on the calendar to view who's out or add your own entry.</p>
                  </CardContent>
                </Card>
              )}

              {/* My entries this month */}
              {myMonthAbsences.length > 0 && (
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="py-3 px-4 border-b border-border/10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">
                      My entries · {format(calMonth, "MMM yyyy")}
                    </h3>
                  </CardHeader>
                  <CardContent className="p-3 space-y-1">
                    {myMonthAbsences.map((a) => (
                      <div key={a._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/30 group/entry transition-colors">
                        <span className={cn("size-2 rounded-full shrink-0", A[a.type as AbsenceType]?.dot)} />
                        <span className="text-xs font-semibold">{format(parseISO(a.date), "MMM d")}</span>
                        <span className="text-xs text-muted-foreground flex-1">— {A[a.type as AbsenceType]?.label}</span>
                        {a.note && <span className="text-[10px] text-muted-foreground/40 truncate max-w-20 italic">{a.note}</span>}
                        <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover/entry:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          onClick={() => handleDeleteAbsence(a._id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ══ BOARD TAB ═════════════════════════════════════════════════════ */}
        {tab === "board" && (
          <div className="space-y-5">

            {/* Cork board banner */}
            <div className="relative rounded-2xl overflow-hidden border border-amber-800/20 shadow-sm">
              {/* Cork texture */}
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(ellipse at 2px 2px, rgba(120,80,30,0.12) 1.5px, transparent 0), radial-gradient(ellipse at 8px 8px, rgba(160,100,40,0.07) 1px, transparent 0)`,
                backgroundSize: "12px 12px, 18px 18px",
                backgroundColor: "rgb(252,247,237)",
              }} />
              <div className="absolute inset-0 dark:bg-amber-950/70" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StickyNote className="size-4 text-amber-700 dark:text-amber-400" />
                    <span className="font-black text-lg text-amber-900 dark:text-amber-100 tracking-tight">Team Bulletin Board</span>
                  </div>
                  <p className="text-xs text-amber-700/60 dark:text-amber-300/50">
                    {boardNotes.length === 0
                      ? "No notes yet — be the first to pin something"
                      : `${boardNotes.length} ${boardNotes.length === 1 ? "note" : "notes"} · ${pinnedNotes.length} pinned · ${unpinnedNotes.length} recent`
                    }
                  </p>
                </div>
                <Button
                  onClick={() => setNoteDialog(true)}
                  className="self-start sm:self-auto gap-2 bg-amber-700 hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0 shadow-md"
                >
                  <Pin className="size-4" />
                  Pin a Note
                </Button>
              </div>
            </div>

            {boardLoading ? (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid mb-5 h-36 rounded-xl bg-muted/20 animate-pulse border border-border/10" />
                ))}
              </div>
            ) : boardNotes.length === 0 ? (
              <div className="flex flex-col items-center py-20 border border-dashed border-amber-200/60 dark:border-amber-800/30 rounded-2xl">
                <div className="size-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 flex items-center justify-center mb-4">
                  <StickyNote className="size-7 text-amber-500" />
                </div>
                <p className="font-black text-base tracking-tight">The board is empty</p>
                <p className="text-xs text-muted-foreground/50 mt-1 mb-5">Be the first to pin a note for the team</p>
                <Button onClick={() => setNoteDialog(true)} className="gap-2 bg-amber-700 hover:bg-amber-800 text-white">
                  <Pin className="size-4" />Pin a Note
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pinned */}
                {pinnedNotes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Pin className="size-3 text-muted-foreground/50" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Pinned</span>
                      <Separator className="flex-1" />
                    </div>
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
                      {pinnedNotes.map((note, i) => (
                        <div key={note._id} className="break-inside-avoid mb-5 group">
                          <NoteCard
                            note={note} index={i} isMe={note.userName === user?.fullName} isAdmin={isAdmin}
                            onDelete={() => deleteNote.mutateAsync(note._id).then(() => toast.success("Removed")).catch(() => toast.error("Failed"))}
                            onPin={() => pinNote.mutateAsync(note._id).catch(() => toast.error("Failed"))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rest */}
                {unpinnedNotes.length > 0 && (
                  <div>
                    {pinnedNotes.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Recent</span>
                        <Separator className="flex-1" />
                      </div>
                    )}
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
                      {unpinnedNotes.map((note, i) => (
                        <div key={note._id} className="break-inside-avoid mb-5 group">
                          <NoteCard
                            note={note} index={i + pinnedNotes.length} isMe={note.userName === user?.fullName} isAdmin={isAdmin}
                            onDelete={() => deleteNote.mutateAsync(note._id).then(() => toast.success("Removed")).catch(() => toast.error("Failed"))}
                            onPin={() => pinNote.mutateAsync(note._id).catch(() => toast.error("Failed"))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Post Note Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Pin className="size-4 text-amber-600" />
              Pin a Note to the Board
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Title <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(optional)</span>
              </label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Announcement, Reminder, FYI…" className="h-9 text-sm" maxLength={100} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Content <span className="text-destructive">*</span>
              </label>
              <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write your message here…" className="text-sm resize-none h-28" maxLength={1000} />
              <p className="text-[10px] text-muted-foreground/40 text-right">{noteBody.length}/1000</p>
            </div>

            <div className="flex gap-4 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-35">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Duration</label>
                <Select value={String(noteDuration)} onValueChange={(v) => setNoteDuration(Number(v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTS.map((o) => <SelectItem key={o.v} value={String(o.v)} className="text-sm">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {noteDuration > 0 && (
                  <p className="text-[10px] text-muted-foreground/40">
                    Expires {format(new Date(Date.now() + noteDuration * 86400000), "MMM d, yyyy")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Color</label>
                <div className="flex gap-1.5 pt-0.5">
                  {(Object.keys(N) as NoteColor[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setNoteColor(c)}
                      style={{ backgroundColor: N[c].pinHex }}
                      className={cn(
                        "size-7 rounded-lg transition-all border-2",
                        noteColor === c ? "border-foreground/30 scale-110 shadow-md" : "border-transparent hover:scale-105 opacity-70 hover:opacity-100",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {(noteTitle || noteBody) && (
              <div className={cn("rounded-xl border p-3 space-y-1 text-sm", N[noteColor].bg)}>
                {noteTitle && <p className="font-black text-xs tracking-tight">{noteTitle}</p>}
                {noteBody && <p className="whitespace-pre-wrap wrap-break-word leading-relaxed text-sm">{noteBody}</p>}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setNoteDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0"
                onClick={handlePostNote} disabled={!noteBody.trim() || createNote.isPending}>
                <Pin className="size-3.5 mr-1.5" />
                {createNote.isPending ? "Posting…" : "Post to Board"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
