"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CarFront,
  Pencil,
  Trash2,
  LifeBuoy,
  CreditCard,
  Wrench,
  Package,
  MessageCircle,
  LayoutDashboard,
  Plus,
  Heart,
  Bell,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  BellRing,
  GaugeCircle,
  ClipboardList,
  MapPin,
  Zap,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { initializeSocket, getSocket } from "@/lib/socket.client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, resolveImageUrl } from "@/lib/utils";
import { fetchOwnedVehicles, OwnedVehicle, deleteVehicle } from "@/lib/api/vehicles";
import { fetchServiceHistory } from "@/lib/api/services";
import { fetchSavedVehicles } from "@/lib/api/savedVehicles";
import { apiClient } from "@/lib/api-client";
import { useUser, useAuth } from "@/providers/AuthProvider";
import { useProfileContext } from "@/context/ProfileContext";
import { useNotifications } from "@/context/NotificationContext";
import { useTheme } from "@/context/ThemeContext";
import { LogServiceModal } from "@/components/customer/LogServiceModal";
import { UpdateMileageModal } from "@/components/customer/UpdateMileageModal";
import { AddVehicleModal } from "@/components/customer/AddVehicleModal";
import { EditVehicleModal } from "@/components/customer/EditVehicleModal";
import { BookServiceModal } from "@/components/customer/BookServiceModal";
import { MembershipCardModal } from "@/components/customer/MembershipCardModal";
import { ServiceStatusTracker } from "@/components/customer/ServiceStatusTracker";

const calculateServiceProgress = (current: number, nextDue: number) => {
  if (!nextDue || nextDue <= current) return 100;
  const interval = Math.min(5000, nextDue);
  const base = nextDue - interval;
  return Math.max(0, Math.min(((current - base) / interval) * 100, 100));
};

function buildVehiclePhotoFallback(vehicle: Pick<OwnedVehicle, "year" | "make" | "model">) {
  const query = encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model} car`);
  return `https://source.unsplash.com/featured/1600x900/?${query}`;
}

function getVehicleImageSrc(vehicle: OwnedVehicle) {
  const rawCandidates = [vehicle.images?.[0], (vehicle as any).imageUrl, (vehicle as any).image];
  for (const candidate of rawCandidates) {
    const resolved = resolveImageUrl(candidate);
    if (resolved) return resolved;
  }
  return buildVehiclePhotoFallback(vehicle);
}

function GarageVehicleImage({ vehicle }: { vehicle: OwnedVehicle }) {
  const initialSrc = React.useMemo(() => getVehicleImageSrc(vehicle), [vehicle]);
  const placeholderSrc = React.useMemo(() => buildVehiclePhotoFallback(vehicle), [vehicle]);
  const [src, setSrc] = React.useState(initialSrc);
  const [fallbackTried, setFallbackTried] = React.useState(false);
  React.useEffect(() => { setSrc(initialSrc); }, [initialSrc]);
  return (
    <img
      src={src}
      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity duration-500"
      onError={() => {
        if (!fallbackTried) { setFallbackTried(true); setSrc(placeholderSrc); return; }
        setSrc("/placeholder-avatar.png");
      }}
    />
  );
}

function getVehicleId(vehicle: OwnedVehicle | null | undefined) {
  return vehicle?.id || vehicle?._id || "";
}

const SERVICE_TYPE_COLORS: Record<string, string> = {
  OIL_CHANGE: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  TIRES: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  BRAKES: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  INSPECTION: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  OTHER: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
};

export default function CustomerDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { avatarUrl } = useProfileContext();
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const { theme } = useTheme();

  // Initialize socket and listen for real-time appointment + service updates
  React.useEffect(() => {
    let cleanup: (() => void) | null = null;

    getToken().then((token) => {
      if (!token) return;
      const socket = initializeSocket(token);

      const onAppointmentStatusUpdated = () => {
        queryClient.invalidateQueries({ queryKey: ['appointments', 'service'] });
      };
      const onServiceCheckedIn = (data: { vehicleId: string }) => {
        if (data?.vehicleId) {
          queryClient.invalidateQueries({ queryKey: ['activeService', data.vehicleId] });
        }
      };

      socket.on('appointment:status_updated', onAppointmentStatusUpdated);
      socket.on('service:checked_in', onServiceCheckedIn);

      cleanup = () => {
        socket.off('appointment:status_updated', onAppointmentStatusUpdated);
        socket.off('service:checked_in', onServiceCheckedIn);
      };
    });

    return () => { cleanup?.(); };
  }, [getToken, queryClient]);

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchOwnedVehicles,
  });

  const { data: savedVehicles = [] } = useQuery({
    queryKey: ["savedVehicles"],
    queryFn: fetchSavedVehicles,
  });

  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["appointments", "service"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/api/appointments", { params: { entryType: "appointment", includeCustomerBookings: "true", limit: 20 } });
        const d = res.data?.data || res.data;
        const all: any[] = d?.appointments || d || [];
        return all.filter((a: any) => a.type === "service");
      } catch { return []; }
    },
    refetchInterval: 30_000,
  });

  const { data: pendingPayments } = useQuery({
    queryKey: ["payments", "pending-count"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/api/payments", { params: { status: "pending", limit: 1 } });
        const d = res.data?.data || res.data;
        return d?.pagination?.total ?? (Array.isArray(d?.invoices) ? d.invoices.length : 0);
      } catch { return 0; }
    },
  });

  const [selectedVehicle, setSelectedVehicle] = React.useState<OwnedVehicle | null>(null);
  const [historyVehicleId, setHistoryVehicleId] = React.useState<string>("");
  const [isLogServiceOpen, setIsLogServiceOpen] = React.useState(false);
  const [isUpdateMileageOpen, setIsUpdateMileageOpen] = React.useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = React.useState(false);
  const [isMembershipCardOpen, setIsMembershipCardOpen] = React.useState(false);
  const [isBookServiceOpen, setIsBookServiceOpen] = React.useState(false);
  const [serviceVehicle, setServiceVehicle] = React.useState<OwnedVehicle | null>(null);

  React.useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;
    if (!selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
      if (!historyVehicleId) setHistoryVehicleId(vehicles[0].id || vehicles[0]._id);
      return;
    }
    const selectedId = getVehicleId(selectedVehicle);
    const stillExists = vehicles.some((v) => getVehicleId(v) === selectedId);
    if (!stillExists) {
      setSelectedVehicle(vehicles[0]);
      setHistoryVehicleId(vehicles[0].id || vehicles[0]._id);
    }
  }, [vehicles, selectedVehicle, historyVehicleId]);

  const historyVehicle = React.useMemo(
    () => vehicles?.find((v) => (v.id || v._id) === historyVehicleId) ?? vehicles?.[0] ?? null,
    [vehicles, historyVehicleId],
  );

  const { data: serviceHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["serviceHistory", historyVehicle?.id || historyVehicle?._id],
    queryFn: () => fetchServiceHistory(historyVehicle!.id || historyVehicle!._id),
    enabled: !!(historyVehicle?.id || historyVehicle?._id),
  });

  const handleLogService = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsLogServiceOpen(true); };
  const handleUpdateMileage = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsUpdateMileageOpen(true); };
  const handleEditVehicle = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsEditVehicleOpen(true); };
  const handleBookService = (v: OwnedVehicle) => { setServiceVehicle(v); setIsBookServiceOpen(true); };

  const handleDeleteVehicle = async (v: OwnedVehicle) => {
    if (!window.confirm(`Remove your ${v.year} ${v.make} from your garage? This cannot be undone.`)) return;
    try {
      await deleteVehicle(v.id);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      if (selectedVehicle?.id === v.id) setSelectedVehicle(null);
    } catch { }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";
  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || "M";

  const QUICK_ACTIONS = [
    {
      label: "Book Service",
      sub: "Schedule your next visit",
      icon: Wrench,
      action: () => { setServiceVehicle(vehicles?.[0] ?? null); setIsBookServiceOpen(true); },
      className: "border-primary/30 bg-primary/8 dark:bg-primary/12",
      iconCls: "bg-primary/15 text-primary",
    },
    {
      label: "Shop Vehicles",
      sub: "Browse inventory",
      icon: CarFront,
      href: "/customer/shop",
      className: "border-amber-500/20 bg-amber-500/6 dark:bg-amber-500/8",
      iconCls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Aftermarket",
      sub: "Parts & upgrades",
      icon: Package,
      href: "/customer/aftermarket",
      className: "border-purple-500/20 bg-purple-500/6 dark:bg-purple-500/8",
      iconCls: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    },
    {
      label: "Support",
      sub: "Get help",
      icon: MessageCircle,
      href: "/customer/support",
      className: "border-border/40 bg-muted/40",
      iconCls: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div
      data-theme={theme}
      style={{ colorScheme: theme }}
      className="min-h-full bg-background space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-6">
        {/* Tab header row */}
        <div className="flex items-center justify-between gap-3">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-default select-none">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
                    Member Portal
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase leading-none mt-0.5">
                    Dashboard
                  </h2>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] p-3" sideOffset={8}>
                <div className="flex items-center gap-1.5 mb-1">
                  <LayoutDashboard className="h-3 w-3 text-primary shrink-0" />
                  <p className="text-[11px] font-bold">Member Portal</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your personal command center — manage vehicles, track service history, and access all member features.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsMembershipCardOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl font-semibold h-9 border-green-600/40 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">My Card</span>
            </Button>
            <Button
              onClick={() => setIsAddVehicleOpen(true)}
              size="sm"
              className="gap-1.5 rounded-xl font-semibold h-9"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Vehicle</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <TabsList className="flex w-full sm:w-fit gap-1 rounded-2xl border border-border/50 bg-muted/40 p-1 h-auto dark:bg-zinc-900/60 dark:border-zinc-800">
          <TabsTrigger
            value="overview"
            className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="vehicles"
            className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            <CarFront className="h-3.5 w-3.5" />
            <span>
              <span className="hidden xs:inline">My </span>Vehicles
            </span>
            {vehicles && vehicles.length > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-black px-1">
                {vehicles.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Service </span>Log
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB 1 — OVERVIEW                                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          {/* Welcome card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-primary/20" />
            <div className="absolute right-0 top-0 h-full w-2/5 bg-linear-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {greeting}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase leading-tight mt-0.5">
                    {firstName}
                    <span className="text-primary">.</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Here&apos;s your account at a glance
                  </p>
                </div>
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
                  <AvatarImage src={resolveImageUrl(avatarUrl !== null ? avatarUrl : user?.imageUrl) ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-base">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="mt-4 pt-3.5 border-t border-border/30 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Link href="/customer" className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors">
                  <CarFront className="h-3.5 w-3.5 text-primary/60" />
                  {vehicles?.length ?? 0} <span className="text-muted-foreground font-normal">vehicles</span>
                </Link>
                <span className="text-border/80 text-xs">·</span>
                <Link href="/customer/saved" className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  {(savedVehicles as any[]).length} <span className="text-muted-foreground font-normal">saved</span>
                </Link>
                {unreadCount > 0 && (
                  <>
                    <span className="text-border/80 text-xs">·</span>
                    <Link href="/customer/notifications" className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-black">
                        {unreadCount}
                      </span>
                      new alert{unreadCount !== 1 ? "s" : ""}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: CarFront, label: "Vehicles", value: vehicles?.length ?? 0, href: "/customer", ring: "ring-primary/20", iconBg: "bg-primary/10", iconCl: "text-primary" },
              { icon: Heart, label: "Wishlist", value: (savedVehicles as any[]).length, href: "/customer/saved", ring: "ring-rose-400/20", iconBg: "bg-rose-500/10", iconCl: "text-rose-500" },
              { icon: Bell, label: "Alerts", value: unreadCount, href: "/customer/notifications", ring: "ring-amber-400/20", iconBg: "bg-amber-500/10", iconCl: "text-amber-500" },
              { icon: CreditCard, label: "Payments Due", value: pendingPayments ?? 0, href: "/customer/payments", ring: "ring-emerald-400/20", iconBg: "bg-emerald-500/10", iconCl: "text-emerald-500" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <div className={cn(
                  "group rounded-2xl border border-border/40 bg-card p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer",
                  "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 dark:bg-zinc-900/60",
                )}>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl ring-1", stat.iconBg, stat.ring)}>
                    <stat.icon className={cn("h-4 w-4", stat.iconCl)} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground tabular-nums leading-none">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 self-end -mt-1 group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((item) => {
              const inner = (
                <div className={cn(
                  "group relative flex items-center gap-3 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  item.className,
                )}>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", item.iconCls)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground leading-none">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 ml-auto group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </div>
              );
              return "href" in item && item.href ? (
                <Link key={item.label} href={item.href}>{inner}</Link>
              ) : (
                <button key={item.label} onClick={(item as any).action} className="text-left">{inner}</button>
              );
            })}
          </div>

          {/* Appointments + Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Upcoming Appointments */}
            <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Appointments</p>
                </div>
                <button
                  onClick={() => { setServiceVehicle(vehicles?.[0] ?? null); setIsBookServiceOpen(true); }}
                  className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5"
                >
                  Book new <Plus className="h-3 w-3" />
                </button>
              </div>
              {(upcomingAppointments as any[]).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-5 text-center">
                  <Calendar className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No upcoming appointments</p>
                  <button
                    onClick={() => { setServiceVehicle(vehicles?.[0] ?? null); setIsBookServiceOpen(true); }}
                    className="mt-2 text-xs text-primary font-semibold hover:underline"
                  >
                    Schedule one now →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(upcomingAppointments as any[]).map((appt: any, idx: number) => {
                    const s = appt.status ?? "scheduled";
                    const statusCls: Record<string, string> = {
                      scheduled: "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-900/20 dark:border-amber-700/40",
                      confirmed: "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-900/20 dark:border-emerald-700/40",
                      completed: "bg-zinc-100 text-zinc-500 border-zinc-200/60 dark:bg-zinc-800/40 dark:border-zinc-700/40",
                      cancelled: "bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-900/20 dark:border-rose-700/40",
                      "no-show": "bg-orange-50 text-orange-600 border-orange-200/60 dark:bg-orange-900/20 dark:border-orange-700/40",
                    };
                    const flowSteps = ["scheduled", "confirmed", "completed"];
                    const flowIdx = flowSteps.indexOf(s);
                    const isTerminal = s === "cancelled" || s === "no-show";
                    const statusLabel = s === "no-show" ? "No Show" : s === "confirmed" ? "On Queue" : s.charAt(0).toUpperCase() + s.slice(1);
                    return (
                    <div
                      key={appt._id || appt.id || idx}
                      className="rounded-xl border border-border/30 bg-muted/30 hover:border-primary/20 transition-colors dark:bg-zinc-800/40 overflow-hidden"
                    >
                      {/* Top row — date, title, status badge */}
                      <div className="flex items-center gap-3 p-3">
                        <div className="flex flex-col items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shrink-0 text-center">
                          <span className="text-[10px] font-bold text-primary uppercase leading-none">
                            {appt.startTime ? new Date(appt.startTime).toLocaleDateString(undefined, { month: "short" }) : "—"}
                          </span>
                          <span className="text-base font-black text-primary leading-none">
                            {appt.startTime ? new Date(appt.startTime).getDate() : "—"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate leading-snug">
                            {appt.title || "Service Appointment"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {appt.startTime ? new Date(appt.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                        <span className={cn(
                          "shrink-0 text-[10px] font-bold rounded-full border px-2 py-0.5",
                          statusCls[s] ?? statusCls.scheduled
                        )}>
                          {statusLabel}
                        </span>
                      </div>
                      {/* Status flow stepper */}
                      <div className="flex items-center gap-1 px-3 pb-2.5 border-t border-border/20 pt-2">
                        {isTerminal ? (
                          <span className={cn("text-[10px] font-bold rounded-full border px-2 py-0.5", statusCls[s])}>
                            ⊘ {statusLabel}
                          </span>
                        ) : flowSteps.map((step, i) => {
                          const isDone = i < flowIdx;
                          const isCurrent = i === flowIdx;
                          const stepLabel = step === "confirmed" ? "On Queue" : step.charAt(0).toUpperCase() + step.slice(1);
                          return (
                            <React.Fragment key={step}>
                              <span className={cn(
                                "flex items-center gap-0.5 text-[10px] font-bold rounded-full border px-2 py-0.5",
                                isDone
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                  : isCurrent
                                  ? statusCls[s]
                                  : "text-zinc-400 border-zinc-200 dark:border-zinc-700/50"
                              )}>
                                {isDone && <span className="text-[9px]">✓</span>}
                                {stepLabel}
                              </span>
                              {i < flowSteps.length - 1 && (
                                <div className={cn("flex-1 h-px", isDone ? "bg-emerald-300/60 dark:bg-emerald-700/40" : "bg-border/30")} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Notifications */}
            <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-xl", unreadCount > 0 ? "bg-amber-500/10" : "bg-muted")}>
                    <Bell className={cn("h-3.5 w-3.5", unreadCount > 0 ? "text-amber-500" : "text-muted-foreground")} />
                  </div>
                  <p className="text-sm font-bold text-foreground">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-black px-1">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <Link href="/customer/notifications" className="text-[11px] text-primary font-semibold hover:underline">
                  View all →
                </Link>
              </div>
              {notifications.slice(0, 3).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-5 text-center">
                  <Bell className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 3).map((notif) => (
                    <button
                      key={notif._id}
                      onClick={() => markAsRead(notif._id)}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150",
                        notif.isRead
                          ? "border-border/30 bg-muted/20 hover:bg-muted/30"
                          : "border-primary/15 bg-primary/5 hover:bg-primary/8 dark:border-primary/20 dark:bg-primary/8",
                      )}
                    >
                      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl mt-0.5", notif.isRead ? "bg-muted" : "bg-primary/15")}>
                        <Bell className={cn("h-3.5 w-3.5", notif.isRead ? "text-muted-foreground" : "text-primary")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs leading-snug truncate", notif.isRead ? "font-medium text-foreground/80" : "font-bold text-foreground")}>
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{notif.message}</p>
                      </div>
                      {!notif.isRead && <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Wishlist carousel */}
          <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10">
                  <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                </div>
                <p className="text-sm font-bold text-foreground">Wishlist</p>
                {(savedVehicles as any[]).length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-medium">{(savedVehicles as any[]).length} saved</span>
                )}
              </div>
              <Link href="/customer/saved" className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {(savedVehicles as any[]).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-5 text-center">
                <Heart className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">Your wishlist is empty</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Heart vehicles in the shop to save them here.</p>
                <Link href="/customer/shop">
                  <Button variant="outline" size="sm" className="mt-3 h-7 text-xs rounded-xl gap-1.5">
                    <CarFront className="h-3 w-3" /> Browse Shop
                  </Button>
                </Link>
              </div>
            ) : (
              <div
                className="flex gap-3 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {(savedVehicles as any[]).slice(0, 8).map((v: any) => (
                  <Link
                    key={v.id || v._id}
                    href="/customer/saved"
                    className="group shrink-0 w-36 rounded-2xl border border-border/40 bg-background overflow-hidden hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-zinc-800/60"
                  >
                    <div className="relative h-20 bg-muted overflow-hidden">
                      {(v.image || v.images?.[0]) ? (
                        <img
                          src={resolveImageUrl(v.image || v.images?.[0]) || ""}
                          alt={`${v.year} ${v.make} ${v.model}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <CarFront className="h-7 w-7 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                      {v.price && (
                        <span className="absolute bottom-1.5 left-1.5 text-[10px] font-black text-white bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                          ${Number(v.price).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-foreground truncate leading-snug">{v.year} {v.make}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{v.model}</p>
                    </div>
                  </Link>
                ))}
                <Link
                  href="/customer/saved"
                  className="shrink-0 w-36 rounded-2xl border border-dashed border-primary/30 bg-primary/5 dark:bg-primary/8 flex flex-col items-center justify-center gap-1.5 p-3 hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                  <p className="text-[11px] font-bold text-primary text-center leading-snug">View All Saved</p>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB 2 — MY VEHICLES                                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <TabsContent value="vehicles" className="mt-0 space-y-5">
          {isLoadingVehicles ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse dark:bg-zinc-900" />
              ))}
            </div>
          ) : !vehicles || vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CarFront className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">No Vehicles Yet</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Your vehicle hasn&apos;t been synced yet, or you haven&apos;t added one.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" className="rounded-xl gap-1.5">
                  <Link href="/customer/support">
                    <LifeBuoy className="h-3.5 w-3.5" /> Contact Support
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsAddVehicleOpen(true)} className="rounded-xl gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <>
              {vehicles.map((vehicle) => {
                const vehicleId = getVehicleId(vehicle);
                const estimatedNext = vehicle.currentMileage + 3000;
                const svcProgress = calculateServiceProgress(vehicle.currentMileage, estimatedNext);
                const dueSoon = svcProgress > 80;

                return (
                  <div key={vehicleId} className="space-y-3">
                    <div className="rounded-2xl overflow-hidden border border-border/40">
                      {/* Cinematic banner */}
                      <div className="relative h-60 sm:h-72 bg-zinc-900 group overflow-hidden">
                        <GarageVehicleImage vehicle={vehicle} />
                        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

                        {/* Top-right action buttons */}
                        <div className="absolute top-3 right-3 flex gap-2 z-10">
                          <button
                            onClick={() => handleEditVehicle(vehicle)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(vehicle)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/70 hover:bg-red-500 backdrop-blur-md border border-red-500/40 text-white transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Vehicle identity */}
                        <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-zinc-300 font-medium tracking-widest uppercase drop-shadow-md text-xs">
                                Active Vehicle
                              </p>
                              {(vehicle as any).source === "DEALERSHIP_TRANSFER" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 backdrop-blur-md">
                                  ✓ Added by{(vehicle as any).dealershipName ? ` ${(vehicle as any).dealershipName}` : " dealership"}
                                </span>
                              )}
                            </div>
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-xl">
                              {vehicle.year} {vehicle.make}
                            </h2>
                            <p className="text-xl text-zinc-200 font-medium mt-1 drop-shadow-md">
                              {vehicle.model}{vehicle.trim ? ` · ${vehicle.trim}` : ""}
                            </p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:text-right shrink-0">
                            <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-1">VIN</p>
                            <p className="text-zinc-100 font-mono text-sm tracking-wider">{vehicle.vin}</p>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle health + actions */}
                      <div className="bg-card dark:bg-zinc-900/60 grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border/30">
                        {/* Health metrics */}
                        <div className="sm:col-span-2 p-4 sm:p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-foreground">Vehicle Health</p>
                            <div className={cn(
                              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                              dueSoon
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                            )}>
                              {dueSoon ? <BellRing className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                              {dueSoon ? "Service Soon" : "Good Standing"}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <GaugeCircle className="h-3.5 w-3.5" />
                                Current mileage
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground tabular-nums">
                                  {vehicle.currentMileage.toLocaleString()} mi
                                </span>
                                <button
                                  onClick={() => handleUpdateMileage(vehicle)}
                                  className="text-[10px] text-primary font-semibold hover:underline"
                                >
                                  Update
                                </button>
                              </div>
                            </div>
                            <Progress value={svcProgress} className="h-2 rounded-full" />
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              Next service ~{estimatedNext.toLocaleString()} mi
                            </p>
                          </div>
                          {vehicle.licensePlate && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{vehicle.licensePlate}</span>
                              <span>·</span>
                              <span>{vehicle.color || "—"}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick actions */}
                        <div className="p-3 sm:p-5 grid grid-cols-3 sm:flex sm:flex-col gap-1.5 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 rounded-xl font-semibold text-xs gap-1 sm:gap-1.5 border-border/50"
                            onClick={() => handleLogService(vehicle)}
                          >
                            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden xxs:inline sm:hidden">Log</span>
                            <span className="hidden sm:inline">Log Service</span>
                          </Button>
                          <Button
                            size="sm"
                            className="w-full h-9 rounded-xl font-semibold text-xs gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => { window.location.href = "/customer/network"; }}
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden xxs:inline sm:hidden">Find</span>
                            <span className="hidden sm:inline">Find Shop</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 rounded-xl font-semibold text-xs gap-1 sm:gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => handleBookService(vehicle)}
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden xxs:inline">Book</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Live service status tracker */}
                    <ServiceStatusTracker
                      vehicleId={vehicleId}
                      vehicleLabel={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    />
                  </div>
                );
              })}

              {/* Upcoming service appointments */}
              {(upcomingAppointments as any[]).length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
                  <div className="flex items-center gap-2 mb-3.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Scheduled Appointments</p>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {(upcomingAppointments as any[]).length} upcoming
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(upcomingAppointments as any[]).map((appt: any, idx: number) => {
                      const s = appt.status ?? "scheduled";
                      const statusCls: Record<string, string> = {
                        scheduled: "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-900/20 dark:border-amber-700/40",
                        confirmed: "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-900/20 dark:border-emerald-700/40",
                        completed: "bg-zinc-100 text-zinc-500 border-zinc-200/60 dark:bg-zinc-800/40 dark:border-zinc-700/40",
                        cancelled: "bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-900/20 dark:border-rose-700/40",
                        "no-show": "bg-orange-50 text-orange-600 border-orange-200/60 dark:bg-orange-900/20 dark:border-orange-700/40",
                      };
                      const flowSteps = ["scheduled", "confirmed", "completed"];
                      const flowIdx = flowSteps.indexOf(s);
                      const isTerminal = s === "cancelled" || s === "no-show";
                      const statusLabel = s === "no-show" ? "No Show" : s === "confirmed" ? "On Queue" : s.charAt(0).toUpperCase() + s.slice(1);
                      return (
                        <div
                          key={appt._id || appt.id || idx}
                          className="rounded-xl border border-border/30 bg-muted/30 hover:border-primary/20 transition-colors dark:bg-zinc-800/40 overflow-hidden"
                        >
                          <div className="flex items-center gap-3 p-3">
                            <div className="flex flex-col items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shrink-0 text-center">
                              <span className="text-[10px] font-bold text-primary uppercase leading-none">
                                {appt.startTime ? new Date(appt.startTime).toLocaleDateString(undefined, { month: "short" }) : "—"}
                              </span>
                              <span className="text-base font-black text-primary leading-none">
                                {appt.startTime ? new Date(appt.startTime).getDate() : "—"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate leading-snug">
                                {appt.title || "Service Appointment"}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {appt.startTime ? new Date(appt.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                              </p>
                            </div>
                            <span className={cn("shrink-0 text-[10px] font-bold rounded-full border px-2 py-0.5", statusCls[s] ?? statusCls.scheduled)}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 px-3 pb-2.5 border-t border-border/20 pt-2">
                            {isTerminal ? (
                              <span className={cn("text-[10px] font-bold rounded-full border px-2 py-0.5", statusCls[s])}>
                                ⊘ {statusLabel}
                              </span>
                            ) : flowSteps.map((step, i) => {
                              const isDone = i < flowIdx;
                              const isCurrent = i === flowIdx;
                              const stepLabel = step === "confirmed" ? "On Queue" : step.charAt(0).toUpperCase() + step.slice(1);
                              return (
                                <React.Fragment key={step}>
                                  <span className={cn(
                                    "flex items-center gap-0.5 text-[10px] font-bold rounded-full border px-2 py-0.5",
                                    isDone
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                      : isCurrent
                                      ? statusCls[s]
                                      : "text-zinc-400 border-zinc-200 dark:border-zinc-700/50"
                                  )}>
                                    {isDone && <span className="text-[9px]">✓</span>}
                                    {stepLabel}
                                  </span>
                                  {i < flowSteps.length - 1 && (
                                    <div className={cn("flex-1 h-px", isDone ? "bg-emerald-300/60 dark:bg-emerald-700/40" : "bg-border/30")} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl gap-1.5 h-10 border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
                onClick={() => setIsAddVehicleOpen(true)}
              >
                <Plus className="h-4 w-4" /> Add Another Vehicle
              </Button>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB 3 — SERVICE LOG                                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <TabsContent value="history" className="mt-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground uppercase">Service Log</h2>
              {historyVehicle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {historyVehicle.year} {historyVehicle.make} {historyVehicle.model}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {vehicles && vehicles.length > 1 && (
                <Select value={historyVehicleId} onValueChange={setHistoryVehicleId}>
                  <SelectTrigger className="h-8 w-40 text-xs rounded-xl border-border/50">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id || v._id} value={v.id || v._id} className="text-xs">
                        {v.year} {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {historyVehicle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl gap-1.5 text-xs font-semibold border-border/50 shrink-0"
                  onClick={() => handleLogService(historyVehicle)}
                >
                  <Plus className="h-3.5 w-3.5" /> Log Service
                </Button>
              )}
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse dark:bg-zinc-900" />
              ))}
            </div>
          ) : !serviceHistory || serviceHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Wrench className="h-6 w-6 text-muted-foreground/25" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No service records</p>
                <p className="text-xs text-muted-foreground">Start logging your maintenance history.</p>
              </div>
              {historyVehicle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  onClick={() => handleLogService(historyVehicle)}
                >
                  <Plus className="h-3.5 w-3.5" /> Log First Service
                </Button>
              )}
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline spine */}
              <div className="absolute left-[19px] top-5 bottom-5 w-px bg-border/40 hidden sm:block" />
              {serviceHistory.map((record) => {
                const colorCls = SERVICE_TYPE_COLORS[record.serviceType] ?? SERVICE_TYPE_COLORS.OTHER;
                const date = new Date(record.date);
                return (
                  <div key={record._id} className="flex gap-3 sm:gap-4 items-start">
                    {/* Timeline dot */}
                    <div className={cn(
                      "hidden sm:flex shrink-0 relative z-10 w-10 h-10 rounded-full items-center justify-center border-2 bg-background",
                      colorCls,
                    )}>
                      <Wrench className="h-3.5 w-3.5" />
                    </div>
                    {/* Card */}
                    <div className="flex-1 rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <span className={cn("inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", colorCls)}>
                            {record.serviceType.replace(/_/g, " ")}
                          </span>
                          <p className="text-sm font-bold text-foreground mt-1.5">{record.locationName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-foreground">
                            {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          {record.cost !== undefined && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">${record.cost.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <GaugeCircle className="h-3 w-3" />
                          {record.mileageAtService.toLocaleString()} mi
                        </span>
                      </div>
                      {record.notes && (
                        <p className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Modals ────────────────────────────────────────────────── */}
      <LogServiceModal
        vehicle={selectedVehicle}
        isOpen={isLogServiceOpen}
        onOpenChange={setIsLogServiceOpen}
      />

      <UpdateMileageModal
        vehicle={selectedVehicle}
        isOpen={isUpdateMileageOpen}
        onOpenChange={setIsUpdateMileageOpen}
      />

      <AddVehicleModal
        isOpen={isAddVehicleOpen}
        onOpenChange={setIsAddVehicleOpen}
      />

      <EditVehicleModal
        vehicle={selectedVehicle}
        isOpen={isEditVehicleOpen}
        onOpenChange={setIsEditVehicleOpen}
      />

      <BookServiceModal
        vehicle={serviceVehicle}
        vehicles={vehicles}
        isOpen={isBookServiceOpen}
        onOpenChange={setIsBookServiceOpen}
      />

      <MembershipCardModal
        isOpen={isMembershipCardOpen}
        onOpenChange={setIsMembershipCardOpen}
      />
    </div>
  );
}
