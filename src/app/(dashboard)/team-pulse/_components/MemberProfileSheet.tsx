"use client";

import * as React from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { deptLabel } from "@/lib/departments";
import type { OnlineStatus } from "@/hooks/useTeamPulse";
import { useTeamMemberProfile, usePingMember } from "@/hooks/useTeamPulse";
import { useOpenDm } from "@/hooks/useOpenDm";
import { S, ROLE_STYLE, ROLE_LABEL } from "./team-pulse-constants";
import { StatusDot, PresenceAvatarDot } from "./StatusDot";

const PING_MAX = 3;
const PING_WINDOW_MS = 3600_000;

function getPingTimes(memberId: string): number[] {
  try {
    const raw = localStorage.getItem(`ping_ts_${memberId}`);
    if (!raw) return [];
    const times: number[] = JSON.parse(raw);
    return times.filter((t) => Date.now() - t < PING_WINDOW_MS);
  } catch {
    return [];
  }
}

function recordPing(memberId: string) {
  const times = getPingTimes(memberId);
  times.push(Date.now());
  localStorage.setItem(`ping_ts_${memberId}`, JSON.stringify(times));
}

function MemberFullProfileDialog({
  profile,
  open,
  onClose,
}: {
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
    {
      icon: User,
      label: "Gender",
      value: (profile.personalInfo as any)?.gender
        ? String((profile.personalInfo as any).gender).charAt(0).toUpperCase() + String((profile.personalInfo as any).gender).slice(1)
        : null,
      color: "text-pink-500",
    },
    {
      icon: CalendarDays,
      label: "Birthday",
      value: (profile.personalInfo as any)?.dateOfBirth ? format(new Date((profile.personalInfo as any).dateOfBirth), "MMM d, yyyy") : null,
      color: "text-rose-500",
    },
  ].filter((i) => i.value);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
        <div className="relative overflow-hidden bg-linear-to-br from-primary/80 via-primary/60 to-primary/40 px-4 sm:px-6 pt-5 sm:pt-8 pb-4 sm:pb-6">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 0), radial-gradient(circle at 80% 20%, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          <div className="relative flex items-start gap-3 sm:gap-5">
            <div className="relative shrink-0">
              <Avatar className="size-16 sm:size-20 ring-4 ring-white/40 ring-offset-2 ring-offset-primary/50 shadow-xl">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="text-2xl font-black bg-primary/30 text-white">{profile.name?.[0]}</AvatarFallback>
              </Avatar>
              <PresenceAvatarDot status={status} deviceType={profile.lastDeviceType} sizeClass="size-5" borderClass="border-[3px] border-white" shadowClass="shadow-md" />
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
                  <Briefcase className="size-3 shrink-0" />
                  {profile.personalInfo.jobTitle}
                  {profile.personalInfo?.department && (
                    <span className="text-white/50">· {deptLabel(profile.personalInfo.department)}</span>
                  )}
                </p>
              )}
            </div>
            <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-1 gap-1.5 border shrink-0 self-start", S.badge[status])}>
              <StatusDot s={status} size="md" />
              {S.label[status]}
            </Badge>
          </div>
          {profile.customStatus && (
            <p className="relative mt-3 text-xs italic text-white/60">"{profile.customStatus}"</p>
          )}
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {profile.personalInfo?.bio && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">About</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{profile.personalInfo.bio}</p>
            </div>
          )}

          {infoItems.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2.5">Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {infoItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2.5">Account</p>
            <div className="flex flex-wrap gap-2">
              {(profile as any).accountStatus?.isActive !== undefined && (
                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  (profile as any).accountStatus?.isActive
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
                )}>
                  <span className={cn("size-1.5 rounded-full", (profile as any).accountStatus?.isActive ? "bg-green-500" : "bg-red-400")} />
                  {(profile as any).accountStatus?.isActive ? "Active" : "Inactive"}
                </div>
              )}
              {(profile as any).accountStatus?.isVerified !== undefined && (
                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  (profile as any).accountStatus?.isVerified
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40"
                    : "bg-muted/60 text-muted-foreground border-border/40",
                )}>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground/50 px-0.5">
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

export function MemberProfileSheet({
  memberId,
  onClose,
  myUserId,
}: {
  memberId: string | null;
  onClose: () => void;
  myUserId?: string;
}) {
  const { data: profile, isLoading } = useTeamMemberProfile(memberId);
  const status = (profile?.onlineStatus ?? "offline") as OnlineStatus;
  const { openDm, loading: dmLoading } = useOpenDm();
  const pingMember = usePingMember();

  const [pingOpen, setPingOpen] = React.useState(false);
  const [pingMsg, setPingMsg] = React.useState("");
  const [pingTimes, setPingTimes] = React.useState<number[]>([]);
  const [cooldownLabel, setCooldownLabel] = React.useState<string | null>(null);
  const [fullProfileOpen, setFullProfileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!memberId) return;
    const times = getPingTimes(memberId);
    setPingTimes(times);
  }, [memberId]);

  React.useEffect(() => {
    if (pingTimes.length < PING_MAX) { setCooldownLabel(null); return; }
    const oldest = Math.min(...pingTimes);
    const resetAt = oldest + PING_WINDOW_MS;
    const tick = () => {
      const remaining = resetAt - Date.now();
      if (remaining <= 0) { setCooldownLabel(null); return; }
      const m = Math.floor(remaining / 60_000);
      const s = Math.floor((remaining % 60_000) / 1_000);
      setCooldownLabel(m > 0 ? `${m}m` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [pingTimes]);

  const isMe = memberId === myUserId;
  const canPing = !isMe && pingTimes.length < PING_MAX && !cooldownLabel;

  async function handlePing() {
    if (!memberId || !canPing) return;
    try {
      await pingMember.mutateAsync({ userId: memberId, message: pingMsg.trim() || undefined });
      recordPing(memberId);
      const newTimes = getPingTimes(memberId);
      setPingTimes(newTimes);
      setPingOpen(false);
      setPingMsg("");
      toast.success(`Pinged ${profile?.name ?? "member"}!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not send ping");
    }
  }

  return (
    <>
    <MemberFullProfileDialog profile={profile} open={fullProfileOpen} onClose={() => setFullProfileOpen(false)} />
    <Sheet open={!!memberId} onOpenChange={(o) => { if (!o) { onClose(); setPingOpen(false); setFullProfileOpen(false); } }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className={cn("relative overflow-hidden bg-linear-to-br from-primary/15 via-primary/8 to-transparent border-b border-border/30 px-5 sm:px-6 pt-5 pb-4", !profile && "hidden")}>
          <SheetHeader className="sr-only">
            <SheetTitle>{profile?.name ?? "Team Member"}</SheetTitle>
          </SheetHeader>
          {profile && (
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0">
                <Avatar className={cn("size-14 sm:size-16 ring-2 ring-offset-2 ring-offset-background", S.ring[status])}>
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-xl font-black">{profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <PresenceAvatarDot status={status} deviceType={profile.lastDeviceType} sizeClass="size-4" shadowClass="shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black tracking-tight truncate">{profile.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border", ROLE_STYLE[profile.role] ?? ROLE_STYLE.employee)}>
                    {ROLE_LABEL[profile.role] ?? profile.role}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold h-4 px-1.5 gap-1 border", S.badge[status])}>
                    <StatusDot s={status} />
                    {S.label[status]}
                  </Badge>
                </div>
                {profile.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="size-3 opacity-50 shrink-0" />{profile.email}
                  </p>
                )}
                {profile.customStatus && (
                  <p className="text-[11px] italic text-muted-foreground/50 mt-1">"{profile.customStatus}"</p>
                )}
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && !profile && (
          <div className="flex flex-col items-center py-16 px-6">
            <SheetHeader>
              <SheetTitle>Team Member</SheetTitle>
            </SheetHeader>
            <p className="text-sm text-muted-foreground text-center mt-4">Profile not found</p>
          </div>
        )}

        {!isLoading && profile && (
          <div className="space-y-5 px-5 sm:px-6 py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2.5">Work</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { icon: Briefcase, label: "Job Title", value: profile.personalInfo?.jobTitle, color: "text-amber-500" },
                  { icon: Building2, label: "Department", value: profile.personalInfo?.department ? deptLabel(profile.personalInfo.department) : null, color: "text-cyan-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/20 border border-border/30">
                    <item.icon className={cn("size-3.5 shrink-0", item.color)} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50">{item.label}</p>
                      <p className="text-xs font-semibold truncate">
                        {item.value || <span className="italic font-normal text-muted-foreground/40">Not set</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2.5">Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { icon: Phone, label: "Phone", value: profile.personalInfo?.phone, color: "text-blue-500", href: profile.personalInfo?.phone ? `tel:${profile.personalInfo.phone}` : undefined },
                  { icon: Mail, label: "Email", value: profile.email, color: "text-violet-500", href: profile.email ? `mailto:${profile.email}` : undefined },
                  { icon: MapPin, label: "Location", value: profile.personalInfo?.location, color: "text-emerald-500", href: undefined },
                  { icon: Globe, label: "Timezone", value: (profile.personalInfo as any)?.timezone, color: "text-indigo-500", href: undefined },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/20 border border-border/30">
                    <item.icon className={cn("size-4 shrink-0", item.color)} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50">{item.label}</p>
                      {item.href && item.value ? (
                        <a href={item.href} className="text-xs font-semibold truncate block hover:text-primary transition-colors">{item.value}</a>
                      ) : (
                        <p className="text-xs font-semibold truncate">
                          {item.value || <span className="italic font-normal text-muted-foreground/40">Not set</span>}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-muted/20 border border-border/20 px-4 py-4">
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

            {!isMe && pingOpen && (
              <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70 dark:text-amber-400/70">Add a message (optional)</p>
                <Textarea
                  value={pingMsg}
                  onChange={(e) => setPingMsg(e.target.value.slice(0, 120))}
                  placeholder={`Hey ${profile.name?.split(" ")[0]}, checking in!`}
                  className="text-xs h-16 resize-none bg-background border-border/50"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => { setPingOpen(false); setPingMsg(""); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
                    onClick={handlePing}
                    disabled={pingMember.isPending}
                  >
                    <Zap className="size-3" />
                    {pingMember.isPending ? "Pinging…" : "Send Ping"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 gap-2"
                variant="outline"
                onClick={() => setFullProfileOpen(true)}
                disabled={!profile}
              >
                <ExternalLink className="size-4" />
                Full Profile
              </Button>
              {!isMe && (
                <>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => { onClose(); openDm(memberId!); }}
                    disabled={dmLoading}
                  >
                    {dmLoading ? (
                      <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    ) : (
                      <MessageCircle className="size-4" />
                    )}
                    {dmLoading ? "Opening…" : "Message"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "shrink-0 size-10 border transition-all",
                      canPing
                        ? "border-amber-300/60 text-amber-600 hover:bg-amber-50 hover:border-amber-400 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                        : "border-border/30 text-muted-foreground/30 cursor-not-allowed",
                    )}
                    onClick={() => canPing && setPingOpen((v) => !v)}
                    title={cooldownLabel ? `Cooldown: ${cooldownLabel}` : "Ping"}
                    disabled={!canPing}
                  >
                    {cooldownLabel ? (
                      <span className="text-[9px] font-black tabular-nums">{cooldownLabel}</span>
                    ) : (
                      <Zap className="size-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
            {!isMe && pingTimes.length > 0 && (
              <p className="text-[10px] text-muted-foreground/40 text-center -mt-1">
                {PING_MAX - pingTimes.length} ping{PING_MAX - pingTimes.length !== 1 ? "s" : ""} left this hour
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
