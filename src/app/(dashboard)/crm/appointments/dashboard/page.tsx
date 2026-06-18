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

// ─── Token map ────────────────────────────────────────────────────────────────
// Single source of truth for status color. Drives badges + the status strip so
// a "confirmed" pill and the strip's confirmed segment can never drift apart.

const STATUS_TONE: Record<
  string,
  { dot: string; bar: string; badge: string }
> = {
  scheduled: {
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-400",
  },
  confirmed: {
    dot: "bg-teal-500",
    bar: "bg-teal-500",
    badge: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
  },
  completed: {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  },
  cancelled: {
    dot: "bg-red-500",
    bar: "bg-red-500",
    badge: "bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-400",
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
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border";

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

const EYEBROW = "text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground";

function SectionHeader({
  icon, title, count, children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span>{title}</span>
        {count != null && (
          <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ─── Signature: the day's status strip ──────────────────────────────────────────
// Replaces five identical stat cards with one proportional bar. A service desk
// reads "what's my mix today" in a single glance instead of summing five boxes.

function StatusStrip({ stats, contextLabel }: { stats: DashboardStats; contextLabel: string }) {
  const segments = [
    { key: "scheduled", label: "Scheduled", value: stats.scheduled ?? 0 },
    { key: "confirmed", label: "Confirmed", value: stats.confirmed ?? 0 },
    { key: "completed", label: "Completed", value: stats.completed ?? 0 },
    { key: "cancelled", label: "Cancelled", value: stats.cancelled ?? 0 },
  ];
  const total = stats.total ?? 0;
  const sum = segments.reduce((s, x) => s + x.value, 0);

  return (
    <div className="rounded-xl border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Headline count */}
        <div className="shrink-0">
          <p className={cn(EYEBROW, "mb-1")}>{contextLabel}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-bold leading-none tabular-nums tracking-tight">
              {total.toLocaleString()}
            </span>
            <span className="text-[12px] font-medium text-muted-foreground">
              appointment{total === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="hidden sm:block w-px self-stretch bg-border" />

        {/* Proportional bar + legend */}
        <div className="flex-1 min-w-0">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {sum === 0 ? (
              <div className="h-full w-full bg-muted" />
            ) : (
              segments.map((seg) =>
                seg.value > 0 ? (
                  <div
                    key={seg.key}
                    className={cn("h-full transition-all", STATUS_TONE[seg.key].bar)}
                    style={{ width: `${(seg.value / sum) * 100}%` }}
                    title={`${seg.label}: ${seg.value}`}
                  />
                ) : null
              )
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", STATUS_TONE[seg.key].dot)} />
                <span className="text-[11.5px] font-medium text-muted-foreground">{seg.label}</span>
                <span className="text-[12.5px] font-bold tabular-nums">{seg.value.toLocaleString()}</span>
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
        "h-7 px-3 rounded border text-[11.5px] font-medium transition-all whitespace-nowrap",
        active
          ? "bg-primary/10 border-primary/40 text-primary font-semibold"
          : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
      )}
    >
      {label}
    </button>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, canDelete, onDelete, deleting }: {
  post: DashboardPost;
  canDelete: boolean;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div className="group rounded-xl border bg-card/60 px-4 py-3.5 shadow-sm transition-colors hover:border-border/80">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border", getBadgeClass(POST_TYPE_BADGE, post.type))}>
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
            className="ml-auto inline-flex items-center gap-1 h-6 px-2 rounded border border-border bg-transparent text-muted-foreground text-[11px] font-medium opacity-0 transition-all hover:border-destructive hover:text-destructive hover:bg-destructive/5 disabled:opacity-50 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Delete post"
            title="Delete post"
          >
            <Trash2 size={11} strokeWidth={2} />
          </button>
        )}
      </div>
      <p className="text-[13px] font-bold text-foreground mb-1">{post.title}</p>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
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
      className="group border-b border-border transition-colors last:border-0 hover:bg-muted/40 cursor-pointer"
      onClick={() => onOpen(apt._id)}
    >
      {/* Status spine — a thin colored edge makes the table scannable by state */}
      <td className="w-[18%] py-3 pr-3.5 pl-0 align-middle">
        <div className="flex items-stretch gap-3">
          <span className={cn("w-0.75 shrink-0 rounded-full", tone)} />
          <div className="min-w-0">
            <div className="font-semibold text-[13px] truncate">{name}</div>
            <div className="text-[11.5px] text-muted-foreground truncate">{apt.customerBooking.email}</div>
          </div>
        </div>
      </td>
      <td className="px-3.5 py-3 align-middle w-[11%]">
        <span className="font-mono text-[12px] tabular-nums text-foreground/80 whitespace-nowrap">{apt.customerBooking.phone}</span>
      </td>
      <td className="px-3.5 py-3 align-middle w-[8%]">
        <div className="font-mono text-[13px] font-medium tabular-nums">{format(start, "HH:mm")}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">{dur} min</div>
      </td>
      <td className="px-3.5 py-3 align-middle w-[11%]">
        <TypeBadge type={displayType} />
      </td>
      <td className="px-3.5 py-3 align-middle w-[17%]">
        {apt.vehicles && apt.vehicles.length > 0 ? (
          <div className="flex flex-col gap-1">
            {apt.vehicles.slice(0, 2).map((v: any, i: number) => (
              <span key={v._id || i} className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium bg-primary/8 text-primary border border-primary/20">
                <Car className="h-3 w-3 shrink-0" />
                <span className="truncate">{v.year} {v.make} {v.model}</span>
              </span>
            ))}
            {apt.vehicles.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{apt.vehicles.length - 2} more</span>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-muted-foreground/40 italic">None</span>
        )}
      </td>
      <td className="px-3.5 py-3 align-middle w-[13%]">
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground truncate">
          <Users className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate">{apt.crmUser?.fullName || "—"}</span>
        </span>
      </td>
      <td className="px-3.5 py-3 align-middle w-[9%]">
        <SourceBadge source={apt.source} />
      </td>
      <td className="px-3.5 py-3 align-middle w-[9%]">
        <StatusBadge status={apt.status} />
      </td>
      <td className="px-3.5 py-3 align-middle w-[4%] text-center" onClick={(e) => e.stopPropagation()}>
        <button
          className="inline-flex items-center gap-1 h-6 px-2 rounded border border-border bg-transparent text-muted-foreground text-[11px] font-medium transition-all hover:border-primary hover:text-primary hover:bg-primary/5"
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
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="mx-auto max-w-390 px-4 sm:px-7 pb-16 pt-6 flex flex-col gap-4">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="size-8 shrink-0 flex items-center justify-center bg-card border border-border rounded-md text-muted-foreground hover:border-primary hover:text-primary hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft size={14} strokeWidth={2} />
            </button>
            <div className="min-w-0">
              <div className={cn(EYEBROW, "text-primary mb-0.5")}>Operations Center</div>
              <div className="text-base sm:text-[19px] font-bold tracking-tight leading-tight truncate">Service Hub</div>
            </div>
          </div>
          <Button size="sm" onClick={() => router.push("/crm/appointments")} className="bg-primary hover:bg-primary/90 gap-1.5 shrink-0">
            <FileText size={13} strokeWidth={2} />
            <span className="hidden xs:inline">Go to Appointments</span>
            <span className="xs:hidden">Appointments</span>
            <ChevronRight size={13} strokeWidth={2} />
          </Button>
        </div>

        {/* ── Day status strip ── */}
        {statsData && <StatusStrip stats={statsData as DashboardStats} contextLabel={displayDate} />}

        {/* ── Filter toolbar ── */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm">
          {/* Date / Month */}
          <div className="flex flex-col gap-1.5">
            <span className={EYEBROW}>{viewMode === "month" ? "Month" : "Date"}</span>
            {viewMode === "month" ? (
              <input
                type="month"
                className="h-8.5 w-40 px-2.5 bg-muted/50 border border-border rounded-md text-foreground text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer scheme-light-dark"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            ) : (
              <input
                type="date"
                className="h-8.5 w-40 px-2.5 bg-muted/50 border border-border rounded-md text-foreground text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer scheme-light-dark"
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

          <div className="hidden sm:block w-px h-8 bg-border self-end" />

          {/* Status */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-32">
            <span className={EYEBROW}>Status</span>
            <select
              className="h-8.5 w-full sm:w-36 px-2.5 pr-7 bg-muted/50 border border-border rounded-md text-foreground text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none"
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
          <div className="flex flex-col gap-1.5 flex-1 min-w-32">
            <span className={EYEBROW}>Type</span>
            <select
              className="h-8.5 w-full sm:w-36 px-2.5 pr-7 bg-muted/50 border border-border rounded-md text-foreground text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none"
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

          <div className="hidden sm:block w-px h-8 bg-border self-end" />

          {/* Search */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 w-full">
            <span className={EYEBROW}>Search</span>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" strokeWidth={2} />
              <Input
                className="h-8.5 pl-8 bg-muted/50 text-[13px] border-border focus:border-primary w-full sm:max-w-55"
                placeholder="Name, email, phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-[13px] text-destructive">
            <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
            {error instanceof Error ? error.message : "Couldn't load appointments. Try refreshing."}
          </div>
        )}

        {/* ── Table card ── */}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">

          <SectionHeader
            icon={<CalendarDays size={13} strokeWidth={2} />}
            title={displayDate}
            count={!isLoading && appointmentsData?.count != null ? appointmentsData.count : undefined}
          >
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExport} disabled={isLoading || !filtered.length}>
              <Download size={12} strokeWidth={2} />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => refetch()} disabled={isLoading}>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
                <Calendar size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[14.5px] font-semibold text-foreground/80">No appointments here</p>
                <p className="mt-0.5 text-[13px] max-w-xs">
                  {showFiltersActive ? "Adjust the search or filters to widen the view." : `Nothing booked for ${displayDate}.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-130 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
              <table className="w-full border-collapse table-fixed min-w-240">
                <thead className="sticky top-0 z-10 bg-card">
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
                          "px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap bg-muted/30",
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
            <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t border-border bg-muted/20 text-[11.5px] text-muted-foreground">
              <span>
                Showing <strong className="text-foreground/70 font-semibold tabular-nums">{filtered.length}</strong> of{" "}
                <strong className="text-foreground/70 font-semibold tabular-nums">{appointmentsData?.count ?? 0}</strong> appointments
              </span>
              <span>{displayDate}</span>
            </div>
          )}
        </div>

        {/* ── Post management (admin) ── */}
        {(isAdmin || isPostsLoading || posts.length > 0) && (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <SectionHeader
              icon={<Megaphone size={13} strokeWidth={2} />}
              title="Announcements & Updates"
              count={posts.length > 0 ? posts.length : undefined}
            >
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setShowPostComposer((v) => !v)}
                >
                  <Plus size={12} strokeWidth={2} />
                  {showPostComposer ? "Cancel" : "Add Post"}
                </Button>
              )}
            </SectionHeader>

            {/* Composer form */}
            {showPostComposer && isAdmin && (
              <form onSubmit={handleCreatePost} className="border-b border-border p-4 space-y-3 bg-muted/10">
                <div className="flex flex-wrap gap-3">
                  <Input
                    placeholder="Post title…"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    maxLength={160}
                    className="flex-1 min-w-52 h-8.5 text-[13px] bg-background"
                    required
                  />
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as DashboardPost["type"])}
                    className="h-8.5 w-40 px-2.5 pr-7 bg-background border border-border rounded-md text-foreground text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none"
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
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
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
              <div className="p-4 space-y-2.5">
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
              <p className="px-5 py-4 text-[13px] text-muted-foreground/50 italic">Nothing posted yet.</p>
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