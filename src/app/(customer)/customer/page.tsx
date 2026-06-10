"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  Wrench,
  ShoppingBag,
  MessageCircle,
  Heart,
  CreditCard,
  Bell,
  ChevronRight,
  Plus,
  LayoutDashboard,
  ClipboardList,
  MapPin,
  GaugeCircle,
  BellRing,
  Settings,
  ArrowUpRight,
  Zap,
  Package,
  Sparkles,
  Clock,
  Tag,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchOwnedVehicles, OwnedVehicle } from "@/lib/api/vehicles";
import { fetchServiceHistory } from "@/lib/api/services";
import { apiClient } from "@/lib/api-client";
import { LogServiceModal } from "@/components/customer/LogServiceModal";
import { UpdateMileageModal } from "@/components/customer/UpdateMileageModal";
import { AddVehicleModal } from "@/components/customer/AddVehicleModal";
import { EditVehicleModal } from "@/components/customer/EditVehicleModal";
import { BookServiceModal } from "@/components/customer/BookServiceModal";
import { deleteVehicle } from "@/lib/api/vehicles";
import { resolveImageUrl, cn } from "@/lib/utils";
import { useUser } from "@/providers/AuthProvider";
import { useNotifications } from "@/context/NotificationContext";
import { fetchSavedVehicles } from "@/lib/api/savedVehicles";
import { useProfileContext } from "@/context/ProfileContext";
import { toast } from "sonner";

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
  const { avatarUrl } = useProfileContext();
  const { unreadCount, notifications, markAsRead } = useNotifications();

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchOwnedVehicles,
  });

  const { data: savedVehicles = [] } = useQuery({
    queryKey: ["savedVehicles"],
    queryFn: fetchSavedVehicles,
  });

  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["appointments", "upcoming"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/api/appointments", { params: { status: "scheduled", limit: 3 } });
        const d = res.data?.data || res.data;
        return d?.appointments || d || [];
      } catch { return []; }
    },
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
  const [isLogServiceOpen, setIsLogServiceOpen] = React.useState(false);
  const [isUpdateMileageOpen, setIsUpdateMileageOpen] = React.useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = React.useState(false);
  const [isBookServiceOpen, setIsBookServiceOpen] = React.useState(false);
  const [serviceVehicle, setServiceVehicle] = React.useState<OwnedVehicle | null>(null);
  const [historyVehicleId, setHistoryVehicleId] = React.useState<string>("");

  React.useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;

    if (!selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
      return;
    }

    const selectedId = getVehicleId(selectedVehicle);
    const stillExists = vehicles.some((v) => getVehicleId(v) === selectedId);
    if (!stillExists) {
      setSelectedVehicle(vehicles[0]);
      setHistoryVehicleId(vehicles[0].id || vehicles[0]._id);
    }
  }, [vehicles, selectedVehicle]);

  const historyVehicle = React.useMemo(
    () => vehicles?.find((v) => (v.id || v._id) === historyVehicleId) ?? vehicles?.[0] ?? null,
    [vehicles, historyVehicleId],
  );

  const { data: serviceHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["serviceHistory", historyVehicle?.id],
    queryFn: () => fetchServiceHistory(historyVehicle!.id),
    enabled: !!historyVehicle?.id,
  });

  const queryClient = useQueryClient();

  const handleLogService = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsLogServiceOpen(true); };
  const handleUpdateMileage = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsUpdateMileageOpen(true); };
  const handleEditVehicle = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsEditVehicleOpen(true); };
  const handleBookService = (v: OwnedVehicle) => { setServiceVehicle(v); setIsBookServiceOpen(true); };
  const handleFutureUpdate = () => toast.info("Book Service is coming soon — stay tuned!");

  const handleDeleteVehicle = async (v: OwnedVehicle) => {
    if (!window.confirm(`Remove your ${v.year} ${v.make} from your garage? This cannot be undone.`)) return;
    try {
      await deleteVehicle(v.id);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      if (selectedVehicle?.id === v.id) setSelectedVehicle(null);
    } catch { }
  };

  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const hour = now ? now.getHours() : new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";

  const mstTime = now
    ? new Intl.DateTimeFormat(undefined, {
        timeZone: "America/Denver",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      }).format(now)
    : "";
  const localTime = now
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(now)
    : "";
  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || "M";

  const QUICK_ACTIONS = [
    {
      label: "Book Service",
      sub: "Coming soon",
      icon: Wrench,
      action: handleFutureUpdate,
      className: "border-primary/30 bg-primary/8 dark:bg-primary/12",
      iconCls: "bg-primary/15 text-primary",
      featured: true,
      badge: "Soon",
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
    <div className="min-h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-600">
      <Tabs defaultValue="overview" className="space-y-5">

        {/* ─── Page header + Tabs ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-default select-none">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
                      Member Portal
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase leading-none mt-0.5">
                      Dashboard
                    </h1>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-55 p-3" sideOffset={8}>
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
            <Button
              onClick={() => setIsAddVehicleOpen(true)}
              size="sm"
              className="gap-1.5 rounded-xl font-semibold shrink-0 h-9"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Vehicle</span>
              <span className="sm:hidden">Add</span>
            </Button>
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
              value="sell"
              className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
            >
              <Tag className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Auction </span>Listing
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Service </span>Log
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB 1 — OVERVIEW                                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4 mt-0">

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
                  {now && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 font-semibold tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-primary/60" />
                      {mstTime}
                      <span className="text-muted-foreground/60 font-normal">({localTime} your time)</span>
                    </p>
                  )}
                </div>
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
                  <AvatarImage src={resolveImageUrl(avatarUrl !== null ? avatarUrl : user?.imageUrl)} />
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
              {
                icon: CarFront,
                label: "Vehicles",
                value: vehicles?.length ?? 0,
                href: "/customer",
                ring: "ring-primary/20",
                iconBg: "bg-primary/10",
                iconCl: "text-primary",
              },
              {
                icon: Heart,
                label: "Wishlist",
                value: (savedVehicles as any[]).length,
                href: "/customer/saved",
                ring: "ring-rose-400/20",
                iconBg: "bg-rose-500/10",
                iconCl: "text-rose-500",
              },
              {
                icon: Bell,
                label: "Alerts",
                value: unreadCount,
                href: "/customer/notifications",
                ring: "ring-amber-400/20",
                iconBg: "bg-amber-500/10",
                iconCl: "text-amber-500",
              },
              {
                icon: CreditCard,
                label: "Payments Due",
                value: pendingPayments ?? 0,
                href: "/customer/payments",
                ring: "ring-emerald-400/20",
                iconBg: "bg-emerald-500/10",
                iconCl: "text-emerald-500",
              },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <div
                  className={cn(
                    "group rounded-2xl border border-border/40 bg-card p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer",
                    "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
                    "dark:bg-zinc-900/60",
                  )}
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl ring-1", stat.iconBg, stat.ring)}>
                    <stat.icon className={cn("h-4 w-4", stat.iconCl)} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground tabular-nums leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 self-end -mt-1 group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 px-0.5">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((item) => {
                const inner = (
                  <div
                    className={cn(
                      "group rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer",
                      "hover:shadow-md hover:-translate-y-0.5",
                      item.className,
                      item.featured && "col-span-1",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.iconCls)}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      {(item as any).badge && (
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-wider rounded-full px-2">
                          {(item as any).badge}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 self-end -mt-1 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                  </div>
                );
                return item.href ? (
                  <Link key={item.label} href={item.href}>{inner}</Link>
                ) : (
                  <button key={item.label} onClick={item.action} className="text-left">
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Appointments + Notifications (side by side on lg) */}
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
                  onClick={handleFutureUpdate}
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
                    onClick={handleFutureUpdate}
                    className="mt-2 text-xs text-primary font-semibold hover:underline"
                  >
                    Schedule one now →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(upcomingAppointments as any[]).map((appt: any, idx: number) => (
                    <div
                      key={appt._id || appt.id || idx}
                      className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/30 p-3 hover:border-primary/20 transition-colors dark:bg-zinc-800/40"
                    >
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
                          {appt.startTime
                            ? new Date(appt.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] capitalize rounded-full px-2"
                      >
                        {appt.type || "appt"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Notifications */}
            <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-xl",
                    unreadCount > 0 ? "bg-amber-500/10" : "bg-muted",
                  )}>
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
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl mt-0.5",
                        notif.isRead ? "bg-muted" : "bg-primary/15",
                      )}>
                        <Bell className={cn("h-3.5 w-3.5", notif.isRead ? "text-muted-foreground" : "text-primary")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs leading-snug truncate",
                          notif.isRead ? "font-medium text-foreground/80" : "font-bold text-foreground",
                        )}>
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{notif.message}</p>
                      </div>
                      {!notif.isRead && (
                        <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Garage — Saved Vehicles carousel */}
          <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10">
                  <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                </div>
                <p className="text-sm font-bold text-foreground">Wishlist</p>
                {(savedVehicles as any[]).length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {(savedVehicles as any[]).length} saved
                  </span>
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
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Heart vehicles in the shop to save them here.
                </p>
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
                    className="group shrink-0 w-35 rounded-2xl border border-border/40 bg-background overflow-hidden hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:bg-zinc-800/60"
                  >
                    <div className="relative h-21 bg-muted overflow-hidden">
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
                      <p className="text-xs font-bold text-foreground truncate leading-snug">
                        {v.year} {v.make}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{v.model}</p>
                    </div>
                  </Link>
                ))}

                {/* "View all" tile */}
                <Link
                  href="/customer/saved"
                  className="shrink-0 w-35 rounded-2xl border border-dashed border-primary/30 bg-primary/5 dark:bg-primary/8 flex flex-col items-center justify-center gap-1.5 p-3 hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                  <p className="text-[11px] font-bold text-primary text-center leading-snug">
                    View All Saved
                  </p>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB 2 — MY VEHICLES                                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <TabsContent value="vehicles" className="mt-0 space-y-4">
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
            <div className="space-y-5">
              {vehicles.map((vehicle) => {
                const estimatedNext = vehicle.currentMileage + 3000;
                const svcProgress = calculateServiceProgress(vehicle.currentMileage, estimatedNext);
                const dueSoon = svcProgress > 80;

                return (
                  <div key={vehicle.id} className="rounded-2xl overflow-hidden border border-border/40">

                    {/* Cinematic vehicle banner */}
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
                            <p className="text-zinc-300 font-medium tracking-widest uppercase drop-shadow-md">
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

                    {/* Vehicle details + health */}
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
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl gap-1.5 h-10 border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
                onClick={() => setIsAddVehicleOpen(true)}
              >
                <Plus className="h-4 w-4" /> Add Another Vehicle
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB — AUCTION LISTING                                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <TabsContent value="sell" className="mt-0">
          <div className="relative min-h-100">
            {/* Blurred preview of the upcoming feature */}
            <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4 blur-sm pointer-events-none select-none opacity-60">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground">List Your Car for Auction</p>
              </div>
            </div>

            {/* Future update overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md px-8 py-10 text-center shadow-lg max-w-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">Future Update</h2>
                <p className="text-sm text-muted-foreground">
                  Soon you&apos;ll be able to list your car for auction so other customers can bid and buy. Stay tuned!
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*  TAB 3 — SERVICE LOG                                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <TabsContent value="history" className="mt-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground uppercase">
                Service Log
              </h2>
              {historyVehicle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {historyVehicle.year} {historyVehicle.make} {historyVehicle.model}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {vehicles && vehicles.length > 1 && (
                <Select value={historyVehicleId} onValueChange={setHistoryVehicleId}>
                  <SelectTrigger className="h-8 w-36 text-xs rounded-xl border-border/50">
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
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4.75 top-4 bottom-4 w-px bg-border/40" />

              <div className="space-y-3">
                {serviceHistory.map((record, idx) => {
                  const colorCls = SERVICE_TYPE_COLORS[record.serviceType] ?? SERVICE_TYPE_COLORS.OTHER;
                  return (
                    <div key={record._id || idx} className="flex gap-4 items-start">
                      {/* Timeline dot */}
                      <div className={cn(
                        "shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border z-10 bg-card",
                        colorCls,
                      )}>
                        <Wrench className="h-4 w-4" />
                      </div>

                      {/* Record card */}
                      <div className="flex-1 min-w-0 rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-3.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {record.serviceType.replace(/_/g, " ")}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {record.locationName && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="h-3 w-3" /> {record.locationName}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {record.mileageAtService.toLocaleString()} mi
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {record.cost ? (
                            <p className="text-sm font-black text-foreground tabular-nums">
                              ${record.cost.toFixed(2)}
                            </p>
                          ) : (
                            <p className="text-sm font-medium text-muted-foreground">—</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(record.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Modals ───────────────────────────────────────────────── */}
      <LogServiceModal vehicle={selectedVehicle} isOpen={isLogServiceOpen} onOpenChange={setIsLogServiceOpen} />
      <UpdateMileageModal vehicle={selectedVehicle} isOpen={isUpdateMileageOpen} onOpenChange={setIsUpdateMileageOpen} />
      <AddVehicleModal isOpen={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen} />
      <EditVehicleModal vehicle={selectedVehicle} isOpen={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen} />
      <BookServiceModal vehicle={serviceVehicle} vehicles={vehicles} isOpen={isBookServiceOpen} onOpenChange={setIsBookServiceOpen} />
    </div>
  );
}