"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft, Calendar, CalendarDays, Car, ChevronRight,
  Download, Eye, FileText, Loader2, Plus, RefreshCw, Search,
  Users, AlertCircle, Megaphone, Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { AppointmentDetailsModal } from "@/components/AppointmentDetailsModal";
import { AppointmentChat } from "@/components/AppointmentChat";
import { VehicleHistory } from "@/components/VehicleHistory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerBooking {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isCustomerBooking: boolean;
}

interface CrmUserData {
  _id: string;
  fullName: string;
  email: string;
  username: string;
}

interface DashboardAppointment {
  _id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  type: string;
  customTypeDetails?: string;
  entryType: string;
  source: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  customerBooking: CustomerBooking;
  crmUser: CrmUserData;
  vehicles: any[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface DashboardPost {
  _id: string;
  type: "event" | "news" | "announcement" | "update";
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdBy?: string; // author id — used to gate the delete control
  createdAt: Date | string;
}

interface DashboardStats {
  total?: number;
  scheduled?: number;
  confirmed?: number;
  completed?: number;
  cancelled?: number;
}

// ─── Surface tokens ─────────────────────────────────────────────────────────
// One card recipe, used everywhere, so every panel sits on the same layered
// surface. Soft double shadow + hairline ring reads as "floating glass" without
// shouting. Radius is generous (rounded-2xl) for the modern, rounded geometry.

const CARD =
  "rounded-2xl border border-border/60 bg-card " +
  "shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] " +
  "ring-1 ring-black/[0.015] dark:ring-white/[0.02]";

// Glassy header bar shared by every panel — content scrolls cleanly beneath it.
const PANEL_HEADER =
  "flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border/60 " +
  "bg-gradient-to-b from-muted/40 to-muted/10 " +
  "backdrop-blur supports-[backdrop-filter]:bg-card/50";

// ─── Token map ────────────────────────────────────────────────────────────────
// Single source of truth for status color. Drives badges + the status strip so
// a "confirmed" pill and the strip's confirmed segment can never drift apart.

const STATUS_TONE: Record<
  string,
  { dot: string; bar: string; badge: string }
> = {
  scheduled: {
    dot: "bg-sky-500",
    bar: "bg-gradient-to-b from-sky-400 to-sky-500",
    badge: "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-400",
  },
  confirmed: {
    dot: "bg-teal-500",
    bar: "bg-gradient-to-b from-teal-400 to-teal-500",
    badge: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
  },
  completed: {
    dot: "bg-emerald-500",
    bar: "bg-gradient-to-b from-emerald-400 to-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  },
  cancelled: {
    dot: "bg-rose-500",
    bar: "bg-gradient-to-b from-rose-400 to-rose-500",
    badge: "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400",
  },
};

const TYPE_BADGE: Record<string, string> = {
  appointment:  "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-400",
  "test-drive": "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  "phone-call": "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
  meeting:      "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
  event:        "bg-pink-500/10 text-pink-700 border-pink-500/25 dark:text-pink-400",
  task:         "bg-orange-500/10 text-orange-700 border-orange-500/25 dark:text-orange-400",
  reminder:     "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
};

const SOURCE_BADGE: Record<string, string> = {
  sms:     "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  phone:   "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
  email:   "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-400",
  lead:    "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  booking: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
  manual:  "bg-gray-500/10 text-gray-700 border-gray-400/25 dark:text-gray-400",
};

const POST_TYPE_BADGE: Record<DashboardPost["type"], string> = {
  event:        "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
  news:         "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-400",
  announcement: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  update:       "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
};

function getBadgeClass(map: Record<string, string>, key: string) {
  return map[key.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
}

function statusBadgeClass(status: string) {
  return STATUS_TONE[status.toLowerCase()]?.badge ?? "bg-muted text-muted-foreground border-border";
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function labelFromKey(key: string) { return key.split(/[-_\s]+/).map(capitalize).join(" "); }

const pill =
  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border";

function StatusBadge({ status }: { status: string }) {
  return <span className={cn(pill, statusBadgeClass(status))}>{capitalize(status)}</span>;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(pill, getBadgeClass(TYPE_BADGE, type.toLowerCase().replace(/[\s_]+/g, "-")))}>
      {labelFromKey(type)}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return <span className={cn(pill, getBadgeClass(SOURCE_BADGE, source))}>{capitalize(source)}</span>;
}

// Shared eyebrow + section-header treatment (reused across every panel) ──────────

const EYEBROW = "text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground";

function SectionHeader({
  icon, title, count, children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className={PANEL_HEADER}>
      <div className="flex items-center gap-2.5 text-[12.5px] font-semibold text-foreground/80">
        {/* Icon sits in a small accent tile — anchors each panel with a spot of color */}
        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          {icon}
        </span>
        <span>{title}</span>
        {count != null && (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ─── Signature: the day's status command bar ────────────────────────────────────
// Replaces five identical stat cards with one proportional, animated bar. A
// service desk reads "what's my mix today" in a single glance. The headline count
// carries an accent glow to make it the unmistakable hero of the page.

function StatusStrip({ stats, contextLabel }: { stats: DashboardStats; contextLabel: string }) {
  const segments = [
    { key: "scheduled", label: "Scheduled", value: stats.scheduled ?? 0 },
    { key: "confirmed", label: "Confirmed", value: stats.confirmed ?? 0 },
    { key: "completed", label: "Completed", value: stats.completed ?? 0 },
    { key: "cancelled", label: "Cancelled", value: stats.cancelled ?? 0 },
  ];
  const total = stats.total ?? 0;
  const sum = segments.reduce((s, x) => s + x.value, 0);

  // Grow the bar from 0 → target on mount / data change. Respects reduced motion.
  const [grown, setGrown] = React.useState(false);
  React.useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setGrown(true); return; }
    setGrown(false);
    const id = window.requestAnimationFrame(() => setGrown(true));
    return () => window.cancelAnimationFrame(id);
  }, [sum, contextLabel]);

  const pct = (v: number) => (sum === 0 ? 0 : Math.round((v / sum) * 100));

  return (
    <div className={cn(CARD, "relative overflow-hidden px-5 py-5")}>
      {/* Ambient accent wash anchored to the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        {/* Headline count */}
        <div className="shrink-0">
          <p className={cn(EYEBROW, "mb-1.5 text-primary/80")}>{contextLabel}</p>
          <div className="flex items-baseline gap-2">
            <span className="bg-gradient-to-br from-foreground to-foreground/55 bg-clip-text text-[42px] font-extrabold leading-none tracking-tight tabular-nums text-transparent">
              {total.toLocaleString()}
            </span>
            <span className="text-[12px] font-medium text-muted-foreground">
              appointment{total === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="hidden h-12 w-px self-center bg-gradient-to-b from-transparent via-border to-transparent sm:block" />

        {/* Proportional bar + legend */}
        <div className="min-w-0 flex-1">
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted p-px ring-1 ring-inset ring-black/[0.03]">
            {sum === 0 ? (
              <div className="h-full w-full rounded-full bg-muted" />
            ) : (
              segments.map((seg) =>
                seg.value > 0 ? (
                  <div
                    key={seg.key}
                    className={cn(
                      "h-full rounded-full transition-[width] duration-700 ease-out",
                      STATUS_TONE[seg.key].bar
                    )}
                    style={{ width: grown ? `${(seg.value / sum) * 100}%` : "0%" }}
                    title={`${seg.label}: ${seg.value}`}
                  />
                ) : null
              )
            )}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2.5">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full ring-2 ring-background", STATUS_TONE[seg.key].dot)} />
                <span className="text-[11.5px] font-medium text-muted-foreground">{seg.label}</span>
                <span className="text-[13px] font-bold tabular-nums text-foreground">{seg.value.toLocaleString()}</span>
                <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground/60">{pct(seg.value)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick chip ───────────────────────────────────────────────────────────────

function QuickChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg border px-3 text-[11.5px] font-medium whitespace-nowrap transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active
          ? "border-primary/40 bg-gradient-to-b from-primary/15 to-primary/10 text-primary font-semibold shadow-sm"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
      )}
    >
      {label}
    </button>
  );
}

// Shared field-control look (inputs / selects) ──────────────────────────────────
const FIELD =
  "h-9 rounded-lg border border-border bg-muted/40 px-2.5 text-[13px] text-foreground " +
  "outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20";

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, canDelete, onDelete, deleting }: {
  post: DashboardPost;
  canDelete: boolean;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card/60 px-4 py-3.5 transition-all hover:border-primary/30 hover:bg-card hover:shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", getBadgeClass(POST_TYPE_BADGE, post.type))}>
          {post.type}
        </span>
        <span className="text-[11px] text-muted-foreground/60">
          By {post.authorName} · {format(new Date(post.createdAt), "MMM d, yyyy · HH:mm")}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(post._id)}
            disabled={deleting}
            className="ml-auto inline-flex h-6 items-center gap-1 rounded-lg border border-border bg-transparent px-2 text-[11px] font-medium text-muted-foreground opacity-0 transition-all hover:border-destructive hover:bg-destructive/5 hover:text-destructive focus-visible:opacity-100 disabled:opacity-50 group-hover:opacity-100"
            aria-label="Delete post"
            title="Delete post"
          >
            <Trash2 size={11} strokeWidth={2} />
          </button>
        )}
      </div>
      <p className="mb-1 text-[13px] font-bold text-foreground">{post.title}</p>
      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">{post.content}</p>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function AppointmentRow({ apt, onOpen }: {
  apt: DashboardAppointment;
  onOpen: (id: string) => void;
}) {
  const start = new Date(apt.startTime);
  const end   = new Date(apt.endTime);
  const dur   = Math.round((end.getTime() - start.getTime()) / 60000);
  const name  = `${apt.customerBooking.firstName} ${apt.customerBooking.lastName}`.trim();
  const displayType = apt.type === "other" && apt.customTypeDetails ? apt.customTypeDetails : apt.type;
  const tone  = STATUS_TONE[apt.status]?.dot ?? "bg-border";

  return (
    <tr
      className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-primary/[0.035]"
      onClick={() => onOpen(apt._id)}
    >
      {/* Status spine — a thin colored edge makes the table scannable by state.
          It widens slightly on hover to reward the pointer. */}
      <td className="w-[18%] py-3 pl-0 pr-3.5 align-middle">
        <div className="flex items-stretch gap-3">
          <span className={cn("w-1 shrink-0 rounded-full transition-all group-hover:w-1.5", tone)} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{name}</div>
            <div className="truncate text-[11.5px] text-muted-foreground">{apt.customerBooking.email}</div>
          </div>
        </div>
      </td>
      <td className="w-[11%] px-3.5 py-3 align-middle">
        <span className="whitespace-nowrap font-mono text-[12px] tabular-nums text-foreground/80">{apt.customerBooking.phone}</span>
      </td>
      <td className="w-[8%] px-3.5 py-3 align-middle">
        <div className="font-mono text-[13px] font-medium tabular-nums">{format(start, "HH:mm")}</div>
        <div className="text-[11px] tabular-nums text-muted-foreground">{dur} min</div>
      </td>
      <td className="w-[11%] px-3.5 py-3 align-middle">
        <TypeBadge type={displayType} />
      </td>
      <td className="w-[17%] px-3.5 py-3 align-middle">
        {apt.vehicles && apt.vehicles.length > 0 ? (
          <div className="flex flex-col gap-1">
            {apt.vehicles.slice(0, 2).map((v: any, i: number) => (
              <span key={v._id || i} className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Car className="h-3 w-3 shrink-0" />
                <span className="truncate">{v.year} {v.make} {v.model}</span>
              </span>
            ))}
            {apt.vehicles.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{apt.vehicles.length - 2} more</span>
            )}
          </div>
        ) : (
          <span className="text-[12px] italic text-muted-foreground/40">None</span>
        )}
      </td>
      <td className="w-[13%] px-3.5 py-3 align-middle">
        <span className="flex items-center gap-1.5 truncate text-[12.5px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate">{apt.crmUser?.fullName || "—"}</span>
        </span>
      </td>
      <td className="w-[9%] px-3.5 py-3 align-middle">
        <SourceBadge source={apt.source} />
      </td>
      <td className="w-[9%] px-3.5 py-3 align-middle">
        <StatusBadge status={apt.status} />
      </td>
      <td className="w-[4%] px-3.5 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
        <button
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-transparent px-2 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
          onClick={() => onOpen(apt._id)}
          aria-label={`View appointment for ${name}`}
        >
          <Eye size={11} strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function AppointmentDashboard() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { getToken } = useAuth();

  const today        = format(new Date(), "yyyy-MM-dd");
  const tomorrow     = format(new Date(Date.now() + 86_400_000), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  const [viewMode,      setViewMode]      = React.useState<"day" | "month">("day");
  const [selectedDate,  setSelectedDate]  = React.useState(today);
  const [statusFilter,  setStatusFilter]  = React.useState("all");
  const [typeFilter,    setTypeFilter]    = React.useState("all");
  const [searchQuery,   setSearchQuery]   = React.useState("");

  const selectedMonth = selectedDate.slice(0, 7);

  // Query window params shared by list / stats / export.
  const rangeParams: Record<string, string> =
    viewMode === "month"
      ? { view: "month", month: selectedMonth }
      : { date: selectedDate };

  // Detail modal
  const [detailsModalOpen,    setDetailsModalOpen]    = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<any>(null);

  // Post composer (admin only)
  const [showPostComposer, setShowPostComposer] = React.useState(false);
  const [postType,    setPostType]    = React.useState<DashboardPost["type"]>("event");
  const [postTitle,   setPostTitle]   = React.useState("");
  const [postContent, setPostContent] = React.useState("");

  const getHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: appointmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ["appts-dash", viewMode, selectedDate, statusFilter, typeFilter],
    queryFn: async () => {
      const h = await getHeaders();
      const params: Record<string, string> = { ...rangeParams };
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter   !== "all") params.type   = typeFilter;
      const r = await apiClient.get("/api/appointments/dashboard", { ...h, params });
      return r.data?.data ?? r.data;
    },
    staleTime: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ["appts-dash-stats", viewMode, selectedDate],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/stats", { ...h, params: { ...rangeParams } });
      return r.data?.data ?? r.data;
    },
    staleTime: 30_000,
  });

  const { data: crmMeData } = useQuery({
    queryKey: ["crm-me-for-apd"],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/crm/me", h);
      return r.data?.data ?? r.data;
    },
    staleTime: 60_000,
  });

  const isAdmin = crmMeData?.role === "admin";
  const currentUserId: string | undefined = crmMeData?._id;

  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ["appts-dash-posts"],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/posts", { ...h, params: { limit: 30 } });
      return r.data?.data ?? r.data;
    },
    staleTime: 30_000,
  });

  const posts: DashboardPost[] = (postsData?.posts as DashboardPost[] | undefined) || [];

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const h = await getHeaders();
      return apiClient.post(
        "/api/appointments/dashboard/posts",
        { type: postType, title: postTitle, content: postContent },
        h,
      );
    },
    onSuccess: () => {
      setPostType("event");
      setPostTitle("");
      setPostContent("");
      setShowPostComposer(false);
      queryClient.invalidateQueries({ queryKey: ["appts-dash-posts"] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const h = await getHeaders();
      return apiClient.delete(`/api/appointments/dashboard/posts/${id}`, h);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appts-dash-posts"] });
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleOpenDetailsModal = async (id: string) => {
    try {
      const h = await getHeaders();
      const response = await apiClient.get(`/api/appointments/${id}`, h);
      setSelectedAppointment(response.data?.data || response.data);
      setDetailsModalOpen(true);
    } catch (e) {
      console.error("Failed to fetch appointment details:", e);
    }
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
  };

  // Day pick (date input + Today/Tomorrow chips)
  const handleDateChange = (d: string) => {
    setViewMode("day");
    setSelectedDate(d);
    resetFilters();
  };

  // Month pick (month input + This Month chip)
  const handleMonthChange = (m: string) => {
    setViewMode("month");
    setSelectedDate(`${m}-01`);
    resetFilters();
  };

  const handleDeletePost = (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this post? This cannot be undone.")) return;
    deletePostMutation.mutate(id);
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin || !postTitle.trim() || !postContent.trim()) return;
    await createPostMutation.mutateAsync();
  };

  const filtered = React.useMemo(() => {
    if (!appointmentsData?.appointments) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return appointmentsData.appointments as DashboardAppointment[];
    return (appointmentsData.appointments as DashboardAppointment[]).filter((apt) => {
      const name = `${apt.customerBooking.firstName} ${apt.customerBooking.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        apt.customerBooking.email?.toLowerCase().includes(q) ||
        apt.customerBooking.phone?.toLowerCase().includes(q)
      );
    });
  }, [appointmentsData?.appointments, searchQuery]);

  const displayDate = (() => {
    try {
      if (viewMode === "month") return format(new Date(selectedMonth + "-01T00:00:00"), "MMMM yyyy");
      return format(new Date(selectedDate + "T00:00:00"), "MMMM d, yyyy");
    } catch { return selectedDate; }
  })();

  const handleExport = async () => {
    try {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/export", {
        ...h, params: { ...rangeParams, format: "csv" }, responseType: "text",
      });
      const blob = new Blob([r.data], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const fileTag = viewMode === "month" ? selectedMonth : selectedDate;
      const a    = Object.assign(document.createElement("a"), { href: url, download: `appointments-${fileTag}.csv` });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Export failed:", e); }
  };

  const showFiltersActive = statusFilter !== "all" || typeFilter !== "all" || searchQuery.trim() !== "";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased">
      {/* Ambient atmosphere — faint accent fields give the page depth without noise */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-40 size-[36rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-32 top-0 size-[30rem] rounded-full bg-sky-500/5 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-390 flex-col gap-4 px-4 pb-16 pt-6 sm:px-7">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-primary hover:text-primary hover:ring-2 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft size={15} strokeWidth={2} />
            </button>
            <div className="min-w-0">
              <div className={cn(EYEBROW, "mb-0.5 text-primary")}>Operations Center</div>
              <div className="truncate text-lg font-bold leading-tight tracking-tight sm:text-[20px]">Service Hub</div>
            </div>
          </div>
          <Button size="sm" onClick={() => router.push("/crm/appointments")} className="shrink-0 gap-1.5 bg-primary hover:bg-primary/90">
            <FileText size={13} strokeWidth={2} />
            <span className="hidden xs:inline">Go to Appointments</span>
            <span className="xs:hidden">Appointments</span>
            <ChevronRight size={13} strokeWidth={2} />
          </Button>
        </div>

        {/* ── Day status strip ── */}
        {statsData && <StatusStrip stats={statsData as DashboardStats} contextLabel={displayDate} />}

        {/* ── Filter toolbar ── */}
        <div className={cn(CARD, "flex flex-wrap items-end gap-3 px-4 py-3.5")}>
          {/* Date / Month */}
          <div className="flex flex-col gap-1.5">
            <span className={EYEBROW}>{viewMode === "month" ? "Month" : "Date"}</span>
            {viewMode === "month" ? (
              <input
                type="month"
                className={cn(FIELD, "w-40 cursor-pointer scheme-light-dark")}
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            ) : (
              <input
                type="date"
                className={cn(FIELD, "w-40 cursor-pointer scheme-light-dark")}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            )}
          </div>

          {/* Quick chips */}
          <div className="flex flex-col gap-1.5">
            <span className={EYEBROW}>Quick select</span>
            <div className="flex items-center gap-1.5">
              <QuickChip label="Today"      active={viewMode === "day" && selectedDate === today}            onClick={() => handleDateChange(today)} />
              <QuickChip label="Tomorrow"   active={viewMode === "day" && selectedDate === tomorrow}         onClick={() => handleDateChange(tomorrow)} />
              <QuickChip label="This Month" active={viewMode === "month" && selectedMonth === currentMonth}  onClick={() => handleMonthChange(currentMonth)} />
              {(viewMode !== "day" || selectedDate !== today) && (
                <QuickChip label="Reset" active={false} onClick={() => handleDateChange(today)} />
              )}
            </div>
          </div>

          <div className="hidden h-9 w-px self-end bg-border sm:block" />

          {/* Status */}
          <div className="flex min-w-32 flex-1 flex-col gap-1.5">
            <span className={EYEBROW}>Status</span>
            <select
              className={cn(FIELD, "w-full cursor-pointer appearance-none pr-7 sm:w-36")}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type */}
          <div className="flex min-w-32 flex-1 flex-col gap-1.5">
            <span className={EYEBROW}>Type</span>
            <select
              className={cn(FIELD, "w-full cursor-pointer appearance-none pr-7 sm:w-36")}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="appointment">Appointment</option>
              <option value="test-drive">Test Drive</option>
              <option value="phone-call">Phone Call</option>
              <option value="meeting">Meeting</option>
              <option value="event">Event</option>
              <option value="task">Task</option>
            </select>
          </div>

          <div className="hidden h-9 w-px self-end bg-border sm:block" />

          {/* Search */}
          <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
            <span className={EYEBROW}>Search</span>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
              <Input
                className="h-9 w-full rounded-lg border-border bg-muted/40 pl-8 text-[13px] focus:border-primary sm:max-w-55"
                placeholder="Name, email, phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-[13px] text-destructive">
            <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
            {error instanceof Error ? error.message : "Couldn't load appointments. Try refreshing."}
          </div>
        )}

        {/* ── Table card ── */}
        <div className={cn(CARD, "overflow-hidden")}>

          <SectionHeader
            icon={<CalendarDays size={13} strokeWidth={2} />}
            title={displayDate}
            count={!isLoading && appointmentsData?.count != null ? appointmentsData.count : undefined}
          >
            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={handleExport} disabled={isLoading || !filtered.length}>
              <Download size={12} strokeWidth={2} />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw size={12} strokeWidth={2} className={cn(isLoading && "animate-spin")} />
              Refresh
            </Button>
          </SectionHeader>

          {/* Table body */}
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Loader2 size={22} strokeWidth={2} className="animate-spin text-primary" />
              <p className="text-sm">Loading appointments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-muted to-muted/40 text-muted-foreground shadow-inner">
                <Calendar size={22} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[14.5px] font-semibold text-foreground/80">No appointments here</p>
                <p className="mt-0.5 max-w-xs text-[13px]">
                  {showFiltersActive ? "Adjust the search or filters to widen the view." : `Nothing booked for ${displayDate}.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-130 overflow-x-auto overflow-y-auto [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin]">
              <table className="w-full min-w-240 table-fixed border-collapse">
                <thead className="sticky top-0 z-10 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/65">
                  <tr className="border-b border-border">
                    {[
                      ["Customer",  "18%"],
                      ["Phone",     "11%"],
                      ["Time",       "8%"],
                      ["Type",      "11%"],
                      ["Vehicles",  "17%"],
                      ["Booked By", "13%"],
                      ["Source",     "9%"],
                      ["Status",     "9%"],
                      ["",           "4%"],
                    ].map(([label, width]) => (
                      <th
                        key={label}
                        style={{ width }}
                        className={cn(
                          "whitespace-nowrap px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
                          !label && "text-center"
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt) => (
                    <AppointmentRow key={apt._id} apt={apt} onOpen={handleOpenDetailsModal} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table footer */}
          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-5 py-2.5 text-[11.5px] text-muted-foreground">
              <span>
                Showing <strong className="font-semibold tabular-nums text-foreground/70">{filtered.length}</strong> of{" "}
                <strong className="font-semibold tabular-nums text-foreground/70">{appointmentsData?.count ?? 0}</strong> appointments
              </span>
              <span>{displayDate}</span>
            </div>
          )}
        </div>

        {/* ── Post management (admin) ── */}
        {(isAdmin || isPostsLoading || posts.length > 0) && (
          <div className={cn(CARD, "overflow-hidden")}>
            <SectionHeader
              icon={<Megaphone size={13} strokeWidth={2} />}
              title="Announcements & Updates"
              count={posts.length > 0 ? posts.length : undefined}
            >
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs"
                  onClick={() => setShowPostComposer((v) => !v)}
                >
                  <Plus size={12} strokeWidth={2} />
                  {showPostComposer ? "Cancel" : "Add Post"}
                </Button>
              )}
            </SectionHeader>

            {/* Composer form */}
            {showPostComposer && isAdmin && (
              <form onSubmit={handleCreatePost} className="space-y-3 border-b border-border/60 bg-muted/10 p-4">
                <div className="flex flex-wrap gap-3">
                  <Input
                    placeholder="Post title…"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    maxLength={160}
                    className="h-9 min-w-52 flex-1 rounded-lg bg-background text-[13px]"
                    required
                  />
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as DashboardPost["type"])}
                    className={cn(FIELD, "w-40 cursor-pointer appearance-none bg-background pr-7")}
                  >
                    <option value="event">Event</option>
                    <option value="news">News</option>
                    <option value="announcement">Announcement</option>
                    <option value="update">Update</option>
                  </select>
                </div>
                <textarea
                  placeholder="Write your update…"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  maxLength={5000}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPostComposer(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    disabled={createPostMutation.isPending || !postTitle.trim() || !postContent.trim()}
                  >
                    {createPostMutation.isPending ? "Posting…" : "Post"}
                  </Button>
                </div>
              </form>
            )}

            {/* Post list */}
            {isPostsLoading ? (
              <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-muted-foreground">
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                Loading posts…
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-2.5 p-4">
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    canDelete={isAdmin && !!currentUserId && post.createdBy === currentUserId}
                    onDelete={handleDeletePost}
                    deleting={deletePostMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <p className="px-5 py-4 text-[13px] italic text-muted-foreground/50">Nothing posted yet.</p>
            )}
          </div>
        )}

        {/* ── Team Chat (real-time, all users) ── */}
        <AppointmentChat currentUserId={currentUserId} isAdmin={isAdmin} />

        {/* ── Vehicle History ── */}
        <VehicleHistory />

      </div>

      {/* Appointment detail modal */}
      <AppointmentDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        appointment={selectedAppointment}
      />
    </div>
  );
}

export default AppointmentDashboard;