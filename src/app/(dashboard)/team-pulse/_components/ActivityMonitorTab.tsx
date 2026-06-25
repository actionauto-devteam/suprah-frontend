"use client";

import * as React from "react";
import {
  Coffee, ArrowLeft, CircleDot, User2, Search, Wifi,
  WifiOff, Clock, Flame, BellOff, Minus,
  Activity, Users, TrendingUp,
} from "lucide-react";
import { formatDistanceToNowStrict, parseISO, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TeamMember, OnlineStatus } from "@/hooks/useTeamPulse";
import { useActivityFeed, useStartBreak, useEndBreak, type ActivityEvent } from "@/hooks/useActivityFeed";
import { useOpenDm } from "@/hooks/useOpenDm";
import { S } from "./team-pulse-constants";

interface Props {
  members: TeamMember[];
  myUserId?: string;
}

type RosterFilter = "all" | "active" | "away" | "offline";

const EVENT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  online:           { icon: Wifi,       color: "text-green-600 dark:text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
  offline:          { icon: WifiOff,    color: "text-gray-500 dark:text-gray-400",     bg: "bg-muted/60 border-border/20" },
  away:             { icon: Minus,      color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  busy:             { icon: Flame,      color: "text-red-600 dark:text-red-400",       bg: "bg-red-500/10 border-red-500/20" },
  do_not_disturb:   { icon: BellOff,    color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  break_start:      { icon: Coffee,     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  break_end:        { icon: ArrowLeft,  color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/10 border-blue-500/20" },
  custom_status:    { icon: CircleDot,  color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  idle:             { icon: Clock,      color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
};

function timeAgo(iso: string) {
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function breakDuration(startedAt?: string) {
  if (!startedAt) return 0;
  try {
    return differenceInMinutes(new Date(), parseISO(startedAt));
  } catch {
    return 0;
  }
}

function MemberAvatar({
  name, avatar, size = "md",
}: {
  name: string; avatar?: string; size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "size-7" : "size-9";
  const txt = size === "sm" ? "text-[9px]" : "text-[11px]";
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return avatar ? (
    <img src={avatar} alt={name} className={cn(sz, "rounded-full object-cover shrink-0")} />
  ) : (
    <div className={cn(sz, txt, "rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary shrink-0")}>
      {initials}
    </div>
  );
}

function BreakTimer({ startedAt }: { startedAt?: string }) {
  const [min, setMin] = React.useState(() => breakDuration(startedAt));
  React.useEffect(() => {
    const id = setInterval(() => setMin(breakDuration(startedAt)), 30_000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span>{min}m</span>;
}

function MemberCard({
  member,
  isMe,
  myUserId,
  onBreakToggle,
  breakLoading,
}: {
  member: TeamMember;
  isMe: boolean;
  myUserId?: string;
  onBreakToggle: () => void;
  breakLoading: boolean;
}) {
  const isOnBreak = member.breakStatus?.isOnBreak ?? false;
  const isOffline = member.onlineStatus === "offline";
  const statusLabel = S.label[member.onlineStatus as OnlineStatus] ?? member.onlineStatus;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 p-3 rounded-xl border transition-all",
        "bg-card hover:bg-accent/5",
        isMe ? "border-primary/30 ring-1 ring-primary/10" : "border-border/40",
        isOnBreak && "border-orange-400/30 bg-orange-500/3",
      )}
    >
      <div className="relative shrink-0">
        <MemberAvatar name={member.name} avatar={member.avatar} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
            S.dot[member.onlineStatus as OnlineStatus] ?? "bg-gray-400",
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("text-[12px] font-bold truncate", isOffline && "text-muted-foreground/70")}>
            {member.name}
          </span>
          {isMe && (
            <span className="text-[9px] font-black text-primary bg-primary/10 px-1 rounded shrink-0">You</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={cn(
            "text-[10px] font-semibold px-1.5 py-px rounded border leading-none",
            S.badge[member.onlineStatus as OnlineStatus] ?? "bg-muted/60 text-muted-foreground border-border/30",
          )}>
            {statusLabel}
          </span>
          {isOnBreak && (
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
              <Coffee className="size-2.5" />
              Break {member.breakStatus?.startedAt && <BreakTimer startedAt={member.breakStatus.startedAt} />}
            </span>
          )}
        </div>

        {member.customStatus && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{member.customStatus}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          {member.personalInfo?.jobTitle && (
            <span className="text-[9px] text-muted-foreground/50 truncate">{member.personalInfo.jobTitle}</span>
          )}
          {member.lastActive && !isOnBreak && (
            <span className="text-[9px] text-muted-foreground/40 shrink-0">
              {timeAgo(member.lastActive)}
            </span>
          )}
        </div>
      </div>

      {isMe && (
        <Button
          size="sm"
          variant={isOnBreak ? "default" : "outline"}
          onClick={onBreakToggle}
          disabled={breakLoading}
          className={cn(
            "h-6 px-2 text-[10px] font-bold shrink-0 rounded-lg",
            isOnBreak
              ? "bg-orange-500 hover:bg-orange-600 text-white border-0"
              : "border-orange-400/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10",
          )}
        >
          <Coffee className="size-2.5 mr-1" />
          {isOnBreak ? "End" : "Break"}
        </Button>
      )}
    </div>
  );
}

function EventItem({ event, myUserId }: { event: ActivityEvent; myUserId?: string }) {
  const { openDm } = useOpenDm();
  const meta = EVENT_META[event.type] ?? EVENT_META.offline;
  const Icon = meta.icon;
  const initials = event.userName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const canChat = event.userId !== myUserId;

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-border/30 last:border-0 group">
      <div className="relative shrink-0">
        <button
          onClick={() => canChat && openDm(event.userId)}
          className={cn("relative", canChat && "cursor-pointer")}
          disabled={!canChat}
        >
          {event.userAvatar ? (
            <img src={event.userAvatar} alt={event.userName} className="size-7 rounded-full object-cover" />
          ) : (
            <div className="size-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-black text-primary">
              {initials}
            </div>
          )}
        </button>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border border-background flex items-center justify-center pointer-events-none",
          meta.bg,
        )}>
          <Icon className={cn("size-2", meta.color)} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground/90 leading-snug">
          <span className="font-semibold">{event.userName}</span>
          {" · "}
          <span className="text-muted-foreground/80">{event.description.replace(event.userName, "").trim()}</span>
        </p>
        {event.type === "break_end" && event.meta?.durationMin > 0 && (
          <p className="text-[9px] text-muted-foreground/50 mt-0.5">Duration: {event.meta?.durationMin}m</p>
        )}
      </div>

      <span className="text-[9px] text-muted-foreground/40 shrink-0 tabular-nums mt-0.5">
        {timeAgo(event.createdAt)}
      </span>
    </div>
  );
}

const FILTER_LABELS: Record<RosterFilter, string> = {
  all: "All",
  active: "Active",
  away: "Away",
  offline: "Offline",
};

export function ActivityMonitorTab({ members, myUserId }: Props) {
  const [rosterFilter, setRosterFilter] = React.useState<RosterFilter>("all");
  const [search, setSearch] = React.useState("");

  const { data: events = [], isLoading: eventsLoading } = useActivityFeed();
  const { mutate: startBreak, isPending: startingBreak } = useStartBreak();
  const { mutate: endBreak, isPending: endingBreak } = useEndBreak();

  const myMember = members.find((m) => m._id === myUserId);
  const isOnBreak = myMember?.breakStatus?.isOnBreak ?? false;
  const breakLoading = startingBreak || endingBreak;

  const stats = React.useMemo(() => ({
    online:  members.filter((m) => m.onlineStatus === "online").length,
    active:  members.filter((m) => !["offline"].includes(m.onlineStatus)).length,
    onBreak: members.filter((m) => m.breakStatus?.isOnBreak).length,
    offline: members.filter((m) => m.onlineStatus === "offline").length,
  }), [members]);

  const filteredMembers = React.useMemo(() => {
    const q = search.toLowerCase();
    let list = members.filter((m) => !q || m.name.toLowerCase().includes(q));
    if (rosterFilter === "active") list = list.filter((m) => m.onlineStatus !== "offline");
    else if (rosterFilter === "away")  list = list.filter((m) => ["away", "busy", "idle", "do_not_disturb"].includes(m.onlineStatus));
    else if (rosterFilter === "offline") list = list.filter((m) => m.onlineStatus === "offline");
    return [...list].sort((a, b) => {
      if (a._id === myUserId) return -1;
      if (b._id === myUserId) return 1;
      return 0;
    });
  }, [members, search, rosterFilter, myUserId]);

  function handleBreakToggle() {
    if (isOnBreak) endBreak();
    else startBreak();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Online Now",  value: stats.online,  Icon: Wifi,        color: "text-green-600 dark:text-green-400",   dot: "bg-green-500" },
          { label: "Active",      value: stats.active,  Icon: Activity,    color: "text-blue-600 dark:text-blue-400",     dot: "bg-blue-500" },
          { label: "On Break",    value: stats.onBreak, Icon: Coffee,      color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
          { label: "Offline",     value: stats.offline, Icon: WifiOff,     color: "text-muted-foreground/60",             dot: "bg-gray-400" },
        ].map(({ label, value, Icon, color, dot }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card">
            <div className="flex items-center justify-center size-8 rounded-lg bg-muted/60 shrink-0">
              <Icon className={cn("size-4", color)} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black tabular-nums leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground/60" />
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">Live Roster</span>
            </div>
            <span className="text-[10px] text-muted-foreground/40 tabular-nums">{filteredMembers.length} shown</span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="pl-7 h-8 text-xs bg-background border-border/50"
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {(Object.keys(FILTER_LABELS) as RosterFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setRosterFilter(f)}
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                  rosterFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/40 text-muted-foreground/60 hover:border-border hover:text-foreground",
                )}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="space-y-2 pr-0.5 sm:max-h-130 sm:overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground/40">
                <User2 className="size-8" />
                <p className="text-xs">No members match this filter</p>
              </div>
            ) : (
              filteredMembers.map((m) => (
                <MemberCard
                  key={m._id}
                  member={m}
                  isMe={m._id === myUserId}
                  myUserId={myUserId}
                  onBreakToggle={handleBreakToggle}
                  breakLoading={breakLoading}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-muted-foreground/60" />
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">Activity Stream</span>
            </div>
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Live</span>
          </div>

          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            {eventsLoading ? (
              <div className="space-y-0 divide-y divide-border/30 px-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5">
                    <div className="size-7 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground/40">
                <Activity className="size-10" />
                <div className="text-center">
                  <p className="text-sm font-semibold">No activity yet</p>
                  <p className="text-[11px] mt-1">Events appear here as your team works</p>
                </div>
              </div>
            ) : (
              <div className="px-3 divide-y divide-border/30 sm:max-h-130 sm:overflow-y-auto">
                {events.map((event) => (
                  <EventItem key={event._id} event={event} myUserId={myUserId} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
