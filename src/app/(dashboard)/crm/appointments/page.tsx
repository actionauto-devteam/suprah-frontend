"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, Users, Plus, RefreshCw, Mail, ArrowLeft, Contact,
  TrendingUp, MapPin, Sparkles, ChevronRight
} from "lucide-react"
import { AppointmentCalendar } from "@/components/AppointmentCalendar"
import { BookedTab } from "@/components/BookedTab"
import { LeadsTab } from "@/components/LeadsTab"
import { CreateAppointmentModal } from "@/components/CreateAppointmentModal"
import { AppointmentDetailsModal } from "@/components/AppointmentDetailsModal"
import { CrmCalendarConnect } from "@/components/CrmCalendarConnect"
import { CrmCalendarSyncButton } from "@/components/CrmCalendarSyncButton"
import { CustomerCredentialsTab } from "@/components/CustomerCredentialsTab";
import type { LeadNavParams } from "@/components/CustomerCredentialsTab";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import {
  FullscreenProvider,
  useFullscreen,
  TabOption,
} from "@/components/FullscreenProvider";
import {
  PaneToolbar,
  MultiPaneContainer,
  FullscreenWrapper,
} from "@/components/MultiPaneLayout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow } from "date-fns";

// ─── Tab options ──────────────────────────────────────────────────────────────

const TAB_OPTIONS: TabOption[] = [
  { id: "leads", label: "Leads", icon: <Mail className="h-3.5 w-3.5" /> },
  { id: "calendar", label: "Calendar View", icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: "upcoming", label: "Upcoming", icon: <Clock className="h-3.5 w-3.5" /> },
  { id: "booked", label: "Booked", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "customers", label: "Customer Credentials", icon: <Contact className="h-3.5 w-3.5" /> },
];

// ─── Style helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { pill: string; bar: string; dot: string }> = {
  confirmed: { pill: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  scheduled: { pill: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400", bar: "bg-blue-500", dot: "bg-blue-500" },
  cancelled: { pill: "bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-400", bar: "bg-red-500", dot: "bg-red-500" },
  completed: { pill: "bg-gray-500/10 text-gray-700 border-gray-400/25 dark:text-gray-400", bar: "bg-gray-400", dot: "bg-gray-400" },
  "no-show": { pill: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400", bar: "bg-amber-500", dot: "bg-amber-500" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.scheduled;
}

function formatDateLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentClass: string;
  iconBgClass: string;
  iconColorClass: string;
  sublabel?: string;
  loading?: boolean;
}

function StatCard({ label, value, icon, accentClass, iconBgClass, iconColorClass, sublabel, loading }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card px-4 py-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80">
      {/* Top accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.75 rounded-t-xl", accentClass)} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-3xl font-bold tabular-nums leading-none">{value.toLocaleString()}</p>
          )}
          {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        <div className={cn("mt-0.5 shrink-0 rounded-lg p-2 transition-colors group-hover:scale-105", iconBgClass)}>
          <span className={iconColorClass}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming appointment card ────────────────────────────────────────────────

function UpcomingAppointmentCard({ appointment, onClick }: { appointment: any; onClick: () => void }) {
  const start = new Date(appointment.startTime);
  const style = getStatusStyle(appointment.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group relative flex cursor-pointer gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Left status bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", style.bar)} />

      {/* Time column */}
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-muted/60 px-2 py-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {formatDateLabel(start)}
        </span>
        <span className="mt-0.5 text-base font-bold tabular-nums leading-none">
          {format(start, "h:mm")}
        </span>
        <span className="text-[10px] text-muted-foreground">{format(start, "a")}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold leading-tight line-clamp-1 pr-1">{appointment.title}</h4>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide border", style.pill)}
          >
            {appointment.status}
          </Badge>
        </div>

        {appointment.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{appointment.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(start, "EEEE, MMM d, yyyy")}
          </span>
          {appointment.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1 max-w-37.5">{appointment.location}</span>
            </span>
          )}
          {appointment.entryType && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium capitalize">
              {appointment.entryType.replace("-", " ")}
            </Badge>
          )}
        </div>
      </div>

      <ChevronRight className="mt-1 h-4 w-4 shrink-0 self-start text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </div>
  );
}

// ─── Custom tab bar ───────────────────────────────────────────────────────────

interface CustomTabBarProps {
  value: string;
  onChange: (id: string) => void;
  upcomingCount: number;
  bookedCount: number;
  customerCount: number;
}

function CustomTabBar({ value, onChange, upcomingCount, bookedCount, customerCount }: CustomTabBarProps) {
  const tabs = [
    { id: "leads", label: "Leads", icon: <Mail className="h-3.5 w-3.5" />, count: null },
    { id: "calendar", label: "Calendar", icon: <Calendar className="h-3.5 w-3.5" />, count: null },
    { id: "upcoming", label: "Upcoming", icon: <Clock className="h-3.5 w-3.5" />, count: upcomingCount > 0 ? upcomingCount : null },
    { id: "booked", label: "Booked", icon: <Users className="h-3.5 w-3.5" />, count: bookedCount > 0 ? bookedCount : null },
    { id: "customers", label: "Credentials", icon: <Contact className="h-3.5 w-3.5" />, count: customerCount > 0 ? customerCount : null },
  ];

  return (
    <div className="overflow-x-auto touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-0.5 rounded-xl border bg-muted/50 p-1 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap",
              value === tab.id
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <span className={cn("transition-colors", value === tab.id ? "text-primary" : "")}>{tab.icon}</span>
            {tab.label}
            {tab.count !== null && (
              <span className={cn(
                "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                value === tab.id
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                {tab.count > 99 ? "99+" : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AppointmentSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative flex gap-4 rounded-xl border bg-card p-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-muted animate-pulse" />
          <div className="w-16 h-14 rounded-lg bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-56 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function UpcomingEmpty({ onCreateAppointment }: { onCreateAppointment: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No upcoming appointments</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Schedule your first appointment to keep track of your customer meetings.
        </p>
      </div>
      <Button onClick={onCreateAppointment} size="sm" className="mt-1">
        <Plus className="mr-2 h-4 w-4" />
        Create Appointment
      </Button>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, count }: { title: string; subtitle?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between pb-2">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-xs tabular-nums">
              {count}
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function AppointmentsPageInner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { isFullscreen } = useFullscreen();

  const DRAFT_STORAGE_KEY = "crm-appointment-draft";

  const [activeTab, setActiveTab] = React.useState("leads");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<any>(null);
  const [preselectedDate, setPreselectedDate] = React.useState<Date | undefined>();
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [pendingLeadNav, setPendingLeadNav] = React.useState<LeadNavParams | null>(null);

  const handleLeadNavigate = React.useCallback((params: LeadNavParams) => {
    setActiveTab("leads");
    setPendingLeadNav(params);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      window.history.replaceState({}, "", "/crm/appointments");
      setTimeout(() => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); }, 1000);
    }
    if (params.get("calendar") === "connected") window.history.replaceState({}, "", "/crm/appointments");
    if (params.get("calendar_error")) window.history.replaceState({}, "", "/crm/appointments");
    const tabParam = params.get("tab");
    if (tabParam && TAB_OPTIONS.some((t) => t.id === tabParam)) setActiveTab(tabParam);
  }, [queryClient]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as any;
      const leadId = draft?.meta?.extraPayload?.leadId;
      if (draft?.resume && !leadId) {
        setCreateModalOpen(true);
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, resume: false }));
      }
    } catch { /* ignore */ }
  }, []);

  const getAuthHeaders = async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const { data: globalAppointments = [], isLoading: isGlobalLoading, refetch: refetchGlobal } = useQuery({
    queryKey: ["appointments", "global"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await apiClient.get("/api/crm/calendar/appointments", { ...headers, params: { limit: 500 } });
        const data = response.data?.data || response.data;
        if (Array.isArray(data)) return data;
        return data.appointments || [];
      } catch { return []; }
    },
    staleTime: 30_000,
  });

  const { data: calendarAppointments = [], isLoading: isCalendarLoading, refetch: refetchCalendar } = useQuery({
    queryKey: ["appointments", "calendar", currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const response = await apiClient.get("/api/crm/calendar/appointments", {
          ...headers,
          params: { startDate: start.toISOString(), endDate: end.toISOString(), limit: 200 },
        });
        const data = response.data?.data || response.data;
        if (Array.isArray(data)) return data;
        return data.appointments || [];
      } catch { return []; }
    },
    staleTime: 60_000,
  });

  const { data: customerBookingsCount = 0 } = useQuery({
    queryKey: ["customer-bookings-count"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await apiClient.get("/api/appointments/customer-bookings/list", headers);
        const data = response.data?.data || response.data;
        return data.appointments?.length || 0;
      } catch { return 0; }
    },
  });

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["customers-count"],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await apiClient.get("/api/customers/stats", headers);
        return res.data?.data?.total ?? 0;
      } catch { return 0; }
    },
    staleTime: 60_000,
  });

  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      total: globalAppointments.length,
      upcoming: globalAppointments.filter((apt: any) => {
        const start = new Date(apt.startTime);
        return start >= today && !["cancelled", "completed", "no-show"].includes(apt.status);
      }).length,
      today: globalAppointments.filter((apt: any) => {
        const start = new Date(apt.startTime);
        return start >= today && start < tomorrow && !["cancelled", "completed", "no-show"].includes(apt.status);
      }).length,
      cancelled: globalAppointments.filter((apt: any) => apt.status === "cancelled").length,
    };
  }, [globalAppointments]);

  const upcomingAppointments = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return globalAppointments
      .filter((apt: any) => {
        const start = new Date(apt.startTime);
        return start >= today && !["cancelled", "completed", "no-show"].includes(apt.status);
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 20);
  }, [globalAppointments]);

  const handleCreateAppointment = React.useCallback(() => {
    setPreselectedDate(undefined);
    setCreateModalOpen(true);
  }, []);

  const handleDateClick = React.useCallback((date?: Date) => {
    setPreselectedDate(date);
    setCreateModalOpen(true);
  }, []);

  const handleSyncComplete = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ]);
  }, [refetchGlobal, refetchCalendar, queryClient]);

  const handleAppointmentClick = React.useCallback((appointment: any) => {
    setSelectedAppointment(appointment);
    setDetailsModalOpen(true);
  }, []);

  const handleUpdateAppointment = React.useCallback(async (id: string, data: any) => {
    const headers = await getAuthHeaders();
    await apiClient.put(`/api/crm/calendar/appointments/${id}`, data, headers);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ]);
  }, [refetchGlobal, refetchCalendar, queryClient]);

  const handleCancelAppointment = React.useCallback(async (id: string) => {
    const headers = await getAuthHeaders();
    await apiClient.post(`/api/crm/calendar/appointments/${id}/cancel`, {}, headers);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ]);
  }, [refetchGlobal, refetchCalendar, queryClient]);

  const handleDeleteAppointment = React.useCallback(async (id: string) => {
    const headers = await getAuthHeaders();
    await apiClient.delete(`/api/crm/calendar/appointments/${id}`, headers);
    setDetailsModalOpen(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
      refetchGlobal(),
      refetchCalendar(),
    ]);
  }, [refetchGlobal, refetchCalendar, queryClient]);

  const handleCreateAppointmentSubmit = React.useCallback(async (data: any) => {
    const headers = await getAuthHeaders();
    await apiClient.post("/api/crm/calendar/appointments", data, headers);
    await Promise.all([
      refetchGlobal(),
      refetchCalendar(),
      queryClient.invalidateQueries({ queryKey: ["customer-bookings-count"] }),
    ]);
  }, [refetchGlobal, refetchCalendar, queryClient]);

  // Used by MultiPaneContainer in fullscreen mode
  const renderTabContent = React.useCallback(
    (tabId: string) => {
      switch (tabId) {
        case "leads":
          return (
            <div className="h-full">
              <LeadsTab pendingNav={pendingLeadNav} onNavConsumed={() => setPendingLeadNav(null)} />
            </div>
          );
        case "calendar":
          return (
            <div className="p-4">
              {!isCalendarLoading ? (
                <AppointmentCalendar
                  appointments={calendarAppointments}
                  viewDate={currentMonth}
                  onViewDateChange={setCurrentMonth}
                  onCreateAppointment={handleDateClick}
                  onSelectAppointment={handleAppointmentClick}
                />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          );
        case "upcoming":
          return (
            <div className="p-4 space-y-3">
              {isGlobalLoading ? (
                <AppointmentSkeleton />
              ) : upcomingAppointments.length === 0 ? (
                <UpcomingEmpty onCreateAppointment={handleCreateAppointment} />
              ) : (
                upcomingAppointments.map((apt: any) => (
                  <UpcomingAppointmentCard
                    key={apt._id}
                    appointment={apt}
                    onClick={() => handleAppointmentClick(apt)}
                  />
                ))
              )}
            </div>
          );
        case "booked":
          return <div className="p-4"><BookedTab /></div>;
        case "customers":
          return (
            <div className="p-4 h-full">
              <CustomerCredentialsTab onLeadNavigate={handleLeadNavigate} />
            </div>
          );
        default:
          return (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground/30 py-16">
              Unknown tab: {tabId}
            </div>
          );
      }
    },
    [calendarAppointments, isCalendarLoading, upcomingAppointments, isGlobalLoading,
      handleCreateAppointment, handleDateClick, handleAppointmentClick, currentMonth,
      pendingLeadNav, handleLeadNavigate]
  );

  // ── Normal mode header ──────────────────────────────────────────────────────

  const normalHeader = (
    <div className="overflow-x-hidden md:flex md:items-start md:justify-between md:gap-6">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/dashboard")}
            className="h-8 w-8 shrink-0 rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 p-0 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Appointments</h1>
              {(isGlobalLoading || isCalendarLoading) && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Manage leads, events, and customer records
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex w-full flex-wrap items-center gap-2 md:mt-0 md:w-auto md:justify-end md:self-start">
        <PaneToolbar tabOptions={TAB_OPTIONS} />
        <CrmCalendarSyncButton onSyncComplete={handleSyncComplete} compactOnMobile />
        <Button
          type="button"
          size="sm"
          onClick={handleCreateAppointment}
          aria-label="Create appointment"
          className="bg-primary hover:bg-primary/90 gap-1.5 px-3 sm:px-4"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Appointment</span>
        </Button>
      </div>
    </div>
  );

  // ── Fullscreen header ───────────────────────────────────────────────────────

  const fullscreenHeader = (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-card shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/crm/dashboard")}
          className="h-8 w-8 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 p-0 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Appointments</h1>
      </div>
      <div className="flex items-center gap-2">
        <PaneToolbar tabOptions={TAB_OPTIONS} />
        <CrmCalendarSyncButton onSyncComplete={handleSyncComplete} />
        <Button type="button" onClick={handleCreateAppointment} size="sm" className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Appointment
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <FullscreenWrapper>
        <div className={isFullscreen
          ? "flex flex-col h-full overflow-hidden"
          : "container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
        }>
          {isFullscreen ? fullscreenHeader : normalHeader}

          {isFullscreen ? (
            <div className="flex-1 overflow-hidden">
              <MultiPaneContainer tabOptions={TAB_OPTIONS} renderTab={renderTabContent} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Calendar connect banner */}
              <CrmCalendarConnect />

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                  label="Total"
                  value={stats.total}
                  icon={<Calendar className="h-4 w-4" />}
                  accentClass="bg-primary"
                  iconBgClass="bg-primary/10"
                  iconColorClass="text-primary"
                  sublabel="All appointments"
                  loading={isGlobalLoading}
                />
                <StatCard
                  label="Today"
                  value={stats.today}
                  icon={<Clock className="h-4 w-4" />}
                  accentClass="bg-blue-500"
                  iconBgClass="bg-blue-500/10"
                  iconColorClass="text-blue-600 dark:text-blue-400"
                  sublabel="Scheduled today"
                  loading={isGlobalLoading}
                />
                <StatCard
                  label="Upcoming"
                  value={stats.upcoming}
                  icon={<TrendingUp className="h-4 w-4" />}
                  accentClass="bg-violet-500"
                  iconBgClass="bg-violet-500/10"
                  iconColorClass="text-violet-600 dark:text-violet-400"
                  sublabel="Active pipeline"
                  loading={isGlobalLoading}
                />
                <StatCard
                  label="Cust. Bookings"
                  value={customerBookingsCount}
                  icon={<Users className="h-4 w-4" />}
                  accentClass="bg-amber-500"
                  iconBgClass="bg-amber-500/10"
                  iconColorClass="text-amber-600 dark:text-amber-400"
                  sublabel="By customers"
                />
                {/* Last card: spans 2 cols on mobile so it doesn't sit alone in a half-row */}
                <div className="col-span-2 sm:col-span-1">
                  <StatCard
                    label="Customers"
                    value={customerCount}
                    icon={<Contact className="h-4 w-4" />}
                    accentClass="bg-teal-500"
                    iconBgClass="bg-teal-500/10"
                    iconColorClass="text-teal-600 dark:text-teal-400"
                    sublabel="In database"
                  />
                </div>
              </div>

              {/* Custom tab navigation */}
              <CustomTabBar
                value={activeTab}
                onChange={setActiveTab}
                upcomingCount={stats.upcoming}
                bookedCount={customerBookingsCount}
                customerCount={customerCount}
              />

              {/* Tab content */}
              <div className="min-h-0">
                {activeTab === "leads" && (
                  <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm min-h-[650px] h-[75vh]">
                    <LeadsTab
                      pendingNav={pendingLeadNav}
                      onNavConsumed={() => setPendingLeadNav(null)}
                    />
                  </div>
                )}

                {activeTab === "calendar" && (
                  <>
                    {!isCalendarLoading ? (
                      <AppointmentCalendar
                        appointments={calendarAppointments}
                        viewDate={currentMonth}
                        onViewDateChange={setCurrentMonth}
                        onCreateAppointment={handleDateClick}
                        onSelectAppointment={handleAppointmentClick}
                      />
                    ) : (
                      <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <RefreshCw className="h-8 w-8 animate-spin" />
                          <span className="text-sm">Loading calendar…</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "upcoming" && (
                  <div className="space-y-3">
                    <SectionHeader
                      title="Upcoming Appointments"
                      subtitle="Sorted by earliest date"
                      count={stats.upcoming}
                    />
                    {isGlobalLoading ? (
                      <AppointmentSkeleton />
                    ) : upcomingAppointments.length === 0 ? (
                      <UpcomingEmpty onCreateAppointment={handleCreateAppointment} />
                    ) : (
                      upcomingAppointments.map((apt: any) => (
                        <UpcomingAppointmentCard
                          key={apt._id}
                          appointment={apt}
                          onClick={() => handleAppointmentClick(apt)}
                        />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "booked" && <BookedTab />}

                {activeTab === "customers" && (
                  <CustomerCredentialsTab onLeadNavigate={handleLeadNavigate} />
                )}
              </div>
            </div>
          )}
        </div>
      </FullscreenWrapper>

      {/* Modals */}
      <CreateAppointmentModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setPreselectedDate(undefined);
        }}
        onCreateAppointment={handleCreateAppointmentSubmit}
        conversations={[]}
        preselectedDate={preselectedDate}
      />
      {selectedAppointment && (
        <AppointmentDetailsModal
          open={detailsModalOpen}
          onOpenChange={(open) => {
            setDetailsModalOpen(open);
            if (!open) setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onUpdate={handleUpdateAppointment}
          onDelete={handleDeleteAppointment}
          onCancel={handleCancelAppointment}
        />
      )}
    </>
  );
}

// ─── Exported page ────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  return (
    <TooltipProvider>
      <FullscreenProvider defaultTab="leads">
        <AppointmentsPageInner />
      </FullscreenProvider>
    </TooltipProvider>
  );
}
