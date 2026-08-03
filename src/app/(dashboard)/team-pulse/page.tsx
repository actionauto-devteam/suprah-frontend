"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  LayoutGrid,
  Navigation,
  Radio,
  StickyNote,
  Users,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { endOfDay, differenceInMinutes, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useTeamMembers,
  useTeamAbsences,
  useCurrentMember,
  useUpdateMyStatus,
  type OnlineStatus,
} from "@/hooks/useTeamPulse";
import { useTeamPulseSocket } from "@/hooks/useTeamPulseSocket";
import { useUser } from "@/providers/AuthProvider";
import { onlineStatusOptions } from "@/components/profile/profile-constants";
import { isSameDay } from "date-fns";

import { TeamOverview } from "./_components/TeamOverview";
import { TeamList } from "./_components/TeamList";
import { TeamCalendar } from "./_components/TeamCalendar";
import { TeamBoard } from "./_components/TeamBoard";
import { ActivityMonitorTab } from "./_components/ActivityMonitorTab";
import { LocatorErrorBoundary } from "./_components/locator/LocatorErrorBoundary";
import { MemberProfileSheet } from "./_components/MemberProfileSheet";

type TabId =
  | "overview"
  | "team"
  | "activity"
  | "calendar"
  | "board";

const EXPIRY_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "4 hrs", value: 240 },
  { label: "Today", value: -1 },
  { label: "Never", value: 0 },
] as const;

function minutesUntilEndOfDay() {
  return differenceInMinutes(endOfDay(new Date()), new Date());
}

const VALID_TAB_IDS: TabId[] = ["overview", "team", "activity", "calendar", "board"];

export default function TeamPulsePage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const initialTab = (() => {
    const t = searchParams.get("tab") as TabId | null;
    return t && VALID_TAB_IDS.includes(t) ? t : "overview";
  })();
  const [tab, setTab] = React.useState<TabId>(initialTab);
  const [openMemberId, setOpenMemberId] = React.useState<string | null>(null);
  const [myStatus, setMyStatus] = React.useState<OnlineStatus>("offline");
  const [myCustomStatus, setMyCustomStatus] = React.useState("");
  const [myExpiresAt, setMyExpiresAt] = React.useState<string | null>(null);

  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [draftStatus, setDraftStatus] = React.useState<OnlineStatus>("online");
  const [draftCustom, setDraftCustom] = React.useState("");
  const [draftExpiry, setDraftExpiry] = React.useState<number>(0);

  useTeamPulseSocket();

  const { data: members = [], isLoading: membersLoading } = useTeamMembers();
  const now = new Date();
  const { data: absences = [] } = useTeamAbsences(
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const todayAbsences = React.useMemo(
    () => absences.filter((a) => isSameDay(parseISO(a.date), new Date())),
    [absences],
  );

  const myMember = useCurrentMember(user?.id);
  const isAdmin = ["admin", "super_admin"].includes(myMember?.role ?? "");
  const myUserId = myMember?._id;
  const updateStatus = useUpdateMyStatus();

  const onlineCount = members.filter((m) => m.onlineStatus === "online").length;
  const activeCount = members.filter(
    (m) => m.onlineStatus !== "offline",
  ).length;

  React.useEffect(() => {
    if (!myMember) return;
    setMyStatus((prev) => (myMember.onlineStatus !== prev ? myMember.onlineStatus : prev));
    setMyCustomStatus((prev) =>
      (myMember.customStatus ?? "") !== prev ? (myMember.customStatus ?? "") : prev,
    );
    setMyExpiresAt(myMember.statusExpiresAt ?? null);
  }, [myMember]);

  React.useEffect(() => {
    if (popoverOpen) {
      setDraftStatus(myStatus);
      setDraftCustom(myCustomStatus);
      setDraftExpiry(0);
    }
  }, [popoverOpen]);

  async function applyStatus() {
    const prev = myStatus;
    const prevCustom = myCustomStatus;
    const expiresIn =
      draftExpiry === -1
        ? minutesUntilEndOfDay()
        : draftExpiry === 0
          ? null
          : draftExpiry;

    setMyStatus(draftStatus);
    setMyCustomStatus(draftCustom);
    setPopoverOpen(false);

    try {
      await updateStatus.mutateAsync({
        status: draftStatus,
        customStatus: draftCustom.trim() || undefined,
        expiresIn,
      });
      const label =
        onlineStatusOptions.find((o) => o.value === draftStatus)?.label ??
        draftStatus;
      toast.success(
        `Status set to ${label}${draftCustom.trim() ? ` · "${draftCustom.trim()}"` : ""}`,
      );
    } catch {
      setMyStatus(prev);
      setMyCustomStatus(prevCustom);
      toast.error("Failed to update status");
    }
  }

  const currentStatusOpt =
    onlineStatusOptions.find((o) => o.value === myStatus) ??
    onlineStatusOptions[0];

  const expiryLabel = React.useMemo(() => {
    if (!myExpiresAt) return null;
    try {
      const min = differenceInMinutes(parseISO(myExpiresAt), new Date());
      if (min <= 0) return null;
      if (min < 60) return `${min}m left`;
      return `${Math.round(min / 60)}h left`;
    } catch {
      return null;
    }
  }, [myExpiresAt]);

  const tabs: {
    id: TabId;
    Icon: React.ComponentType<{ className?: string }>;
    label: string;
    count?: number;
  }[] = [
    { id: "overview", Icon: LayoutGrid, label: "Overview" },
    { id: "team", Icon: Users, label: "Team", count: members.length },
    {
      id: "activity",
      Icon: Navigation,
      label: "Locator",
      count: activeCount > 0 ? activeCount : undefined,
    },
    { id: "calendar", Icon: CalendarDays, label: "Calendar" },
    { id: "board", Icon: StickyNote, label: "Board" },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen animate-in fade-in duration-400">
        <div className="border-b border-border/50 bg-background">
          <div className="container mx-auto px-4 sm:px-8">
            <div className="flex items-center justify-between gap-4 py-4 sm:py-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                  <Radio className="size-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-2.5 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none">
                    Team<span className="text-primary">Pulse</span>
                  </h1>
                  <div className="hidden xs:flex items-center gap-1.5 shrink-0">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">
                      Live
                    </span>
                  </div>
                </div>
                {members.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-border/40">
                    <span className="text-[11px] font-black tabular-nums text-foreground">
                      {members.length}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      members
                    </span>
                    <span className="text-[11px] text-muted-foreground/30">
                      ·
                    </span>
                    <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-[11px] font-black tabular-nums text-green-700 dark:text-green-400">
                      {onlineCount}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      online
                    </span>
                    {todayAbsences.length > 0 && (
                      <>
                        <span className="text-[11px] text-muted-foreground/30">
                          ·
                        </span>
                        <span className="text-[11px] font-black tabular-nums text-amber-700 dark:text-amber-400">
                          {todayAbsences.length}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">
                          out
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 font-semibold border-border/50 shrink-0 rounded-lg text-xs bg-background"
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        currentStatusOpt.color,
                      )}
                    />
                    <span className="hidden sm:inline max-w-20 truncate">
                      {myCustomStatus || currentStatusOpt.label}
                    </span>
                    {expiryLabel && (
                      <span className="hidden md:flex items-center gap-0.5 text-muted-foreground/50 text-[9px]">
                        <Clock className="size-2.5" />
                        {expiryLabel}
                      </span>
                    )}
                    <ChevronDown className="size-3 text-muted-foreground/60" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  className="w-64 p-0 rounded-xl overflow-hidden"
                >
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">
                      My Status
                    </p>
                  </div>

                  <div className="px-1.5 space-y-0.5 pb-1">
                    {onlineStatusOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setDraftStatus(opt.value as OnlineStatus)
                          }
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all",
                            draftStatus === opt.value
                              ? "bg-primary/8 text-foreground"
                              : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center justify-center size-6 rounded-md shrink-0 bg-black/5 dark:bg-white/10">
                            <Icon className={cn("size-3", opt.color.replace("bg-", "text-"))} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">{opt.label}</p>
                            <p className="text-[10px] text-muted-foreground/60 truncate">
                              {opt.description}
                            </p>
                          </div>
                          {draftStatus === opt.value && (
                            <Check className="size-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-border/40 px-3 pt-2.5 pb-1.5 space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">
                      Custom Status
                    </p>
                    <div className="relative">
                      <Input
                        value={draftCustom}
                        onChange={(e) =>
                          setDraftCustom(e.target.value.slice(0, 60))
                        }
                        placeholder="What are you working on?"
                        className="h-8 text-xs bg-background border-border/50 pr-7"
                        onKeyDown={(e) => e.key === "Enter" && applyStatus()}
                      />
                      {draftCustom && (
                        <button
                          onClick={() => setDraftCustom("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="px-3 pb-2.5 space-y-1.5">
                    <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">
                      Clears In
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {EXPIRY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDraftExpiry(opt.value)}
                          className={cn(
                            "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                            draftExpiry === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border/40 text-muted-foreground/70 hover:border-border hover:text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/40 p-2.5">
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs font-bold"
                      onClick={applyStatus}
                      disabled={updateStatus.isPending}
                    >
                      {updateStatus.isPending ? "Applying…" : "Apply Status"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-0 overflow-x-auto no-scrollbar -mb-px">
              {tabs.map(({ id, Icon, label, count }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                    "border-b-2",
                    tab === id
                      ? "border-primary text-foreground font-black"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      tab === id ? "text-primary" : "text-muted-foreground/50",
                    )}
                  />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(" ")[0]}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        "text-[9px] font-black px-1 py-px rounded min-w-4 text-center leading-none tabular-nums",
                        tab === id
                          ? "bg-primary/12 text-primary"
                          : "bg-muted-foreground/10 text-muted-foreground/60",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-8 pb-20 pt-6">
          <div className="animate-in fade-in duration-200">
            {tab === "overview" && (
              <div className="space-y-6">
                <TeamOverview
                  members={members}
                  todayAbsences={todayAbsences}
                  onMemberClick={(id) => setOpenMemberId(id)}
                  myUserId={myUserId}
                />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">
                    Quick Access
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      {
                        id: "team" as TabId,
                        Icon: Users,
                        label: "Team Directory",
                        desc: `${members.length} members`,
                        accentCls: "bg-blue-500",
                        borderCls:
                          "border-border/40 hover:border-blue-300/50 dark:hover:border-blue-700/40",
                        iconCls: "text-blue-600 dark:text-blue-400",
                      },
                      {
                        id: "activity" as TabId,
                        Icon: Navigation,
                        label: "Locator",
                        desc: `${onlineCount} online now`,
                        accentCls: "bg-green-500",
                        borderCls:
                          "border-border/40 hover:border-green-300/50 dark:hover:border-green-700/40",
                        iconCls: "text-green-600 dark:text-green-400",
                      },
                      {
                        id: "calendar" as TabId,
                        Icon: CalendarDays,
                        label: "Team Calendar",
                        desc: todayAbsences.length
                          ? `${todayAbsences.length} out today`
                          : "All in today",
                        accentCls: "bg-amber-500",
                        borderCls:
                          "border-border/40 hover:border-amber-300/50 dark:hover:border-amber-700/40",
                        iconCls: "text-amber-600 dark:text-amber-400",
                      },
                      {
                        id: "board" as TabId,
                        Icon: StickyNote,
                        label: "Bulletin Board",
                        desc: "Team notes",
                        accentCls: "bg-emerald-500",
                        borderCls:
                          "border-border/40 hover:border-emerald-300/50 dark:hover:border-emerald-700/40",
                        iconCls: "text-emerald-600 dark:text-emerald-400",
                      },
                    ].map(
                      ({
                        id,
                        Icon,
                        label,
                        desc,
                        accentCls,
                        borderCls,
                        iconCls,
                      }) => (
                        <button
                          key={id}
                          onClick={() => setTab(id)}
                          className={cn(
                            "relative flex flex-col items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border bg-card",
                            "hover:bg-accent/10 active:scale-[0.98] transition-all text-left group min-w-0 overflow-hidden",
                            borderCls,
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-0 left-0 w-0.5 h-full opacity-60 group-hover:opacity-100 transition-opacity",
                              accentCls,
                            )}
                          />
                          <Icon
                            className={cn(
                              "size-4 shrink-0 transition-transform group-hover:scale-110",
                              iconCls,
                            )}
                          />
                          <div className="min-w-0 w-full">
                            <p className="text-[11px] sm:text-xs font-bold truncate">
                              {label}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 truncate mt-0.5">
                              {desc}
                            </p>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "team" && (
              <TeamList
                members={members}
                membersLoading={membersLoading}
                myUserId={myUserId}
                todayAbsences={todayAbsences}
                onMemberClick={(id) => setOpenMemberId(id)}
                isAdmin={isAdmin}
              />
            )}

            {tab === "activity" && (
              <LocatorErrorBoundary>
                <ActivityMonitorTab members={members} myUserId={myUserId} isAdmin={isAdmin} />
              </LocatorErrorBoundary>
            )}

            {tab === "calendar" && (
              <TeamCalendar
                members={members}
                userName={user?.fullName}
                isAdmin={isAdmin}
                myUserId={myUserId}
              />
            )}

            {tab === "board" && (
              <TeamBoard
                userName={user?.fullName}
                myUserId={myUserId}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>

        <MemberProfileSheet
          memberId={openMemberId}
          onClose={() => setOpenMemberId(null)}
          myUserId={myUserId}
        />
      </div>
    </TooltipProvider>
  );
}
