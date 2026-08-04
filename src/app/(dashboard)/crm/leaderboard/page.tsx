"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Zap,
  Target,
  Phone,
  MessageSquare,
  Calendar,
  Users,
  BarChart3,
  Activity,
  Award,
  Download,
  Filter,
  RefreshCw,
  Crown,
  Flame,
  ChevronRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Loader2,
  Eye,
  Shield,
  Coffee,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";

interface KpiSnapshot {
  leadsCreated: number;
  leadsContacted: number;
  leadsConverted: number;
  conversionRate: number;
  appointmentsCompleted: number;
  callsMade: number;
  messagesSent: number;
  followUpsSent: number;
  transactionsCompleted: number;
  onboardingsCompleted: number;
  avgResponseTimeMin: number;
  totalScore: number;
}

interface LeaderboardEntry {
  rank: number;
  prevRank?: number;
  rankChange?: number | null;
  user: {
    _id: string;
    fullName: string;
    username: string;
    avatar?: string;
    role: string;
  };
  kpis: KpiSnapshot;
  badges: string[];
  periodKey: string;
  periodType: string;
}

interface OrgUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface AnalyticsOverview {
  totals: {
    totalLeadsCreated: number;
    totalLeadsConverted: number;
    totalAppointments: number;
    totalCalls: number;
    totalMessages: number;
    totalTransactions: number;
    totalOnboardings: number;
    avgConversionRate: number;
    avgResponseTime: number;
    activeUsers: number;
  };
  trend: Array<{ _id: string; count: number; score: number }>;
  byAction: Array<{ _id: string; count: number }>;
}

interface MyStats {
  daily: KpiSnapshot | null;
  weekly: KpiSnapshot | null;
  monthly: KpiSnapshot | null;
}

interface ActivityLogEntry {
  _id: string;
  actionType: string;
  sourceModule: string;
  timestamp: string;
  score: number;
  user?: { fullName: string; username: string; avatar?: string };
}

function ini(n: string) {
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ACTION_LABELS: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  lead_created: {
    label: "Lead Created",
    icon: <Star className="h-3 w-3" />,
    color: "text-emerald-500",
  },
  lead_contacted: {
    label: "Lead Contacted",
    icon: <Phone className="h-3 w-3" />,
    color: "text-blue-500",
  },
  lead_converted: {
    label: "Lead Converted",
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "text-emerald-600",
  },
  lead_replied: {
    label: "Replied to Lead",
    icon: <MessageSquare className="h-3 w-3" />,
    color: "text-indigo-500",
  },
  appointment_completed: {
    label: "Appointment Done",
    icon: <Calendar className="h-3 w-3" />,
    color: "text-purple-500",
  },
  appointment_created: {
    label: "Appointment Set",
    icon: <Calendar className="h-3 w-3" />,
    color: "text-violet-500",
  },
  call_made: {
    label: "Call Made",
    icon: <Phone className="h-3 w-3" />,
    color: "text-cyan-500",
  },
  message_sent: {
    label: "Message Sent",
    icon: <MessageSquare className="h-3 w-3" />,
    color: "text-sky-500",
  },
  follow_up_sent: {
    label: "Follow-up Sent",
    icon: <RefreshCw className="h-3 w-3" />,
    color: "text-amber-500",
  },
  transaction_completed: {
    label: "Transaction Closed",
    icon: <Zap className="h-3 w-3" />,
    color: "text-yellow-500",
  },
  onboarding_completed: {
    label: "Onboarding Complete",
    icon: <UserCheck className="h-3 w-3" />,
    color: "text-teal-500",
  },
  time_in: {
    label: "Clocked In",
    icon: <Clock className="h-3 w-3" />,
    color: "text-muted-foreground",
  },
  time_out: {
    label: "Clocked Out",
    icon: <Clock className="h-3 w-3" />,
    color: "text-muted-foreground",
  },
};

const BADGE_META: Record<
  string,
  { name: string; icon: string; color: string }
> = {
  first_lead: {
    name: "First Contact",
    icon: "🌱",
    color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
  },
  lead_machine: {
    name: "Lead Machine",
    icon: "⚡",
    color: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
  },
  converter: {
    name: "The Converter",
    icon: "🎯",
    color: "from-orange-500/20 to-red-500/10 border-orange-500/30",
  },
  speed_demon: {
    name: "Speed Demon",
    icon: "🚀",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
  },
  onboarding_hero: {
    name: "Onboarding Hero",
    icon: "🏆",
    color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
  },
  appointment_setter: {
    name: "Appt. Setter",
    icon: "📅",
    color: "from-purple-500/20 to-violet-500/10 border-purple-500/30",
  },
  top_weekly: {
    name: "Weekly Champion",
    icon: "👑",
    color: "from-rose-500/20 to-pink-500/10 border-rose-500/30",
  },
  follow_up_king: {
    name: "Follow-Up King",
    icon: "📞",
    color: "from-teal-500/20 to-emerald-500/10 border-teal-500/30",
  },
  transaction_titan: {
    name: "Transaction Titan",
    icon: "💰",
    color: "from-green-500/20 to-emerald-500/10 border-green-500/30",
  },
};

const RANK_ICONS = [
  <Crown className="h-4 w-4 text-yellow-400" />,
  <Medal className="h-4 w-4 text-slate-300" />,
  <Trophy className="h-4 w-4 text-amber-600" />,
];

function RankChange({ change }: { change?: number | null }) {
  if (change == null || change === 0)
    return <Minus className="h-3 w-3 text-muted-foreground/30" />;
  if (change > 0)
    return (
      <span className="flex items-center gap-0.5 text-emerald-500">
        <TrendingUp className="h-3 w-3" />
        <span className="text-[10px] font-bold">+{change}</span>
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-red-400">
      <TrendingDown className="h-3 w-3" />
      <span className="text-[10px] font-bold">{change}</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: number;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center">
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-semibold flex items-center gap-1 ${trend >= 0 ? "text-emerald-500" : "text-red-400"}`}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{label}</p>
        {sub && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── KPI Bar ───────────────────────────────────────────────────────────────
function KpiBar({
  label,
  value,
  max,
  color = "bg-emerald-500",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground/70 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <span className="font-bold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Leaderboard Row (ranked) ───────────────────────────────────────────────
function LeaderboardRow({
  entry,
  onClick,
  isMe,
}: {
  entry: LeaderboardEntry;
  onClick: () => void;
  isMe: boolean;
}) {
  const isTop3 = entry.rank <= 3;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 cursor-pointer transition-all duration-200 hover:border-emerald-500/25 hover:bg-emerald-500/2 ${
        isMe
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/40 bg-card"
      } ${isTop3 ? "ring-1 ring-inset ring-border/0 hover:ring-emerald-500/15" : ""}`}
    >
      {/* Rank */}
      <div className="w-10 flex flex-col items-center gap-1 shrink-0">
        {isTop3 ? (
          RANK_ICONS[entry.rank - 1]
        ) : (
          <span className="text-sm font-bold text-muted-foreground/60 tabular-nums">
            #{entry.rank}
          </span>
        )}
        <RankChange change={entry.rankChange} />
      </div>

      {/* Avatar */}
      <Avatar
        className={`h-10 w-10 ring-2 shrink-0 ${isMe ? "ring-emerald-500/50" : "ring-border/40"}`}
      >
        <AvatarImage src={entry.user.avatar} />
        <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
          {ini(entry.user.fullName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold truncate">{entry.user.fullName}</p>
          {isMe && (
            <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/15 text-emerald-600 border-0">
              You
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {entry.user.username}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {entry.badges.slice(0, 4).map((b) => {
            const meta = BADGE_META[b];
            return meta ? (
              <span key={b} className="text-sm leading-none" title={meta.name}>
                {meta.icon}
              </span>
            ) : null;
          })}
          {entry.badges.length > 4 && (
            <span className="text-[9px] text-muted-foreground/60 font-semibold">
              +{entry.badges.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* KPI mini-stats */}
      <div className="hidden md:flex items-center gap-5 text-center shrink-0">
        {[
          { label: "Leads", value: entry.kpis.leadsCreated },
          { label: "Conv%", value: `${entry.kpis.conversionRate}%` },
          { label: "Appts", value: entry.kpis.appointmentsCompleted },
          { label: "Txns", value: entry.kpis.transactionsCompleted },
        ].map((item) => (
          <div key={item.label} className="w-12">
            <p className="text-base font-bold tabular-nums">{item.value}</p>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Score */}
      <div className="text-right shrink-0 ml-2">
        <p className="text-xl font-bold tabular-nums text-emerald-500">
          {Math.round(entry.kpis.totalScore)}
        </p>
        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
          pts
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 sm:text-muted-foreground/20 sm:group-hover:text-muted-foreground/40 transition-colors shrink-0" />
    </div>
  );
}

// ─── Member Row (unranked — alphabetical) ──────────────────────────────────
function MemberRow({
  orgUser,
  badges,
  isMe,
}: {
  orgUser: OrgUser;
  badges: string[];
  isMe: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-200 ${
        isMe
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/40 bg-card"
      }`}
    >
      {/* Rank placeholder — keeps alignment with LeaderboardRow */}
      <div className="w-10 flex items-center justify-center shrink-0">
        <span className="text-lg text-muted-foreground/10 font-bold select-none">
          —
        </span>
      </div>

      {/* Avatar */}
      <Avatar
        className={`h-10 w-10 ring-2 shrink-0 ${isMe ? "ring-emerald-500/50" : "ring-border/40"}`}
      >
        <AvatarImage src={orgUser.avatar} />
        <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
          {ini(orgUser.fullName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + role + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold truncate">{orgUser.fullName}</p>
          {isMe && (
            <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/15 text-emerald-600 border-0">
              You
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {orgUser.username}
          </span>
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize
            ${
              orgUser.role === "admin"
                ? "bg-rose-500/10 text-rose-500"
                : orgUser.role === "manager"
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-muted/50 text-muted-foreground/70"
            }`}
          >
            {orgUser.role}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {badges.length === 0 ? (
            <span className="text-[10px] text-muted-foreground/60 italic">
              No badges yet
            </span>
          ) : (
            <>
              {badges.slice(0, 5).map((b) => {
                const meta = BADGE_META[b];
                return meta ? (
                  <span
                    key={b}
                    className="text-sm leading-none"
                    title={meta.name}
                  >
                    {meta.icon}
                  </span>
                ) : null;
              })}
              {badges.length > 5 && (
                <span className="text-[9px] text-muted-foreground/60 font-semibold">
                  +{badges.length - 5}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPI columns — dimmed, not open yet */}
      <div className="hidden md:flex items-center gap-5 text-center shrink-0">
        {["Leads", "Conv%", "Appts", "Txns"].map((label) => (
          <div key={label} className="w-12">
            <p className="text-base font-bold tabular-nums text-muted-foreground/50">
              —
            </p>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Score — not open yet */}
      <div className="text-right shrink-0 ml-2">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
          Soon
        </p>
      </div>

      {/* Spacer to match LeaderboardRow chevron width */}
      <div className="w-4 shrink-0" />
    </div>
  );
}

// ─── Activity Feed Item ────────────────────────────────────────────────────
function ActivityItem({ log }: { log: ActivityLogEntry }) {
  const meta = ACTION_LABELS[log.actionType] || {
    label: log.actionType,
    icon: <Activity className="h-3 w-3" />,
    color: "text-muted-foreground",
  };
  const time = new Date(log.timestamp);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/20 last:border-0">
      <div
        className={`h-7 w-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}
      >
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {log.user && (
            <span className="text-xs font-bold truncate">
              {log.user.fullName}
            </span>
          )}
          <span className={`text-xs ${meta.color}`}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {time.toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
          <span className="text-[10px] text-muted-foreground/50 capitalize">
            {log.sourceModule}
          </span>
        </div>
      </div>
      {log.score > 0 && (
        <span className="text-xs font-bold text-emerald-500/70 shrink-0">
          +{log.score}pts
        </span>
      )}
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [user, setUser] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("leaderboard");
  const [periodType, setPeriodType] = React.useState<
    "daily" | "weekly" | "monthly"
  >("weekly");
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [orgUsers, setOrgUsers] = React.useState<OrgUser[]>([]);
  const [orgUserBadges, setOrgUserBadges] = React.useState<
    Record<string, string[]>
  >({});
  const [overview, setOverview] = React.useState<AnalyticsOverview | null>(
    null,
  );
  const [myStats, setMyStats] = React.useState<MyStats | null>(null);
  const [activityFeed, setActivityFeed] = React.useState<ActivityLogEntry[]>(
    [],
  );
  const [selectedEntry, setSelectedEntry] =
    React.useState<LeaderboardEntry | null>(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date());

  // ── Auth ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) {
      router.replace("/crm");
      return;
    }
    setToken(t);
    apiClient
      .get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => setUser(res.data?.data || res.data))
      .catch(() => router.replace("/crm"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const authHeaders = React.useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  // ── Fetch all org users alphabetically ───────────────────────────────────
  const fetchOrgUsers = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient.get("/api/crm/users", {
        headers: authHeaders,
      });
      const data: OrgUser[] = res.data?.data?.users || res.data?.users || [];
      const sorted = [...data].sort((a, b) =>
        a.fullName.localeCompare(b.fullName),
      );
      setOrgUsers(sorted);

      // Fetch badges for each user in parallel — non-blocking
      const results = await Promise.allSettled(
        sorted.map((u) =>
          apiClient
            .get(`/api/analytics/users/${u._id}/stats`, {
              headers: authHeaders,
            })
            .then((r) => ({
              userId: u._id,
              badges: (r.data?.data?.badges || []).map(
                (b: any) => b.badgeId,
              ) as string[],
            }))
            .catch(() => ({ userId: u._id, badges: [] as string[] })),
        ),
      );

      const map: Record<string, string[]> = {};
      for (const r of results) {
        if (r.status === "fulfilled") map[r.value.userId] = r.value.badges;
      }
      setOrgUserBadges(map);
    } catch (err) {
      console.error("Failed to fetch org users:", err);
    }
  }, [token, authHeaders]);

  // ── Fetch leaderboard ────────────────────────────────────────────────────
  const fetchLeaderboard = React.useCallback(async () => {
    if (!token) return;
    setIsFetching(true);
    try {
      const res = await apiClient.get(
        `/api/analytics/leaderboard?periodType=${periodType}`,
        { headers: authHeaders },
      );
      setLeaderboard(res.data?.data?.leaderboard || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
    } finally {
      setIsFetching(false);
    }
  }, [token, periodType, authHeaders]);

  // ── Fetch analytics overview ─────────────────────────────────────────────
  const fetchOverview = React.useCallback(async () => {
    if (!token || user?.role === "employee") return;
    try {
      const res = await apiClient.get(
        `/api/analytics/overview?periodType=${periodType}`,
        { headers: authHeaders },
      );
      setOverview(res.data?.data || null);
    } catch {}
  }, [token, periodType, authHeaders, user?.role]);

  // ── Fetch my stats ───────────────────────────────────────────────────────
  const fetchMyStats = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient.get("/api/analytics/my-stats", {
        headers: authHeaders,
      });
      setMyStats(res.data?.data?.stats || null);
    } catch {}
  }, [token, authHeaders]);

  // ── Fetch activity feed ──────────────────────────────────────────────────
  const fetchActivityFeed = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient.get("/api/analytics/activity-feed?limit=40", {
        headers: authHeaders,
      });
      setActivityFeed(res.data?.data?.logs || []);
    } catch {}
  }, [token, authHeaders]);

  React.useEffect(() => {
    if (token && user) {
      fetchLeaderboard();
      fetchOrgUsers();
      fetchMyStats();
      if (activeTab === "overview") fetchOverview();
      if (activeTab === "activity") fetchActivityFeed();
    }
  }, [token, user, periodType, activeTab]);

  // ── Polling (30s) ────────────────────────────────────────────────────────
  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLeaderboard();
        if (activeTab === "activity") fetchActivityFeed();
      }
    }, 30000);
    return () => clearInterval(id);
  }, [fetchLeaderboard, fetchActivityFeed, activeTab]);

  const handleExport = async () => {
    try {
      const url = `/api/analytics/export?type=leaderboard&periodType=${periodType}`;
      const res = await apiClient.get(url, {
        headers: authHeaders,
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `leaderboard_${periodType}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch {
      console.error("Export failed");
    }
  };

  if (isLoading)
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

  const statPeriod = myStats?.[periodType];
  const hasRankings = leaderboard.length > 0;

  return (
    <div className="min-h-screen w-full bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 sm:min-h-14">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl shrink-0"
              onClick={() => router.push("/crm/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none">Leaderboard</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70 mt-0.5 font-semibold">
                Analytics & Rankings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={periodType}
              onValueChange={(v) => setPeriodType(v as any)}
            >
              <SelectTrigger className="h-9 w-24 sm:w-28 text-xs rounded-xl border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl shrink-0"
              onClick={() => {
                fetchLeaderboard();
                fetchOrgUsers();
              }}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs rounded-xl border-border/40 px-2.5 sm:px-3"
                onClick={handleExport}
              >
                <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── My Stats Strip ── */}
        {statPeriod && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/3 px-4 sm:px-6 py-4">
            <p className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> My Performance —{" "}
              {periodType === "daily"
                ? "Today"
                : periodType === "weekly"
                  ? "This Week"
                  : "This Month"}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
              {[
                {
                  label: "Score",
                  value: Math.round(statPeriod.totalScore),
                  highlight: true,
                },
                { label: "Leads", value: statPeriod.leadsCreated },
                { label: "Conv%", value: `${statPeriod.conversionRate}%` },
                { label: "Appts", value: statPeriod.appointmentsCompleted },
                { label: "Calls", value: statPeriod.callsMade },
                { label: "Msgs", value: statPeriod.messagesSent },
                { label: "Txns", value: statPeriod.transactionsCompleted },
                { label: "Onboard", value: statPeriod.onboardingsCompleted },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`text-center rounded-xl px-3 py-2 ${item.highlight ? "bg-emerald-500/10" : "bg-muted/20"}`}
                >
                  <p
                    className={`text-lg font-bold tabular-nums ${item.highlight ? "text-emerald-500" : ""}`}
                  >
                    {item.value}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            if (v === "overview") fetchOverview();
            if (v === "activity") fetchActivityFeed();
          }}
        >
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="w-full min-w-max rounded-2xl border border-border/40 bg-muted/20 p-1.5 h-auto gap-1.5">
              {[
                {
                  value: "leaderboard",
                  label: "Leaderboard",
                  icon: <Trophy className="h-3.5 w-3.5" />,
                },
                {
                  value: "overview",
                  label: "Analytics",
                  icon: <BarChart3 className="h-3.5 w-3.5" />,
                  adminOnly: true,
                },
                {
                  value: "activity",
                  label: "Activity Feed",
                  icon: <Activity className="h-3.5 w-3.5" />,
                },
                {
                  value: "badges",
                  label: "Badges",
                  icon: <Award className="h-3.5 w-3.5" />,
                },
              ]
                .filter((t) => !t.adminOnly || user?.role !== "employee")
                .map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="flex-1 rounded-xl text-xs font-semibold gap-2 px-5 py-2.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60 transition-all"
                  >
                    {t.icon}
                    {t.label}
                  </TabsTrigger>
                ))}
            </TabsList>
          </div>

          {/* ─ LEADERBOARD TAB ─────────────────────────────────────────── */}
          <TabsContent value="leaderboard" className="mt-4">
            <div className="space-y-2">
              {/* Loading */}
              {isFetching && orgUsers.length === 0 && (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
                </div>
              )}

              {/* No rankings yet — show all org users A–Z */}
              {!hasRankings && orgUsers.length > 0 && (
                <>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 flex items-center gap-3">
                    <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        Rankings Coming Soon
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        Full performance rankings are on the way. Here's your
                        team in the meantime.
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold pt-1 pb-1">
                    {orgUsers.length} member{orgUsers.length !== 1 ? "s" : ""} ·
                    sorted A–Z
                  </p>
                  {orgUsers.map((u) => (
                    <MemberRow
                      key={u._id}
                      orgUser={u}
                      badges={orgUserBadges[u._id] || []}
                      isMe={u._id === user?._id}
                    />
                  ))}
                </>
              )}

              {/* Rankings are live */}
              {hasRankings && (
                <>
                  {leaderboard.map((entry) => (
                    <LeaderboardRow
                      key={entry.user._id || entry.rank}
                      entry={entry}
                      isMe={entry.user._id === user?._id}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
                  <p className="text-center text-[10px] text-muted-foreground/50 pt-2">
                    Last updated:{" "}
                    {lastRefresh.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}{" "}
                    · Auto-refreshes every 30s
                  </p>
                </>
              )}
            </div>
          </TabsContent>

          {/* ─ ANALYTICS OVERVIEW TAB ──────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4">
            {!overview ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <StatCard
                    label="Active Users"
                    value={overview.totals.activeUsers || 0}
                    icon={<Users className="h-4 w-4 text-blue-500" />}
                  />
                  <StatCard
                    label="Leads Created"
                    value={overview.totals.totalLeadsCreated || 0}
                    icon={<Star className="h-4 w-4 text-emerald-500" />}
                  />
                  <StatCard
                    label="Leads Converted"
                    value={overview.totals.totalLeadsConverted || 0}
                    icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  />
                  <StatCard
                    label="Appointments"
                    value={overview.totals.totalAppointments || 0}
                    icon={<Calendar className="h-4 w-4 text-purple-500" />}
                  />
                  <StatCard
                    label="Transactions"
                    value={overview.totals.totalTransactions || 0}
                    icon={<Zap className="h-4 w-4 text-yellow-500" />}
                  />
                  <StatCard
                    label="Calls Made"
                    value={overview.totals.totalCalls || 0}
                    icon={<Phone className="h-4 w-4 text-cyan-500" />}
                  />
                  <StatCard
                    label="Messages Sent"
                    value={overview.totals.totalMessages || 0}
                    icon={<MessageSquare className="h-4 w-4 text-sky-500" />}
                  />
                  <StatCard
                    label="Onboardings"
                    value={overview.totals.totalOnboardings || 0}
                    icon={<UserCheck className="h-4 w-4 text-teal-500" />}
                  />
                  <StatCard
                    label="Avg Conv. Rate"
                    value={`${Math.round(overview.totals.avgConversionRate || 0)}%`}
                    icon={<Target className="h-4 w-4 text-orange-500" />}
                  />
                  <StatCard
                    label="Avg Response"
                    value={`${Math.round(overview.totals.avgResponseTime || 0)}m`}
                    icon={<Clock className="h-4 w-4 text-amber-500" />}
                    sub="minutes"
                  />
                </div>

                {overview.trend.length > 0 && (
                  <div className="rounded-2xl border border-border/40 bg-card p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-5">
                      Activity Trend (Last 30 Days)
                    </p>
                    <div className="flex items-end gap-1 h-32">
                      {overview.trend.map((d, i) => {
                        const maxCount = Math.max(
                          ...overview.trend.map((x) => x.count),
                          1,
                        );
                        const pct = (d.count / maxCount) * 100;
                        return (
                          <div
                            key={d._id}
                            className="flex-1 group relative flex flex-col items-center justify-end gap-1"
                            title={`${d._id}: ${d.count} actions`}
                          >
                            <div
                              className="w-full rounded-t-sm bg-emerald-500/30 group-hover:bg-emerald-500/60 transition-colors duration-150 min-h-0.5"
                              style={{ height: `${pct}%` }}
                            />
                            {i % 7 === 0 && (
                              <span className="text-[8px] text-muted-foreground/50 absolute -bottom-4 truncate">
                                {new Date(d._id).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {overview.byAction.length > 0 && (
                  <div className="rounded-2xl border border-border/40 bg-card p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-5">
                      Activity Breakdown
                    </p>
                    <div className="space-y-3">
                      {overview.byAction.slice(0, 8).map((a) => {
                        const maxCount = Math.max(
                          ...overview.byAction.map((x) => x.count),
                          1,
                        );
                        const meta = ACTION_LABELS[a._id];
                        return (
                          <KpiBar
                            key={a._id}
                            label={meta?.label || a._id}
                            value={a.count}
                            max={maxCount}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─ ACTIVITY FEED TAB ───────────────────────────────────────── */}
          <TabsContent value="activity" className="mt-4">
            <div className="rounded-2xl border border-border/40 bg-card">
              <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Activity className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 truncate">
                    Live Activity Feed
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs gap-1.5 rounded-xl shrink-0"
                  onClick={fetchActivityFeed}
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </Button>
              </div>
              <div className="px-4 sm:px-6 py-2 divide-y divide-border/20">
                {activityFeed.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/60">
                      No activity yet
                    </p>
                  </div>
                ) : (
                  activityFeed.map((log) => (
                    <ActivityItem key={log._id} log={log} />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─ BADGES TAB ──────────────────────────────────────────────── */}
          <TabsContent value="badges" className="mt-4">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/40 bg-card p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-5">
                  All Badges & Achievements
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(BADGE_META).map(([id, meta]) => {
                    const rankedBadges = leaderboard.flatMap((e) => e.badges);
                    const unrankedBadges = Object.values(orgUserBadges).flat();
                    const allBadges = [...rankedBadges, ...unrankedBadges];
                    const isEarned =
                      leaderboard
                        .find((e) => e.user._id === user?._id)
                        ?.badges.includes(id) ||
                      (orgUserBadges[user?._id] || []).includes(id);
                    const earnedCount = allBadges.filter(
                      (b) => b === id,
                    ).length;

                    return (
                      <div
                        key={id}
                        className={`rounded-2xl border p-4 bg-linear-to-br transition-opacity ${meta.color} ${isEarned ? "" : "opacity-40 grayscale"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl leading-none">
                            {meta.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight">
                              {meta.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 capitalize">
                              {id.replace(/_/g, " ")}
                            </p>
                            {earnedCount > 0 && (
                              <p className="text-[9px] text-muted-foreground/60 mt-1">
                                {earnedCount} team member
                                {earnedCount > 1 ? "s" : ""} earned
                              </p>
                            )}
                          </div>
                          {isEarned && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ─ Entry Detail Drawer ──────────────────────────────────────────── */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/40 bg-background p-6 space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              {selectedEntry.rank <= 3 ? (
                RANK_ICONS[selectedEntry.rank - 1]
              ) : (
                <span className="text-sm font-bold text-muted-foreground/60">
                  #{selectedEntry.rank}
                </span>
              )}
              <Avatar className="h-12 w-12 ring-2 ring-border/40">
                <AvatarImage src={selectedEntry.user.avatar} />
                <AvatarFallback className="bg-emerald-600 text-white font-bold">
                  {ini(selectedEntry.user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold">{selectedEntry.user.fullName}</p>
                <p className="text-xs text-muted-foreground/70">
                  {selectedEntry.user.username} ·{" "}
                  <span className="capitalize">{selectedEntry.user.role}</span>
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-bold text-emerald-500">
                  {Math.round(selectedEntry.kpis.totalScore)}
                </p>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  pts
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold">
                KPI Breakdown
              </p>
              {[
                {
                  label: "Leads Created",
                  value: selectedEntry.kpis.leadsCreated,
                  max: 30,
                },
                {
                  label: "Leads Converted",
                  value: selectedEntry.kpis.leadsConverted,
                  max: 15,
                },
                {
                  label: "Conversion Rate",
                  value: selectedEntry.kpis.conversionRate,
                  max: 100,
                },
                {
                  label: "Appointments Completed",
                  value: selectedEntry.kpis.appointmentsCompleted,
                  max: 30,
                },
                {
                  label: "Calls Made",
                  value: selectedEntry.kpis.callsMade,
                  max: 100,
                },
                {
                  label: "Messages Sent",
                  value: selectedEntry.kpis.messagesSent,
                  max: 200,
                },
                {
                  label: "Follow-ups",
                  value: selectedEntry.kpis.followUpsSent,
                  max: 50,
                },
                {
                  label: "Transactions",
                  value: selectedEntry.kpis.transactionsCompleted,
                  max: 10,
                },
                {
                  label: "Onboardings",
                  value: selectedEntry.kpis.onboardingsCompleted,
                  max: 15,
                },
              ].map((item) => (
                <KpiBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={item.max}
                />
              ))}
            </div>

            {selectedEntry.badges.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold mb-3">
                  Badges
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.badges.map((b) => {
                    const meta = BADGE_META[b];
                    return meta ? (
                      <span
                        key={b}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold bg-linear-to-r ${meta.color}`}
                      >
                        {meta.icon} {meta.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => setSelectedEntry(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
