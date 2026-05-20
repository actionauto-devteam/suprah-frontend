"use client";

import * as React from "react";
import {
  differenceInCalendarDays, format, formatDistanceToNow,
  isSameDay, parseISO,
} from "date-fns";
import {
  AlertTriangle, Bell, Briefcase, Building2, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock, Edit2,
  ExternalLink, Filter, Globe, LayoutGrid, Mail, MapPin, MessageCircle,
  Pencil, Phone, Pin, PinOff, Plus, Search, Shield, StickyNote, Timer,
  Trash2, TrendingUp, User, Users, WifiOff, X, Zap,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  useTeamMembers, useTeamAbsences, useCreateAbsence, useDeleteAbsence,
  useBoardNotes, useCreateBoardNote, useUpdateBoardNote, useDeleteBoardNote,
  useTogglePinNote, useUpdateMyStatus, useTeamMemberProfile,
  type TeamMember, type Absence, type AbsenceType,
  type BoardNote, type NoteColor, type AnnouncementType, type OnlineStatus,
} from "@/hooks/useTeamPulse";
import { useUser } from "@/providers/AuthProvider";
import { onlineStatusOptions } from "@/components/profile/profile-constants";
import { DEPARTMENTS, deptLabel } from "@/lib/departments";
import { cn } from "@/lib/utils";

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

function MemberFullProfileDialog({ profile, open, onClose }: {
  profile: any;
  open: boolean;
  onClose: () => void;
}) {
  const status = (profile?.onlineStatus ?? "offline") as OnlineStatus;
  if (!profile) return null;

  const infoItems = [
    { icon: Briefcase, label: "Job Title", value: profile.personalInfo?.jobTitle, color: "text-amber-500" },
    { icon: Building2, label: "Department", value: profile.personalInfo?.department ? deptLabel(profile.personalInfo.department) : null, color: "text-cyan-500" },
    { icon: Phone, label: "Phone", value: profile.personalInfo?.phone, color: "text-blue-500" },
    { icon: MapPin, label: "Location", value: profile.personalInfo?.location, color: "text-emerald-500" },
    { icon: Globe, label: "Timezone", value: (profile.personalInfo as any)?.timezone, color: "text-indigo-500" },
    { icon: Globe, label: "Language", value: (profile.personalInfo as any)?.language, color: "text-violet-500" },
    { icon: User, label: "Gender", value: (profile.personalInfo as any)?.gender ? String((profile.personalInfo as any).gender).charAt(0).toUpperCase() + String((profile.personalInfo as any).gender).slice(1) : null, color: "text-pink-500" },
    { icon: CalendarDays, label: "Birthday", value: (profile.personalInfo as any)?.dateOfBirth ? format(new Date((profile.personalInfo as any).dateOfBirth), "MMM d, yyyy") : null, color: "text-rose-500" },
  ].filter((i) => i.value);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="relative bg-linear-to-br from-primary/80 via-primary/60 to-primary/40 px-6 pt-8 pb-6">
          <div className="flex items-end gap-5">
            <div className="relative shrink-0">
              <Avatar className={cn("size-20 ring-4 ring-white/60 ring-offset-2 ring-offset-primary/50 shadow-xl")}>
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="text-2xl font-black bg-primary/30 text-white">{profile.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className={cn("absolute -bottom-0.5 -right-0.5 size-5 rounded-full border-[3px] border-white shadow-md", S.dot[status])} />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-black text-white tracking-tight">{profile.name}</h2>
                <Badge className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border", ROLE_STYLE[profile.role] ?? ROLE_STYLE.employee)}>
                  {ROLE_LABEL[profile.role] ?? profile.role}
                </Badge>
              </div>
              {profile.email && (
                <p className="text-white/70 text-xs flex items-center gap-1.5">
                  <Mail className="size-3 shrink-0" />{profile.email}
                </p>
              )}
              {profile.personalInfo?.jobTitle && (
                <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1.5">
                  <Briefcase className="size-3 shrink-0" />{profile.personalInfo.jobTitle}
                  {profile.personalInfo?.department && <span className="text-white/50">· {deptLabel(profile.personalInfo.department)}</span>}
                </p>
              )}
            </div>
            <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-1 gap-1.5 border shrink-0 self-start", S.badge[status])}>
              <StatusDot s={status} size="md" />{S.label[status]}
            </Badge>
          </div>
          {profile.customStatus && (
            <p className="mt-3 text-xs italic text-white/60">"{profile.customStatus}"</p>
          )}
        </div>

        <div className="p-6 space-y-5">
          {profile.personalInfo?.bio && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">About</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{profile.personalInfo.bio}</p>
            </div>
          )}

          {infoItems.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Details</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {infoItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                    <item.icon className={cn("size-4 shrink-0", item.color)} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{item.label}</p>
                      <p className="text-xs font-semibold truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Account</p>
            <div className="flex flex-wrap gap-2">
              {(profile as any).accountStatus?.isActive !== undefined && (
                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  (profile as any).accountStatus?.isActive
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400")}>
                  <span className={cn("size-1.5 rounded-full", (profile as any).accountStatus?.isActive ? "bg-green-500" : "bg-red-400")} />
                  {(profile as any).accountStatus?.isActive ? "Active" : "Inactive"}
                </div>
              )}
              {(profile as any).accountStatus?.isVerified !== undefined && (
                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  (profile as any).accountStatus?.isVerified
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40"
                    : "bg-muted/60 text-muted-foreground border-border/40")}>
                  <Shield className="size-3" />
                  {(profile as any).accountStatus?.isVerified ? "Verified" : "Unverified"}
                </div>
              )}
              {profile.createdAt && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-muted/40 text-muted-foreground border-border/30">
                  <CalendarDays className="size-3" />
                  Member since {format(new Date(profile.createdAt), "MMM yyyy")}
                </div>
              )}
            </div>
          </div>

          {profile.lastActive && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60 px-0.5">
              <Clock className="size-3.5" />
              {status === "offline" ? "Last active" : "Active"}{" "}
              {formatDistanceToNow(parseISO(profile.lastActive), { addSuffix: true })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberProfileSheet({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { data: profile, isLoading } = useTeamMemberProfile(memberId);
  const [showFullProfile, setShowFullProfile] = React.useState(false);
  const status = (profile?.onlineStatus ?? "offline") as OnlineStatus;

  return (
    <>
      <Sheet open={!!memberId} onOpenChange={(o) => { if (!o) { onClose(); setShowFullProfile(false); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
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
              <div className="flex items-start gap-5 p-4 rounded-2xl bg-muted/20 border border-border/30">
                <div className="relative shrink-0">
                  <Avatar className={cn("size-18 ring-2 ring-offset-2 ring-offset-background", S.ring[status])}>
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="text-2xl font-black">{profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-background", S.dot[status])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black tracking-tight mb-1">{profile.name}</p>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border", ROLE_STYLE[profile.role] ?? ROLE_STYLE.employee)}>
                      {ROLE_LABEL[profile.role] ?? profile.role}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px] font-semibold h-4 px-1.5 gap-1 border", S.badge[status])}>
                      <StatusDot s={status} />{S.label[status]}
                    </Badge>
                  </div>
                  {profile.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="size-3 opacity-50 shrink-0" />{profile.email}
                    </p>
                  )}
                  {profile.customStatus && (
                    <p className="text-[11px] italic text-muted-foreground/50 mt-1">"{profile.customStatus}"</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-0.5">Work</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Briefcase, label: "Job Title", value: profile.personalInfo?.jobTitle, color: "text-amber-500" },
                    { icon: Building2, label: "Department", value: profile.personalInfo?.department ? deptLabel(profile.personalInfo.department) : null, color: "text-cyan-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
                      <item.icon className={cn("size-3.5 shrink-0", item.color)} />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50">{item.label}</p>
                        <p className="text-xs font-semibold truncate">{item.value || <span className="italic font-normal text-muted-foreground/40">Not set</span>}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-0.5">Contact</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Phone, label: "Phone", value: profile.personalInfo?.phone, color: "text-blue-500" },
                    { icon: MapPin, label: "Location", value: profile.personalInfo?.location, color: "text-emerald-500" },
                    { icon: Globe, label: "Timezone", value: (profile.personalInfo as any)?.timezone, color: "text-indigo-500" },
                    { icon: Globe, label: "Language", value: (profile.personalInfo as any)?.language, color: "text-violet-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
                      <item.icon className={cn("size-3.5 shrink-0", item.color)} />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50">{item.label}</p>
                        <p className="text-xs font-semibold truncate">{item.value || <span className="italic font-normal text-muted-foreground/40">Not set</span>}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-muted/20 border border-border/20 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Bio</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {profile.personalInfo?.bio || <span className="italic opacity-50">No bio added yet.</span>}
                </p>
              </div>

              {profile.lastActive && (
                <p className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5 px-0.5">
                  <Clock className="size-3" />
                  {status === "offline" ? "Last active" : "Active"}{" "}
                  {formatDistanceToNow(parseISO(profile.lastActive), { addSuffix: true })}
                </p>
              )}

              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => setShowFullProfile(true)}
              >
                <ExternalLink className="size-4" />
                View Full Profile
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {profile && (
        <MemberFullProfileDialog
          profile={profile}
          open={showFullProfile}
          onClose={() => setShowFullProfile(false)}
        />
      )}
    </>
  );
}

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
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-bold text-sm truncate">{member.name}</span>
          {isMe && <span className="text-[9px] font-black text-primary uppercase tracking-widest shrink-0">(you)</span>}
          <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border shrink-0", ROLE_STYLE[member.role] ?? ROLE_STYLE.employee)}>
            {ROLE_LABEL[member.role] ?? member.role}
          </Badge>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {member.personalInfo?.jobTitle && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
              <Briefcase className="size-2.5 opacity-50 shrink-0" />
              <span>{member.personalInfo.jobTitle}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Building2 className="size-2.5 opacity-50 shrink-0" />
            <span className={cn(noDept && "italic opacity-40")}>{dept}</span>
          </span>
          {member.customStatus && (
            <span className="text-[10px] italic text-muted-foreground/40 truncate">"{member.customStatus}"</span>
          )}
        </div>
      </div>
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

function NoteCard({ note, index, isMe, isAdmin, onDelete, onPin, onEdit }: {
  note: BoardNote; index: number; isMe: boolean; isAdmin: boolean;
  onDelete: () => void; onPin: () => void; onEdit: () => void;
}) {
  const style = N[note.color] ?? N.yellow;
  const daysLeft = note.expiresAt ? differenceInCalendarDays(parseISO(note.expiresAt), new Date()) : null;
  const announceConfig = ANNOUNCE_CONFIG[note.announcementType ?? "general"] ?? ANNOUNCE_CONFIG.general;
  const AnnounceIcon = announceConfig.icon;
  const isNonGeneral = note.announcementType && note.announcementType !== "general";

  return (
    <div
      className={cn(
        "relative group transition-all duration-200",
        SKEWS[index % SKEWS.length],
        "hover:rotate-0! hover:scale-[1.04] hover:z-30",
      )}
      style={{ paddingTop: 22 }}
    >
      <PushPin color={style.pin} />

      {/* Pinned glow shadow underneath */}
      {note.pinned && (
        <div className="absolute bottom-1 left-3 right-3 h-3 bg-black/20 dark:bg-black/40 blur-md rounded-full -z-10" />
      )}

      <div
        className={cn("rounded-xl overflow-hidden flex flex-col relative", style.bg, isNonGeneral ? announceConfig.border : "")}
        style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.08), 0 6px 18px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.06)" }}
      >
        {isNonGeneral && (
          <div className={cn("flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest", announceConfig.badge)}>
            <AnnounceIcon className="size-3" />{announceConfig.label}
          </div>
        )}

        {note.pinned && (
          <div className="flex items-center gap-1 px-3.5 pt-2 pb-0">
            <Pin className="size-2.5 text-foreground/30" />
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">Pinned</span>
          </div>
        )}

        <div className={cn("flex items-start gap-2 px-3.5 pt-3 pb-2", style.top, (isNonGeneral || note.pinned) && "pt-2")}>
          <div className="flex-1 min-w-0">
            {note.emoji && <span className="text-2xl leading-none block mb-1.5">{note.emoji}</span>}
            {note.title && (
              <p className="text-sm font-black tracking-tight leading-snug wrap-break-word">{note.title}</p>
            )}
            {!note.title && !note.emoji && (
              <p className="text-[10px] italic text-foreground/25 uppercase tracking-widest font-semibold">Note</p>
            )}
          </div>
          <div className={cn(
            "flex items-center gap-0.5 shrink-0 -mt-0.5 -mr-0.5 transition-opacity",
            isMe || isAdmin ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100",
          )}>
            {note.pinned && !isAdmin && <Pin className="size-3 text-foreground/30 p-0.5" />}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onPin} className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground/50">
                    {note.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{note.pinned ? "Unpin" : "Pin to top"}</TooltipContent>
              </Tooltip>
            )}
            {isMe && (
              <button onClick={onEdit} className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground/50">
                <Pencil className="size-3.5" />
              </button>
            )}
            {(isMe || isAdmin) && (
              <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-500/15 transition-colors text-foreground/50 hover:text-red-600">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-3.5 py-3 flex-1">
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/80">{note.content}</p>
        </div>

        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-black/[0.07] dark:border-white/[0.07] flex items-center gap-2">
          <Avatar className="size-5 shrink-0">
            <AvatarImage src={note.userAvatar} />
            <AvatarFallback className="text-[8px] font-black">{note.userName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-foreground/50 truncate flex-1">{note.userName}</span>
          <span className="text-[10px] text-foreground/35 shrink-0 tabular-nums">
            {format(parseISO(note.createdAt), "MMM d · h:mm a")}
          </span>
          {daysLeft !== null && (
            <span className={cn("text-[9px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0",
              daysLeft <= 0 ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400" :
                daysLeft <= 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" :
                  "bg-black/8 dark:bg-white/10 text-foreground/50",
            )}>
              <Timer className="size-2.5" />{daysLeft <= 0 ? "Expiring" : `${daysLeft}d`}
            </span>
          )}
        </div>

        <div
          className="absolute bottom-0 right-0 pointer-events-none"
          style={{
            width: 0, height: 0,
            borderLeft: "18px solid transparent",
            borderBottom: "18px solid rgba(0,0,0,0.09)",
          }}
        />
      </div>
    </div>
  );
}

function OverviewDashboard({
  members, todayAbsences, onMemberClick,
}: {
  members: TeamMember[];
  todayAbsences: Absence[];
  onMemberClick: (id: string) => void;
}) {
  const online = members.filter((m) => m.onlineStatus === "online").length;
  const busy = members.filter((m) => m.onlineStatus === "busy" || m.onlineStatus === "do_not_disturb").length;
  const away = members.filter((m) => m.onlineStatus === "away" || m.onlineStatus === "idle").length;
  const offline = members.filter((m) => m.onlineStatus === "offline").length;
  const active = members.length - offline;
  const total = members.length;

  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

  const stripRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  React.useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY + e.deltaX;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = stripRef.current;
    if (!el || e.button !== 0) return;
    drag.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || !stripRef.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) {
      drag.current.moved = true;
      stripRef.current.scrollLeft = drag.current.scrollLeft - dx;
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (stripRef.current) {
      stripRef.current.releasePointerCapture(e.pointerId);
      stripRef.current.style.cursor = "grab";
    }
    setTimeout(() => { drag.current.moved = false; }, 0);
  }

  const sortedMembers = React.useMemo(() => [...members].sort((a, b) => {
    const o: Record<string, number> = { online: 0, busy: 1, away: 2, idle: 3, do_not_disturb: 4, offline: 5 };
    return (o[a.onlineStatus] ?? 5) - (o[b.onlineStatus] ?? 5);
  }), [members]);

  const deptGroups = React.useMemo(() => {
    const groups: Record<string, TeamMember[]> = {};
    for (const m of members) {
      const key = m.personalInfo?.department || "__none__";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    const ordered: { key: string; label: string; members: TeamMember[] }[] = [];
    for (const d of DEPARTMENTS) {
      ordered.push({ key: d.key, label: d.label, members: groups[d.key] ?? [] });
    }
    if (groups["__none__"]) ordered.push({ key: "__none__", label: "No Department", members: groups["__none__"] });
    return ordered;
  }, [members]);

  return (
    <div className="space-y-5">

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Team Members", value: total, sub: `${active} currently active`, icon: Users, color: "text-foreground", bg: "bg-card border-border/40" },
          { label: "Online Now", value: online, sub: `${pct(online)}% of team`, icon: Zap, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30 border-green-200/60 dark:border-green-800/30" },
          { label: "Away / Busy", value: away + busy, sub: `${away} away · ${busy} busy`, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/30" },
          { label: "Out Today", value: todayAbsences.length, sub: todayAbsences.length ? "on leave / absent" : "everyone in", icon: CalendarDays, color: "text-rose-600 dark:text-rose-400", bg: todayAbsences.length ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/30" : "bg-card border-border/40" },
        ].map((s) => (
          <div key={s.label} className={cn("flex items-start gap-3 p-4 rounded-xl border", s.bg)}>
            <div className={cn("mt-0.5 p-1.5 rounded-lg bg-background/60", s.color)}>
              <s.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black tabular-nums leading-none">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Team Members</span>
            <span className="text-[10px] font-black text-primary">{active} active</span>
            <span className="text-[10px] text-muted-foreground/40">· {total} total</span>
          </div>
          <div
            ref={stripRef}
            className="flex flex-nowrap gap-4 overflow-x-auto no-scrollbar pt-2 pb-2 px-0.5 select-none touch-pan-x"
            style={{ cursor: "grab" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {sortedMembers.map((m) => {
              const st = m.onlineStatus as OnlineStatus;
              return (
                <Tooltip key={m._id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { if (drag.current.moved) { e.preventDefault(); return; } onMemberClick(m._id); }}
                      className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                      <div className="relative">
                        <Avatar className={cn(
                          "size-12 ring-2 ring-offset-2 ring-offset-background transition-transform group-hover:scale-110",
                          S.ring[st],
                          st === "offline" && "opacity-50",
                        )}>
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback className="text-sm font-black bg-muted/60">{m.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background", S.dot[st])} />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold max-w-14 truncate leading-tight">{m.name.split(" ")[0]}</p>
                        <p className={cn("text-[9px] font-bold leading-tight", {
                          "text-green-600 dark:text-green-400": st === "online",
                          "text-red-500 dark:text-red-400": st === "busy" || st === "do_not_disturb",
                          "text-amber-500 dark:text-amber-400": st === "away" || st === "idle",
                          "text-muted-foreground/40": st === "offline",
                        })}>{S.label[st]}</p>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-bold">{m.name}</p>
                    {m.personalInfo?.jobTitle && <p className="text-muted-foreground">{m.personalInfo.jobTitle}</p>}
                    {m.customStatus && <p className="italic text-muted-foreground/70">"{m.customStatus}"</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Team Presence</span>
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">{active}/{total} active</span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden flex">
            {online > 0 && <div className="bg-green-500 transition-all" style={{ width: `${pct(online)}%` }} />}
            {busy > 0 && <div className="bg-red-400 transition-all" style={{ width: `${pct(busy)}%` }} />}
            {away > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${pct(away)}%` }} />}
            {offline > 0 && <div className="bg-muted-foreground/20 transition-all" style={{ width: `${pct(offline)}%` }} />}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { label: "Online", color: "bg-green-500", count: online },
              { label: "Busy", color: "bg-red-400", count: busy },
              { label: "Away", color: "bg-amber-400", count: away },
              { label: "Offline", color: "bg-muted-foreground/30", count: offline },
            ].filter((s) => s.count > 0).map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", s.color)} />
                <span className="text-[10px] text-muted-foreground/60 font-medium">{s.count} {s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-3.5 text-muted-foreground/50" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">By Department</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {deptGroups.map(({ key, label, members: dm }) => {
            const dOnline = dm.filter((m) => m.onlineStatus === "online").length;
            const dBusy = dm.filter((m) => m.onlineStatus === "busy" || m.onlineStatus === "do_not_disturb").length;
            const dAway = dm.filter((m) => m.onlineStatus === "away" || m.onlineStatus === "idle").length;
            const dOffline = dm.filter((m) => m.onlineStatus === "offline").length;
            const dActive = dm.length - dOffline;
            const isEmpty = dm.length === 0;
            const isNone = key === "__none__";
            const leadDot = dOnline > 0 ? "bg-green-500" : dActive > 0 ? "bg-amber-500" : isEmpty ? "bg-border" : "bg-gray-300 dark:bg-gray-600";

            return (
              <div key={key} className={cn(
                "flex flex-col gap-2 px-3.5 py-3 rounded-xl border transition-colors",
                isEmpty || isNone
                  ? "border-dashed border-border/30 bg-muted/10"
                  : "border-border/40 bg-card/60 hover:bg-accent/10",
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full shrink-0 mt-px", leadDot)} />
                  <p className={cn("text-xs font-bold truncate flex-1", (isNone || isEmpty) && "text-muted-foreground/60 italic")}>
                    {label}
                  </p>
                  <span className="text-[10px] text-muted-foreground/40 shrink-0 tabular-nums">{dm.length}</span>
                </div>

                {isEmpty ? (
                  <p className="text-[10px] text-muted-foreground/30 italic">No members yet</p>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {dOnline > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
                        <span className="size-1.5 rounded-full bg-green-500" />{dOnline} online
                      </span>
                    )}
                    {dBusy > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 dark:text-red-400">
                        <span className="size-1.5 rounded-full bg-red-400" />{dBusy} busy
                      </span>
                    )}
                    {dAway > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        <span className="size-1.5 rounded-full bg-amber-400" />{dAway} away
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                      <span className="size-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />{dOffline} offline
                    </span>
                  </div>
                )}

                {dm.length > 0 && (
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {[...dm]
                      .sort((a, b) => {
                        const o: Record<string, number> = { online: 0, busy: 1, away: 2, idle: 3, do_not_disturb: 4, offline: 5 };
                        return (o[a.onlineStatus] ?? 5) - (o[b.onlineStatus] ?? 5);
                      })
                      .slice(0, 6)
                      .map((m) => (
                        <Tooltip key={m._id}>
                          <TooltipTrigger asChild>
                            <div className={cn(m.onlineStatus === "offline" && "opacity-40")}>
                              <Avatar className={cn("size-5 border border-background ring-1", S.ring[m.onlineStatus as OnlineStatus])}>
                                <AvatarImage src={m.avatar} />
                                <AvatarFallback className="text-[7px] font-black">{m.name[0]}</AvatarFallback>
                              </Avatar>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {m.name} · {S.label[m.onlineStatus as OnlineStatus]}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    {dm.length > 6 && (
                      <div className="size-5 rounded-full bg-muted border border-background flex items-center justify-center">
                        <span className="text-[7px] font-black text-muted-foreground">+{dm.length - 6}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="h-1 rounded-full bg-muted/40 overflow-hidden flex gap-px">
                  {dOnline > 0 && <div className="bg-green-500" style={{ width: `${Math.round((dOnline / Math.max(dm.length, 1)) * 100)}%` }} />}
                  {dBusy > 0 && <div className="bg-red-400" style={{ width: `${Math.round((dBusy / Math.max(dm.length, 1)) * 100)}%` }} />}
                  {dAway > 0 && <div className="bg-amber-400" style={{ width: `${Math.round((dAway / Math.max(dm.length, 1)) * 100)}%` }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {todayAbsences.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-3.5 py-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/80 dark:bg-amber-950/20">
          <span className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400 shrink-0">Out today</span>
          <div className="w-px h-4 bg-amber-200 dark:bg-amber-800" />
          {todayAbsences.map((a) => {
            const liveAvatar = members.find((m) => m.name === a.userName)?.avatar;
            return (
              <div key={a._id} className="flex items-center gap-1.5">
                <Avatar className="size-5 shrink-0"><AvatarImage src={liveAvatar || a.userAvatar} /><AvatarFallback className="text-[8px]">{a.userName[0]}</AvatarFallback></Avatar>
                <span className="text-xs font-semibold">{a.userName.split(" ")[0]}</span>
                <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded-md", A[a.type as AbsenceType]?.pill)}>{A[a.type as AbsenceType]?.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type TabId = "overview" | "team" | "calendar" | "board";

export default function TeamPulsePage() {
  const { user } = useUser();

  const [tab, setTab] = React.useState<TabId>("overview");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");

  const [calMonth, setCalMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [absType, setAbsType] = React.useState<AbsenceType>("day_off");
  const [absTitle, setAbsTitle] = React.useState("");
  const [absNote, setAbsNote] = React.useState("");
  const [absOther, setAbsOther] = React.useState("");
  const [calDeptFilter, setCalDeptFilter] = React.useState("all");
  const [calTypeFilter, setCalTypeFilter] = React.useState("all");
  const [showAddForm, setShowAddForm] = React.useState(false);

  const [boardTypeFilter, setBoardTypeFilter] = React.useState("all");
  const [noteDialog, setNoteDialog] = React.useState(false);
  const [editNoteId, setEditNoteId] = React.useState<string | null>(null);
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");
  const [noteColor, setNoteColor] = React.useState<NoteColor>("yellow");
  const [noteExpiry, setNoteExpiry] = React.useState("");
  const [noteAnnounce, setNoteAnnounce] = React.useState<AnnouncementType>("general");
  const [noteEmoji, setNoteEmoji] = React.useState("");

  const [myStatus, setMyStatus] = React.useState<OnlineStatus>("offline");
  const [myCustomStatus, setMyCustomStatus] = React.useState("");
  const [openMemberId, setOpenMemberId] = React.useState<string | null>(null);

  const calYear = calMonth.getFullYear();
  const calMonthNum = calMonth.getMonth() + 1;

  const { data: members = [], isLoading: membersLoading } = useTeamMembers();
  const { data: absences = [] } = useTeamAbsences(calYear, calMonthNum);
  const { data: boardNotes = [], isLoading: boardLoading } = useBoardNotes();

  const createAbsence = useCreateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const createNote = useCreateBoardNote();
  const updateNote = useUpdateBoardNote();
  const deleteNote = useDeleteBoardNote();
  const pinNote = useTogglePinNote();
  const updateStatus = useUpdateMyStatus();

  React.useEffect(() => {
    const me = members.find((m) => m.name === user?.fullName);
    if (!me) return;
    setMyStatus((prev) => (me.onlineStatus ?? "offline") !== prev ? (me.onlineStatus ?? "offline") : prev);
    setMyCustomStatus((prev) => (me.customStatus ?? "") !== prev ? (me.customStatus ?? "") : prev);
  }, [members, user?.fullName]);

  React.useEffect(() => {
    setShowAddForm(false);
    setAbsTitle("");
    setAbsNote("");
    setAbsOther("");
    setAbsType("day_off");
  }, [selectedDay]);

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

  const availableDepts = React.useMemo(() => ({
    ordered: [...DEPARTMENTS],
    hasNone: members.some((m) => !m.personalInfo?.department),
  }), [members]);

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
    return absences.filter((a) => {
      const m = members.find((mb) => mb.name === a.userName);
      const deptOk = calDeptFilter === "all" || (calDeptFilter === "__none__" ? !m?.personalInfo?.department : m?.personalInfo?.department === calDeptFilter);
      const typeOk = calTypeFilter === "all" || a.type === calTypeFilter;
      return deptOk && typeOk;
    });
  }, [absences, calDeptFilter, calTypeFilter, members]);

  const dayAbsences = selectedDay ? calAbsences.filter((a) => isSameDay(parseISO(a.date), selectedDay)) : [];
  const myDayAbsence = selectedDay ? absences.filter((a) => isSameDay(parseISO(a.date), selectedDay)).find((a) => a.userName === user?.fullName) : undefined;
  const myMonthAbsences = absences.filter((a) => a.userName === user?.fullName);
  const upcomingAbsences = React.useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(todayStart); weekEnd.setDate(todayStart.getDate() + 6);
    return calAbsences
      .filter((a) => { const d = parseISO(a.date); return d >= todayStart && d <= weekEnd; })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [calAbsences]);

  const monthStats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    calAbsences.forEach((a) => { counts[a.type] = (counts[a.type] || 0) + 1; });
    const peakType = Object.entries(counts).sort(([, x], [, y]) => y - x)[0]?.[0] as AbsenceType | null ?? null;
    return { total: calAbsences.length, unique: new Set(calAbsences.map((a) => a.userName)).size, peakType };
  }, [calAbsences]);


  const currentStatus = onlineStatusOptions.find((o) => o.value === myStatus) ?? onlineStatusOptions[0];
  const hasFilters = search || statusFilter !== "all" || deptFilter !== "all" || roleFilter !== "all";

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
    setNoteExpiry(""); setNoteAnnounce("general"); setNoteEmoji(""); setNoteDialog(true);
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
        const durationDays = noteExpiry
          ? Math.max(1, Math.ceil((new Date(noteExpiry).getTime() - Date.now()) / 86_400_000))
          : null;
        await createNote.mutateAsync({ title: noteTitle.trim() || undefined, content: noteBody.trim(), color: noteColor, durationDays, announcementType: noteAnnounce, emoji: noteEmoji || undefined });
        if (noteAnnounce === "urgent") toast.error(`🚨 Urgent: ${noteTitle || noteBody.slice(0, 40)}`, { duration: 6000 });
        else if (noteAnnounce === "important") toast.warning(`⚠️ Important: ${noteTitle || noteBody.slice(0, 40)}`, { duration: 5000 });
        else toast.success("Note posted to the board");
      }
      setNoteDialog(false);
    } catch { toast.error("Failed to save note"); }
  }

  async function handleStatusChange(s: OnlineStatus) {
    const prev = myStatus;
    setMyStatus(s);
    try { await updateStatus.mutateAsync({ status: s, customStatus: myCustomStatus }); toast.success(`Status → ${S.label[s]}`); }
    catch { setMyStatus(prev); toast.error("Failed to update status"); }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 sm:p-8 container mx-auto pb-16 animate-in fade-in duration-500">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
                Team <span className="text-primary">Pulse</span>
              </h1>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/8 border border-primary/15 self-center">
                <Zap className="size-3 text-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live</span>
              </div>
            </div>
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
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1">Status</p>
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

        <div className="border-b border-border/40 mb-6">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {([
              { id: "overview" as TabId, Icon: LayoutGrid, label: "Overview", count: null },
              { id: "team" as TabId, Icon: Users, label: "Team", count: members.length },
              { id: "calendar" as TabId, Icon: CalendarDays, label: "Calendar", count: null },
              { id: "board" as TabId, Icon: StickyNote, label: "Board", count: boardNotes.length },
            ] as const).map(({ id, Icon, label, count }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn("relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap shrink-0",
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

        {tab === "overview" && (
          <div className="space-y-6">
            <OverviewDashboard
              members={members}
              todayAbsences={todayAbsences}
              onMemberClick={(id) => setOpenMemberId(id)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "team" as TabId, Icon: Users, label: "Team Directory", desc: `${members.length} members` },
                { id: "calendar" as TabId, Icon: CalendarDays, label: "Team Calendar", desc: `${todayAbsences.length} out today` },
                { id: "board" as TabId, Icon: StickyNote, label: "Bulletin Board", desc: `${boardNotes.length} notes` },
              ].map(({ id, Icon, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border/40 bg-card hover:bg-accent/20 hover:border-primary/20 transition-all text-left group"
                >
                  <Icon className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <p className="text-xs font-bold">{label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "team" && (
          <div className="space-y-3">
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

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-52">
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

        {tab === "calendar" && (
          <div className="space-y-5">

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Out This Month", value: monthStats.total, sub: `${monthStats.unique} unique people`, icon: CalendarDays, bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/30", color: "text-rose-600 dark:text-rose-400" },
                { label: "Out Today", value: todayAbsences.length, sub: todayAbsences.length ? "on leave / absent" : "everyone in", icon: Users, bg: todayAbsences.length ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/30" : "bg-card border-border/40", color: todayAbsences.length ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
                { label: "This Week", value: upcomingAbsences.length, sub: "upcoming absences", icon: Clock, bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200/60 dark:border-violet-800/30", color: "text-violet-600 dark:text-violet-400" },
                { label: "My Schedule", value: myMonthAbsences.length, sub: `entries in ${format(calMonth, "MMM")}`, icon: TrendingUp, bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/30", color: "text-emerald-600 dark:text-emerald-400" },
              ].map((s) => (
                <div key={s.label} className={cn("flex items-start gap-3 p-4 rounded-xl border", s.bg)}>
                  <div className={cn("mt-0.5 p-1.5 rounded-lg bg-background/60 shrink-0", s.color)}>
                    <s.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-black tabular-nums leading-none">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              <Card className="lg:col-span-7 border-border/40 shadow-sm overflow-hidden">
                <div className="relative overflow-hidden bg-linear-to-br from-primary/90 via-primary/70 to-primary/50 px-5 pt-5 pb-4">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="relative flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-black text-xl tracking-tight text-white leading-none">{format(calMonth, "MMMM yyyy")}</h2>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Team Calendar · Click a date</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8 rounded-lg text-white/80 hover:bg-white/20 hover:text-white" onClick={() => setCalMonth(new Date(calYear, calMonthNum - 2, 1))}><ChevronLeft className="size-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2.5 rounded-lg text-white/80 hover:bg-white/20 hover:text-white text-xs font-bold" onClick={() => setCalMonth(new Date())}>Today</Button>
                      <Button variant="ghost" size="icon" className="size-8 rounded-lg text-white/80 hover:bg-white/20 hover:text-white" onClick={() => setCalMonth(new Date(calYear, calMonthNum, 1))}><ChevronRight className="size-4" /></Button>
                    </div>
                  </div>

                  <div className="relative mt-3 flex flex-wrap gap-2">
                    <Select value={calDeptFilter} onValueChange={setCalDeptFilter}>
                      <SelectTrigger className="h-7 text-xs w-auto bg-white/15 border-white/25 text-white [&>svg]:text-white/60 hover:bg-white/25">
                        <Building2 className="size-3 mr-1 text-white/70" /><SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                        {availableDepts.ordered.map((d) => <SelectItem key={d.key} value={d.key} className="text-xs">{d.label}</SelectItem>)}
                        {availableDepts.hasNone && <SelectItem value="__none__" className="text-xs italic">No Department</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Select value={calTypeFilter} onValueChange={setCalTypeFilter}>
                      <SelectTrigger className="h-7 text-xs w-auto bg-white/15 border-white/25 text-white [&>svg]:text-white/60 hover:bg-white/25">
                        <Filter className="size-3 mr-1 text-white/70" /><SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Types</SelectItem>
                        {(Object.entries(A) as [AbsenceType, { label: string; dot: string }][]).map(([t, c]) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            <span className="flex items-center gap-2"><span className={cn("size-2 rounded-full", c.dot)} />{c.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(calDeptFilter !== "all" || calTypeFilter !== "all") && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-white/70 hover:bg-white/20 hover:text-white gap-1"
                        onClick={() => { setCalDeptFilter("all"); setCalTypeFilter("all"); }}>
                        <X className="size-3" />Clear
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="px-3 pb-4 pt-3">
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
                        const maxAvatars = hits.length <= 2 ? hits.length : hits.length <= 5 ? 3 : 4;
                        const typeCounts: Record<string, number> = {};
                        hits.forEach((h) => { typeCounts[h.type] = (typeCounts[h.type] || 0) + 1; });

                        return (
                          <button {...props} className={cn(
                            "relative flex flex-col items-start w-full h-full rounded-xl px-1.5 pt-1.5 pb-1 transition-all cursor-pointer select-none overflow-hidden",
                            "hover:bg-primary/8 active:scale-[0.97]",
                            isSel ? "bg-primary text-primary-foreground shadow-md" : "",
                            isToday && !isSel ? "ring-2 ring-primary/50 ring-inset" : "",
                            isWknd && !isSel ? "bg-muted/30" : "",
                            hits.length > 0 && !isSel ? "bg-rose-50/40 dark:bg-rose-950/15" : "",
                            modifiers.outside ? "opacity-0 pointer-events-none" : "",
                          )}>
                            <span className={cn(
                              "text-[11px] font-black leading-none z-10",
                              isToday && !isSel ? "text-primary" : "",
                              isSel ? "text-primary-foreground" : "",
                              isWknd && !isSel ? "text-muted-foreground/60" : "",
                            )}>{day.date.getDate()}</span>

                            {hits.length > 0 && (
                              <div className="flex flex-wrap gap-px mt-1 w-full justify-center z-10">
                                {hits.slice(0, maxAvatars).map((a) => {
                                  const liveAvatar = members.find((m) => m.name === a.userName)?.avatar;
                                  const avatarSrc = liveAvatar || a.userAvatar;
                                  return (
                                    <Tooltip key={a._id}>
                                      <TooltipTrigger asChild>
                                        <div className={cn("rounded-full border-[1.5px] border-background overflow-hidden shrink-0", hits.length <= 2 ? "size-4" : "size-3.5")}>
                                          {avatarSrc ? (
                                            <img src={avatarSrc} alt={a.userName} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className={cn("w-full h-full flex items-center justify-center text-[6px] font-black text-white", A[a.type as AbsenceType]?.dot ?? "bg-gray-400")}>{a.userName[0]}</div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs"><p className="font-bold">{a.userName}</p><p className="text-muted-foreground">{A[a.type as AbsenceType]?.label}</p></TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                                {hits.length > maxAvatars && (
                                  <span className={cn("text-[7px] font-black flex items-center justify-center rounded-full shrink-0", hits.length <= 2 ? "size-4" : "size-3.5", isSel ? "text-primary-foreground/70 bg-primary-foreground/20" : "text-muted-foreground bg-muted/60")}>+{hits.length - maxAvatars}</span>
                                )}
                              </div>
                            )}

                            {hits.length > 0 && !isSel && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 flex overflow-hidden rounded-b-xl">
                                {(Object.entries(typeCounts) as [AbsenceType, number][]).map(([type, count]) => (
                                  <div key={type} style={{ flex: count }} className={cn(A[type]?.dot ?? "bg-gray-400")} />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      },
                    }}
                  />

                  <div className="mt-4 pt-3 border-t border-border/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Legend</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {(Object.entries(A) as [AbsenceType, { label: string; dot: string; pill: string }][]).map(([t, c]) => (
                        <button key={t} onClick={() => setCalTypeFilter(calTypeFilter === t ? "all" : t)}
                          className={cn("flex items-center gap-1.5 transition-opacity", calTypeFilter !== "all" && calTypeFilter !== t ? "opacity-30" : "")}>
                          <span className={cn("size-2.5 rounded-full", c.dot)} />
                          <span className="text-[10px] text-muted-foreground/70 font-semibold">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-5 space-y-4">

                {upcomingAbsences.length > 0 && (
                  <Card className="border-border/40 shadow-sm overflow-hidden">
                    <div className="bg-linear-to-r from-violet-500/10 to-transparent border-b border-border/20 px-4 py-3 flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                        <Clock className="size-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Next 7 Days</span>
                      <span className="ml-auto text-[10px] font-black text-violet-600 dark:text-violet-400">{upcomingAbsences.length}</span>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 192, scrollbarWidth: "none" }}>
                      <CardContent className="px-3 pb-3 pt-2.5 space-y-1.5">
                        {upcomingAbsences.map((a) => {
                          const liveAvatar = members.find((m) => m.name === a.userName)?.avatar;
                          const cfg = A[a.type as AbsenceType];
                          return (
                            <div key={a._id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-border/20 hover:bg-muted/20 transition-colors">
                              <Avatar className="size-6 shrink-0">
                                <AvatarImage src={liveAvatar || a.userAvatar} />
                                <AvatarFallback className="text-[9px] font-black">{a.userName[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{a.userName.split(" ")[0]}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">{format(parseISO(a.date), "EEE d")}</span>
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0", cfg.pill)}>{cfg.label}</span>
                            </div>
                          );
                        })}
                      </CardContent>
                    </div>
                  </Card>
                )}

                {selectedDay ? (
                  <Card className="border-border/40 shadow-sm overflow-hidden">
                    <div className="relative overflow-hidden border-b border-border/20">
                      <div className={cn("absolute inset-0 opacity-40", dayAbsences.length > 0 ? "bg-rose-50 dark:bg-rose-950/30" : "bg-emerald-50 dark:bg-emerald-950/20")} />
                      <div className="relative flex items-start justify-between px-4 py-3.5">
                        <div>
                          <h3 className="font-black text-base tracking-tight">{format(selectedDay, "EEEE")}</h3>
                          <p className="text-sm text-muted-foreground font-semibold">{format(selectedDay, "MMMM d, yyyy")}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">
                            {dayAbsences.length === 0 ? "Everyone in" : `${dayAbsences.length} ${dayAbsences.length === 1 ? "person out" : "people out"}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground/40 hover:text-foreground" onClick={() => setSelectedDay(null)}><X className="size-3.5" /></Button>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {dayAbsences.length > 0 && (
                        <div className="overflow-y-auto space-y-1.5" style={{ maxHeight: 180, scrollbarWidth: "none" }}>
                          {dayAbsences.map((a) => {
                            const cfg = A[a.type as AbsenceType];
                            const canDel = a.userName === user?.fullName || isAdmin;
                            const liveAvatar = members.find((m) => m.name === a.userName)?.avatar;
                            return (
                              <div key={a._id} className={cn("flex items-start gap-3 p-3 rounded-xl border", cfg.card)}>
                                <Avatar className="size-8 shrink-0 ring-1 ring-border/30">
                                  <AvatarImage src={liveAvatar || a.userAvatar} />
                                  <AvatarFallback className="text-xs font-black">{a.userName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                    <span className="text-xs font-bold">{a.userName}</span>
                                    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1", cfg.pill)}>
                                      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                                      {cfg.label}{a.type === "other" && a.otherText ? ` — ${a.otherText}` : ""}
                                    </span>
                                  </div>
                                  {a.title && <p className="text-xs font-semibold">{a.title}</p>}
                                  {a.note && <p className="text-xs text-muted-foreground/70 italic">{a.note}</p>}
                                </div>
                                {canDel && (
                                  <Button variant="ghost" size="icon" className="size-6 shrink-0 opacity-40 hover:opacity-100 hover:text-destructive" onClick={() => handleDeleteAbsence(a._id)}>
                                    <Trash2 className="size-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {dayAbsences.length === 0 && !showAddForm && (
                        <div className="flex items-center gap-2 py-2 text-emerald-600 dark:text-emerald-400">
                          <Check className="size-3.5 shrink-0" />
                          <span className="text-xs font-semibold">Everyone in on this day</span>
                        </div>
                      )}

                      {myDayAbsence ? (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/20">
                          <Check className="size-3.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold">You&apos;re marked out</p>
                            <p className="text-[10px] text-muted-foreground/60">{A[myDayAbsence.type as AbsenceType]?.label}{myDayAbsence.title ? ` — ${myDayAbsence.title}` : ""}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1 shrink-0" onClick={() => handleDeleteAbsence(myDayAbsence._id)}>
                            <Trash2 className="size-3" />Remove
                          </Button>
                        </div>
                      ) : showAddForm ? (
                        <div className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black tracking-tight">Mark {format(selectedDay, "MMM d")} as out</p>
                            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground/40 hover:text-foreground"><X className="size-3.5" /></button>
                          </div>
                          <Input value={absTitle} onChange={(e) => setAbsTitle(e.target.value)} placeholder="Title (optional)" className="h-8 text-xs bg-background border-border/50" maxLength={100} />
                          <div className="grid grid-cols-2 gap-1.5">
                            {(Object.entries(A) as [AbsenceType, { label: string; dot: string; pill: string }][]).map(([t, c]) => (
                              <button key={t} onClick={() => setAbsType(t)}
                                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all text-left",
                                  absType === t ? cn(c.pill, "border-current shadow-sm") : "border-border/40 text-muted-foreground hover:border-border/70 bg-background")}>
                                <span className={cn("size-1.5 rounded-full shrink-0", c.dot)} />{c.label}
                              </button>
                            ))}
                          </div>
                          {absType === "other" && (
                            <Input value={absOther} onChange={(e) => setAbsOther(e.target.value)} placeholder="Please specify…" className="h-8 text-xs bg-background border-amber-300/50" maxLength={200} />
                          )}
                          <Textarea value={absNote} onChange={(e) => setAbsNote(e.target.value)} placeholder="Note for your team (optional)" className="text-xs resize-none h-14 bg-background border-border/50" maxLength={500} />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
                            <Button size="sm" className="h-8 flex-1 text-xs gap-1" onClick={handleAddAbsence} disabled={createAbsence.isPending}>
                              <Plus className="size-3" />{createAbsence.isPending ? "Saving…" : "Add"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-dashed" onClick={() => setShowAddForm(true)}>
                          <Plus className="size-3.5" />Mark this day as out
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-border/30 bg-card/50">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center px-6">
                      <div className="size-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-3">
                        <CalendarDays className="size-5 text-primary/60" />
                      </div>
                      <p className="font-black text-sm">Select a date</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1 leading-relaxed max-w-48">Click any date on the calendar to view entries or mark your availability.</p>
                    </CardContent>
                  </Card>
                )}

                {myMonthAbsences.length > 0 && (
                  <Card className="border-border/40 shadow-sm overflow-hidden">
                    <div className="bg-linear-to-r from-emerald-500/10 to-transparent border-b border-border/20 px-4 py-3 flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">My Schedule · {format(calMonth, "MMM yyyy")}</span>
                      <span className="ml-auto text-[10px] font-black text-emerald-600 dark:text-emerald-400">{myMonthAbsences.length}</span>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 200, scrollbarWidth: "none" }}>
                      <CardContent className="p-3 space-y-1">
                        {myMonthAbsences.map((a) => {
                          const cfg = A[a.type as AbsenceType];
                          return (
                            <div key={a._id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/30 group/e transition-colors">
                              <span className={cn("size-2 rounded-full shrink-0", cfg.dot)} />
                              <span className="text-xs font-bold tabular-nums">{format(parseISO(a.date), "MMM d")}</span>
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0", cfg.pill)}>{cfg.label}</span>
                              {a.title && <span className="text-xs text-muted-foreground/70 flex-1 truncate">{a.title}</span>}
                              {!a.title && a.note && <span className="text-xs text-muted-foreground/50 flex-1 truncate italic">{a.note}</span>}
                              {!a.title && !a.note && <span className="flex-1" />}
                              <Button variant="ghost" size="icon" className="size-5 opacity-0 group-hover/e:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0" onClick={() => handleDeleteAbsence(a._id)}><Trash2 className="size-3" /></Button>
                            </div>
                          );
                        })}
                      </CardContent>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "board" && (() => {
          const filteredNotes = boardTypeFilter === "all"
            ? boardNotes
            : boardNotes.filter((n) => (n.announcementType ?? "general") === boardTypeFilter);
          const urgentCount = boardNotes.filter((n) => n.announcementType === "urgent").length;
          const pinnedCount = boardNotes.filter((n) => n.pinned).length;

          return (
            <div className="space-y-4">

              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  border: "6px solid rgb(92, 58, 26)",
                  boxShadow: "inset 0 2px 12px rgba(0,0,0,0.25), inset 0 -2px 6px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.18)",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: "rgb(182, 136, 78)",
                    backgroundImage: `
                      radial-gradient(ellipse at 15% 25%, rgba(220,175,110,0.6) 0%, transparent 45%),
                      radial-gradient(ellipse at 85% 75%, rgba(140,90,35,0.5) 0%, transparent 40%),
                      radial-gradient(ellipse at 50% 50%, rgba(200,155,90,0.2) 0%, transparent 60%),
                      radial-gradient(circle at 1.5px 1.5px, rgba(100,60,20,0.22) 1.5px, transparent 0),
                      radial-gradient(circle at 10px 10px, rgba(160,110,50,0.18) 1px, transparent 0),
                      radial-gradient(circle at 5px 8px, rgba(80,45,15,0.12) 0.8px, transparent 0)
                    `,
                    backgroundSize: "100% 100%, 100% 100%, 100% 100%, 12px 12px, 20px 20px, 8px 8px",
                  }}
                />
                <div className="absolute inset-0 dark:bg-black/55" />

                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.2)] pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-5 py-4">
                  <div className="flex flex-col gap-2.5">
                    <div className="inline-flex items-center gap-2 bg-amber-50/95 dark:bg-zinc-900/90 border border-amber-200/60 dark:border-zinc-700/60 rounded-lg px-3.5 py-2 shadow-md self-start">
                      <StickyNote className="size-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      <span className="font-black text-sm text-amber-900 dark:text-amber-100 tracking-tight">Team Bulletin Board</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-black/20 dark:bg-black/40 backdrop-blur-sm text-white px-2.5 py-1 rounded-full shadow-sm">
                        <StickyNote className="size-2.5" />{boardNotes.length} note{boardNotes.length !== 1 ? "s" : ""}
                      </span>
                      {pinnedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-black/20 dark:bg-black/40 backdrop-blur-sm text-white px-2.5 py-1 rounded-full shadow-sm">
                          <Pin className="size-2.5" />{pinnedCount} pinned
                        </span>
                      )}
                      {urgentCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-red-600/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full shadow-sm">
                          <AlertTriangle className="size-2.5" />{urgentCount} urgent
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={openNewNote}
                    className="self-start gap-2 bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0 shadow-lg shrink-0"
                  >
                    <Plus className="size-4" />New Note
                  </Button>
                </div>
              </div>

              {boardNotes.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {([
                    { key: "all", label: "All", Icon: LayoutGrid },
                    ...Object.entries(ANNOUNCE_CONFIG).map(([key, cfg]) => ({ key, label: cfg.label, Icon: cfg.icon })),
                  ] as { key: string; label: string; Icon: React.ComponentType<any> }[]).map(({ key, label, Icon }) => {
                    const count = key === "all"
                      ? boardNotes.length
                      : boardNotes.filter((n) => (n.announcementType ?? "general") === key).length;
                    if (count === 0 && key !== "all") return null;
                    const on = boardTypeFilter === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setBoardTypeFilter(key)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0",
                          on
                            ? "bg-foreground text-background shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40",
                        )}
                      >
                        <Icon className="size-3" />
                        {label}
                        <span className={cn("font-black tabular-nums text-[10px]", on ? "text-background/60" : "text-muted-foreground/50")}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {boardLoading ? (
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-6" style={{ paddingTop: 20 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="break-inside-avoid mb-6 h-36 rounded-xl bg-muted/20 animate-pulse border border-border/10" />
                  ))}
                </div>
              ) : boardNotes.length === 0 ? (
                <div
                  className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center py-20 text-center"
                  style={{
                    backgroundColor: "rgba(182,136,78,0.08)",
                    border: "2px dashed rgba(182,136,78,0.25)",
                  }}
                >
                  <div className="relative mb-4" style={{ paddingTop: 20 }}>
                    <PushPin color="bg-amber-400" />
                    <div className={cn("rounded-xl border px-8 py-5 shadow-md", N.yellow.bg)} style={{ transform: "rotate(-1deg)", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                      <p className="text-sm font-black text-amber-900/70">No notes yet…</p>
                      <p className="text-xs text-amber-700/50 mt-0.5">Be the first to pin one!</p>
                    </div>
                  </div>
                  <Button onClick={openNewNote} className="gap-2 bg-amber-700 hover:bg-amber-600 text-white border-0 shadow-md mt-2">
                    <Plus className="size-4" />Pin the First Note
                  </Button>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center border border-dashed border-border/30 rounded-xl">
                  <StickyNote className="size-7 text-muted-foreground/20 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No {boardTypeFilter} notes</p>
                  <button onClick={() => setBoardTypeFilter("all")} className="text-xs text-primary mt-1 hover:underline">Show all</button>
                </div>
              ) : (
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-6" style={{ paddingTop: 20 }}>
                  {filteredNotes.map((note, i) => (
                    <div key={note._id} className="break-inside-avoid mb-7">
                      <NoteCard
                        note={note} index={i}
                        isMe={note.userName === user?.fullName} isAdmin={isAdmin}
                        onDelete={() => deleteNote.mutateAsync(note._id).then(() => toast.success("Note removed")).catch(() => toast.error("Failed to remove"))}
                        onPin={() => pinNote.mutateAsync(note._id).catch(() => toast.error("Failed"))}
                        onEdit={() => openEditNote(note)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <MemberProfileSheet memberId={openMemberId} onClose={() => setOpenMemberId(null)} />

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-0">
          <div className="relative overflow-hidden rounded-t-xl px-6 py-4 border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 1.5px 1.5px, rgba(120,80,30,0.3) 1.5px, transparent 0)", backgroundSize: "10px 10px" }} />
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-2.5 text-base font-black text-amber-900 dark:text-amber-100">
                {editNoteId
                  ? <><Edit2 className="size-4 text-amber-700 dark:text-amber-400" />Edit Note</>
                  : <><Pin className="size-4 text-amber-700 dark:text-amber-400" />Pin a New Note</>
                }
              </DialogTitle>
              <p className="text-[11px] text-amber-700/60 dark:text-amber-300/50 mt-0.5">
                {editNoteId ? "Update your note on the board" : "Add a note to the team bulletin board"}
              </p>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <div className="space-y-1.5 w-16 shrink-0">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Emoji</label>
                <Input value={noteEmoji} onChange={(e) => setNoteEmoji(e.target.value)} placeholder="🔔" className="h-9 text-lg text-center" maxLength={2} />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Title <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(optional)</span>
                </label>
                <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Announcement, Reminder, FYI…" className="h-9 text-sm" maxLength={100} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Message <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Write your message for the team…"
                className="text-sm resize-none h-28"
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground/40 text-right tabular-nums">{noteBody.length}/1000</p>
            </div>

            {!editNoteId && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(ANNOUNCE_CONFIG) as [AnnouncementType, any][]).map(([type, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => setNoteAnnounce(type)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            noteAnnounce === type ? cn(cfg.badge, "shadow-sm") : "border-border/40 text-muted-foreground hover:border-border/70 bg-muted/20",
                          )}
                        >
                          <Icon className="size-3" />{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    Auto-expire <span className="font-normal normal-case tracking-normal text-muted-foreground/40">(leave empty = stays forever)</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left h-9 text-sm font-normal">
                        <CalendarDays className="size-4 mr-2 text-muted-foreground/60 shrink-0" />
                        {noteExpiry
                          ? format(parseISO(noteExpiry), "MMMM d, yyyy")
                          : <span className="text-muted-foreground/50">No expiry — permanent</span>
                        }
                        {noteExpiry && (
                          <span className="ml-auto text-[10px] text-muted-foreground/40 font-normal">
                            {Math.max(1, Math.ceil((new Date(noteExpiry).getTime() - Date.now()) / 86_400_000))}d from now
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={noteExpiry ? parseISO(noteExpiry) : undefined}
                        onSelect={(day) => setNoteExpiry(day ? format(day, "yyyy-MM-dd") : "")}
                        disabled={(date) => date <= new Date()}
                      />
                      {noteExpiry && (
                        <div className="px-3 pb-3 border-t border-border/40 pt-2">
                          <Button
                            variant="ghost" size="sm"
                            className="w-full h-7 text-xs text-muted-foreground gap-1.5"
                            onClick={() => setNoteExpiry("")}
                          >
                            <X className="size-3" />Remove expiry — keep permanent
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Note Color</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(N) as NoteColor[]).map((c) => (
                  <Tooltip key={c}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setNoteColor(c)}
                        style={{ backgroundColor: N[c].hex }}
                        className={cn("size-8 rounded-xl border-2 transition-all", noteColor === c ? "border-foreground/40 scale-[1.15] shadow-lg" : "border-transparent hover:scale-110 opacity-55 hover:opacity-90")}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs capitalize">{c}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {(noteTitle || noteBody || noteEmoji) && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Preview</label>
                <div
                  className={cn("rounded-xl border p-3.5 space-y-2", N[noteColor].bg)}
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                >
                  {(noteEmoji || noteTitle) && (
                    <div className="flex items-center gap-2">
                      {noteEmoji && <span className="text-xl leading-none">{noteEmoji}</span>}
                      {noteTitle && <p className="font-black text-sm tracking-tight">{noteTitle}</p>}
                    </div>
                  )}
                  {noteBody && <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground/80">{noteBody}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setNoteDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 text-white border-0 gap-1.5"
                onClick={handleSaveNote}
                disabled={!noteBody.trim() || createNote.isPending || updateNote.isPending}
              >
                {editNoteId
                  ? <><Check className="size-3.5" />Save Changes</>
                  : <><Pin className="size-3.5" />{createNote.isPending ? "Posting…" : "Post to Board"}</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
