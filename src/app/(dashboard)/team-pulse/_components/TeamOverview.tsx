"use client";

import * as React from "react";
import { CalendarDays, LayoutGrid, MessageCircle, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/departments";
import type { TeamMember, Absence, OnlineStatus, AbsenceType } from "@/hooks/useTeamPulse";
import { useOpenDm } from "@/hooks/useOpenDm";
import { S, A } from "./team-pulse-constants";
import { PresenceAvatarDot } from "./StatusDot";

export function TeamOverview({
  members,
  todayAbsences,
  onMemberClick,
  myUserId,
}: {
  members: TeamMember[];
  todayAbsences: Absence[];
  onMemberClick: (id: string) => void;
  myUserId?: string;
}) {
  const { openDm } = useOpenDm();
  const online = members.filter((m) => m.onlineStatus === "online").length;
  const busy = members.filter((m) => m.onlineStatus === "busy" || m.onlineStatus === "do_not_disturb").length;
  const away = members.filter((m) => m.onlineStatus === "away" || m.onlineStatus === "idle").length;
  const offline = members.filter((m) => m.onlineStatus === "offline").length;
  const active = members.length - offline;
  const total = members.length;

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

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

  const sortedMembers = React.useMemo(
    () =>
      [...members].sort((a, b) => {
        const o: Record<string, number> = { online: 0, busy: 1, away: 2, idle: 3, do_not_disturb: 4, offline: 5 };
        return (o[a.onlineStatus] ?? 5) - (o[b.onlineStatus] ?? 5);
      }),
    [members],
  );

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

  const metrics = [
    {
      label: "Members",
      value: total,
      sub: `${active} active`,
      accent: "text-foreground",
    },
    {
      label: "Online",
      value: online,
      sub: `${pct(online)}% of team`,
      accent: "text-green-600 dark:text-green-400",
    },
    {
      label: "Away / Busy",
      value: away + busy,
      sub: `${away} away · ${busy} busy`,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Out Today",
      value: todayAbsences.length,
      sub: todayAbsences.length ? "on leave / absent" : "everyone in",
      accent: todayAbsences.length ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground/60",
    },
  ];

  return (
    <div className="space-y-5">

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/30">
          {metrics.map((m, i) => (
            <div key={m.label} className="flex flex-col gap-1 px-4 sm:px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">{m.label}</p>
              <p className={cn("text-3xl sm:text-4xl font-black tabular-nums leading-none mt-1", m.accent)}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground/50 leading-tight mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="border-t border-border/30">
            <div className="flex gap-0 h-1.5">
              {online > 0 && (
                <div
                  className="bg-green-500 transition-all duration-700"
                  style={{ width: `${pct(online)}%` }}
                />
              )}
              {busy > 0 && (
                <div
                  className="bg-red-400 transition-all duration-700"
                  style={{ width: `${pct(busy)}%` }}
                />
              )}
              {away > 0 && (
                <div
                  className="bg-amber-400 transition-all duration-700"
                  style={{ width: `${pct(away)}%` }}
                />
              )}
              {offline > 0 && (
                <div
                  className="bg-muted/60 transition-all duration-700"
                  style={{ width: `${pct(offline)}%` }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2 border-b border-border/30">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Team Members</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-black text-primary tabular-nums">{active}</span>
              <span className="text-[10px] text-muted-foreground/40">active</span>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground/40 tabular-nums">{total} total</span>
            </div>
          </div>
          <div
            ref={stripRef}
            className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar py-4 px-4 select-none touch-pan-x"
            style={{ cursor: "grab" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {sortedMembers.map((m) => {
              const st = m.onlineStatus as OnlineStatus;
              const isMe = m._id === myUserId;
              return (
                <Popover key={m._id}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => { if (drag.current.moved) { e.preventDefault(); return; } }}
                      className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                    >
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "size-10 ring-2 ring-offset-2 ring-offset-background transition-all group-hover:scale-110",
                            S.ring[st],
                            st === "offline" && "opacity-40",
                          )}
                        >
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback className="text-sm font-black bg-muted/60">{m.name[0]}</AvatarFallback>
                        </Avatar>
                        <PresenceAvatarDot status={st} deviceType={m.lastDeviceType} borderClass="border-[1.5px] border-background" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold max-w-12 truncate leading-tight">{m.name.split(" ")[0]}</p>
                        <p className={cn("text-[9px] font-bold leading-tight", {
                          "text-green-600 dark:text-green-400": st === "online",
                          "text-red-500 dark:text-red-400": st === "busy" || st === "do_not_disturb",
                          "text-amber-500 dark:text-amber-400": st === "away" || st === "idle",
                          "text-muted-foreground/35": st === "offline",
                        })}>
                          {S.label[st]}
                        </p>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="center" className="w-52 p-2 rounded-xl">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-border/40 mb-2">
                      <Avatar className={cn("size-8 ring-2 ring-offset-1 ring-offset-background shrink-0", S.ring[st])}>
                        <AvatarImage src={m.avatar} />
                        <AvatarFallback className="text-xs font-black">{m.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{m.name}</p>
                        {m.customStatus
                          ? <p className="text-[10px] italic text-muted-foreground/60 truncate">"{m.customStatus}"</p>
                          : <p className="text-[10px] text-muted-foreground/50">{S.label[st]}</p>
                        }
                      </div>
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => onMemberClick(m._id)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted/60 transition-colors text-left"
                      >
                        <User className="size-3.5 text-muted-foreground/60 shrink-0" />
                        View Profile
                      </button>
                      {!isMe && (
                        <button
                          onClick={() => openDm(m._id)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-semibold bg-primary/8 hover:bg-primary/15 text-primary transition-colors text-left"
                        >
                          <MessageCircle className="size-3.5 shrink-0" />
                          Message
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-3 text-muted-foreground/40 shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">By Department</span>
        </div>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
          {deptGroups.map(({ key, label, members: dm }) => {
            const dOnline = dm.filter((m) => m.onlineStatus === "online").length;
            const dBusy = dm.filter((m) => m.onlineStatus === "busy" || m.onlineStatus === "do_not_disturb").length;
            const dAway = dm.filter((m) => m.onlineStatus === "away" || m.onlineStatus === "idle").length;
            const dOffline = dm.filter((m) => m.onlineStatus === "offline").length;
            const isEmpty = dm.length === 0;
            const isNone = key === "__none__";
            const hasActive = dOnline + dBusy + dAway > 0;

            const accentCls = dOnline > 0
              ? "bg-green-500"
              : hasActive ? "bg-amber-500"
              : "bg-border/50";

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 sm:gap-4 px-4 py-3 transition-colors",
                  !isEmpty && !isNone && "hover:bg-muted/20",
                  (isEmpty || isNone) && "opacity-50",
                )}
              >
                <div className={cn("w-1 h-6 rounded-full shrink-0", accentCls)} />

                <div className="w-36 sm:w-44 shrink-0 min-w-0">
                  <p className={cn(
                    "text-xs font-bold truncate leading-tight",
                    (isNone || isEmpty) && "italic text-muted-foreground/60",
                  )}>
                    {label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 leading-tight tabular-nums">{dm.length} member{dm.length !== 1 ? "s" : ""}</p>
                </div>

                {!isEmpty ? (
                  <>
                    <div className="hidden sm:flex -space-x-1.5 shrink-0">
                      {[...dm]
                        .sort((a, b) => {
                          const o: Record<string, number> = { online: 0, busy: 1, away: 2, idle: 3, do_not_disturb: 4, offline: 5 };
                          return (o[a.onlineStatus] ?? 5) - (o[b.onlineStatus] ?? 5);
                        })
                        .slice(0, 6)
                        .map((m) => (
                          <Tooltip key={m._id}>
                            <TooltipTrigger asChild>
                              <div className={cn(m.onlineStatus === "offline" && "opacity-35")}>
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

                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden flex">
                        {dOnline > 0 && <div className="bg-green-500 transition-all" style={{ width: `${Math.round((dOnline / dm.length) * 100)}%` }} />}
                        {dBusy > 0 && <div className="bg-red-400 transition-all" style={{ width: `${Math.round((dBusy / dm.length) * 100)}%` }} />}
                        {dAway > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${Math.round((dAway / dm.length) * 100)}%` }} />}
                      </div>
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        {dOnline > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
                            <span className="size-1.5 rounded-full bg-green-500" />{dOnline}
                          </span>
                        )}
                        {dBusy > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 dark:text-red-400">
                            <span className="size-1.5 rounded-full bg-red-400" />{dBusy}
                          </span>
                        )}
                        {dAway > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <span className="size-1.5 rounded-full bg-amber-400" />{dAway}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                          <span className="size-1.5 rounded-full bg-muted-foreground/25" />{dOffline}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground/30 italic">No members</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {todayAbsences.length > 0 && (
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200/40 dark:border-amber-800/20">
            <CalendarDays className="size-3 text-amber-600 dark:text-amber-500 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Out Today</span>
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 tabular-nums ml-auto">{todayAbsences.length}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap px-4 py-3">
            {todayAbsences.map((a) => {
              const liveAvatar = members.find((m) => m.name === a.userName)?.avatar;
              return (
                <div key={a._id} className="flex items-center gap-2">
                  <Avatar className="size-6 shrink-0">
                    <AvatarImage src={liveAvatar || a.userAvatar} />
                    <AvatarFallback className="text-[9px]">{a.userName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold">{a.userName.split(" ")[0]}</span>
                  <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide", A[a.type as AbsenceType]?.pill)}>
                    {A[a.type as AbsenceType]?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
