"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

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
  entryType: string;
  source: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  customerBooking: CustomerBooking;
  crmUser: CrmUserData;
}

interface DashboardPost {
  _id: string;
  type: "event" | "news" | "announcement" | "update";
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: Date | string;
}

const STYLES = `
.apd {
  --c-bg: #f4f7fa;
  --c-surface: #ffffff;
  --c-surface-2: #fcfdfe;
  --c-surface-3: #eef1f6;
  --c-border: #e9edf3;
  --c-text-1: #0c1220;
  --c-text-2: #4e5a7a;
  --c-text-3: #92a1b9;
  --c-green: #10b981;
  --c-blue: #3b82f6;
  --c-red: #ef4444;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.02);
  --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.01);
  font-family: Inter, system-ui, sans-serif;
  background: var(--c-bg);
  color: var(--c-text-1);
  min-height: 100vh;
}

.dark .apd {
  --c-bg: #0b101a;
  --c-surface: #111726;
  --c-surface-2: #161e2f;
  --c-surface-3: #1f2a3f;
  --c-border: #1d283e;
  --c-text-1: #f1f5f9;
  --c-text-2: #94a3b8;
  --c-text-3: #4e5d7a;
}

.apd-layout { max-width: 1600px; margin: 0 auto; padding: 24px 16px 60px; display: flex; flex-direction: column; gap: 20px; }
.apd-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.apd-header-left { display: flex; align-items: center; gap: 14px; }
.apd-header-title { display: flex; flex-direction: column; }
.apd-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-blue); }
.apd-title { font-size: 24px; font-weight: 700; line-height: 1.2; }

.apd-back {
  width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 50%; color: var(--c-text-2);
}

.apd-btn-primary, .apd-btn-ghost {
  height: 36px; padding: 0 14px; border-radius: var(--radius-sm); border: 1px solid var(--c-border);
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; font-size: 12.5px;
}
.apd-btn-primary { background: var(--c-surface); color: var(--c-text-1); font-weight: 600; }
.apd-btn-ghost { background: var(--c-surface); color: var(--c-text-2); }
.apd-btn-primary:disabled, .apd-btn-ghost:disabled { opacity: 0.55; cursor: not-allowed; }

.apd-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.apd-stat { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius); padding: 14px; }
.apd-stat-label { font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--c-text-3); }
.apd-stat-value { font-size: 28px; font-weight: 700; margin-top: 4px; }

.apd-toolbar { display: flex; flex-wrap: wrap; gap: 10px; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius); padding: 12px; }
.apd-field { display: flex; flex-direction: column; gap: 5px; }
.apd-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--c-text-3); }
.apd-ctrl { height: 34px; min-width: 150px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); background: var(--c-surface-2); color: var(--c-text-1); padding: 0 10px; }
.apd-search-wrap { position: relative; }
.apd-search-ico { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: var(--c-text-3); }
.apd-search-wrap .apd-ctrl { padding-left: 30px; min-width: 220px; }
.apd-quick-chips { display: flex; gap: 6px; }
.apd-chip { height: 26px; padding: 0 10px; border: 1px solid var(--c-border); border-radius: 6px; background: var(--c-surface-3); color: var(--c-text-2); }
.apd-chip.is-on { border-color: var(--c-blue); color: var(--c-blue); }

.apd-error { display: flex; gap: 8px; align-items: center; color: var(--c-red); background: color-mix(in srgb, var(--c-red) 8%, transparent); border: 1px solid color-mix(in srgb, var(--c-red) 20%, transparent); border-radius: var(--radius-sm); padding: 10px 12px; }

.apd-table-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius); overflow: hidden; }
.apd-table-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--c-border); background: var(--c-surface-2); }
.apd-table-header-left { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--c-text-2); }
.apd-table-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.apd-count-pill { font-size: 11px; color: var(--c-text-3); background: var(--c-surface-3); border: 1px solid var(--c-border); border-radius: 999px; padding: 2px 8px; }

.apd-post-stream { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--c-border); }
.apd-post-form { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); padding: 10px; background: var(--c-surface-2); }
.apd-post-row { display: flex; gap: 8px; flex-wrap: wrap; }
.apd-post-input, .apd-post-select, .apd-post-textarea { border: 1px solid var(--c-border); border-radius: var(--radius-sm); background: var(--c-surface); color: var(--c-text-1); padding: 8px 10px; font-size: 12.5px; }
.apd-post-input { flex: 1; min-width: 220px; }
.apd-post-select { width: 150px; }
.apd-post-textarea { min-height: 84px; resize: vertical; }
.apd-post-actions { display: flex; justify-content: flex-end; gap: 8px; }
.apd-post-item { border: 1px solid var(--c-border); border-radius: var(--radius-sm); padding: 10px; background: var(--c-surface-2); }
.apd-post-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.apd-post-type { font-size: 10px; font-weight: 700; text-transform: uppercase; border: 1px solid var(--c-border); border-radius: 999px; padding: 2px 8px; color: var(--c-blue); }
.apd-post-author, .apd-post-time { font-size: 11px; color: var(--c-text-3); }
.apd-post-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.apd-post-content { font-size: 12px; color: var(--c-text-2); white-space: pre-wrap; }

.apd-center { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 52px 20px; }
.apd-center-title { font-size: 15px; font-weight: 700; color: var(--c-text-2); }
.apd-center-sub { font-size: 13px; color: var(--c-text-3); }

.apd-tbl-scroll { overflow-x: auto; }
.apd-tbl { width: 100%; min-width: 920px; border-collapse: collapse; }
.apd-tbl th, .apd-tbl td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--c-border); font-size: 12.5px; }
.apd-tbl th { font-size: 10px; color: var(--c-text-3); text-transform: uppercase; letter-spacing: .08em; }
.apd-cust-name { font-weight: 700; color: var(--c-text-1); }
.apd-cust-email { font-size: 11.5px; color: var(--c-text-3); }
.apd-phone { font-size: 12px; }
.apd-time-val { font-weight: 700; }
.apd-time-dur { font-size: 11px; color: var(--c-text-3); }
.apd-staff { color: var(--c-text-2); }

.badge { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 6px; border: 1px solid var(--c-border); font-size: 10px; font-weight: 700; text-transform: uppercase; }
.bs-scheduled { color: #2563eb; }
.bs-confirmed { color: #059669; }
.bs-completed { color: #16a34a; }
.bs-cancelled { color: #dc2626; }
.bt-event { color: #db2777; }
.bt-task { color: #d97706; }
.bt-appointment { color: #7c3aed; }
.bt-phone-call { color: #2563eb; }
.bt-meeting { color: #0d9488; }
.bt-test-drive { color: #d97706; }
.bsrc-manual { color: #6b7280; }

.apd-view-btn { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border: 1px solid var(--c-border); border-radius: var(--radius-sm); background: transparent; color: var(--c-text-2); }
.apd-tbl-foot { display: flex; justify-content: space-between; gap: 8px; padding: 10px 14px; font-size: 11.5px; color: var(--c-text-3); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
`;

function useStyles() {
  React.useEffect(() => {
    const id = "apd-clean-styles";
    if (document.getElementById(id)) return;
    const styleElement = document.createElement("style");
    styleElement.id = id;
    styleElement.textContent = STYLES;
    document.head.appendChild(styleElement);
    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, []);
}

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge bs-${status}`}>{label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase().replace(/[\s_]+/g, "-");
  const label = type
    .split(/[-\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return <span className={`badge bt-${key}`}>{label}</span>;
}

function SourceBadge({ source }: { source: string }) {
  const key = source.toLowerCase().replace(/[\s_]+/g, "-");
  return <span className={`badge bsrc-${key}`}>{source}</span>;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="apd-stat">
      <div className="apd-stat-label">{label}</div>
      <div className="apd-stat-value">{value}</div>
      <div>{icon}</div>
    </div>
  );
}

function AppointmentRow({
  apt,
  onView,
}: {
  apt: DashboardAppointment;
  onView: (id: string) => void;
}) {
  const start = new Date(apt.startTime);
  const end = new Date(apt.endTime);
  const duration = Math.round((end.getTime() - start.getTime()) / 60000);
  const customerName =
    `${apt.customerBooking.firstName} ${apt.customerBooking.lastName}`.trim();

  return (
    <tr>
      <td>
        <div className="apd-cust-name">{customerName}</div>
        <div className="apd-cust-email">{apt.customerBooking.email}</div>
      </td>
      <td>
        <span className="apd-phone">{apt.customerBooking.phone}</span>
      </td>
      <td>
        <div className="apd-time-val">{format(start, "HH:mm")}</div>
        <div className="apd-time-dur">{duration} min</div>
      </td>
      <td>
        <TypeBadge type={apt.entryType || apt.type} />
      </td>
      <td>
        <span className="apd-staff">{apt.crmUser?.fullName || "—"}</span>
      </td>
      <td>
        <SourceBadge source={apt.source || "manual"} />
      </td>
      <td>
        <StatusBadge status={apt.status} />
      </td>
      <td>
        <button
          className="apd-view-btn"
          onClick={() => onView(apt._id)}
          aria-label={`View appointment for ${customerName}`}
        >
          <Eye size={11} strokeWidth={2} />
          View
        </button>
      </td>
    </tr>
  );
}

export function AppointmentDashboard() {
  useStyles();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(new Date(Date.now() + 86_400_000), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = React.useState(today);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showPostComposer, setShowPostComposer] = React.useState(false);
  const [postType, setPostType] =
    React.useState<DashboardPost["type"]>("event");
  const [postTitle, setPostTitle] = React.useState("");
  const [postContent, setPostContent] = React.useState("");

  const getHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const {
    data: appointmentsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["appts-dash", selectedDate, statusFilter, typeFilter],
    queryFn: async () => {
      const headers = await getHeaders();
      const params: Record<string, string> = { date: selectedDate };
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      const response = await apiClient.get("/api/appointments/dashboard", {
        ...headers,
        params,
      });
      return response.data?.data ?? response.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["appts-dash-stats", selectedDate],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await apiClient.get(
        "/api/appointments/dashboard/stats",
        { ...headers, params: { date: selectedDate } },
      );
      return response.data?.data ?? response.data;
    },
    staleTime: 30_000,
  });

  const { data: crmMeData } = useQuery({
    queryKey: ["crm-me-for-apd"],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await apiClient.get("/api/crm/me", headers);
      return response.data?.data ?? response.data;
    },
    staleTime: 60_000,
  });

  const isAdmin = crmMeData?.role === "admin";

  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ["appts-dash-posts"],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await apiClient.get(
        "/api/appointments/dashboard/posts",
        { ...headers, params: { limit: 30 } },
      );
      return response.data?.data ?? response.data;
    },
    staleTime: 30_000,
  });

  const posts: DashboardPost[] =
    (postsData?.posts as DashboardPost[] | undefined) || [];

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const headers = await getHeaders();
      return apiClient.post(
        "/api/appointments/dashboard/posts",
        { type: postType, title: postTitle, content: postContent },
        headers,
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

  const filtered = React.useMemo(() => {
    if (!appointmentsData?.appointments) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return appointmentsData.appointments as DashboardAppointment[];

    return (appointmentsData.appointments as DashboardAppointment[]).filter(
      (appointment) => {
        const name =
          `${appointment.customerBooking.firstName} ${appointment.customerBooking.lastName}`.toLowerCase();
        return (
          name.includes(query) ||
          appointment.customerBooking.email?.toLowerCase().includes(query) ||
          appointment.customerBooking.phone?.toLowerCase().includes(query) ||
          appointment.crmUser?.fullName?.toLowerCase().includes(query)
        );
      },
    );
  }, [appointmentsData?.appointments, searchQuery]);

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
  };

  const displayDate = React.useMemo(() => {
    try {
      return format(new Date(`${selectedDate}T00:00:00`), "MMMM d, yyyy");
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;
    if (!postTitle.trim() || !postContent.trim()) return;
    await createPostMutation.mutateAsync();
  };

  const handleExport = async () => {
    try {
      const headers = await getHeaders();
      const response = await apiClient.get(
        "/api/appointments/dashboard/export",
        {
          ...headers,
          params: { date: selectedDate, format: "csv" },
          responseType: "text",
        },
      );
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), {
        href: url,
        download: `appointments-${selectedDate}.csv`,
      });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error("Export failed:", exportError);
    }
  };

  return (
    <div className="apd">
      <div className="apd-layout">
        <div className="apd-header">
          <div className="apd-header-left">
            <button
              className="apd-back"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft size={14} strokeWidth={2} />
            </button>
            <div className="apd-header-title">
              <div className="apd-eyebrow">Operations Hub</div>
              <div className="apd-title">Appointment Dashboard</div>
            </div>
          </div>
          <button
            className="apd-btn-primary"
            onClick={() => router.push("/crm/appointments")}
          >
            <FileText size={13} strokeWidth={2} />
            Full Appointments
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>

        {statsData && (
          <div className="apd-stats">
            <StatCard
              label="Total"
              value={statsData.total ?? 0}
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              label="Scheduled"
              value={statsData.scheduled ?? 0}
              icon={<Clock size={18} />}
            />
            <StatCard
              label="Confirmed"
              value={statsData.confirmed ?? 0}
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              label="Completed"
              value={statsData.completed ?? 0}
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              label="Cancelled"
              value={statsData.cancelled ?? 0}
              icon={<XCircle size={18} />}
            />
          </div>
        )}

        <div className="apd-toolbar">
          <div className="apd-field">
            <span className="apd-label">Date</span>
            <input
              type="date"
              className="apd-ctrl"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>

          <div className="apd-field">
            <span className="apd-label">Quick Select</span>
            <div className="apd-quick-chips">
              <button
                className={cn("apd-chip", selectedDate === today && "is-on")}
                onClick={() => handleDateChange(today)}
              >
                Today
              </button>
              <button
                className={cn("apd-chip", selectedDate === tomorrow && "is-on")}
                onClick={() => handleDateChange(tomorrow)}
              >
                Tomorrow
              </button>
              {selectedDate !== today && (
                <button
                  className="apd-chip"
                  onClick={() => handleDateChange(today)}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="apd-field">
            <span className="apd-label">Status</span>
            <select
              className="apd-ctrl"
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

          <div className="apd-field">
            <span className="apd-label">Type</span>
            <select
              className="apd-ctrl"
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

          <div className="apd-field">
            <span className="apd-label">Search</span>
            <div className="apd-search-wrap">
              <Search size={12} className="apd-search-ico" strokeWidth={2} />
              <input
                className="apd-ctrl"
                placeholder="Name, email, phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="apd-error">
            <AlertCircle size={14} strokeWidth={2} />
            {error instanceof Error
              ? error.message
              : "Failed to load appointments. Please try again."}
          </div>
        )}

        <div className="apd-table-card">
          <div className="apd-table-header">
            <div className="apd-table-header-left">
              <CalendarDays
                size={13}
                strokeWidth={2}
                style={{ color: "var(--c-green)" }}
              />
              <span>{displayDate}</span>
              {!isLoading && appointmentsData?.count != null && (
                <span className="apd-count-pill">
                  {appointmentsData.count} total
                </span>
              )}
            </div>
            <div className="apd-table-actions">
              {isAdmin && (
                <button
                  className="apd-btn-primary"
                  onClick={() => setShowPostComposer((value) => !value)}
                >
                  <Plus size={12} strokeWidth={2} />+ add event
                </button>
              )}
              <button
                className="apd-btn-ghost"
                onClick={handleExport}
                disabled={isLoading || !filtered.length}
              >
                <Download size={12} strokeWidth={2} />
                Export CSV
              </button>
              <button
                className="apd-btn-ghost"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  size={12}
                  strokeWidth={2}
                  className={isLoading ? "spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {showPostComposer && isAdmin && (
            <div className="apd-post-stream">
              <form className="apd-post-form" onSubmit={handleCreatePost}>
                <div className="apd-post-row">
                  <input
                    className="apd-post-input"
                    placeholder="Post title"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    maxLength={160}
                  />
                  <select
                    className="apd-post-select"
                    value={postType}
                    onChange={(e) =>
                      setPostType(e.target.value as DashboardPost["type"])
                    }
                  >
                    <option value="event">Event</option>
                    <option value="news">News</option>
                    <option value="announcement">Announcement</option>
                    <option value="update">Update</option>
                  </select>
                </div>
                <textarea
                  className="apd-post-textarea"
                  placeholder="Write your update..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  maxLength={5000}
                />
                <div className="apd-post-actions">
                  <button
                    type="button"
                    className="apd-btn-ghost"
                    onClick={() => setShowPostComposer(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="apd-btn-primary"
                    disabled={
                      createPostMutation.isPending ||
                      !postTitle.trim() ||
                      !postContent.trim()
                    }
                  >
                    {createPostMutation.isPending ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {(isPostsLoading || posts.length > 0) && (
            <div className="apd-post-stream">
              {isPostsLoading ? (
                <div className="apd-center-sub">Loading posts...</div>
              ) : (
                posts.map((post) => (
                  <div className="apd-post-item" key={post._id}>
                    <div className="apd-post-meta">
                      <span className="apd-post-type">{post.type}</span>
                      <span className="apd-post-author">
                        By {post.authorName} ({post.authorRole})
                      </span>
                      <span className="apd-post-time">
                        {format(
                          new Date(post.createdAt),
                          "MMM d, yyyy · HH:mm",
                        )}
                      </span>
                    </div>
                    <div className="apd-post-title">{post.title}</div>
                    <div className="apd-post-content">{post.content}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {isLoading ? (
            <div className="apd-center">
              <Loader2
                size={22}
                strokeWidth={2}
                className="spin"
                style={{ color: "var(--c-green)" }}
              />
              <p className="apd-center-sub">Loading appointments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="apd-center">
              <Calendar size={20} strokeWidth={1.5} />
              <div className="apd-center-title">No Appointments Found</div>
              <div className="apd-center-sub">
                {searchQuery
                  ? "Try adjusting your search or filters."
                  : `No appointments scheduled for ${displayDate}.`}
              </div>
            </div>
          ) : (
            <>
              <div className="apd-tbl-scroll">
                <table className="apd-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: "22%" }}>Customer</th>
                      <th style={{ width: "13%" }}>Phone</th>
                      <th style={{ width: "10%" }}>Time</th>
                      <th style={{ width: "16%" }}>Type</th>
                      <th style={{ width: "12%" }}>Booked By</th>
                      <th style={{ width: "12%" }}>Source</th>
                      <th style={{ width: "9%" }}>Status</th>
                      <th style={{ width: "8%" }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((appointment) => (
                      <AppointmentRow
                        key={appointment._id}
                        apt={appointment}
                        onView={(id) =>
                          router.push(`/crm/appointments?id=${id}`)
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="apd-tbl-foot">
                <span>
                  Displaying <strong>{filtered.length}</strong> of{" "}
                  <strong>{appointmentsData?.count ?? 0}</strong> entries
                </span>
                <span>{selectedDate}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppointmentDashboard;
