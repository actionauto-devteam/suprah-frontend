"use client";

import * as React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Briefcase, Building2, Clock, MessageCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deptLabel } from "@/lib/departments";
import type { TeamMember, Absence, OnlineStatus } from "@/hooks/useTeamPulse";
import { useOpenDm } from "@/hooks/useOpenDm";
import { S, ROLE_STYLE, ROLE_LABEL, A } from "./team-pulse-constants";
import { StatusDot, PresenceAvatarDot } from "./StatusDot";

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
      <div className="relative h-full">
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === "Enter" && onClick()}
          className={cn(
            "w-full h-full min-h-48 text-left flex flex-col items-center gap-3 p-4 pt-5 rounded-xl border bg-card",
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
            <div className="flex items-center justify-center gap-1.5 mt-auto pt-2 flex-wrap">
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
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onClick();
      }}
      className={cn(
        "w-full grid grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_auto_minmax(0,1.3fr)_minmax(0,1fr)_auto]",
        "items-center gap-3 sm:gap-4 pl-0 pr-3 sm:pr-4 py-3 rounded-xl border bg-card cursor-pointer",
        "transition-all duration-150 group overflow-hidden",
        "border-border/40 hover:border-border/60 hover:bg-accent/10",
        isMe && "ring-1 ring-primary/20 border-primary/20",
      )}
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

      <div className="min-w-0">
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
        <div className="flex items-center gap-2 flex-wrap sm:hidden">
          {member.personalInfo?.jobTitle && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70 min-w-0">
              <Briefcase className="size-3 opacity-40 shrink-0" />
              <span className="truncate max-w-32">{member.personalInfo.jobTitle}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60 min-w-0">
            <Building2 className="size-3 opacity-40 shrink-0" />
            <span className={cn("truncate max-w-28", noDept && "italic opacity-40")}>{dept}</span>
          </span>
          {member.customStatus && (
            <span className="text-[10px] italic text-muted-foreground/40 truncate max-w-28">"{member.customStatus}"</span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-4 min-w-0">
        {member.personalInfo?.jobTitle && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 min-w-0 flex-1">
            <Briefcase className="size-3 opacity-40 shrink-0" />
            <span className="truncate">{member.personalInfo.jobTitle}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 min-w-0 flex-1">
          <Building2 className="size-3 opacity-40 shrink-0" />
          <span className={cn("truncate", noDept && "italic opacity-40")}>{dept}</span>
        </span>
        {member.customStatus && (
          <span className="text-[10px] italic text-muted-foreground/40 truncate min-w-0 flex-1">"{member.customStatus}"</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 h-10" onClick={(e) => e.stopPropagation()}>
        {!isMe && (
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
        )}

        <div className="flex flex-col items-end justify-center gap-1 h-10 w-28 shrink-0">
          {leaveToday ? (
            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide truncate max-w-full", A[leaveToday.type]?.pill)}>
              {A[leaveToday.type]?.label}
            </span>
          ) : (
            <Badge
              variant="outline"
              className={cn("text-[10px] font-semibold h-5 px-2 gap-1 border max-w-full", S.badge[status])}
            >
              <StatusDot s={status} />
              <span className="truncate">{S.label[status]}</span>
            </Badge>
          )}
          <span
            className="text-[10px] text-muted-foreground/40 flex items-center justify-end gap-0.5 h-3 leading-none w-full truncate"
            title={status === "offline" && since ? since : undefined}
          >
            {status === "offline" && since ? (
              <>
                <Clock className="size-2.5 shrink-0" />
                <span className="truncate">{since}</span>
              </>
            ) : (
              " "
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
