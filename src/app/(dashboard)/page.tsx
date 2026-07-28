"use client";

import * as React from "react";
import {
  Clock,
  Activity,
  Users,
  LayoutDashboard,
  MessageSquare,
  PlusSquare,
  Rss,
  HeartHandshake,
  Car,
  Truck,
  User,
  ClipboardList,
  CreditCard,
  Crown,
  Settings,
  ArrowRight,
  Bell,
  X,
  Heart,
  MessageCircle,
  CalendarDays,
  Star,
  Package,
  Target,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuthActions } from "@/providers/AuthProvider";
import { useWebPush } from "@/hooks/useWebPush";
import { useRouter, usePathname } from "next/navigation";
import { isMobileMonitoringDept } from "@/lib/departments";
import { apiClient } from "@/lib/api-client";
import { useCalendar } from "@/hooks/useCalendar";
import {
  addDays,
  expandOccurrences,
  fmtTime,
  fromZoned,
  sameDay,
  startOfDay,
  zonedNow,
} from "@/utils/calendar.utils";

import { LogisticsMonitor } from "./components/LogisticsMonitor";
import { RevenueIntelligence } from "./components/RevenueIntelligence";
import { OperationalHealth } from "./components/OperationalHealth";
import { StoriesRail } from "@/components/dashboard/StoriesRail";
import { SpotifyPanel } from "@/components/dashboard/SpotifyPanel";

/* ────────────────────────────────────────────────────────────────────────────
 * Shared bits
 * ──────────────────────────────────────────────────────────────────────────── */

const QUICK_NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "CRM", href: "/crm", icon: Users },
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Team Pulse", href: "/team-pulse", icon: Activity },
  { label: "Suprah Space", href: "/crm/supra-space", icon: MessageSquare },
  { label: "Conversations", href: "/crm/conversations", icon: PlusSquare },
  { label: "Feeds", href: "/crm/feeds", icon: Rss },
  { label: "Team Engagement", href: "/crm/hr", icon: HeartHandshake },
  { label: "All Inventory", href: "/inventory", icon: Car },
  { label: "Transportation", href: "/transportation", icon: Truck },
  { label: "Driver Tracker", href: "/driver-tracker", icon: User },
  { label: "Reports", href: "/reports", icon: ClipboardList },
  { label: "SupraPay", href: "/billing", icon: CreditCard },
  { label: "Subscription", href: "/subscription", icon: Crown },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

function ini(n?: string) {
  return (n || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Strip @[Name](id) mention tokens down to plain "@Name" for previews. */
function stripMentions(content: string): string {
  return (content || "").replace(
    /@\[([^\]\n]{1,80})\]\(([a-fA-F0-9]{24}|all)\)/g,
    (_f, name, id) => (id === "all" ? "@Everyone" : `@${name}`),
  );
}

function greeting(): string {
  const hourMST = Number(
    new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/Denver" }),
  );
  if (hourMST < 12) return "Good morning";
  if (hourMST < 18) return "Good afternoon";
  return "Good evening";
}

/** Consistent glass card shell used across the redesigned widgets. */
function Panel({
  title,
  icon: Icon,
  accent = "text-primary",
  action,
  onAction,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  accent?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`size-4 shrink-0 ${accent}`} />
          <h2 className="text-sm font-black tracking-tight truncate">{title}</h2>
        </div>
        {action && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground/60 hover:text-primary transition-colors shrink-0"
          >
            {action}
            <ChevronRight className="size-3" />
          </button>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-muted/40" />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Latest Posts — 5 most recent feed posts; scroll past #5 → /crm/feeds
 * ──────────────────────────────────────────────────────────────────────────── */

interface FeedAttachment {
  url: string;
  thumbnailUrl?: string | null;
  mimeType: string;
  originalName: string;
}
interface FeedPost {
  _id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  attachments?: FeedAttachment[];
  commentCount?: number;
  createdAt: string;
}

function isImage(a: FeedAttachment) {
  return a.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(a.originalName);
}

function LatestPosts() {
  const router = useRouter();
  const [posts, setPosts] = React.useState<FeedPost[]>([]);
  const [reactions, setReactions] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback((signal?: AbortSignal) => {
    return apiClient
      .get("/api/crm/feeds?page=1&limit=5", { signal })
      .then(async (res) => {
        const list: FeedPost[] = res.data?.data?.posts || res.data?.posts || [];
        setPosts(list);
        if (list.length) {
          try {
            const r = await apiClient.post(
              "/api/crm/feeds/reactions/bulk",
              { targetIds: list.map((p) => p._id) },
              { signal },
            );
            const map = r.data?.data?.reactions || {};
            const counts: Record<string, number> = {};
            for (const id of Object.keys(map)) {
              const summary = map[id]?.summary || {};
              counts[id] = Object.values(summary).reduce(
                (acc: number, v: any) => acc + (v?.count || 0),
                0,
              );
            }
            setReactions(counts);
          } catch {
            /* reactions are non-critical */
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    // Lightweight freshness poll (socket wiring is a later enhancement).
    const id = setInterval(() => load(), 60_000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [load]);

  return (
    <Panel title="Latest Posts" icon={Rss} accent="text-emerald-500" action="Open Feeds" onAction={() => router.push("/crm/feeds")}>
      {loading ? (
        <PanelSkeleton rows={4} />
      ) : posts.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-6">Nothing posted yet.</p>
      ) : (
        <div className="space-y-3">
          {posts.slice(0, 5).map((post) => {
            const media = post.attachments?.find(isImage);
            return (
              <button
                key={post._id}
                onClick={() => router.push("/crm/feeds")}
                className="w-full text-left flex gap-3 rounded-2xl border border-border/30 bg-background/40 p-3 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all"
              >
                <Avatar className="size-9 shrink-0 ring-1 ring-border/40">
                  <AvatarImage src={post.authorAvatar} />
                  <AvatarFallback className="bg-emerald-600 text-white text-[10px] font-bold">
                    {ini(post.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold truncate">{post.authorName}</span>
                    <span className="text-[10px] text-muted-foreground/50">{timeAgo(post.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/70 line-clamp-2 leading-relaxed">
                    {stripMentions(post.content)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] font-medium text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <Heart className="size-3" /> {reactions[post._id] ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3" /> {post.commentCount ?? 0}
                    </span>
                  </div>
                </div>
                {media && (
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/20">
                    <img
                      src={media.thumbnailUrl || media.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  </div>
                )}
              </button>
            );
          })}
          {posts.length >= 5 && (
            <button
              onClick={() => router.push("/crm/feeds")}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/30 bg-background/40 py-2.5 text-[11px] font-bold text-muted-foreground/70 hover:border-emerald-500/30 hover:text-emerald-600 transition-colors"
            >
              View all posts in Feeds
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Calendar Summary — user's items for the next 30 days (real, via useCalendar)
 * ──────────────────────────────────────────────────────────────────────────── */

const CAL_TYPE_DOT: Record<string, string> = {
  event: "bg-emerald-400",
  meeting: "bg-cyan-400",
  task: "bg-amber-400",
  reminder: "bg-violet-400",
  appointment: "bg-teal-300",
};

function CalendarSummary() {
  const router = useRouter();
  const now = React.useMemo(() => zonedNow(), []);
  const wallStart = React.useMemo(() => startOfDay(now), [now]);
  const wallEnd = React.useMemo(() => addDays(wallStart, 30), [wallStart]);

  const { items, loading } = useCalendar(fromZoned(wallStart), fromZoned(wallEnd));

  const { today, upcoming, overdue, next } = React.useMemo(() => {
    const occ = expandOccurrences(items || [], wallStart, wallEnd).sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    const nowT = now.getTime();
    const todayList = occ.filter((o) => sameDay(o.start, now));
    const upcomingList = occ.filter((o) => o.start.getTime() > nowT && !sameDay(o.start, now));
    const overdueList = occ.filter(
      (o) => o.end.getTime() < nowT && ["task", "reminder"].includes(o.item.type),
    );
    const nextEvent = occ.find((o) => o.start.getTime() > nowT) || null;
    return { today: todayList, upcoming: upcomingList, overdue: overdueList, next: nextEvent };
  }, [items, wallStart, wallEnd, now]);

  return (
    <Panel
      title="My Calendar"
      icon={CalendarDays}
      accent="text-cyan-500"
      action="View More"
      onAction={() => router.push("/crm/suprah-calendar")}
    >
      {loading ? (
        <PanelSkeleton rows={4} />
      ) : (
        <div className="space-y-4">
          {/* Next up */}
          {next ? (
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] p-3.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-500/70 mb-1">Next up</p>
              <p className="text-sm font-bold truncate">{next.item.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {sameDay(next.start, now) ? "Today" : next.start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                {" · "}
                {next.item.allDay ? "All day" : fmtTime(next.start)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 text-center py-2">Nothing scheduled soon.</p>
          )}

          {/* Counters */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Today", value: today.length, tone: "text-emerald-500" },
              { label: "Upcoming", value: upcoming.length, tone: "text-cyan-500" },
              { label: "Overdue", value: overdue.length, tone: "text-rose-500" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
                <p className={`text-xl font-black tabular-nums ${c.tone}`}>{c.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Today's schedule */}
          {today.length > 0 && (
            <div className="space-y-1.5">
              {today.slice(0, 3).map((o, i) => (
                <div key={`${o.item.id}-${i}`} className="flex items-center gap-2.5 text-xs">
                  <span className={`size-2 rounded-full shrink-0 ${CAL_TYPE_DOT[o.item.type] ?? "bg-muted-foreground"}`} />
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70 w-14 shrink-0">
                    {o.item.allDay ? "All day" : fmtTime(o.start)}
                  </span>
                  <span className="truncate font-medium text-foreground/80">{o.item.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Leads summary  (defensive — wires to /api/leads, shows counts + CTA)
 * ──────────────────────────────────────────────────────────────────────────── */

function LeadsSummary() {
  const router = useRouter();
  const [stats, setStats] = React.useState<{ new: number; followUp: number; total: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/api/leads", { params: { limit: 50 }, signal: controller.signal })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        const list: any[] = Array.isArray(d.leads) ? d.leads : Array.isArray(d) ? d : [];
        setStats({
          new: list.filter((l) => (l.status || "").toLowerCase() === "new").length,
          followUp: list.filter((l) => (l.status || "").toLowerCase().includes("follow")).length,
          total: d.total ?? list.length,
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <Panel title="Leads" icon={Target} accent="text-primary" action="View More" onAction={() => router.push("/crm/leads")}>
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "New", value: stats?.new ?? 0, tone: "text-emerald-500" },
            { label: "Follow-up", value: stats?.followUp ?? 0, tone: "text-amber-500" },
            { label: "Total", value: stats?.total ?? 0, tone: "text-foreground" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border/30 bg-background/40 p-3 text-center">
              <p className={`text-2xl font-black tabular-nums ${c.tone}`}>{c.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60 mt-0.5">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reviews summary  (real — reuses the same /api/crm/reviews shape)
 * ──────────────────────────────────────────────────────────────────────────── */

function ReviewsSummary() {
  const router = useRouter();
  const [data, setData] = React.useState<{ avg: number; total: number; pending: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/api/crm/reviews", { params: { page: 1, source: "all", sort: "newest" }, signal: controller.signal })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        const summary = d.summary || {};
        const list: any[] = d.reviews || [];
        setData({
          avg: summary.averageRating ?? 0,
          total: summary.totalReviews ?? list.length,
          pending: list.filter((r) => !r.response).length,
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <Panel title="Reviews" icon={Star} accent="text-amber-500" action="View More" onAction={() => router.push("/crm/reviews")}>
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums text-amber-500">{(data?.avg ?? 0).toFixed(1)}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`size-3.5 ${n <= Math.round(data?.avg ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
              <p className="text-lg font-black tabular-nums">{data?.total ?? 0}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">Total</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-2.5 text-center">
              <p className="text-lg font-black tabular-nums text-rose-500">{data?.pending ?? 0}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60">Needs reply</p>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Aftermarket summary  (real — catalog stats from /api/crm/aftermarket)
 * ──────────────────────────────────────────────────────────────────────────── */

function AftermarketSummary() {
  const router = useRouter();
  const [stats, setStats] = React.useState<{ total: number; live: number; quote: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/api/crm/aftermarket", { params: { limit: 100 }, signal: controller.signal })
      .then((res) => {
        const list: any[] = res.data?.data?.products || [];
        setStats({
          total: list.length,
          live: list.filter((p) => p.isActive).length,
          quote: list.filter((p) => p.price == null).length,
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <Panel title="Aftermarket" icon={Package} accent="text-violet-500" action="View More" onAction={() => router.push("/crm/aftermarket")}>
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Products", value: stats?.total ?? 0, tone: "text-foreground" },
            { label: "Live", value: stats?.live ?? 0, tone: "text-emerald-500" },
            { label: "Quote", value: stats?.quote ?? 0, tone: "text-violet-500" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border/30 bg-background/40 p-3 text-center">
              <p className={`text-2xl font-black tabular-nums ${c.tone}`}>{c.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground/60 mt-0.5">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Dashboard
 * ──────────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: rawUser } = useAuthActions();
  const firstName = ((rawUser as any)?.fullName || "").split(" ")[0] || "there";
  const isLotTech = isMobileMonitoringDept((rawUser as any)?.personalInfo?.department);
  const isAdmin = ["admin", "super_admin"].includes((rawUser as any)?.role);
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: pushSubscribe,
  } = useWebPush();
  const [pushDismissed, setPushDismissed] = React.useState(false);
  React.useEffect(() => {
    if (sessionStorage.getItem("push_admin_dismissed")) setPushDismissed(true);
  }, []);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [revenuePeriod, setRevenuePeriod] = React.useState<string>("1Y");

  // leaderboardMonth removed with the Standings widget — pass a stable value so
  // the metrics hook signature stays satisfied without the old picker.
  const { data: metrics, isLoading, error } = useDashboardStats(revenuePeriod, "Mar");

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="text-center p-8 border border-destructive/20 bg-destructive/5 rounded-3xl backdrop-blur-sm max-w-sm w-full">
          <p className="text-destructive font-black tracking-tight text-lg mb-2">System Down</p>
          <p className="text-muted-foreground text-sm mb-6">
            Metrics failed to load. Check your connection and try again.
          </p>
          <Button
            variant="outline"
            className="border-destructive/20 hover:bg-destructive/10"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1700px] min-w-0 overflow-x-clip p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 min-h-full pb-24 md:pb-12 animate-in fade-in duration-500">
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(700px_circle_at_15%_-5%,rgba(16,185,129,0.05),transparent_55%),radial-gradient(600px_circle_at_85%_0%,rgba(34,211,238,0.04),transparent_55%)]" />

      {/* ── Header banner with embedded compact Spotify ── */}
      <div className="relative rounded-3xl border border-white/10 bg-card/40 px-4 py-5 backdrop-blur-xl sm:px-7 sm:py-6">
        {/* Decorations are clipped in their own layer so the Spotify dropdown
            (which overflows the banner) isn't cut off. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        </div>
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
          {/* Greeting */}
          <div className="min-w-0 flex-[2] basis-[19rem]">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary"
              >
                Suprah AI
              </Badge>
              <div className="size-1 shrink-0 rounded-full bg-border" />
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Clock className="size-3 shrink-0" />
                <span className="whitespace-nowrap">
                  {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Denver" })}
                </span>
                <span className="whitespace-nowrap font-black tabular-nums text-primary/70">
                  {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Denver" })}
                  <span className="ml-0.5 text-[8px] font-bold text-muted-foreground/50">MST</span>
                </span>
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-400 bg-clip-text text-transparent">Suprah AI</span>
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground/70 sm:text-sm">
              {greeting()}, {firstName}. Here's your intelligent workspace.
            </p>
          </div>

          {/* Embedded compact Spotify */}
          <div className="min-w-0 flex-1 basis-[16rem]">
            <SpotifyPanel compact bare />
          </div>
        </div>
      </div>

      {/* ── Social strip: Stories + Notes, visible to the whole org ── */}
      <StoriesRail me={rawUser} />

      {/* ── Lot Tech clock-in (dept-scoped) ── */}
      {isLotTech && (
        <button
          onClick={() => router.push("/crm/timeproof-clock")}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/12 active:scale-[0.99] transition-all text-left group"
        >
          <div className="h-11 w-11 rounded-xl bg-emerald-600/15 flex items-center justify-center shrink-0 group-hover:bg-emerald-600/20 transition-colors">
            <Clock className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black tracking-tight text-foreground">Timeproof Clock</p>
            <p className="text-[11px] text-muted-foreground/60 font-medium mt-0.5">
              Clock in, track your shift, share your location
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-emerald-500/60 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      )}

      {/* ── Admin push banner ── */}
      {isAdmin && pushSupported && !pushSubscribed && !pushLoading && !pushDismissed && (
        <div className="flex items-start gap-4 px-5 py-4 rounded-2xl border border-amber-500/25 bg-amber-500/8">
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black tracking-tight text-foreground">Enable Admin Alerts</p>
            <p className="text-[11px] text-muted-foreground/60 font-medium mt-0.5">
              Get push notifications for Lot Tech clock-in, clock-out, and location events — even on lock screen.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button
              onClick={() => pushSubscribe()}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors active:scale-95"
            >
              Enable
            </button>
            <button
              onClick={() => {
                setPushDismissed(true);
                sessionStorage.setItem("push_admin_dismissed", "1");
              }}
              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/40 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile quick nav ── */}
      <div className="flex md:hidden gap-1.5 overflow-x-auto no-scrollbar -mx-3 sm:mx-0 px-3 sm:px-0">
        {QUICK_NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <button
              key={item.href + item.label}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border whitespace-nowrap shrink-0 text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 ${
                active
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border/40 bg-card/40 text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
              }`}
            >
              <item.icon className="size-3 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── 1. Feeds (full width) ── */}
      <LatestPosts />

      {/* ── 2. My Calendar · 3. Leads · 4. Reviews · 5. Aftermarket ── */}
      <div className="grid items-stretch gap-3 sm:gap-4 lg:gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
        <CalendarSummary />
        <LeadsSummary />
        <ReviewsSummary />
        <AftermarketSummary />
      </div>

      {/* ── 6. Driver Status · 7. Load Status ── */}
      <div className="grid items-stretch gap-3 sm:gap-4 lg:gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        <Panel title="Driver Status" icon={Truck} accent="text-emerald-500" action="Transportation" onAction={() => router.push("/transportation")}>
          <LogisticsMonitor data={metrics?.logistics} isLoading={isLoading} />
        </Panel>
        <Panel title="Load Status" icon={Package} accent="text-cyan-500" action="Loads" onAction={() => router.push("/loads")}>
          {/* LogisticsMonitor surfaces the load/logistics feed; swap in a dedicated
              LoadStatus component here if you split loads out from logistics. */}
          <LogisticsMonitor data={metrics?.logistics} isLoading={isLoading} />
        </Panel>
      </div>

      {/* ── 8. Revenue Trajectory (Live Payments removed) ── */}
      <div className="min-w-0 max-w-full overflow-x-auto">
        <RevenueIntelligence
          trajectory={metrics?.revenueTrajectory || []}
          livePayments={[]}
          period={revenuePeriod}
          onPeriodChange={setRevenuePeriod}
          isLoading={isLoading}
        />
      </div>

      {/* ── 9. Pipeline Status ── */}
      <OperationalHealth metrics={metrics} isLoading={isLoading} />
    </div>
  );
}