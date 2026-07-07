"use client";

import * as React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Briefcase, Building2, Clock, MessageCircle, Zap } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deptLabel } from "@/lib/departments";
import type { TeamMember, Absence, OnlineStatus } from "@/hooks/useTeamPulse";
import { usePingMember } from "@/hooks/useTeamPulse";
import { useOpenDm } from "@/hooks/useOpenDm";
import { S, ROLE_STYLE, ROLE_LABEL, A } from "./team-pulse-constants";
import { StatusDot, PresenceAvatarDot } from "./StatusDot";

const PING_MAX = 3;
const PING_WINDOW_MS = 3_600_000;

function getPingTimes(memberId: string): number[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(`ping_ts_${memberId}`) : null;
    if (!raw) return [];
    return (JSON.parse(raw) as number[]).filter((t) => Date.now() - t < PING_WINDOW_MS);
  } catch {
    return [];
  }
}

function recordPingLocal(memberId: string) {
  const times = getPingTimes(memberId);
  times.push(Date.now());
  localStorage.setItem(`ping_ts_${memberId}`, JSON.stringify(times));
}

function usePingState(memberId: string, isMe: boolean) {
  const [pingTimes, setPingTimes] = React.useState<number[]>([]);
  const [cooldownLabel, setCooldownLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isMe) return;
    setPingTimes(getPingTimes(memberId));
  }, [memberId, isMe]);

  React.useEffect(() => {
    if (pingTimes.length < PING_MAX) { setCooldownLabel(null); return; }
    const oldest = Math.min(...pingTimes);
    const resetAt = oldest + PING_WINDOW_MS;
    const tick = () => {
      const rem = resetAt - Date.now();
      if (rem <= 0) { setCooldownLabel(null); return; }
      const m = Math.floor(rem / 60_000);
      const s = Math.floor((rem % 60_000) / 1_000);
      setCooldownLabel(m > 0 ? `${m}m` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [pingTimes]);

  const canPing = !isMe && pingTimes.length < PING_MAX && !cooldownLabel;

  function onPingSuccess() {
    recordPingLocal(memberId);
    setPingTimes(getPingTimes(memberId));
  }

  return { canPing, cooldownLabel, onPingSuccess, pingsLeft: Math.max(0, PING_MAX - pingTimes.length) };
}

function PingPopover({
  member,
  isMe,
  compact = false,
}: {
  member: TeamMember;
  isMe: boolean;
  compact?: boolean;
}) {
  const { canPing, cooldownLabel, onPingSuccess, pingsLeft } = usePingState(member._id, isMe);
  const pingMutation = usePingMember();
  const [pingMsg, setPingMsg] = React.useState("");
  const [open, setOpen] = React.useState(false);

  async function handlePing() {
    try {
      await pingMutation.mutateAsync({ userId: member._id, message: pingMsg.trim() || undefined });
      onPingSuccess();
      setOpen(false);
      setPingMsg("");
      toast.success(`Pinged ${member.name.split(" ")[0]}!`, { duration: 3000 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not send ping");
    }
  }

  if (isMe) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          disabled={!canPing}
          title={cooldownLabel ? `Cooldown: ${cooldownLabel}` : `Ping ${member.name.split(" ")[0]}`}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg border transition-all shrink-0",
            compact ? "size-8" : "h-9 px-2.5",
            canPing
              ? "border-amber-300/50 text-amber-600 hover:bg-amber-50 hover:border-amber-400 dark:border-amber-700/40 dark:text-amber-400 dark:hover:bg-amber-950/30"
              : "border-border/20 text-muted-foreground/25 cursor-not-allowed",
          )}
        >
          {cooldownLabel ? (
            <span className="text-[9px] font-black tabular-nums leading-none min-w-4.5 text-center">{cooldownLabel}</span>
          ) : (
            <>
              <Zap className={cn("shrink-0", compact ? "size-3" : "size-3")} />
              {!compact && <span className="hidden sm:inline text-[10px] font-bold">Ping</span>}
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-64 p-3 rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Zap className="size-3.5 text-amber-500 shrink-0" />
          <p className="text-xs font-black">Ping {member.name.split(" ")[0]}</p>
          <span className="ml-auto text-[10px] text-muted-foreground/40">{pingsLeft}/3 left</span>
        </div>
        <Textarea
          value={pingMsg}
          onChange={(e) => setPingMsg(e.target.value.slice(0, 120))}
          placeholder={`Hey ${member.name.split(" ")[0]}, checking in!`}
          className="text-xs h-14 resize-none bg-muted/20 border-border/40 mb-2.5"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePing(); }
          }}
        />
        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
          onClick={handlePing}
          disabled={pingMutation.isPending}
        >
          <Zap className="size-3" />
          {pingMutation.isPending ? "Sending…" : "Send Ping"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function MemberCard({
  member,
  isMe,
  myUserId,
  leaveToday,
  onClick,
  viewMode = "list",
}: {
  member: TeamMember;
  isMe: boolean;
  myUserId?: string;
  leaveToday?: Absence;
  onClick: () => void;
  viewMode?: "list" | "grid";
}) {
  const status = (member.onlineStatus ?? "offline") as OnlineStatus;
  const since = member.lastActive
    ? formatDistanceToNow(parseISO(member.lastActive), { addSuffix: true })
    : null;
  const dept = deptLabel(member.personalInfo?.department);
  const noDept = !member.personalInfo?.department;
  const { openDm, loading: dmLoading } = useOpenDm();

  function handleMessage(e: React.MouseEvent) {
    e.stopPropagation();
    openDm(member._id);
  }

  if (viewMode === "grid") {
    return (
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === "Enter" && onClick()}
          className={cn(
            "w-full text-left flex flex-col items-center gap-3 p-4 pt-5 rounded-xl border bg-card",
            "hover:bg-accent/10 active:scale-[0.98] transition-all duration-150 cursor-pointer group",
            "border-border/40 hover:border-border/60",
            isMe && "ring-1 ring-primary/20 border-primary/20",
          )}
        >
          <div className="relative">
            <Avatar className={cn(
              "size-12 ring-2 ring-offset-2 ring-offset-background transition-all group-hover:scale-105",
              S.ring[status],
              status === "offline" && "opacity-50",
            )}>
              <AvatarImage src={member.avatar} />
              <AvatarFallback className="text-base font-black bg-muted/60">{member.name[0]}</AvatarFallback>
            </Avatar>
            <PresenceAvatarDot status={status} deviceType={member.lastDeviceType} sizeClass="size-3" />
          </div>
          <div className="w-full text-center min-w-0">
            <div className="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
              <p className="font-bold text-sm truncate">{member.name}</p>
              {isMe && <span className="text-[9px] font-black text-primary uppercase tracking-widest px-1 py-0.5 rounded bg-primary/8">you</span>}
            </div>
            {member.personalInfo?.jobTitle && (
              <p className="text-[10px] text-muted-foreground/60 truncate">{member.personalInfo.jobTitle}</p>
            )}
            {member.customStatus && (
              <p className="text-[10px] italic text-muted-foreground/50 truncate mt-0.5">"{member.customStatus}"</p>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border", ROLE_STYLE[member.role] ?? ROLE_STYLE.employee)}>
                {ROLE_LABEL[member.role] ?? member.role}
              </Badge>
              {leaveToday ? (
                <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide", A[leaveToday.type]?.pill)}>
                  {A[leaveToday.type]?.label}
                </span>
              ) : (
                <Badge variant="outline" className={cn("text-[9px] font-semibold h-4 px-1.5 gap-1 border", S.badge[status])}>
                  <StatusDot s={status} />
                  {S.label[status]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!isMe && (
          <div className="absolute top-2 right-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <PingPopover member={member} isMe={isMe} compact />
            <button
              onClick={handleMessage}
              disabled={dmLoading}
              className={cn(
                "flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg text-[10px] font-bold border transition-all",
                "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary",
              )}
              title="Message"
            >
              {dmLoading ? (
                <span className="size-3 rounded-full border border-current border-t-transparent animate-spin" />
              ) : (
                <MessageCircle className="size-3" />
              )}
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full flex items-center gap-3 sm:gap-4 pl-0 pr-3 sm:pr-4 py-3 rounded-xl border bg-card",
        "transition-all duration-150 group overflow-hidden",
        "border-border/40 hover:border-border/60 hover:bg-accent/10",
        isMe && "ring-1 ring-primary/20 border-primary/20",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 cursor-pointer pl-0"
      >
        <div className={cn("w-0.5 self-stretch shrink-0 transition-opacity opacity-70 group-hover:opacity-100", S.dot[status])} />

        <Avatar className={cn(
          "size-9 sm:size-10 ring-2 ring-offset-1 ring-offset-background transition-all shrink-0",
          S.ring[status],
          status === "offline" && "opacity-45",
        )}>
          <AvatarImage src={member.avatar} />
          <AvatarFallback className="text-sm font-black bg-muted/60">{member.name[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="font-bold text-sm truncate">{member.name}</span>
            {isMe && (
              <span className="text-[9px] font-black text-primary uppercase tracking-widest shrink-0 px-1 py-0.5 rounded bg-primary/8">you</span>
            )}
            <Badge
              variant="outline"
              className={cn("text-[9px] font-black px-1.5 h-4 uppercase tracking-wide border shrink-0", ROLE_STYLE[member.role] ?? ROLE_STYLE.employee)}
            >
              {ROLE_LABEL[member.role] ?? member.role}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {member.personalInfo?.jobTitle && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70 shrink-0">
                <Briefcase className="size-3 opacity-40 shrink-0" />
                <span className="truncate max-w-32">{member.personalInfo.jobTitle}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60 shrink-0">
              <Building2 className="size-3 opacity-40 shrink-0" />
              <span className={cn("truncate max-w-28", noDept && "italic opacity-40")}>{dept}</span>
            </span>
            {member.customStatus && (
              <span className="text-[10px] italic text-muted-foreground/40 truncate max-w-28">"{member.customStatus}"</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isMe && (
          <>
            <PingPopover member={member} isMe={isMe} compact />
            <button
              onClick={handleMessage}
              disabled={dmLoading}
              className={cn(
                "flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-bold shrink-0 border transition-all",
                "bg-primary/8 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary",
                dmLoading && "opacity-60 cursor-wait",
              )}
              title="Message"
            >
              {dmLoading ? (
                <span className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <MessageCircle className="size-3.5" />
              )}
              <span className="hidden sm:inline">Message</span>
            </button>
          </>
        )}

        <div className="flex flex-col items-end gap-1">
          {leaveToday ? (
            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide", A[leaveToday.type]?.pill)}>
              {A[leaveToday.type]?.label}
            </span>
          ) : (
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold h-5 px-2 gap-1 border", S.badge[status])}
            >
              <StatusDot s={status} />
              {S.label[status]}
            </Badge>
          )}
          {status === "offline" && since && (
            <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {since}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
