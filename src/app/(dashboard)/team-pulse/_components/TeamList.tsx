"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CalendarOff,
  Check,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Search,
  Shield,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, deptLabel } from "@/lib/departments";
import type { TeamMember, Absence } from "@/hooks/useTeamPulse";
import { S, ROLE_LABEL } from "./team-pulse-constants";
import { MemberCard } from "./MemberCard";

type SortOption = "name" | "status" | "department" | "last_active";
type SortDir = "asc" | "desc";

const STATUS_OPTS = [
  { key: "online",         label: "Online",   dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200/60 dark:bg-green-950/30 dark:text-green-400" },
  { key: "idle",           label: "Idle",     dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400" },
  { key: "away",           label: "Away",     dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700 border-yellow-200/60 dark:bg-yellow-950/30 dark:text-yellow-400" },
  { key: "busy",           label: "Busy",     dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/30 dark:text-red-400" },
  { key: "do_not_disturb", label: "DND",      dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/30 dark:text-purple-400" },
  { key: "offline",        label: "Offline",  dot: "bg-gray-400",   badge: "bg-muted/60 text-muted-foreground border-border/40" },
];

const SORT_OPTS: { key: SortOption; label: string; icon: React.ReactNode }[] = [
  { key: "status",      label: "Online First",  icon: <Wifi className="size-3" /> },
  { key: "name",        label: "Name A–Z",      icon: <ArrowUpDown className="size-3" /> },
  { key: "department",  label: "Department",    icon: <Building2 className="size-3" /> },
  { key: "last_active", label: "Last Active",   icon: <ArrowDown className="size-3" /> },
];

function FilterDropdown({
  label,
  icon,
  active,
  onClear,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-all shrink-0 select-none",
            active
              ? "bg-primary/8 border-primary/25 text-primary shadow-sm"
              : "bg-card border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground hover:bg-muted/30",
          )}
        >
          {icon && <span className={cn("opacity-60", active && "opacity-100")}>{icon}</span>}
          <span>{label}</span>
          {active && onClear && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onClear?.())}
              className="ml-0.5 size-3.5 rounded-full bg-primary/15 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"
            >
              <X className="size-2" />
            </span>
          )}
          {!active && <ChevronDown className="size-3 opacity-50 ml-0.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1.5 rounded-xl shadow-lg">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function DropdownItem({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all text-left",
        selected
          ? "bg-primary/8 text-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <span className="flex-1">{children}</span>
      {selected && <Check className="size-3 text-primary shrink-0" />}
    </button>
  );
}

export function TeamList({
  members,
  membersLoading,
  todayAbsences,
  onMemberClick,
  myUserId,
}: {
  members: TeamMember[];
  membersLoading: boolean;
  todayAbsences: Absence[];
  onMemberClick: (id: string) => void;
  myUserId?: string;
}) {
  const [search, setSearch] = React.useState("");
  const [statusFilters, setStatusFilters] = React.useState<string[]>([]);
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("status");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [hasAbsenceOnly, setHasAbsenceOnly] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");

  const counts = React.useMemo(
    () => ({
      online:          members.filter((m) => m.onlineStatus === "online").length,
      idle:            members.filter((m) => m.onlineStatus === "idle").length,
      away:            members.filter((m) => m.onlineStatus === "away").length,
      busy:            members.filter((m) => m.onlineStatus === "busy").length,
      do_not_disturb:  members.filter((m) => m.onlineStatus === "do_not_disturb").length,
      offline:         members.filter((m) => m.onlineStatus === "offline").length,
    }),
    [members],
  );

  const availableDepts = React.useMemo(
    () => DEPARTMENTS.filter((d) => members.some((m) => m.personalInfo?.department === d.key)),
    [members],
  );
  const hasNoDept = members.some((m) => !m.personalInfo?.department);
  const roles = React.useMemo(() => [...new Set(members.map((m) => m.role))], [members]);
  const absentIds = React.useMemo(() => new Set(todayAbsences.map((a) => a.userName)), [todayAbsences]);

  const filtered = React.useMemo(() => {
    const STATUS_ORDER: Record<string, number> = { online: 0, busy: 1, away: 2, idle: 3, do_not_disturb: 4, offline: 5 };
    const now = Date.now();
    const DAY_MS = 86_400_000;

    let result = members.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.personalInfo?.jobTitle ?? "").toLowerCase().includes(q) ||
        deptLabel(m.personalInfo?.department).toLowerCase().includes(q);
      const matchStatus = statusFilters.length === 0 || statusFilters.includes(m.onlineStatus);
      const matchDept =
        deptFilter === "all" ||
        (deptFilter === "__none__" && !m.personalInfo?.department) ||
        m.personalInfo?.department === deptFilter;
      const matchRole = roleFilter === "all" || m.role === roleFilter;
      const matchActive =
        !activeOnly ||
        m.onlineStatus !== "offline" ||
        (m.lastActive ? now - new Date(m.lastActive).getTime() < DAY_MS : false);
      const matchAbsence = !hasAbsenceOnly || absentIds.has(m.name);
      return matchSearch && matchStatus && matchDept && matchRole && matchActive && matchAbsence;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "status") cmp = (STATUS_ORDER[a.onlineStatus] ?? 5) - (STATUS_ORDER[b.onlineStatus] ?? 5);
      else if (sortBy === "department") cmp = (a.personalInfo?.department ?? "").localeCompare(b.personalInfo?.department ?? "");
      else if (sortBy === "last_active") {
        const ta = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const tb = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        cmp = tb - ta;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [members, search, statusFilters, deptFilter, roleFilter, sortBy, sortDir, activeOnly, hasAbsenceOnly, absentIds]);

  const activeFilterCount =
    (statusFilters.length > 0 ? 1 : 0) +
    (deptFilter !== "all" ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (activeOnly ? 1 : 0) +
    (hasAbsenceOnly ? 1 : 0);

  const hasFilters = !!search || activeFilterCount > 0;

  function clearFilters() {
    setSearch("");
    setStatusFilters([]);
    setDeptFilter("all");
    setRoleFilter("all");
    setActiveOnly(false);
    setHasAbsenceOnly(false);
  }

  function toggleStatus(key: string) {
    setStatusFilters((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  }

  function toggleSort(key: SortOption) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  }

  const onlineCount = counts.online;
  const activeNow = (counts.online + counts.busy + counts.idle + counts.away + counts.do_not_disturb);

  return (
    <div className="space-y-3">

      { }
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STATUS_OPTS.map((s) => {
          const c = counts[s.key as keyof typeof counts] ?? 0;
          const on = statusFilters.length === 1 && statusFilters[0] === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilters(on ? [] : [s.key])}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border transition-all text-center",
                on
                  ? cn(s.badge, "border-current shadow-sm scale-[1.03]")
                  : "bg-card border-border/30 text-muted-foreground hover:bg-muted/30 hover:border-border/60",
                c === 0 && "opacity-35 pointer-events-none",
              )}
            >
              <span className={cn("size-2.5 rounded-full shrink-0 mx-auto", s.dot, !on && "opacity-80")} />
              <span className="text-[11px] font-black tabular-nums leading-none">{c}</span>
              <span className={cn("text-[9px] font-semibold uppercase tracking-wide leading-none", on ? "opacity-100" : "opacity-60")}>{s.label}</span>
            </button>
          );
        })}
      </div>

      { }
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, title, department…"
            className="h-9 pl-8 pr-8 text-sm bg-muted/20 border-border/40 focus:border-primary/30 rounded-lg"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-px border border-border/40 rounded-lg p-0.5 bg-card shrink-0">
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            title="List view"
          >
            <LayoutList className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            title="Grid view"
          >
            <LayoutGrid className="size-3.5" />
          </button>
        </div>
      </div>

      { }
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 shrink-0 pr-1 hidden sm:block">
          <SlidersHorizontal className="size-3 inline -mt-0.5 mr-1" />
          Filter
        </span>

        { }
        <FilterDropdown
          label={statusFilters.length > 0 ? `Status (${statusFilters.length})` : "Status"}
          icon={<span className="size-2 rounded-full bg-green-500" />}
          active={statusFilters.length > 0}
          onClear={() => setStatusFilters([])}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-2.5 pb-1 pt-0.5">Filter by status</p>
          {STATUS_OPTS.map((s) => {
            const c = counts[s.key as keyof typeof counts] ?? 0;
            return (
              <DropdownItem key={s.key} selected={statusFilters.includes(s.key)} onClick={() => toggleStatus(s.key)}>
                <span className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full shrink-0", s.dot)} />
                  <span>{s.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums font-mono">{c}</span>
                </span>
              </DropdownItem>
            );
          })}
        </FilterDropdown>

        {/* Department */}
        <FilterDropdown
          label={deptFilter !== "all" ? (deptFilter === "__none__" ? "No Dept" : (availableDepts.find(d => d.key === deptFilter)?.label ?? deptFilter)) : "Department"}
          icon={<Building2 className="size-3" />}
          active={deptFilter !== "all"}
          onClear={() => setDeptFilter("all")}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-2.5 pb-1 pt-0.5">Filter by department</p>
          <DropdownItem selected={deptFilter === "all"} onClick={() => setDeptFilter("all")}>
            <span className="flex items-center gap-2"><Building2 className="size-3 opacity-40" />All Departments</span>
          </DropdownItem>
          {availableDepts.map((d) => (
            <DropdownItem key={d.key} selected={deptFilter === d.key} onClick={() => setDeptFilter(d.key)}>
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3 opacity-40" />{d.label}
              </span>
            </DropdownItem>
          ))}
          {hasNoDept && (
            <DropdownItem selected={deptFilter === "__none__"} onClick={() => setDeptFilter("__none__")}>
              <span className="italic opacity-60">No Department</span>
            </DropdownItem>
          )}
        </FilterDropdown>

        {/* Role */}
        {roles.length > 1 && (
          <FilterDropdown
            label={roleFilter !== "all" ? (ROLE_LABEL[roleFilter] ?? roleFilter) : "Role"}
            icon={<Shield className="size-3" />}
            active={roleFilter !== "all"}
            onClear={() => setRoleFilter("all")}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-2.5 pb-1 pt-0.5">Filter by role</p>
            <DropdownItem selected={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
              <span className="flex items-center gap-2"><Shield className="size-3 opacity-40" />All Roles</span>
            </DropdownItem>
            {roles.map((r) => (
              <DropdownItem key={r} selected={roleFilter === r} onClick={() => setRoleFilter(r)}>
                <span className="flex items-center gap-1.5"><Shield className="size-3 opacity-40" />{ROLE_LABEL[r] ?? r}</span>
              </DropdownItem>
            ))}
          </FilterDropdown>
        )}

        {/* Sort */}
        <FilterDropdown
          label={SORT_OPTS.find(s => s.key === sortBy)?.label ?? "Sort"}
          icon={sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
          active={sortBy !== "status" || sortDir !== "asc"}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-2.5 pb-1 pt-0.5">Sort by</p>
          {SORT_OPTS.map((s) => (
            <DropdownItem key={s.key} selected={sortBy === s.key} onClick={() => toggleSort(s.key)}>
              <span className="flex items-center gap-2">
                <span className="opacity-40">{s.icon}</span>
                {s.label}
                {sortBy === s.key && (
                  <span className="ml-auto">
                    {sortDir === "asc" ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />}
                  </span>
                )}
              </span>
            </DropdownItem>
          ))}
        </FilterDropdown>

        {/* Quick toggles */}
        <button
          onClick={() => setActiveOnly((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border transition-all shrink-0",
            activeOnly
              ? "bg-green-50 text-green-700 border-green-200/60 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/40 shadow-sm"
              : "bg-card border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground hover:bg-muted/30",
          )}
        >
          <Wifi className={cn("size-3", activeOnly ? "text-green-500" : "text-muted-foreground/40")} />
          <span className="hidden sm:inline">Active Today</span>
          <span className="sm:hidden">Active</span>
        </button>

        {todayAbsences.length > 0 && (
          <button
            onClick={() => setHasAbsenceOnly((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border transition-all shrink-0",
              hasAbsenceOnly
                ? "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40 shadow-sm"
                : "bg-card border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground hover:bg-muted/30",
            )}
          >
            <CalendarOff className={cn("size-3", hasAbsenceOnly ? "text-amber-500" : "text-muted-foreground/40")} />
            <span className="hidden sm:inline">Out Today</span>
            <span className="sm:hidden">Out</span>
            <Badge variant="outline" className={cn("text-[9px] font-black px-1 py-0 h-4 min-w-5 ml-0.5", hasAbsenceOnly ? "border-amber-300 text-amber-700 dark:text-amber-400" : "border-border/40 text-muted-foreground/60")}>
              {todayAbsences.length}
            </Badge>
          </button>
        )}

        {/* Results count + clear */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-between sm:justify-start basis-full sm:basis-auto mt-1.5 sm:mt-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/20">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-border/40 bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
            >
              <X className="size-3" />
              <span className="hidden sm:inline">Clear</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-px rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          <span className="text-[11px] text-muted-foreground/40 font-bold tabular-nums">
            {filtered.length}<span className="opacity-50">/{members.length}</span>
          </span>
        </div>
      </div>

      {/* ── Active filters as dismissible tags ── */}
      {(statusFilters.length > 1 || (statusFilters.length > 0 && deptFilter !== "all")) && (
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((key) => {
            const s = STATUS_OPTS.find(o => o.key === key);
            if (!s) return null;
            return (
              <span
                key={key}
                className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", s.badge)}
              >
                <span className={cn("size-1.5 rounded-full", s.dot)} />
                {s.label}
                <button onClick={() => toggleStatus(key)} className="ml-0.5 opacity-60 hover:opacity-100">
                  <X className="size-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* ── Member list/grid ── */}
      {membersLoading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "bg-muted/15 animate-pulse border border-border/10 rounded-xl",
                viewMode === "grid" ? "h-28" : "h-16",
              )}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 border border-dashed border-border/30 rounded-xl bg-muted/5">
          <WifiOff className="size-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No members match</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Try adjusting the filters</p>
          {hasFilters && (
            <Button variant="link" size="sm" className="text-xs mt-2" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pb-4 sm:max-h-140 sm:overflow-y-auto sm:no-scrollbar">
          {filtered.map((m) => (
            <MemberCard
              key={m._id}
              member={m}
              isMe={m._id === myUserId}
              myUserId={myUserId}
              leaveToday={todayAbsences.find((a) => a.userName === m.name)}
              onClick={() => onMemberClick(m._id)}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 pb-4 overscroll-contain sm:max-h-140 sm:overflow-y-auto sm:no-scrollbar">
          {filtered.map((m) => (
            <MemberCard
              key={m._id}
              member={m}
              isMe={m._id === myUserId}
              myUserId={myUserId}
              leaveToday={todayAbsences.find((a) => a.userName === m.name)}
              onClick={() => onMemberClick(m._id)}
              viewMode="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
