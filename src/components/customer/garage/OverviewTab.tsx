"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CarFront,
  ShoppingBag,
  MessageCircle,
  Heart,
  Wallet,
  ChevronLeft,
  CreditCard,
  Bell,
  ChevronRight,
  ArrowUpRight,
  Package,
  Clock,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";
import { fetchOwnedVehicles } from "@/lib/api/vehicles";
import { fetchSavedVehicles } from "@/lib/api/savedVehicles";
import { resolveImageUrl, cn } from "@/lib/utils";
import { useUser } from "@/providers/AuthProvider";
import { useNotifications } from "@/context/NotificationContext";
import { useProfileContext } from "@/context/ProfileContext";

export function OverviewTab() {
  const { user } = useUser();
  const { avatarUrl } = useProfileContext();
  const { unreadCount, notifications, markAsRead } = useNotifications();

  const { data: vehicles } = useQuery({
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

  const { data: inventorySpotlight = [] } = useQuery({
    queryKey: ["marketplace", "spotlight"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/api/vehicles/marketplace", {
          params: { limit: 50, sortBy: "demand", sortOrder: "desc" },
        });
        const d = res.data?.data || res.data;
        return d?.vehicles || d || [];
      } catch { return []; }
    },
  });

  const [shopActiveIndex, setShopActiveIndex] = React.useState(0);
  const shopCoverflowRef = React.useRef<HTMLDivElement>(null);
  const shopWheelLockRef = React.useRef(false);

  React.useEffect(() => {
    if (shopActiveIndex >= inventorySpotlight.length) setShopActiveIndex(0);
  }, [inventorySpotlight.length, shopActiveIndex]);

  const goShopSlide = React.useCallback((dir: 1 | -1) => {
    setShopActiveIndex((prev) => {
      const len = (inventorySpotlight as any[]).length;
      if (len === 0) return prev;
      return Math.min(Math.max(prev + dir, 0), len - 1);
    });
  }, [inventorySpotlight]);

  React.useEffect(() => {
    const el = shopCoverflowRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 8) return;
      e.preventDefault();
      if (shopWheelLockRef.current) return;
      shopWheelLockRef.current = true;
      goShopSlide(delta > 0 ? 1 : -1);
      setTimeout(() => { shopWheelLockRef.current = false; }, 300);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goShopSlide]);

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
      timeZone: "America/Denver",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(now)
    : "";
  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || "M";

  const QUICK_ACTIONS = [
    {
      label: "Refer & Earn",
      sub: "Invite & get rewarded",
      icon: Wallet,
      href: "/customer/refer",
      className: "border-emerald-500/20 bg-emerald-500/6 dark:bg-emerald-500/8",
      iconCls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
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
    <div className="space-y-4">
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

      {/* Shop Now — Inventory slider */}
      <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
              <CarFront className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Shop Now</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fresh inventory at member pricing</p>
            </div>
          </div>
          <Link href="/customer/shop">
            <Button variant="outline" size="sm" className="h-7 text-xs rounded-xl gap-1.5">
              <ShoppingBag className="h-3 w-3" /> Browse Shop
            </Button>
          </Link>
        </div>

        {inventorySpotlight.length === 0 ? (
          <div className="h-80 sm:h-112 lg:h-128 rounded-2xl bg-muted animate-pulse dark:bg-zinc-800/60" />
        ) : (
          <>
            {/* Coverflow stage */}
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-border/30 bg-linear-to-b from-muted/50 to-muted/10 dark:from-zinc-800/50 dark:to-zinc-900/20">
              {/* Ambient glow */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2/3 w-2/3 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

              <div
                ref={shopCoverflowRef}
                className="relative h-80 sm:h-112 lg:h-128 flex items-center justify-center touch-pan-y select-none"
              >
                {(inventorySpotlight as any[]).map((v: any, i: number) => {
                  const offset = i - shopActiveIndex;
                  const abs = Math.abs(offset);
                  if (abs > 2) return null;

                  const scale = abs === 0 ? 1 : abs === 1 ? 0.8 : 0.62;
                  const translateXPct = offset * 78;
                  const translateY = abs === 0 ? 0 : 14;
                  const zIndex = 10 - abs;
                  const opacity = abs === 0 ? 1 : abs === 1 ? 0.5 : 0.2;

                  const cardInner = (
                    <div
                      className={cn(
                        "relative h-full w-full rounded-2xl border bg-background overflow-hidden dark:bg-zinc-800/60 transition-shadow duration-500",
                        abs === 0
                          ? "border-primary/30 shadow-2xl shadow-primary/15 ring-1 ring-primary/20"
                          : "border-border/40 shadow-xl",
                      )}
                    >
                      <img
                        src={resolveImageUrl(v.image || v.images?.[0]) || "/vehicle-placeholder.jpg"}
                        alt={`${v.year} ${v.make} ${v.model}`}
                        className="h-full w-full object-cover"
                        draggable={false}
                        onError={(e) => { (e.target as HTMLImageElement).src = "/vehicle-placeholder.jpg"; }}
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/0 to-transparent" />
                      {abs === 0 && v.price && (
                        <span className="absolute bottom-3 left-3 text-sm font-black text-white bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                          ${Number(v.price).toLocaleString()}
                        </span>
                      )}
                      {abs === 0 && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary/90 backdrop-blur-sm px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                          <Star className="h-3 w-3" /> Member Price
                        </span>
                      )}
                      {abs === 0 && (
                        <span className="absolute bottom-3 right-3 text-xs font-bold text-white/90 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 max-w-[60%] truncate">
                          {v.year} {v.make} {v.model}
                        </span>
                      )}
                    </div>
                  );

                  const style: React.CSSProperties = {
                    transform: `translate(-50%, -50%) translateX(${translateXPct}%) translateY(${translateY}px) scale(${scale})`,
                    zIndex,
                    opacity,
                  };

                  if (offset === 0) {
                    return (
                      <Link
                        key={v.id || v._id}
                        href={`/customer/shop?vehicleId=${v.id || v._id}`}
                        style={style}
                        className="absolute left-1/2 top-1/2 w-64 sm:w-96 lg:w-md aspect-4/3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer"
                      >
                        {cardInner}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={v.id || v._id}
                      type="button"
                      onClick={() => setShopActiveIndex(i)}
                      style={style}
                      className="absolute left-1/2 top-1/2 w-64 sm:w-96 lg:w-md aspect-4/3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer hover:opacity-80"
                      aria-label={`View ${v.year} ${v.make} ${v.model}`}
                    >
                      {cardInner}
                    </button>
                  );
                })}

                {/* Edge fades */}
                <div className="absolute inset-y-0 left-0 w-12 sm:w-20 bg-linear-to-r from-card to-transparent dark:from-zinc-900/60 pointer-events-none z-10" />
                <div className="absolute inset-y-0 right-0 w-12 sm:w-20 bg-linear-to-l from-card to-transparent dark:from-zinc-900/60 pointer-events-none z-10" />

                {/* Nav arrows */}
                <button
                  type="button"
                  onClick={() => goShopSlide(-1)}
                  disabled={shopActiveIndex === 0}
                  aria-label="Previous vehicle"
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-background hover:scale-105 text-foreground shadow-md transition-all disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => goShopSlide(1)}
                  disabled={shopActiveIndex === (inventorySpotlight as any[]).length - 1}
                  aria-label="Next vehicle"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-background hover:scale-105 text-foreground shadow-md transition-all disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>

            {/* Active vehicle info */}
            {(() => {
              const active = (inventorySpotlight as any[])[shopActiveIndex];
              if (!active) return null;
              return (
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/30 min-h-14">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate leading-snug">
                      {active.year} {active.make} {active.model}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {active.trim || " "}
                    </p>
                  </div>
                  <Link href={`/customer/shop?vehicleId=${active.id || active._id}`} className="shrink-0">
                    <Button size="sm" className="h-8 rounded-xl gap-1.5 text-xs font-semibold">
                      View Details <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              );
            })()}

            {/* Progress track */}
            <div className="mt-2.5 h-1 w-full rounded-full bg-muted-foreground/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: `${100 / (inventorySpotlight as any[]).length}%`,
                  transform: `translateX(${shopActiveIndex * 100}%)`,
                }}
              />
            </div>
          </>
        )}
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
            return <Link key={item.label} href={item.href}>{inner}</Link>;
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
          </div>

          {(upcomingAppointments as any[]).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-5 text-center">
              <Calendar className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No upcoming appointments</p>
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
                      {appt.startTime ? new Date(appt.startTime).toLocaleDateString('en-US', { month: "short", timeZone: "America/Denver" }) : "—"}
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
                        ? new Date(appt.startTime).toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit", timeZone: "America/Denver" })
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
    </div>
  );
}
