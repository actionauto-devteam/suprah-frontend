"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Loader2,
  ArrowLeft,
  Users,
  ShieldCheck,
  ChevronRight,
  Lock,
  HeartHandshake,
  Gift,
  CalendarDays,
  UserMinus,
  UserCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { OffboardModal, type OffboardUser } from "@/components/crm/OffboardModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmUserData {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
}

interface MilestoneEntry {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
  role: string;
  date: string;
  daysUntil: number;
  type: "birthday" | "anniversary";
  yearsCount?: number;
  gender?: string | null;
}

interface ActiveEmployee {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  hireDate?: string;
  birthday?: string;
  createdAt: string;
}

interface OffboardedEmployee {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  offboardedAt?: string;
}

type Tab = "milestones" | "onboarding" | "offboarding";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ini(n: string) {
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleColor(role: string) {
  if (role === "admin") return "bg-violet-500";
  if (role === "manager") return "bg-blue-500";
  return "bg-emerald-600";
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function greeting(entry: MilestoneEntry): string {
  const firstName = entry.fullName.split(" ")[0];
  if (entry.type === "birthday") {
    return `Happy Birthday, ${firstName}!`;
  }
  if (entry.yearsCount) {
    return `Congratulations, ${firstName}! Happy ${ordinal(entry.yearsCount)} Work Anniversary!`;
  }
  return `Congratulations, ${firstName}! Happy Work Anniversary!`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MilestonesTab({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const [entries, setEntries] = React.useState<MilestoneEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [triggering, setTriggering] = React.useState(false);
  const [triggerStatus, setTriggerStatus] = React.useState<"idle" | "ok" | "none" | "err">("idle");
  const [triggerCount, setTriggerCount] = React.useState(0);

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerStatus("idle");
    try {
      const res = await apiClient.post(
        "/api/crm/hr/milestones/trigger",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const count: number = res.data?.data?.announcementsSent ?? 0;
      setTriggerCount(count);
      setTriggerStatus(count > 0 ? "ok" : "none");
      setTimeout(() => setTriggerStatus("idle"), 6000);
    } catch {
      setTriggerStatus("err");
      setTimeout(() => setTriggerStatus("idle"), 6000);
    } finally {
      setTriggering(false);
    }
  };

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiClient
      .get("/api/crm/hr/milestones?window=30", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data?.data || res.data;
        // API returns { birthdays: [...], anniversaries: [...] } — merge them
        const combined: MilestoneEntry[] = [
          ...(Array.isArray(data?.birthdays) ? data.birthdays : []),
          ...(Array.isArray(data?.anniversaries) ? data.anniversaries : []),
        ];
        combined.sort((a, b) => a.daysUntil - b.daysUntil);
        setEntries(combined);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div>
        {isAdmin && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-muted/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Upcoming Milestones
            </p>
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-colors border
                ${triggerStatus === "ok"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : triggerStatus === "none"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : triggerStatus === "err"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-muted/30 text-muted-foreground/60 border-border/30 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/20"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {triggering ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : triggerStatus === "ok" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              {triggering
                ? "Running…"
                : triggerStatus === "ok"
                ? `${triggerCount} announcement${triggerCount !== 1 ? "s" : ""} sent!`
                : triggerStatus === "none"
                ? "No milestones today"
                : triggerStatus === "err"
                ? "Failed — try again"
                : "Run Announcements Now"}
            </button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
            <Gift className="h-6 w-6 text-muted-foreground/20" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground/40">
            No upcoming milestones
          </p>
          <p className="text-xs text-muted-foreground/25 mt-1 max-w-xs">
            Birthdays and work anniversaries in the next 30 days will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isAdmin && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-muted/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Upcoming Milestones
          </p>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-colors border
              ${triggerStatus === "ok"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : triggerStatus === "err"
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : "bg-muted/30 text-muted-foreground/60 border-border/30 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {triggering ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : triggerStatus === "ok" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            {triggering ? "Running…" : triggerStatus === "ok" ? "Announcements sent!" : triggerStatus === "err" ? "Failed — try again" : "Run Announcements Now"}
          </button>
        </div>
      )}
    <div className="divide-y divide-border/20">
      {entries.map((entry) => (
        <div key={`${entry._id}-${entry.type}`} className="flex items-center gap-4 px-5 py-4">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={entry.avatar} />
            <AvatarFallback className={`text-[10px] font-bold text-white ${roleColor(entry.role)}`}>
              {ini(entry.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground/40 truncate">{entry.fullName}</p>
            {entry.daysUntil === 0 ? (
              <p className={`text-sm font-bold truncate mt-0.5 ${entry.type === "birthday" ? "text-pink-500" : "text-amber-500"}`}>
                {greeting(entry)}
              </p>
            ) : (
              <p className={`text-sm font-semibold truncate mt-0.5 ${entry.type === "birthday" ? "text-pink-400/80" : "text-amber-400/80"}`}>
                {`In ${entry.daysUntil} day${entry.daysUntil !== 1 ? "s" : ""}, ${entry.fullName.split(" ")[0]} will celebrate ${
                  entry.type === "birthday"
                    ? `${entry.gender === "male" ? "his" : entry.gender === "female" ? "her" : "his/her"} birthday!`
                    : `${entry.gender === "male" ? "his" : entry.gender === "female" ? "her" : "his/her"} ${entry.yearsCount ? `${ordinal(entry.yearsCount)}-year ` : ""}work anniversary!`
                }`}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/30 mt-0.5">
              {entry.type === "birthday" ? "Birthday" : `${entry.yearsCount ? `${entry.yearsCount}-year ` : ""}Work Anniversary`}
              {" · "}{formatDate(entry.date)}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-sm h-8 px-4 rounded-full font-bold ${
                entry.type === "birthday"
                  ? "bg-pink-500/10 text-pink-600 border-pink-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}
            >
              {entry.type === "birthday" ? "🎂" : "🎉"}{" "}
              {entry.daysUntil === 0 ? "Today!" : `in ${entry.daysUntil}d`}
            </Badge>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}

function OnboardingTab({ token }: { token: string }) {
  const [employees, setEmployees] = React.useState<ActiveEmployee[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiClient
      .get("/api/crm/users?limit=100&sortBy=hireDate&sortOrder=desc&status=active", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data?.data || res.data;
        setEmployees(data?.users || []);
      })
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
          <UserCheck className="h-6 w-6 text-muted-foreground/20" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground/40">No active employees</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/20">
      {employees.map((emp) => (
        <div key={emp._id} className="flex items-center gap-4 px-5 py-4">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={emp.avatar} />
            <AvatarFallback className={`text-[10px] font-bold text-white ${roleColor(emp.role)}`}>
              {ini(emp.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{emp.fullName}</p>
            <p className="text-[11px] text-muted-foreground/40 mt-0.5 truncate">{emp.email}</p>
          </div>
          <div className="shrink-0 text-right space-y-1">
            {emp.hireDate ? (
              <p className="text-[11px] text-muted-foreground/50">
                Hired {formatDate(emp.hireDate)}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/25 italic">No hire date set</p>
            )}
            {emp.birthday && (
              <p className="text-[10px] text-pink-500/60">
                🎂 {formatDate(emp.birthday)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OffboardingTab({
  token,
  isAdmin,
}: {
  token: string;
  isAdmin: boolean;
}) {
  const [active, setActive] = React.useState<ActiveEmployee[]>([]);
  const [offboarded, setOffboarded] = React.useState<OffboardedEmployee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [offboardTarget, setOffboardTarget] = React.useState<OffboardUser | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    if (!token) return;
    setLoading(true);

    let settled = 0;
    const done = () => { if (++settled === 2) setLoading(false); };

    apiClient
      .get("/api/crm/users?limit=50&status=active", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data?.data || res.data;
        setActive(data?.users || []);
      })
      .catch(() => setActive([]))
      .finally(done);

    apiClient
      .get("/api/crm/hr/offboarded", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data?.data || res.data;
        setOffboarded(data?.users || []);
      })
      .catch(() => setOffboarded([]))
      .finally(done);
  }, [token, refreshKey]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
          <Lock className="h-6 w-6 text-muted-foreground/20" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground/40">Restricted</p>
        <p className="text-xs text-muted-foreground/25 mt-1 max-w-xs">
          Only admins can manage offboarding.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <>
      {/* Active employees — can be offboarded */}
      <div className="px-5 py-3 border-b border-border/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Active Employees ({active.length})
        </p>
      </div>
      {active.length === 0 ? (
        <div className="px-5 py-6 text-xs text-muted-foreground/30 text-center">No active employees.</div>
      ) : (
        <div className="divide-y divide-border/20">
          {active.map((emp) => (
            <div key={emp._id} className="flex items-center gap-4 px-5 py-4">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={emp.avatar} />
                <AvatarFallback className={`text-[9px] font-bold text-white ${roleColor(emp.role)}`}>
                  {ini(emp.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{emp.fullName}</p>
                <p className="text-[11px] text-muted-foreground/40 truncate">{emp.email}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOffboardTarget({ _id: emp._id, fullName: emp.fullName, role: emp.role })}
                className="h-7 rounded-lg text-[11px] font-semibold border-amber-500/20 text-amber-600 hover:bg-amber-500/10 gap-1.5"
              >
                <UserMinus className="h-3 w-3" />
                Offboard
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Already offboarded */}
      <div className="px-5 py-3 border-y border-border/20 mt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Offboarded ({offboarded.length})
        </p>
      </div>
      {offboarded.length === 0 ? (
        <div className="px-5 py-6 text-xs text-muted-foreground/30 text-center">No offboarded employees.</div>
      ) : (
        <div className="divide-y divide-border/20">
          {offboarded.map((emp) => (
            <div key={emp._id} className="flex items-center gap-4 px-5 py-4 opacity-60">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={emp.avatar} />
                <AvatarFallback className="text-[9px] font-bold text-white bg-muted-foreground/40">
                  {ini(emp.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{emp.fullName}</p>
                <p className="text-[11px] text-muted-foreground/40 truncate">{emp.email}</p>
              </div>
              {emp.offboardedAt && (
                <p className="text-[11px] text-muted-foreground/40 shrink-0">
                  {formatDate(emp.offboardedAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <OffboardModal
        open={!!offboardTarget}
        onClose={() => setOffboardTarget(null)}
        token={token}
        user={offboardTarget}
        onOffboarded={() => {
          setOffboardTarget(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamEngagementPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<CrmUserData | null>(null);
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<Tab>("milestones");

  React.useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("crm_token");
      if (!t) {
        router.replace("/crm");
        return;
      }
      try {
        const res = await apiClient.get("/api/crm/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = res.data?.data || res.data;
        setUser(data);
        setToken(t);
      } catch {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        router.replace("/crm");
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, [router]);

  const handleExit = async () => {
    try {
      await apiClient.post(
        "/api/crm/logout",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {}
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    router.push("/");
  };

  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground/40 tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "milestones", label: "Milestones", icon: Gift },
    { id: "onboarding", label: "Onboarding", icon: CalendarDays },
    { id: "offboarding", label: "Offboarding", icon: UserMinus },
  ];

  return (
    <div className="min-h-screen w-full bg-background">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">Action Auto</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-600 mt-0.5 font-bold">
                Workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2 pl-1.5 pr-3 rounded-full border border-border/40 hover:bg-muted/50"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">
                      {ini(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate">
                    {user.fullName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl p-0 overflow-hidden shadow-xl border-border/40"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
                        {ini(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{user.fullName}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={() => router.push("/crm/profile")}
                    className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/crm/settings")}
                    className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={handleExit}
                    className="rounded-xl text-xs h-9 gap-2.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/5"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Exit CRM
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/dashboard")}
            className="h-8 w-8 p-0 rounded-xl border border-border/40 hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Settings</h1>
            <p className="text-xs text-muted-foreground/40 mt-0.5">
              Manage your CRM workspace
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-2 rounded-full capitalize font-semibold ml-auto hidden sm:inline-flex"
          >
            {user.role}
          </Badge>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── Sidebar nav ─── */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Navigation
                </p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => router.push("/crm/settings")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-3.5 w-3.5" />
                    User Management
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
                <button
                  onClick={() => router.push("/crm/settings/integrations")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-3.5 w-3.5" />
                    Lead Integrations
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </button>
                <button
                  onClick={() => router.push("/crm/hr")}
                  className="w-full flex items-center justify-between gap-2.5 rounded-xl px-3 h-9 text-xs font-semibold bg-emerald-500/10 text-emerald-600"
                >
                  <div className="flex items-center gap-2.5">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    Team Engagement
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-500/40" />
                    <ChevronRight className="h-3 w-3 text-emerald-500/40" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ─── Main panel ─── */}
          <div className="lg:col-span-9 space-y-4">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <HeartHandshake className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">Team Engagement</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                    Milestones, onboarding, and offboarding for your team.
                  </p>
                </div>
              </div>

              {/* Tab switcher */}
              <div className="flex border-b border-border/30 px-4">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-muted-foreground/50 hover:text-foreground/70"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "milestones" && <MilestonesTab token={token} isAdmin={isAdmin} />}
              {activeTab === "onboarding" && <OnboardingTab token={token} />}
              {activeTab === "offboarding" && (
                <OffboardingTab token={token} isAdmin={isAdmin} />
              )}
            </div>

            {/* Info note */}
            <div className="rounded-2xl border border-border/30 bg-muted/1.5 px-6 py-4">
              <div className="flex items-start gap-3">
                <HeartHandshake className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground/50">
                    Automated announcements
                  </p>
                  <p className="text-[11px] text-muted-foreground/30 mt-0.5 leading-relaxed">
                    Birthdays and work anniversaries are automatically announced
                    in the team Feed and the General channel in Suprah Space
                    every morning at 8:00 AM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
