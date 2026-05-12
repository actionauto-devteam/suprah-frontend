"use client";

import * as React from "react";
import {
  differenceInCalendarDays, format, formatDistanceToNow,
  isSameDay, isThisWeek, parseISO,
} from "date-fns";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  AlertTriangle, Bell, Briefcase, Building2, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock, Edit2,
  Filter, LayoutGrid, MapPin, MessageCircle, Pencil, Pin, PinOff,
  Plus, Search, StickyNote, Timer, Trash2, Users, WifiOff, X, Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  useTeamMembers, useTeamAbsences, useCreateAbsence, useDeleteAbsence,
  useBoardNotes, useCreateBoardNote, useUpdateBoardNote, useDeleteBoardNote,
  useTogglePinNote, useReorderBoardNotes, useUpdateMyStatus, useTeamMemberProfile,
  type TeamMember, type Absence, type AbsenceType,
  type BoardNote, type NoteColor, type AnnouncementType, type OnlineStatus,
} from "@/hooks/useTeamPulse";
import { useUser } from "@/providers/AuthProvider";
import { onlineStatusOptions } from "@/components/profile/profile-constants";
import { DEPARTMENTS, DEPT_LABELS, deptLabel } from "@/lib/departments";
import { cn } from "@/lib/utils";

// ── Config maps ───────────────────────────────────────────────────────────────

const S = {
  dot: { online: "bg-green-500", idle: "bg-amber-500", away: "bg-yellow-500", busy: "bg-red-500", do_not_disturb: "bg-purple-500", offline: "bg-gray-400" } as Record<OnlineStatus, string>,
  label: { online: "Online", idle: "Idle", away: "Away", busy: "Busy", do_not_disturb: "DND", offline: "Offline" } as Record<OnlineStatus, string>,
  ring: { online: "ring-green-500/40", idle: "ring-amber-500/40", away: "ring-yellow-500/40", busy: "ring-red-500/40", do_not_disturb: "ring-purple-500/40", offline: "ring-border/20" } as Record<OnlineStatus, string>,
  badge: { online: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40", idle: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40", away: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40", busy: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40", do_not_disturb: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40", offline: "bg-muted/60 text-muted-foreground border-border/30" } as Record<OnlineStatus, string>,
  borderL: { online: "border-l-green-500", idle: "border-l-amber-500", away: "border-l-yellow-500", busy: "border-l-red-500", do_not_disturb: "border-l-purple-500", offline: "border-l-border/40" } as Record<OnlineStatus, string>,
};

const ROLE_STYLE: Record<string, string> = { super_admin: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400", admin: "bg-primary/10 text-primary border-primary/20", employee: "bg-muted/60 text-muted-foreground border-border/30" };
const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", employee: "Employee" };

const A: Record<AbsenceType, { label: string; dot: string; pill: string; card: string }> = {
  absence: { label: "Absent", dot: "bg-red-400", pill: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", card: "bg-red-50/80 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30" },
  day_off: { label: "Day Off", dot: "bg-blue-400", pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400", card: "bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30" },
  vacation: { label: "Vacation", dot: "bg-purple-400", pill: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400", card: "bg-purple-50/80 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/30" },
  sick: { label: "Sick", dot: "bg-orange-400", pill: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400", card: "bg-orange-50/80 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30" },
  other: { label: "Other", dot: "bg-gray-400", pill: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400", card: "bg-gray-50/80 dark:bg-gray-900/20 border-gray-200/50 dark:border-gray-700/30" },
};

const ANNOUNCE_CONFIG: Record<AnnouncementType, { label: string; icon: React.ComponentType<any>; badge: string; border: string }> = {
  general: { label: "General", icon: MessageCircle, badge: "bg-muted/60 text-muted-foreground border-border/30", border: "" },
  important: { label: "Important", icon: Bell, badge: "bg-amber-100 text-amber-700 border-amber-300/50 dark:bg-amber-950/50 dark:text-amber-400", border: "ring-1 ring-amber-400/30" },
  urgent: { label: "Urgent", icon: AlertTriangle, badge: "bg-red-100 text-red-700 border-red-300/50 dark:bg-red-950/50 dark:text-red-400", border: "ring-2 ring-red-400/40" },
  reminder: { label: "Reminder", icon: Clock, badge: "bg-violet-100 text-violet-700 border-violet-300/50 dark:bg-violet-950/50 dark:text-violet-400", border: "ring-1 ring-violet-400/30" },
  event: { label: "Event", icon: CalendarDays, badge: "bg-emerald-100 text-emerald-700 border-emerald-300/50 dark:bg-emerald-950/50 dark:text-emerald-400", border: "ring-1 ring-emerald-400/30" },
};

const N: Record<NoteColor, { bg: string; top: string; pin: string; hex: string }> = {
  yellow: { bg: "bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200/80 dark:border-yellow-700/40", top: "bg-yellow-100 dark:bg-yellow-900/70", pin: "bg-yellow-400", hex: "#facc15" },
  blue: { bg: "bg-sky-50 dark:bg-sky-950/60 border-sky-200/80 dark:border-sky-700/40", top: "bg-sky-100 dark:bg-sky-900/70", pin: "bg-sky-400", hex: "#38bdf8" },
  green: { bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-700/40", top: "bg-emerald-100 dark:bg-emerald-900/70", pin: "bg-emerald-400", hex: "#34d399" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950/60 border-pink-200/80 dark:border-pink-700/40", top: "bg-pink-100 dark:bg-pink-900/70", pin: "bg-pink-400", hex: "#f472b6" },
  purple: { bg: "bg-violet-50 dark:bg-violet-950/60 border-violet-200/80 dark:border-violet-700/40", top: "bg-violet-100 dark:bg-violet-900/70", pin: "bg-violet-400", hex: "#a78bfa" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/60 border-orange-200/80 dark:border-orange-700/40", top: "bg-orange-100 dark:bg-orange-900/70", pin: "bg-orange-400", hex: "#fb923c" },
  red: { bg: "bg-red-50 dark:bg-red-950/60 border-red-200/80 dark:border-red-700/40", top: "bg-red-100 dark:bg-red-900/70", pin: "bg-red-400", hex: "#f87171" },
  teal: { bg: "bg-teal-50 dark:bg-teal-950/60 border-teal-200/80 dark:border-teal-700/40", top: "bg-teal-100 dark:bg-teal-900/70", pin: "bg-teal-400", hex: "#2dd4bf" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-700/40", top: "bg-indigo-100 dark:bg-indigo-900/70", pin: "bg-indigo-400", hex: "#818cf8" },
  lime: { bg: "bg-lime-50 dark:bg-lime-950/60 border-lime-200/80 dark:border-lime-700/40", top: "bg-lime-100 dark:bg-lime-900/70", pin: "bg-lime-400", hex: "#a3e635" },
  rose: { bg: "bg-rose-50 dark:bg-rose-950/60 border-rose-200/80 dark:border-rose-700/40", top: "bg-rose-100 dark:bg-rose-900/70", pin: "bg-rose-400", hex: "#fb7185" },
  sky: { bg: "bg-sky-50 dark:bg-sky-950/60 border-sky-200/80 dark:border-sky-700/40", top: "bg-sky-100 dark:bg-sky-900/70", pin: "bg-sky-400", hex: "#38bdf8" },
};

const SKEWS = ["-rotate-[1.1deg]", "rotate-[0.8deg]", "-rotate-[0.4deg]", "rotate-[1.3deg]", "-rotate-[0.6deg]", "rotate-[0.3deg]"];
const DURATION_OPTS = [{ label: "1 day", v: 1 }, { label: "3 days", v: 3 }, { label: "1 week", v: 7 }, { label: "2 weeks", v: 14 }, { label: "1 month", v: 30 }, { label: "Permanent", v: 0 }];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusDot({ s, size = "sm" }: { s: OnlineStatus; size?: "sm" | "md" }) {
  return <span className={cn("inline-block rounded-full shrink-0", S.dot[s], size === "sm" ? "size-2" : "size-2.5")} />;
}

function PushPin({ color }: { color: string }) {
  return (
    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none">
      <div className={cn("size-4 rounded-full border-2 border-white/60 shadow-md", color)} />
      <div className="w-px h-2.5 bg-gray-400/60" />
    </div>
  );
}

// ── Member Profile Sheet ──────────────────────────────────────────────────────

function MemberProfileSheet({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { data: profile, isLoading } = useTeamMemberProfile(memberId);
  const status = (profile?.onlineStatus ?? "offline") as OnlineStatus;

  return (
    <Sheet open={!!memberId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {/* Always render SheetTitle so Radix accessibility check passes */}
        <SheetHeader className={cn(!profile && "sr-only")}>
          <SheetTitle className="text-lg font-black tracking-tight">
            {profile?.name ?? "Team Member"}
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && !profile && (
          <p className="text-sm text-muted-foreground text-center py-12">Profile not found</p>
        )}

        {!isLoading && profile && (
          <div className="space-y-5 mt-4">
            {/* Avatar + name row */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <Avatar className={cn("size-16 ring-2 ring-offset-2 ring-offset-background", S.ring[status])}>
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-xl font-black">{profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className={cn("absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-background", S.dot[status])} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border", ROLE_STYLE[profile.role] ?? ROLE_STYLE.employee)}>
                    {ROLE_LABEL[profile.role] ?? profile.role}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold h-4 px-1.5 gap-1 border", S.badge[status])}>
                    <StatusDot s={status} />
                    {S.label[status]}
                  </Badge>
                </div>
                {profile.customStatus && (
                  <p className="text-xs italic text-muted-foreground/60 mt-1.5">"{profile.customStatus}"</p>
                )}
              </div>
            </div>

            {/* Job + dept */}
            {(profile.personalInfo?.jobTitle || profile.personalInfo?.department) && (
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-muted/30 border border-border/30">
                {profile.personalInfo?.jobTitle && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="size-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="font-medium">{profile.personalInfo.jobTitle}</span>
                  </div>
                )}
                {profile.personalInfo?.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="size-3.5 text-muted-foreground/60 shrink-0" />
                    <span>{deptLabel(profile.personalInfo.department)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bio */}
            {profile.personalInfo?.bio && (
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/20">
                <p className="text-xs text-muted-foreground/80 leading-relaxed">{profile.personalInfo.bio}</p>
              </div>
            )}

            {/* Contact */}
            {(profile.personalInfo?.phone || profile.personalInfo?.location) && (
              <div className="space-y-2 px-1">
                {profile.personalInfo?.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageCircle className="size-3 shrink-0" />
                    {profile.personalInfo.phone}
                  </div>
                )}
                {profile.personalInfo?.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    {profile.personalInfo.location}
                  </div>
                )}
              </div>
            )}

            {/* Last active */}
            {profile.lastActive && status === "offline" && (
              <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1.5 px-1">
                <Clock className="size-3" />
                Last active {formatDistanceToNow(parseISO(profile.lastActive), { addSuffix: true })}
              </p>
            )}

            <Button variant="outline" className="w-full" onClick={() => window.open("/profile", "_blank")}>
              View Full Profile
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Member Card (clickable) ───────────────────────────────────────────────────

function MemberCard({ member, isMe, leaveToday, onClick }: {
  member: TeamMember; isMe: boolean; leaveToday?: Absence; onClick: () => void;
}) {
  const status = (member.onlineStatus ?? "offline") as OnlineStatus;
  const since = member.lastActive ? formatDistanceToNow(parseISO(member.lastActive), { addSuffix: true }) : null;
  const dept = deptLabel(member.personalInfo?.department);
  const noDept = !member.personalInfo?.department;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3.5 px-4 py-3 rounded-2xl border border-l-[3px] bg-card",
        "hover:bg-accent/20 hover:shadow-sm active:scale-[0.99] transition-all duration-150 cursor-pointer group",
        S.borderL[status], isMe && "ring-1 ring-primary/20",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className={cn("size-11 ring-2 ring-offset-2 ring-offset-background", S.ring[status])}>
          <AvatarImage src={member.avatar} />
          <AvatarFallback className="text-sm font-black bg-muted/60">{member.name[0]}</AvatarFallback>
        </Avatar>
        <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-[1.5px] border-background", S.dot[status])} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="font-bold text-sm truncate">{member.name}</span>
          {isMe && <span className="text-[9px] font-black text-primary uppercase tracking-widest">(you)</span>}
          <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border ml-auto shrink-0", ROLE_STYLE[member.role] ?? ROLE_STYLE.employee)}>
            {ROLE_LABEL[member.role] ?? member.role}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {member.personalInfo?.jobTitle && (
            <><Briefcase className="size-2.5 opacity-50 shrink-0" /><span className="truncate max-w-32.5">{member.personalInfo.jobTitle}</span></>
          )}
          {member.personalInfo?.jobTitle && <span className="opacity-30 mx-0.5">·</span>}
          <Building2 className="size-2.5 opacity-50 shrink-0" />
          <span className={cn("truncate max-w-27.5", noDept && "italic opacity-50")}>{dept}</span>
        </div>
        {member.customStatus && (
          <p className="text-[10px] italic text-muted-foreground/50 truncate mt-0.5">"{member.customStatus}"</p>
        )}
      </div>l
      <div className="flex flex-col items-end gap-1 shrink-0">
        {leaveToday ? (
          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide", A[leaveToday.type]?.pill)}>{A[leaveToday.type]?.label}</span>
        ) : (
          <Badge variant="outline" className={cn("text-[10px] font-semibold h-5 px-2 gap-1 border", S.badge[status])}>
            <StatusDot s={status} />{S.label[status]}
          </Badge>
        )}
        {status === "offline" && since && (
          <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5"><Clock className="size-2.5" />{since}</span>
        )}
      </div>
    </button>
  );
}

// ── Bulletin Board Note Card ──────────────────────────────────────────────────

function NoteCard({ note, dragHandleProps, index, isMe, isAdmin, onDelete, onPin, onEdit }: {
  note: BoardNote; dragHandleProps?: any; index: number; isMe: boolean; isAdmin: boolean;
  onDelete: () => void; onPin: () => void; onEdit: () => void;
}) {
  const style = N[note.color] ?? N.yellow;
  const daysLeft = note.expiresAt ? differenceInCalendarDays(parseISO(note.expiresAt), new Date()) : null;
  const announceConfig = ANNOUNCE_CONFIG[note.announcementType ?? "general"] ?? ANNOUNCE_CONFIG.general;
  const AnnounceIcon = announceConfig.icon;

  return (
    <div
      className={cn("relative group transition-all duration-200 hover:rotate-0! hover:scale-[1.02] hover:z-20", SKEWS[index % SKEWS.length], announceConfig.border)}
      style={{ paddingTop: "18px" }}
      {...dragHandleProps}
    >
      <PushPin color={style.pin} />
      <div className={cn("rounded-xl border shadow-md overflow-hidden flex flex-col", style.bg)}>
        <div className={cn("flex items-start gap-2 px-3 pt-2.5 pb-2", style.top)}>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {note.emoji && <span className="text-base leading-none shrink-0">{note.emoji}</span>}
            <div className="min-w-0">
              {note.title && <p className="text-[11px] font-black tracking-tight truncate leading-tight">{note.title}</p>}
              <div className="flex items-center gap-1 mt-0.5">
                <Avatar className="size-4 shrink-0"><AvatarImage src={note.userAvatar} /><AvatarFallback className="text-[8px] font-bold">{note.userName[0]}</AvatarFallback></Avatar>
                <span className="text-[10px] text-muted-foreground/70 truncate">{note.userName}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {note.pinned && !isAdmin && <Pin className="size-2.5 text-muted-foreground mt-0.5" />}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onPin} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    {note.pinned ? <PinOff className="size-3 text-muted-foreground" /> : <Pin className="size-3 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{note.pinned ? "Unpin" : "Pin"}</TooltipContent>
              </Tooltip>
            )}
            {isMe && (
              <button onClick={onEdit} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-muted-foreground">
                <Pencil className="size-3" />
              </button>
            )}
            {(isMe || isAdmin) && (
              <button onClick={onDelete} className="p-0.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500">
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        </div>

        <div className="px-3 py-2.5 flex-1">
          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">{note.content}</p>
        </div>

        <div className="px-3 pb-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/50">{format(parseISO(note.createdAt), "MMM d · h:mm a")}</span>
            {note.announcementType && note.announcementType !== "general" && announceConfig && (
              <Badge variant="outline" className={cn("text-[8px] font-bold px-1 h-3.5 gap-0.5 border", announceConfig.badge)}>
                <AnnounceIcon className="size-2" />{announceConfig.label}
              </Badge>
            )}
          </div>
          {daysLeft !== null ? (
            <span className={cn("text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
              daysLeft <= 0 ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400" :
                daysLeft <= 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" : "bg-black/5 dark:bg-white/10 text-muted-foreground",
            )}>
              <Timer className="size-2.5" />{daysLeft <= 0 ? "Expiring" : `${daysLeft}d left`}
            </span>
          ) : (
            <span className="text-[9px] italic text-muted-foreground/30">Permanent</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview dashboard ────────────────────────────────────────────────────────

function OverviewDashboard({ members, todayAbsences }: { members: TeamMember[]; todayAbsences: Absence[] }) {
  const online = members.filter((m) => m.onlineStatus === "online").length;
  const active = members.filter((m) => m.onlineStatus !== "offline").length;

  const deptGroups = React.useMemo(() => {
    const groups: Record<string, TeamMember[]> = {};
    for (const m of members) {
      const key = m.personalInfo?.department || "__none__";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    const ordered: { key: string; label: string; members: TeamMember[] }[] = [];
    for (const d of DEPARTMENTS) {
      if (groups[d.key]) ordered.push({ key: d.key, label: d.label, members: groups[d.key] });
    }
    if (groups["__none__"]) ordered.push({ key: "__none__", label: "No Department", members: groups["__none__"] });
    return ordered;
  }, [members]);

  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: members.length, icon: Users, color: "text-foreground", bg: "bg-card border-border/40" },
          { label: "Online Now", value: online, icon: Zap, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30 border-green-200/60 dark:border-green-800/30" },
          { label: "Active", value: active, icon: Filter, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
          { label: "Out Today", value: todayAbsences.length, icon: CalendarDays, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/30" },
        ].map((s) => (
          <div key={s.label} className={cn("flex items-center gap-3 p-3.5 rounded-xl border", s.bg)}>
            <s.icon className={cn("size-5 shrink-0", s.color)} />
            <div>
              <p className="text-2xl font-black tabular-nums leading-none">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {deptGroups.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="py-3 px-4 pb-0">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-3.5 text-muted-foreground/60" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">By Department</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {deptGroups.map(({ key, label, members: dm }) => {
                const onlineDm = dm.filter((m) => m.onlineStatus === "online").length;
                const isNone = key === "__none__";
                return (
                  <div key={key} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border", isNone ? "border-dashed border-border/30 bg-muted/20" : "border-border/30 bg-card/60")}>
                    <span className={cn("size-2 rounded-full shrink-0", onlineDm > 0 ? "bg-green-500" : dm.filter(m => m.onlineStatus !== "offline").length > 0 ? "bg-amber-500" : "bg-gray-300")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold truncate", isNone && "italic text-muted-foreground/60")}>{label}</p>
                      <p className="text-[10px] text-muted-foreground/50">{dm.length} {dm.length === 1 ? "member" : "members"}</p>
                    </div>
                    <p className="text-xs font-black tabular-nums text-green-600 dark:text-green-400 shrink-0">
                      {onlineDm} <span className="text-muted-foreground/40 font-normal text-[10px]">online</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {todayAbsences.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-3.5 py-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/80 dark:bg-amber-950/20">
          <span className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400 shrink-0">Out today</span>
          <div className="w-px h-4 bg-amber-200 dark:bg-amber-800" />
          {todayAbsences.map((a) => (
            <div key={a._id} className="flex items-center gap-1.5">
              <Avatar className="size-5 shrink-0"><AvatarImage src={a.userAvatar} /><AvatarFallback className="text-[8px]">{a.userName[0]}</AvatarFallback></Avatar>
              <span className="text-xs font-semibold">{a.userName.split(" ")[0]}</span>
              <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded-md", A[a.type as AbsenceType]?.pill)}>{A[a.type as AbsenceType]?.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabId = "team" | "calendar" | "board";

export default function TeamPulsePage() {
  const { user } = useUser();

  // Tab & filters
  const [tab, setTab] = React.useState<TabId>("team");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");

  // Calendar
  const [calMonth, setCalMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [absType, setAbsType] = React.useState<AbsenceType>("day_off");
  const [absTitle, setAbsTitle] = React.useState("");
  const [absNote, setAbsNote] = React.useState("");
  const [absOther, setAbsOther] = React.useState("");
  const [calDeptFilter, setCalDeptFilter] = React.useState("all");

  // Board
  const [noteDialog, setNoteDialog] = React.useState(false);
  const [editNoteId, setEditNoteId] = React.useState<string | null>(null);
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");
  const [noteColor, setNoteColor] = React.useState<NoteColor>("yellow");
  const [noteDuration, setNoteDuration] = React.useState(7);
  const [noteAnnounce, setNoteAnnounce] = React.useState<AnnouncementType>("general");
  const [noteEmoji, setNoteEmoji] = React.useState("");
  // Drag order — stores only IDs, derived from boardNotes on first load
  const [customOrderIds, setCustomOrderIds] = React.useState<string[]>([]);

  // Status & member sheet
  const [myStatus, setMyStatus] = React.useState<OnlineStatus>("offline");
  const [myCustomStatus, setMyCustomStatus] = React.useState("");
  const [openMemberId, setOpenMemberId] = React.useState<string | null>(null);

  const calYear = calMonth.getFullYear();
  const calMonthNum = calMonth.getMonth() + 1;

  // Data
  const { data: members = [], isLoading: membersLoading } = useTeamMembers();
  const { data: absences = [] } = useTeamAbsences(calYear, calMonthNum);
  const { data: boardNotes = [], isLoading: boardLoading } = useBoardNotes();

  const createAbsence = useCreateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const createNote = useCreateBoardNote();
  const updateNote = useUpdateBoardNote();
  const deleteNote = useDeleteBoardNote();
  const pinNote = useTogglePinNote();
  const reorderNotes = useReorderBoardNotes();
  const updateStatus = useUpdateMyStatus();

  // Sync my status — only update the status value, never causes loop because
  // setMyStatus doesn't affect `members` or `user?.fullName`
  React.useEffect(() => {
    const me = members.find((m) => m.name === user?.fullName);
    if (!me) return;
    setMyStatus((prev) => (me.onlineStatus ?? "offline") !== prev ? (me.onlineStatus ?? "offline") : prev);
    setMyCustomStatus((prev) => (me.customStatus ?? "") !== prev ? (me.customStatus ?? "") : prev);
  }, [members, user?.fullName]);

  // Derived
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

  const availableDepts = React.useMemo(() => {
    const inUse = new Set(members.map((m) => m.personalInfo?.department).filter(Boolean));
    return { ordered: DEPARTMENTS.filter((d) => inUse.has(d.key)), hasNone: members.some((m) => !m.personalInfo?.department) };
  }, [members]);

  const roles = React.useMemo(() => [...new Set(members.map((m) => m.role))], [members]);
  const todayAbsences = React.useMemo(() => absences.filter((a) => isSameDay(parseISO(a.date), new Date())), [absences]);

  const filtered = React.useMemo(() => members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (!q || m.name.toLowerCase().includes(q) || (m.personalInfo?.jobTitle ?? "").toLowerCase().includes(q) || deptLabel(m.personalInfo?.department).toLowerCase().includes(q)) &&
      (statusFilter === "all" || m.onlineStatus === statusFilter) &&
      (deptFilter === "all" || (deptFilter === "__none__" && !m.personalInfo?.department) || m.personalInfo?.department === deptFilter) &&
      (roleFilter === "all" || m.role === roleFilter)
    );
  }), [members, search, statusFilter, deptFilter, roleFilter]);

  const calAbsences = React.useMemo(() => {
    if (calDeptFilter === "all") return absences;
    return absences.filter((a) => {
      const m = members.find((mb) => mb.name === a.userName);
      return calDeptFilter === "__none__" ? !m?.personalInfo?.department : m?.personalInfo?.department === calDeptFilter;
    });
  }, [absences, calDeptFilter, members]);

  const dayAbsences = selectedDay ? calAbsences.filter((a) => isSameDay(parseISO(a.date), selectedDay)) : [];
  const myDayAbsence = selectedDay ? absences.filter((a) => isSameDay(parseISO(a.date), selectedDay)).find((a) => a.userName === user?.fullName) : undefined;
  const myMonthAbsences = absences.filter((a) => a.userName === user?.fullName);
  const weekAbsences = calAbsences.filter((a) => isThisWeek(parseISO(a.date)));

  // Board display order — derived from customOrderIds (drag state) + boardNotes (server)
  // No useEffect sync needed; customOrderIds only changes on user drag
  const displayedNotes = React.useMemo(() => {
    if (customOrderIds.length === 0) return boardNotes;
    const noteMap = new Map(boardNotes.map((n) => [n._id, n]));
    const ordered = customOrderIds.map((id) => noteMap.get(id)).filter(Boolean) as BoardNote[];
    const newNotes = boardNotes.filter((n) => !customOrderIds.includes(n._id));
    return [...ordered, ...newNotes];
  }, [boardNotes, customOrderIds]);

  const currentStatus = onlineStatusOptions.find((o) => o.value === myStatus) ?? onlineStatusOptions[0];
  const hasFilters = search || statusFilter !== "all" || deptFilter !== "all" || roleFilter !== "all";

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAddAbsence() {
    if (!selectedDay) return;
    if (absType === "other" && !absOther.trim()) { toast.error("Please specify what 'Other' means"); return; }
    try {
      await createAbsence.mutateAsync({
        date: format(selectedDay, "yyyy-MM-dd"),
        type: absType,
        title: absTitle.trim() || undefined,
        note: absNote.trim() || undefined,
        otherText: absType === "other" ? absOther.trim() : undefined,
      });
      toast.success(`${A[absType].label} marked for ${format(selectedDay, "MMM d")}`);
      setAbsTitle(""); setAbsNote(""); setAbsOther("");
    } catch (err: any) { toast.error(err?.response?.data?.message ?? "Failed to save"); }
  }

  async function handleDeleteAbsence(id: string) {
    try { await deleteAbsence.mutateAsync(id); toast.success("Entry removed"); }
    catch { toast.error("Failed to remove"); }
  }

  function openNewNote() {
    setEditNoteId(null); setNoteTitle(""); setNoteBody(""); setNoteColor("yellow");
    setNoteDuration(7); setNoteAnnounce("general"); setNoteEmoji(""); setNoteDialog(true);
  }

  function openEditNote(note: BoardNote) {
    setEditNoteId(note._id); setNoteTitle(note.title ?? ""); setNoteBody(note.content);
    setNoteColor(note.color); setNoteEmoji(note.emoji ?? ""); setNoteDialog(true);
  }

  async function handleSaveNote() {
    if (!noteBody.trim()) return;
    try {
      if (editNoteId) {
        await updateNote.mutateAsync({ id: editNoteId, title: noteTitle.trim() || undefined, content: noteBody.trim(), color: noteColor, emoji: noteEmoji || undefined });
        toast.success("Note updated");
      } else {
        await createNote.mutateAsync({ title: noteTitle.trim() || undefined, content: noteBody.trim(), color: noteColor, durationDays: noteDuration === 0 ? null : noteDuration, announcementType: noteAnnounce, emoji: noteEmoji || undefined });
        if (noteAnnounce === "urgent") toast.error(`🚨 Urgent: ${noteTitle || noteBody.slice(0, 40)}`, { duration: 6000 });
        else if (noteAnnounce === "important") toast.warning(`⚠️ Important: ${noteTitle || noteBody.slice(0, 40)}`, { duration: 5000 });
        else toast.success("Note posted to the board");
      }
      setNoteDialog(false);
    } catch { toast.error("Failed to save note"); }
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const items = [...displayedNotes];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setCustomOrderIds(items.map((n) => n._id));
    reorderNotes.mutate(items.map((n) => n._id));
  }

  async function handleStatusChange(s: OnlineStatus) {
    const prev = myStatus;
    setMyStatus(s);
    try { await updateStatus.mutateAsync({ status: s, customStatus: myCustomStatus }); toast.success(`Status → ${S.label[s]}`); }
    catch { setMyStatus(prev); toast.error("Failed to update status"); }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 sm:p-8 container mx-auto pb-16 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/8 border border-primary/15">
                <Zap className="size-3 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live</span>
              </div>
              <span className="text-[11px] text-muted-foreground/60 font-medium">
                <span className="font-black text-foreground">{counts.online}</span> online ·{" "}
                <span className="font-black text-foreground">{members.filter(m => m.onlineStatus !== "offline").length}</span> active ·{" "}
                <span className="font-black text-foreground">{members.length}</span> total
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
              Team <span className="text-primary">Pulse</span>
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 font-semibold border-border/60 self-start sm:self-auto">
                <span className={cn("size-2.5 rounded-full", currentStatus.color)} />
                {currentStatus.label}
                {myCustomStatus && <span className="text-muted-foreground/50 text-xs hidden md:inline truncate max-w-18">· {myCustomStatus}</span>}
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1">Your status</p>
              {onlineStatusOptions.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value as OnlineStatus)} className="gap-2.5 rounded-lg cursor-pointer py-2 px-2">
                  <span className={cn("size-2.5 rounded-full shrink-0", opt.color)} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                  </div>
                  {myStatus === opt.value && <Check className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Overview dashboard */}
        <OverviewDashboard members={members} todayAbsences={todayAbsences} />

        {/* Tab bar */}
        <div className="border-b border-border/40 mb-6 mt-6">
          <div className="flex gap-0">
            {([
              { id: "team" as TabId, Icon: Users, label: "Team Directory", count: members.length },
              { id: "calendar" as TabId, Icon: CalendarDays, label: "Team Calendar", count: null },
              { id: "board" as TabId, Icon: StickyNote, label: "Bulletin Board", count: boardNotes.length },
            ] as const).map(({ id, Icon, label, count }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn("relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap",
                  tab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/30")}>
                <Icon className={cn("size-4", tab === id && "text-primary")} />
                {label}
                {count !== null && count > 0 && (
                  <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-4.5 text-center",
                    tab === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{count}</span>
                )}
                {tab === id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TEAM TAB ════════════════════════════════════════════════════════ */}
        {tab === "team" && (
          <div className="space-y-3">
            {/* Status filter chips */}
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
                const c = counts[s.key as keyof typeof counts] ?? 0;
                const on = statusFilter === s.key;
                return (
                  <button key={s.key} onClick={() => setStatusFilter(s.key)}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0",
                      on ? "bg-foreground text-background shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40")}>
                    <span className={cn("size-1.5 rounded-full", on ? "bg-background/70" : s.dot)} />
                    {s.label}
                    <span className={cn("font-black tabular-nums", on ? "text-background/60" : "text-muted-foreground/50")}>{c}</span>
                  </button>
                );
              })}
            </div>

            {/* Extended filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative min-w-45 flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, title, dept…"
                  className="h-8 pl-8 pr-7 text-sm bg-muted/30 border-border/40 focus:border-primary/30" />
                {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"><X className="size-3.5" /></button>}
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 text-xs w-auto min-w-32.5 bg-muted/30 border-border/40">
                  <Building2 className="size-3 text-muted-foreground mr-1" /><SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                  {availableDepts.ordered.map((d) => <SelectItem key={d.key} value={d.key} className="text-xs">{d.label}</SelectItem>)}
                  {availableDepts.hasNone && <SelectItem value="__none__" className="text-xs italic">No Department</SelectItem>}
                </SelectContent>
              </Select>
              {roles.length > 1 && (
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 text-xs w-auto min-w-25 bg-muted/30 border-border/40">
                    <Filter className="size-3 text-muted-foreground mr-1" /><SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                    {roles.map((r) => <SelectItem key={r} value={r} className="text-xs">{ROLE_LABEL[r] ?? r}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground"
                  onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setRoleFilter("all"); }}>
                  <X className="size-3" />Clear
                </Button>
              )}
              <span className="ml-auto text-[11px] text-muted-foreground/40 font-semibold tabular-nums shrink-0">{filtered.length}/{members.length}</span>
            </div>

            {/* Member list */}
            {membersLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16.5 rounded-2xl bg-muted/20 animate-pulse border border-border/10" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 border border-dashed border-border/30 rounded-2xl">
                <WifiOff className="size-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">No members match</p>
                <Button variant="link" size="sm" className="text-xs" onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); setRoleFilter("all"); }}>Clear all</Button>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto no-scrollbar pr-0.5" style={{ maxHeight: 520 }}>
                {filtered.map((m) => (
                  <MemberCard key={m._id} member={m} isMe={m.name === user?.fullName}
                    leaveToday={todayAbsences.find((a) => a.userName === m.name)}
                    onClick={() => setOpenMemberId(m._id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CALENDAR TAB ════════════════════════════════════════════════════ */}
        {tab === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-7 border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="pb-0 pt-5 px-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-black text-lg tracking-tight">Team Calendar</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Shared · Click any date to view or mark</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setCalMonth(new Date(calYear, calMonthNum - 2, 1))}><ChevronLeft className="size-4" /></Button>
                    <span className="text-sm font-black px-2 min-w-27.5 text-center">{format(calMonth, "MMMM yyyy")}</span>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setCalMonth(new Date(calYear, calMonthNum, 1))}><ChevronRight className="size-4" /></Button>
                  </div>
                </div>
                <div className="pb-3">
                  <Select value={calDeptFilter} onValueChange={setCalDeptFilter}>
                    <SelectTrigger className="h-7 text-xs w-auto bg-muted/30 border-border/40">
                      <Building2 className="size-3 text-muted-foreground mr-1" /><SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                      {availableDepts.ordered.map((d) => <SelectItem key={d.key} value={d.key} className="text-xs">{d.label}</SelectItem>)}
                      {availableDepts.hasNone && <SelectItem value="__none__" className="text-xs italic">No Department</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="px-3 pb-4">
                <Calendar
                  mode="single" month={calMonth} onMonthChange={setCalMonth}
                  selected={selectedDay ?? undefined}
                  onDayClick={(day) => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  showOutsideDays={false} hideNavigation
                  className="w-full [--cell-size:--spacing(14)]"
                  classNames={{ month_caption: "hidden" }}
                  components={{
                    DayButton: ({ day, modifiers, ...props }: any) => {
                      const hits = calAbsences.filter((a) => isSameDay(parseISO(a.date), day.date));
                      const isSel = selectedDay && isSameDay(day.date, selectedDay);
                      const isToday = isSameDay(day.date, new Date());
                      const isWknd = day.date.getDay() === 0 || day.date.getDay() === 6;
                      const maxAvatars = hits.length <= 3 ? hits.length : hits.length <= 6 ? 3 : 4;

                      return (
                        <button {...props} className={cn(
                          "flex flex-col items-center w-full h-full rounded-xl pt-1 pb-0.5 transition-all cursor-pointer select-none",
                          "hover:bg-primary/8 active:scale-95",
                          isSel ? "bg-primary text-primary-foreground shadow-md" : "",
                          isToday && !isSel ? "ring-2 ring-primary/40 ring-inset" : "",
                          isWknd && !isSel ? "bg-muted/20" : "",
                          modifiers.outside ? "opacity-20 pointer-events-none" : "",
                        )}>
                          <span className={cn("text-xs font-bold leading-none mb-0.5", isToday && !isSel ? "text-primary" : "")}>{day.date.getDate()}</span>
                          {hits.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-px px-0.5 w-full">
                              {hits.slice(0, maxAvatars).map((a) => (
                                <Tooltip key={a._id}>
                                  <TooltipTrigger asChild>
                                    <div className={cn("rounded-full border border-background overflow-hidden", hits.length <= 2 ? "size-4" : hits.length <= 4 ? "size-3.5" : "size-3")}>
                                      {a.userAvatar ? (
                                        <img src={a.userAvatar} alt={a.userName} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className={cn("w-full h-full flex items-center justify-center text-[6px] font-black text-white", A[a.type as AbsenceType]?.dot ?? "bg-gray-400")}>{a.userName[0]}</div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">{a.userName} · {A[a.type as AbsenceType]?.label}</TooltipContent>
                                </Tooltip>
                              ))}
                              {hits.length > maxAvatars && (
                                <span className={cn("text-[7px] font-black flex items-center justify-center size-3 rounded-full", isSel ? "text-primary-foreground/70 bg-primary-foreground/20" : "text-muted-foreground bg-muted/60")}>+{hits.length - maxAvatars}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    },
                  }}
                />
                <div className="mt-3 pt-3 border-t border-border/20 flex flex-wrap gap-x-4 gap-y-1.5">
                  {(Object.entries(A) as [AbsenceType, { label: string; dot: string }][]).map(([t, c]) => (
                    <div key={t} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", c.dot)} /><span className="text-[10px] text-muted-foreground/70 font-medium">{c.label}</span></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Right panel */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {weekAbsences.length > 0 && (
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="py-3.5 px-4 pb-2"><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Out this week</span></CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-1.5">
                    {weekAbsences.slice(0, 5).map((a) => (
                      <div key={a._id} className="flex items-center gap-2.5">
                        <Avatar className="size-6 shrink-0"><AvatarImage src={a.userAvatar} /><AvatarFallback className="text-[9px]">{a.userName[0]}</AvatarFallback></Avatar>
                        <span className="text-xs font-semibold flex-1 truncate">{a.userName.split(" ")[0]}</span>
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(a.date), "EEE d")}</span>
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0", A[a.type as AbsenceType]?.pill)}>{A[a.type as AbsenceType]?.label}</span>
                      </div>
                    ))}
                    {weekAbsences.length > 5 && <p className="text-[10px] text-muted-foreground/40 text-center">+{weekAbsences.length - 5} more</p>}
                  </CardContent>
                </Card>
              )}

              {selectedDay ? (
                <Card className="border-border/40 shadow-sm flex-1">
                  <CardHeader className="py-3.5 px-4 border-b border-border/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-base tracking-tight">{format(selectedDay, "EEEE, MMMM d")}</h3>
                        <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">{dayAbsences.length} {dayAbsences.length === 1 ? "entry" : "entries"}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/40 -mt-0.5" onClick={() => setSelectedDay(null)}><X className="size-3.5" /></Button>
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
                              <Avatar className="size-8 shrink-0"><AvatarImage src={a.userAvatar} /><AvatarFallback className="text-xs font-bold">{a.userName[0]}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold">{a.userName}</span>
                                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1", cfg.pill)}>
                                    <span className={cn("size-1.5 rounded-full", cfg.dot)} />{cfg.label}
                                    {a.type === "other" && a.otherText && ` — ${a.otherText}`}
                                  </span>
                                </div>
                                {a.title && <p className="text-xs font-semibold mt-0.5">{a.title}</p>}
                                {a.note && <p className="text-xs text-muted-foreground/70 mt-0.5">{a.note}</p>}
                              </div>
                              {canDel && <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-40 hover:opacity-100 hover:text-destructive" onClick={() => handleDeleteAbsence(a._id)}><Trash2 className="size-3" /></Button>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4 border border-dashed border-border/25 rounded-xl text-center">
                        <CalendarDays className="size-5 text-muted-foreground/20 mb-1.5" />
                        <p className="text-xs text-muted-foreground/50">No entries for this day</p>
                      </div>
                    )}

                    {!myDayAbsence && (
                      <div className="space-y-3 pt-1 border-t border-border/20">
                        <div>
                          <p className="text-sm font-bold tracking-tight">Mark this day</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">Let your team know your availability on {format(selectedDay, "MMMM d")}.</p>
                        </div>
                        <Input value={absTitle} onChange={(e) => setAbsTitle(e.target.value)} placeholder="Title (optional — e.g. Doctor appointment)" className="h-8 text-sm bg-muted/20" maxLength={100} />
                        <Select value={absType} onValueChange={(v) => setAbsType(v as AbsenceType)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.entries(A) as [AbsenceType, { label: string; dot: string }][]).map(([t, c]) => (
                              <SelectItem key={t} value={t} className="text-sm">
                                <span className="flex items-center gap-2"><span className={cn("size-2 rounded-full", c.dot)} />{c.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {absType === "other" && (
                          <Input value={absOther} onChange={(e) => setAbsOther(e.target.value)} placeholder="Please specify…" className="h-8 text-sm bg-muted/20 border-amber-300/50" maxLength={200} />
                        )}
                        <Textarea value={absNote} onChange={(e) => setAbsNote(e.target.value)} placeholder="Additional note for your team… (optional)" className="text-sm resize-none h-14 bg-muted/20" maxLength={500} />
                        <Button className="w-full h-8 text-sm" onClick={handleAddAbsence} disabled={createAbsence.isPending}>
                          <Plus className="size-3.5 mr-1.5" />{createAbsence.isPending ? "Saving…" : "Add Entry"}
                        </Button>
                      </div>
                    )}
                    {myDayAbsence && <p className="text-[10px] text-center text-muted-foreground/40 pt-1 border-t border-border/20">You already have an entry for this day</p>}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-border/30 flex-1">
                  <CardContent className="flex flex-col items-center justify-center py-14 text-center px-6">
                    <div className="size-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
                      <CalendarDays className="size-5 text-primary" />
                    </div>
                    <p className="font-bold text-sm">Select a date</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1 leading-relaxed">Click any calendar date to view entries or mark your availability.</p>
                  </CardContent>
                </Card>
              )}

              {/* My entries — fixed height to prevent page expanding */}
              {myMonthAbsences.length > 0 && (
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="py-3 px-4 border-b border-border/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">My entries · {format(calMonth, "MMM yyyy")}</span>
                  </CardHeader>
                  <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 180 }}>
                    <CardContent className="p-3 space-y-1">
                      {myMonthAbsences.map((a) => (
                        <div key={a._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/30 group/e transition-colors">
                          <span className={cn("size-2 rounded-full shrink-0", A[a.type as AbsenceType]?.dot)} />
                          <span className="text-xs font-semibold">{format(parseISO(a.date), "MMM d")}</span>
                          <span className="text-xs text-muted-foreground flex-1">— {A[a.type as AbsenceType]?.label}{a.type === "other" && a.otherText ? ` (${a.otherText})` : ""}</span>
                          {a.note && <span className="text-[10px] text-muted-foreground/40 truncate max-w-17.5 italic">{a.note}</span>}
                          <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover/e:opacity-100 text-muted-foreground hover:text-destructive transition-all" onClick={() => handleDeleteAbsence(a._id)}><Trash2 className="size-3" /></Button>
                        </div>
                      ))}
                    </CardContent>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ══ BOARD TAB ══════════════════════════════════════════════════════ */}
        {tab === "board" && (
          <div className="space-y-5">
            {/* Cork board header */}
            <div className="relative rounded-2xl overflow-hidden border border-amber-800/20 shadow-sm">
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 1.5px 1.5px, rgba(120,80,30,0.15) 1.5px, transparent 0), radial-gradient(ellipse at 9px 9px, rgba(150,100,40,0.08) 1px, transparent 0)", backgroundSize: "12px 12px, 18px 18px", backgroundColor: "rgb(254,249,240)" }} />
              <div className="absolute inset-0 dark:bg-amber-950/75" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StickyNote className="size-4 text-amber-700 dark:text-amber-400" />
                    <span className="font-black text-lg text-amber-900 dark:text-amber-100 tracking-tight">Team Bulletin Board</span>
                  </div>
                  <p className="text-xs text-amber-700/60 dark:text-amber-300/50">
                    {boardNotes.length === 0 ? "No notes — be the first to pin something" : `${boardNotes.length} note${boardNotes.length !== 1 ? "s" : ""} · ${boardNotes.filter(n => n.pinned).length} pinned · Drag to reorder`}
                  </p>
                </div>
                <Button onClick={openNewNote} className="self-start sm:self-auto gap-2 bg-amber-700 hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0 shadow-md">
                  <Pin className="size-4" />Pin a Note
                </Button>
              </div>
            </div>

            {boardLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ paddingTop: 18 }}>
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 rounded-xl bg-muted/20 animate-pulse border border-border/10" />)}
              </div>
            ) : displayedNotes.length === 0 ? (
              <div className="flex flex-col items-center py-20 border border-dashed border-amber-200/50 dark:border-amber-800/30 rounded-2xl text-center">
                <div className="size-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 flex items-center justify-center mb-4">
                  <StickyNote className="size-7 text-amber-500" />
                </div>
                <p className="font-black text-base">The board is empty</p>
                <p className="text-xs text-muted-foreground/50 mt-1 mb-5">Pin a note for your team</p>
                <Button onClick={openNewNote} className="gap-2 bg-amber-700 hover:bg-amber-800 text-white border-0"><Pin className="size-4" />Pin a Note</Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="board">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                      style={{ paddingTop: 18 }}
                    >
                      {displayedNotes.map((note, i) => (
                        <Draggable key={note._id} draggableId={note._id} index={i}>
                          {(drag, snapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              className={cn("group", snapshot.isDragging && "z-50 drop-shadow-2xl")}
                            >
                              <NoteCard
                                note={note} index={i}
                                dragHandleProps={drag.dragHandleProps}
                                isMe={note.userName === user?.fullName} isAdmin={isAdmin}
                                onDelete={() => deleteNote.mutateAsync(note._id).then(() => toast.success("Removed")).catch(() => toast.error("Failed"))}
                                onPin={() => pinNote.mutateAsync(note._id).catch(() => toast.error("Failed"))}
                                onEdit={() => openEditNote(note)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        )}
      </div>

      {/* ── Member Profile Sheet ─────────────────────────────────────────────── */}
      <MemberProfileSheet memberId={openMemberId} onClose={() => setOpenMemberId(null)} />

      {/* ── Post / Edit Note Dialog ──────────────────────────────────────────── */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              {editNoteId ? <><Edit2 className="size-4" />Edit Note</> : <><Pin className="size-4 text-amber-600" />Pin a Note</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Emoji + Title row */}
            <div className="flex gap-2">
              <div className="space-y-1.5 w-16">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Emoji</label>
                <Input value={noteEmoji} onChange={(e) => setNoteEmoji(e.target.value)} placeholder="🔔" className="h-9 text-lg text-center" maxLength={2} />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Title <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(optional)</span></label>
                <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Announcement, Reminder, FYI…" className="h-9 text-sm" maxLength={100} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Content <span className="text-destructive">*</span></label>
              <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write your message…" className="text-sm resize-none h-28" maxLength={1000} />
              <p className="text-[10px] text-muted-foreground/40 text-right">{noteBody.length}/1000</p>
            </div>

            {!editNoteId && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Announcement Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(ANNOUNCE_CONFIG) as [AnnouncementType, any][]).map(([type, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button key={type} onClick={() => setNoteAnnounce(type)}
                          className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                            noteAnnounce === type ? cn(cfg.badge, "shadow-sm") : "border-border/40 text-muted-foreground hover:border-border/70")}>
                          <Icon className="size-3" />{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Duration (days until auto-remove)</label>
                  <Select value={String(noteDuration)} onValueChange={(v) => setNoteDuration(Number(v))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATION_OPTS.map((o) => <SelectItem key={o.v} value={String(o.v)} className="text-sm">{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {noteDuration > 0 && <p className="text-[10px] text-muted-foreground/40">Expires {format(new Date(Date.now() + noteDuration * 86400000), "MMM d, yyyy")}</p>}
                </div>
              </>
            )}

            {/* Color swatches */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Note Color</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(N) as NoteColor[]).map((c) => (
                  <button key={c} onClick={() => setNoteColor(c)} style={{ backgroundColor: N[c].hex }}
                    className={cn("size-7 rounded-lg border-2 transition-all", noteColor === c ? "border-foreground/30 scale-110 shadow-md" : "border-transparent hover:scale-105 opacity-60 hover:opacity-100")} />
                ))}
              </div>
            </div>

            {/* Preview */}
            {(noteTitle || noteBody || noteEmoji) && (
              <div className={cn("rounded-xl border p-3 space-y-1", N[noteColor].bg)}>
                <div className="flex items-center gap-1.5">
                  {noteEmoji && <span className="text-base">{noteEmoji}</span>}
                  {noteTitle && <p className="font-black text-xs tracking-tight">{noteTitle}</p>}
                </div>
                {noteBody && <p className="whitespace-pre-wrap wrap-break-word leading-relaxed text-sm">{noteBody}</p>}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setNoteDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0"
                onClick={handleSaveNote} disabled={!noteBody.trim() || createNote.isPending || updateNote.isPending}>
                {editNoteId ? <><Check className="size-3.5 mr-1.5" />Save Changes</> : <><Pin className="size-3.5 mr-1.5" />{createNote.isPending ? "Posting…" : "Post to Board"}</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
