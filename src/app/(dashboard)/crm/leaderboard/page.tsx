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
  PhoneIncoming,
  PhoneMissed,
  Mail,
  Timer,
  Lock,
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
import { fmtDateMDT, fmtTimeMDT, todayStrMDT } from "@/lib/timezone";
import { LeaderboardExportDialog } from "@/components/leaderboard/LeaderboardExportDialog";
import { LeaderboardAccessDialog } from "@/components/leaderboard/LeaderboardAccessDialog";
import { formatTalkTime } from "@/components/leaderboard/leaderboard-export";

interface KpiSnapshot {
  callsTotal: number;
  callsMade: number;
  callsAnswered: number;
  callsConnected: number;
  talkTimeSec: number;
  leadsCreated: number;
  leadsContacted: number;
  leadsConverted: number;
  conversionRate: number;
  appointmentsCompleted: number;
  messagesSent: number;
  textsSent: number;
  chatsSent: number;
  emailsSent: number;
  followUpsSent: number;
  transactionsCompleted: number;
  onboardingsCompleted: number;
  avgResponseTimeMin: number;
  responsesCount: number;
  totalScore: number;
}

interface LeaderboardEntry {
  rank: number;
  prevRank?: number | null;
  rankChange?: number | null;
  metricValue: number;
  user: {
    _id: string;
    ids: string[];
    fullName: string;
    username: string;
    avatar?: string;
    role: string;
    email: string;
  };
  kpis: KpiSnapshot;
  badges: string[];
  active: boolean;
}

interface PeriodInfo {
  preset: PeriodPreset;
  from: string;
  to: string;
  label: string;
  singleDay: boolean;
}

interface TeamTotals extends KpiSnapshot {
  missedCalls: number;
  incomingCalls: number;
  activeUsers: number;
}

interface CallCheckpoints {
  date: string;
  times: string[];
  rows: Array<{ userId: string; fullName: string; counts: Array<number | null>; total: number }>;
  teamCounts: Array<number | null>;
  teamTotal: number;
}

interface AnalyticsOverview {
  totals: {
    totalLeadsCreated: number;
    totalLeadsConverted: number;
    totalAppointments: number;
    totalCalls: number;
    totalCallsAll: number;
    totalCallsAnswered: number;
    totalMissedCalls: number;
    totalTalkTimeSec: number;
    totalMessages: number;
    totalFollowUps: number;
    totalTransactions: number;
    totalOnboardings: number;
    avgConversionRate: number;
    avgResponseTime: number;
    activeUsers: number;
  };
  trend: Array<{ _id: string; count: number; score: number }>;
  byAction: Array<{ _id: string; count: number }>;
}

interface ActivityLogEntry {
  _id: string;
  actionType: string;
  sourceModule: string;
  timestamp: string;
  score: number;
  followUp?: boolean;
  customer?: string;
  detail?: string;
  user?: { fullName: string; username: string; avatar?: string };
}

type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

type RankBy = "calls" | "score" | "leads" | "appointments" | "messages" | "transactions";

const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom dates" },
];

const RANK_OPTIONS: Array<{ value: RankBy; label: string; unit: string }> = [
  { value: "calls", label: "Calls", unit: "calls" },
  { value: "score", label: "Points", unit: "pts" },
  { value: "leads", label: "Leads", unit: "leads" },
  { value: "appointments", label: "Appointments", unit: "appts" },
  { value: "messages", label: "Messages", unit: "msgs" },
  { value: "transactions", label: "Sales", unit: "sales" },
];

function dayLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
    label: "Lead Sold",
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
    label: "Appointment Booked",
    icon: <Calendar className="h-3 w-3" />,
    color: "text-violet-500",
  },
  call_made: {
    label: "Call Made",
    icon: <Phone className="h-3 w-3" />,
    color: "text-cyan-500",
  },
  call_received: {
    label: "Call Answered",
    icon: <PhoneIncoming className="h-3 w-3" />,
    color: "text-cyan-600",
  },
  message_sent: {
    label: "Message Sent",
    icon: <MessageSquare className="h-3 w-3" />,
    color: "text-sky-500",
  },
  email_sent: {
    label: "Email Sent",
    icon: <Mail className="h-3 w-3" />,
    color: "text-sky-600",
  },
  follow_up_sent: {
    label: "Follow-ups",
    icon: <RefreshCw className="h-3 w-3" />,
    color: "text-amber-500",
  },
  transaction_completed: {
    label: "Sale Recorded",
    icon: <Zap className="h-3 w-3" />,
    color: "text-yellow-500",
  },
  onboarding_completed: {
    label: "Customer Added",
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
  { name: string; icon: string; color: string; desc: string }
> = {
  first_lead: {
    name: "First Contact",
    icon: "🌱",
    color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
    desc: "Got your first lead",
  },
  lead_machine: {
    name: "Lead Machine",
    icon: "⚡",
    color: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30",
    desc: "10 or more new leads in one week",
  },
  converter: {
    name: "The Converter",
    icon: "🎯",
    color: "from-orange-500/20 to-red-500/10 border-orange-500/30",
    desc: "Half or more of your leads sold in one month (at least 5 leads)",
  },
  speed_demon: {
    name: "Speed Demon",
    icon: "🚀",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
    desc: "Replies to customers in under 10 minutes on average for a week",
  },
  onboarding_hero: {
    name: "Onboarding Hero",
    icon: "🏆",
    color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
    desc: "Added 10 or more customers in one month",
  },
  appointment_setter: {
    name: "Appt. Setter",
    icon: "📅",
    color: "from-purple-500/20 to-violet-500/10 border-purple-500/30",
    desc: "Booked 20 or more appointments in one month",
  },
  top_weekly: {
    name: "Weekly Champion",
    icon: "👑",
    color: "from-rose-500/20 to-pink-500/10 border-rose-500/30",
    desc: "Most points on the team for a week",
  },
  follow_up_king: {
    name: "Follow-Up King",
    icon: "📞",
    color: "from-teal-500/20 to-emerald-500/10 border-teal-500/30",
    desc: "30 or more follow-ups in one week",
  },
  transaction_titan: {
    name: "Transaction Titan",
    icon: "💰",
    color: "from-green-500/20 to-emerald-500/10 border-green-500/30",
    desc: "5 or more sales in one month",
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
  metricUnit,
}: {
  entry: LeaderboardEntry;
  onClick: () => void;
  isMe: boolean;
  metricUnit: string;
}) {
  const isTop3 = entry.rank <= 3 && entry.metricValue > 0;

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
          { label: "Calls", value: entry.kpis.callsTotal },
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
      <div className="text-right shrink-0 ml-2 min-w-10">
        <p className="text-xl font-bold tabular-nums text-emerald-500">
          {Math.round(entry.metricValue)}
        </p>
        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
          {metricUnit}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 sm:text-muted-foreground/20 sm:group-hover:text-muted-foreground/40 transition-colors shrink-0" />
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
          {log.followUp && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Follow-up
            </span>
          )}
        </div>
        {(log.customer || log.detail) && (
          <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
            {[log.customer, log.detail].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {fmtTimeMDT(log.timestamp)} · {fmtDateMDT(log.timestamp, { month: "short", day: "numeric" })}
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

function CheckpointsCard({ checkpoints, periodLabel }: { checkpoints: CallCheckpoints; periodLabel: string }) {
  const cell = (value: number | null) => (value === null ? "—" : value);
  const rows = checkpoints.rows.filter((row) => row.total > 0 || checkpoints.rows.length <= 12);
  return (
    <div className="rounded-2xl border border-border/40 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border/30">
        <div className="flex items-center gap-2 min-w-0">
          <Timer className="h-4 w-4 text-cyan-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
            Call checkpoints
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/70">
          {periodLabel} · calls made + answered so far
        </span>
      </div>
      <div className="px-2 sm:px-4 py-2">
        <table className="w-full table-fixed text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              <th className="w-[34%] sm:w-[30%] py-2 pl-2 text-left font-semibold">Name</th>
              {checkpoints.times.map((time) => (
                <th key={time} className="py-2 text-center font-semibold">
                  <span className="hidden sm:inline">By </span>
                  {time}
                </th>
              ))}
              <th className="py-2 pr-2 text-right font-semibold">Day</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-t border-border/20">
                <td className="py-2 pl-2 truncate font-semibold">{row.fullName}</td>
                {row.counts.map((value, index) => (
                  <td key={index} className={`py-2 text-center tabular-nums ${value === null ? "text-muted-foreground/40" : ""}`}>
                    {cell(value)}
                  </td>
                ))}
                <td className="py-2 pr-2 text-right font-bold tabular-nums text-emerald-500">{row.total}</td>
              </tr>
            ))}
            <tr className="border-t border-border/40 bg-muted/20">
              <td className="py-2 pl-2 font-bold">Whole team</td>
              {checkpoints.teamCounts.map((value, index) => (
                <td key={index} className={`py-2 text-center font-bold tabular-nums ${value === null ? "text-muted-foreground/40" : ""}`}>
                  {cell(value)}
                </td>
              ))}
              <td className="py-2 pr-2 text-right font-bold tabular-nums text-emerald-500">{checkpoints.teamTotal}</td>
            </tr>
          </tbody>
        </table>
        {rows.length < checkpoints.rows.length && (
          <p className="px-2 pt-2 pb-1 text-[10px] text-muted-foreground/70">
            Team members with no calls are hidden here. They still show in the list below.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [user, setUser] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [access, setAccess] = React.useState<{ canView: boolean; isAdmin: boolean } | null>(null);
  const [activeTab, setActiveTab] = React.useState("leaderboard");
  const [period, setPeriod] = React.useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = React.useState(todayStrMDT(-6));
  const [customTo, setCustomTo] = React.useState(todayStrMDT(0));
  const [rankBy, setRankBy] = React.useState<RankBy>("calls");
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [periodInfo, setPeriodInfo] = React.useState<PeriodInfo | null>(null);
  const [totals, setTotals] = React.useState<TeamTotals | null>(null);
  const [checkpoints, setCheckpoints] = React.useState<CallCheckpoints | null>(null);
  const [me, setMe] = React.useState<LeaderboardEntry | null>(null);
  const [overview, setOverview] = React.useState<AnalyticsOverview | null>(
    null,
  );
  const [activityFeed, setActivityFeed] = React.useState<ActivityLogEntry[]>(
    [],
  );
  const [selectedEntry, setSelectedEntry] =
    React.useState<LeaderboardEntry | null>(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [exportOpen, setExportOpen] = React.useState(false);
  const [accessOpen, setAccessOpen] = React.useState(false);
  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date());

  // ── Auth ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) {
      router.replace("/crm");
      return;
    }
    setToken(t);
    const headers = { Authorization: `Bearer ${t}` };
    apiClient
      .get("/api/crm/me", { headers })
      .then(async (res) => {
        setUser(res.data?.data || res.data);
        try {
          const accessRes = await apiClient.get("/api/analytics/access", { headers });
          setAccess(accessRes.data?.data || { canView: false, isAdmin: false });
        } catch {
          setAccess({ canView: false, isAdmin: false });
        }
      })
      .catch(() => router.replace("/crm"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const authHeaders = React.useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const customReady = period !== "custom" || (Boolean(customFrom) && Boolean(customTo) && customFrom <= customTo);

  const periodParams = React.useMemo<Record<string, string>>(() => {
    const params: Record<string, string> = { period };
    if (period === "custom") {
      params.from = customFrom;
      params.to = customTo;
    }
    return params;
  }, [period, customFrom, customTo]);

  const canView = Boolean(access?.canView);

  // ── Fetch leaderboard ────────────────────────────────────────────────────
  const fetchLeaderboard = React.useCallback(async () => {
    if (!token || !canView || !customReady) return;
    setIsFetching(true);
    try {
      const res = await apiClient.get("/api/analytics/leaderboard", {
        headers: authHeaders,
        params: { ...periodParams, rankBy },
      });
      const data = res.data?.data || {};
      setLeaderboard(data.leaderboard || []);
      setPeriodInfo(data.period || null);
      setTotals(data.totals || null);
      setCheckpoints(data.checkpoints || null);
      setMe(data.me || null);
      setLoadError("");
      setLastRefresh(new Date());
    } catch (err) {
      const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setLoadError(typeof message === "string" && message ? message : "Could not load the Leaderboard. Please try again.");
    } finally {
      setIsFetching(false);
    }
  }, [token, canView, customReady, authHeaders, periodParams, rankBy]);

  // ── Fetch analytics overview ─────────────────────────────────────────────
  const fetchOverview = React.useCallback(async () => {
    if (!token || !canView || !customReady) return;
    try {
      const res = await apiClient.get("/api/analytics/overview", {
        headers: authHeaders,
        params: periodParams,
      });
      setOverview(res.data?.data || null);
    } catch {}
  }, [token, canView, customReady, authHeaders, periodParams]);

  // ── Fetch activity feed ──────────────────────────────────────────────────
  const fetchActivityFeed = React.useCallback(async () => {
    if (!token || !canView || !customReady) return;
    try {
      const res = await apiClient.get("/api/analytics/activity-feed", {
        headers: authHeaders,
        params: { ...periodParams, limit: 40 },
      });
      setActivityFeed(res.data?.data?.logs || []);
    } catch {}
  }, [token, canView, customReady, authHeaders, periodParams]);

  React.useEffect(() => {
    if (token && user && canView) {
      fetchLeaderboard();
      if (activeTab === "overview") fetchOverview();
      if (activeTab === "activity") fetchActivityFeed();
    }
  }, [token, user, canView, activeTab, fetchLeaderboard, fetchOverview, fetchActivityFeed]);

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

  if (isLoading || (user && !access))
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

  const rankOption = RANK_OPTIONS.find((option) => option.value === rankBy) || RANK_OPTIONS[0];
  const periodLabel = periodInfo?.label || PERIOD_OPTIONS.find((option) => option.value === period)?.label || "";
  const myKpis = me?.kpis;
  const myBadges = me?.badges || [];

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
          {canView && (
            <div className="flex items-center gap-2">
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as PeriodPreset)}
              >
                <SelectTrigger className="h-9 w-32 sm:w-36 text-xs rounded-xl border-border/40" aria-label="Period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-xl shrink-0"
                onClick={() => {
                  fetchLeaderboard();
                  if (activeTab === "overview") fetchOverview();
                  if (activeTab === "activity") fetchActivityFeed();
                }}
                disabled={isFetching}
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
              </Button>
              {access?.isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="h-9 gap-1.5 text-xs rounded-xl border-border/40 px-2.5 sm:px-3"
                  onClick={() => setAccessOpen(true)}
                  aria-label="Who can see the Leaderboard"
                  title="Who can see the Leaderboard"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Who can see</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="h-9 gap-1.5 text-xs rounded-xl border-border/40 px-2.5 sm:px-3"
                onClick={() => setExportOpen(true)}
                disabled={!customReady}
                aria-label="Download records"
                title="Download records"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {!canView ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="mx-auto max-w-sm rounded-2xl border border-border/40 bg-card p-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-bold">You don&apos;t have access to the Leaderboard</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask an admin to turn on Leaderboard access for you.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => router.push("/crm/dashboard")}
            >
              Back to dashboard
            </Button>
          </div>
        </main>
      ) : (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-card px-4 py-3">
            <span className="text-xs font-semibold text-muted-foreground">From</span>
            <input
              type="date"
              value={customFrom}
              max={customTo || todayStrMDT(0)}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
              aria-label="Start date"
            />
            <span className="text-xs font-semibold text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStrMDT(0)}
              onChange={(event) => setCustomTo(event.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
              aria-label="End date"
            />
            {!customReady && (
              <span className="text-xs text-red-500">Pick a start date before the end date.</span>
            )}
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs text-red-600 dark:text-red-400">
            {loadError}
          </div>
        )}

        {/* ── My Stats Strip ── */}
        {myKpis && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/3 px-4 sm:px-6 py-4">
            <p className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> My Performance — {periodLabel}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-4">
              {[
                {
                  label: "Score",
                  value: Math.round(myKpis.totalScore),
                  highlight: true,
                },
                { label: "Calls", value: myKpis.callsTotal },
                { label: "Talk", value: formatTalkTime(myKpis.talkTimeSec) },
                { label: "Msgs", value: myKpis.messagesSent },
                { label: "Leads", value: myKpis.leadsCreated },
                { label: "Appts", value: myKpis.appointmentsCompleted },
                { label: "Txns", value: myKpis.transactionsCompleted },
                { label: "Onboard", value: myKpis.onboardingsCompleted },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`text-center rounded-xl px-1.5 sm:px-3 py-2 min-w-0 ${item.highlight ? "bg-emerald-500/10" : "bg-muted/20"}`}
                >
                  <p
                    className={`text-base sm:text-lg font-bold tabular-nums truncate ${item.highlight ? "text-emerald-500" : ""}`}
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
          onValueChange={(v) => setActiveTab(v)}
        >
          <div className="overflow-x-auto overscroll-x-contain scrollbar-hide">
            <TabsList className="w-full min-w-max rounded-2xl border border-border/40 bg-muted/20 p-1 h-auto gap-1.5">
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
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="min-h-11 min-w-[6.5rem] flex-1 rounded-xl gap-1.5 px-2.5 py-2 text-[11px] font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60 transition-all sm:gap-2 sm:px-5 sm:text-xs"
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
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-semibold">
                  {leaderboard.length} member{leaderboard.length !== 1 ? "s" : ""} · {periodLabel} · Mountain Time
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Rank by</span>
                  <Select value={rankBy} onValueChange={(v) => setRankBy(v as RankBy)}>
                    <SelectTrigger className="h-8 w-32 text-xs rounded-xl border-border/40" aria-label="Rank by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {RANK_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {totals && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2">
                  {[
                    { label: "Team calls", value: totals.callsTotal, sub: "made + answered" },
                    { label: "Calls made", value: totals.callsMade, sub: `${totals.callsConnected} picked up` },
                    { label: "Missed calls", value: totals.missedCalls, sub: `of ${totals.incomingCalls} incoming` },
                    { label: "Talk time", value: formatTalkTime(totals.talkTimeSec), sub: "whole team" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/40 bg-card px-4 py-3 min-w-0">
                      <p className="text-lg font-bold tabular-nums truncate">{item.value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">{item.sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {checkpoints && (
                <div className="pb-2">
                  <CheckpointsCard checkpoints={checkpoints} periodLabel={periodLabel} />
                </div>
              )}

              {/* Loading */}
              {isFetching && leaderboard.length === 0 && (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
                </div>
              )}

              {!isFetching && leaderboard.length === 0 && !loadError && (
                <div className="rounded-2xl border border-border/40 bg-card py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground/60">No team members yet</p>
                </div>
              )}

              {leaderboard.length > 0 && (
                <>
                  {leaderboard.map((entry) => (
                    <LeaderboardRow
                      key={entry.user._id || entry.rank}
                      entry={entry}
                      isMe={entry.user.ids.includes(String(user?._id))}
                      metricUnit={rankOption.unit}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
                  <p className="text-center text-[10px] text-muted-foreground/50 pt-2">
                    Last updated: {fmtTimeMDT(lastRefresh)} · Auto-refreshes every 30s
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
                    sub="sales recorded"
                  />
                  <StatCard
                    label="Total Calls"
                    value={overview.totals.totalCallsAll || 0}
                    icon={<Phone className="h-4 w-4 text-cyan-500" />}
                    sub="made + answered"
                  />
                  <StatCard
                    label="Calls Made"
                    value={overview.totals.totalCalls || 0}
                    icon={<Phone className="h-4 w-4 text-cyan-500" />}
                  />
                  <StatCard
                    label="Calls Answered"
                    value={overview.totals.totalCallsAnswered || 0}
                    icon={<PhoneIncoming className="h-4 w-4 text-cyan-600" />}
                  />
                  <StatCard
                    label="Missed Calls"
                    value={overview.totals.totalMissedCalls || 0}
                    icon={<PhoneMissed className="h-4 w-4 text-red-500" />}
                    sub="incoming, nobody answered"
                  />
                  <StatCard
                    label="Talk Time"
                    value={formatTalkTime(overview.totals.totalTalkTimeSec || 0)}
                    icon={<Timer className="h-4 w-4 text-cyan-500" />}
                  />
                  <StatCard
                    label="Messages Sent"
                    value={overview.totals.totalMessages || 0}
                    icon={<MessageSquare className="h-4 w-4 text-sky-500" />}
                    sub="texts, chat and email"
                  />
                  <StatCard
                    label="Follow-ups"
                    value={overview.totals.totalFollowUps || 0}
                    icon={<RefreshCw className="h-4 w-4 text-amber-500" />}
                  />
                  <StatCard
                    label="Onboardings"
                    value={overview.totals.totalOnboardings || 0}
                    icon={<UserCheck className="h-4 w-4 text-teal-500" />}
                    sub="customers added"
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
                            className="flex-1 h-full group relative flex flex-col items-center justify-end gap-1"
                            title={`${dayLabel(d._id)}: ${d.count} actions`}
                          >
                            <div
                              className="w-full rounded-t-sm bg-emerald-500/30 group-hover:bg-emerald-500/60 transition-colors duration-150 min-h-0.5"
                              style={{ height: `${pct}%` }}
                            />
                            {i % 7 === 0 && (
                              <span className="text-[8px] text-muted-foreground/50 absolute -bottom-4 truncate">
                                {dayLabel(d._id)}
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
                      {overview.byAction.slice(0, 10).map((a) => {
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
                    const earners = leaderboard.filter((e) => e.badges.includes(id));
                    const isEarned = myBadges.includes(id);
                    const earnedCount = earners.length;

                    return (
                      <div
                        key={id}
                        className={`rounded-2xl border p-4 bg-linear-to-br transition-opacity ${meta.color} ${isEarned || earnedCount > 0 ? "" : "opacity-40 grayscale"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl leading-none">
                            {meta.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight">
                              {meta.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                              {meta.desc}
                            </p>
                            {earnedCount > 0 && (
                              <p className="text-[9px] text-muted-foreground/70 mt-1 break-words">
                                Earned by {earners.slice(0, 3).map((e) => e.user.fullName).join(", ")}
                                {earnedCount > 3 ? ` +${earnedCount - 3} more` : ""}
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
      )}

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
              {selectedEntry.rank <= 3 && selectedEntry.metricValue > 0 ? (
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
              <div className="min-w-0">
                <p className="font-bold truncate">{selectedEntry.user.fullName}</p>
                <p className="text-xs text-muted-foreground/70 truncate">
                  {periodLabel} ·{" "}
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

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Calls", value: selectedEntry.kpis.callsTotal },
                { label: "Talk time", value: formatTalkTime(selectedEntry.kpis.talkTimeSec) },
                {
                  label: "Avg reply",
                  value: selectedEntry.kpis.responsesCount ? `${selectedEntry.kpis.avgResponseTimeMin}m` : "—",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/20 px-2 py-2 text-center">
                  <p className="text-base font-bold tabular-nums">{item.value}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold">
                KPI Breakdown
              </p>
              {[
                {
                  label: "Calls Made",
                  value: selectedEntry.kpis.callsMade,
                  max: 100,
                },
                {
                  label: "Calls Answered",
                  value: selectedEntry.kpis.callsAnswered,
                  max: 100,
                },
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
                  label: "Appointments",
                  value: selectedEntry.kpis.appointmentsCompleted,
                  max: 30,
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

      {canView && (
        <LeaderboardExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          authHeaders={authHeaders}
          periodParams={periodParams}
          periodLabel={periodLabel}
          rankBy={rankBy}
        />
      )}
      {access?.isAdmin && (
        <LeaderboardAccessDialog
          open={accessOpen}
          onOpenChange={setAccessOpen}
          authHeaders={authHeaders}
        />
      )}
    </div>
  );
}
