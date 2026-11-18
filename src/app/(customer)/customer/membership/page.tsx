"use client";

import { useState, useEffect, useRef } from "react";
import {
  Key, Car, Gauge, Wind, Zap, Flame, Rocket,
  ShoppingBag, Calendar, Gift, UserCheck, CalendarClock, ShieldCheck,
  Tag, Lock, Check, ChevronRight, CreditCard, TrendingUp, Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useMyMembership, useAllTiers, useMyPointHistory } from "@/hooks/api/useMembership";
import { useUser, useAuthActions } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { MembershipCardModal } from "@/components/customer/MembershipCardModal";
import type { PointSourceType } from "@/types/membership";
import { cn } from "@/lib/utils";
import { ACTION_AUTO_BENEFITS_REP, ACTION_AUTO_SERVICE_DISCOUNT_PERCENT } from "@/lib/customer-benefits";
import { TIER_TEXT, tierColorVars } from "@/lib/membership-theme";

const TIER_ICONS: Record<string, React.ElementType> = {
  ignition: Key,
  cruiser: Car,
  sport: Gauge,
  turbo: Wind,
  supercharged: Zap,
  apex: Flame,
  hypercar: Rocket,
};

const SOURCE_META: Record<PointSourceType, { icon: React.ElementType; tone: string; label: string }> = {
  aftermarket_order:   { icon: ShoppingBag,   tone: "text-primary bg-primary/10",       label: "Parts Order" },
  service_appointment: { icon: Calendar,      tone: "text-chart-3 bg-chart-3/15",       label: "Service Visit" },
  test_drive:          { icon: Car,           tone: "text-chart-4 bg-chart-4/15",       label: "Test Drive" },
  referral_conversion: { icon: Gift,          tone: "text-chart-5 bg-chart-5/15",       label: "Referral" },
  profile_completion:  { icon: UserCheck,     tone: "text-primary bg-primary/10",       label: "Profile Bonus" },
  account_anniversary: { icon: CalendarClock, tone: "text-chart-4 bg-chart-4/15",       label: "Anniversary" },
  admin_adjustment:    { icon: ShieldCheck,   tone: "text-muted-foreground bg-muted",   label: "Adjustment" },
};

const EARN_METHODS = [
  { icon: ShoppingBag,   label: "Shop the Parts Store",  desc: "Every fulfilled aftermarket order",    pts: "1 pt / $1" },
  { icon: Calendar,      label: "Book a Service Visit",  desc: "Credited once the visit is completed", pts: "+75 pts" },
  { icon: Car,           label: "Take a Test Drive",     desc: "After your scheduled drive wraps up",  pts: "+50 pts" },
  { icon: Gift,          label: "Refer a Friend",        desc: "When your referral makes a purchase",  pts: "+300 pts" },
  { icon: UserCheck,     label: "Complete Your Profile", desc: "One-time welcome bonus",               pts: "+100 pts" },
  { icon: CalendarClock, label: "Stay a Member",         desc: "Loyalty bonus every anniversary",      pts: "+200 pts/yr" },
];

const PERK_ROWS = [
  "Member pricing on vehicles & parts",
  "Priority support queue",
  "Early access to new inventory",
  "Free aftermarket shipping",
  "Priority service slots",
  "VIP test-drive scheduling",
  "Exclusive deals access",
  "Free annual inspection credit",
  "Priority financing review",
  "Concierge line + auction access",
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Denver' });
}

function Odometer({ value }: { value: number }) {
  const digits = value.toLocaleString().split("");
  return (
    <div className="flex max-w-full flex-wrap items-center gap-0.5 gap-y-1">
      {digits.map((d, i) =>
        d === "," ? (
          <span key={i} className="px-0.5 text-xl font-black text-foreground/60 sm:text-2xl lg:text-3xl dark:text-white/70">,</span>
        ) : (
          <span
            key={i}
            className="shrink-0 rounded-md bg-card px-1 py-1 font-mono text-xl font-black tabular-nums text-foreground shadow-sm ring-1 ring-primary/20 sm:px-1.5 sm:text-2xl lg:text-3xl dark:bg-black/35 dark:text-white dark:shadow-inner dark:ring-white/10"
          >
            {d}
          </span>
        ),
      )}
    </div>
  );
}

export default function MembershipPage() {
  const { data: membership, isLoading: loadingMembership } = useMyMembership();
  const { data: allTiers, isLoading: loadingTiers } = useAllTiers();
  const [historyPage, setHistoryPage] = useState(1);
  const { data: history, isLoading: loadingHistory } = useMyPointHistory(historyPage);
  const { user } = useUser();
  const { user: rawUser } = useAuthActions();
  const { organization } = useOrg();
  const dealerName = organization?.name || "Your Dealership";
  const [cardOpen, setCardOpen] = useState(false);
  const [mobilePerkTier, setMobilePerkTier] = useState<string | null>(null);
  const prevTierRankRef = useRef<number | null>(null);

  useEffect(() => {
    if (!membership) return;
    const rank = membership.currentTier.rank;
    if (prevTierRankRef.current !== null && rank > prevTierRankRef.current) {
      toast.success(`Welcome to ${membership.currentTier.name} Class!`, {
        description: `You now unlock ${membership.currentTier.discountPercent}% member pricing and new perks.`,
        duration: 6000,
      });
    }
    prevTierRankRef.current = rank;
  }, [membership]);

  const tier = membership?.currentTier;
  const nextTier = membership?.nextTier;
  const progress = membership?.progressPercent ?? 0;
  const lifetime = membership?.points.lifetimePoints ?? 0;
  const TierIcon = tier ? (TIER_ICONS[tier.slug] ?? Car) : Car;

  const primary = tier?.colorTheme.primary ?? "#34d399";
  const grad = tier
    ? tier.colorTheme.gradient.length > 1
      ? tier.colorTheme.gradient
      : [tier.colorTheme.secondary, tier.colorTheme.primary]
    : ["#064e3b", "#34d399"];

  const sinceYear = (() => {
    try {
      const ts = parseInt((rawUser?._id ?? "").substring(0, 8), 16) * 1000;
      return ts ? new Date(ts).getFullYear() : new Date().getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  })();
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "Driver";

  if (loadingMembership) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-56 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-[14px]" />)}
        </div>
        <Skeleton className="h-28 w-full rounded-[14px]" />
      </div>
    );
  }

  // `accent` reads well on dark screens, `ink` on light screens (2026-11-18).
  const ink = tier?.colorTheme.secondary ?? "#4b5563";
  const stats = [
    { label: "Member Pricing", value: `${tier?.discountPercent ?? 0}%`,  sub: "off vehicles & parts", icon: Tag,        accent: primary, ink },
    { label: "Drive Points",   value: lifetime.toLocaleString(),          sub: "lifetime earned",      icon: Sparkles,   accent: "#34d399", ink: "#047857" },
    { label: "Current Class",  value: tier?.name ?? "Ignition",           sub: `Class ${tier?.rank ?? 1} of 7`, icon: TierIcon, accent: primary, ink },
    {
      label: "Next Class",
      value: nextTier?.name ?? "Maxed",
      sub: nextTier ? `${membership?.pointsToNextTier?.toLocaleString()} pts to go` : "Top class reached",
      icon: TrendingUp, accent: "#60a5fa", ink: "#1d4ed8",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary/80">
              {dealerName} · Drivers Club
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            Your Membership
          </h1>
        </div>
        <Button onClick={() => setCardOpen(true)} variant="outline" className="gap-2 rounded-xl border-border/60">
          <CreditCard className="h-4 w-4" />
          Member Card
        </Button>
      </div>

      {/* ── Cockpit hero ──────────────────────────────────────────── */}
      {/* Follows the light/dark theme (2026-11-18): Suprah mint with class-colored
          accents on light screens, the class gradient on dark screens. */}
      <div
        className="relative overflow-hidden rounded-3xl bg-linear-135 from-card via-primary/5 to-primary/15 p-5 shadow-xl ring-1 ring-primary/20 sm:p-7 dark:ring-0"
        style={tierColorVars(tier?.colorTheme)}
      >
        <div
          className="absolute inset-0 hidden dark:block"
          style={{ background: `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1] ?? primary} ${grad.length > 2 ? "55%" : "100%"}${grad[2] ? `, ${grad[2]} 100%` : ""})` }}
        />
        <div className="absolute inset-0 hidden bg-black/45 dark:block" />
        <div
          className="pointer-events-none absolute inset-0 text-emerald-900 opacity-[0.07] dark:text-white"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "14px 14px" }}
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: `${primary}55` }}
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-primary/20 backdrop-blur dark:bg-white/15 dark:shadow-none dark:ring-white/25">
                <TierIcon className="h-7 w-7 text-(--tier-ink) dark:text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-emerald-800 backdrop-blur dark:bg-white/15 dark:text-white">
                  Class {tier?.rank ?? 1} of 7
                </div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl dark:text-white dark:drop-shadow">
                  {tier?.name ?? "Ignition"}
                </h2>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground dark:text-white/75">Drive Points</p>
              <div className="mt-1.5"><Odometer value={lifetime} /></div>
              <p className="mt-2 max-w-md text-sm font-medium text-foreground/90 dark:text-white/90">
                {tier && tier.discountPercent > 0
                  ? `${firstName}, you're saving ${tier.discountPercent}% on every vehicle and part in the shop.`
                  : `Welcome aboard, ${firstName}. Earn points to unlock member pricing.`}
              </p>
            </div>
          </div>

          {/* Progress gauge */}
          <div className="w-full max-w-sm rounded-2xl bg-card/80 p-4 shadow-sm ring-1 ring-primary/15 backdrop-blur lg:w-80 dark:bg-black/40 dark:shadow-none dark:ring-white/15">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground/90 dark:text-white/90">
              <span>Member since {sinceYear}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-primary/15 dark:bg-white/20">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 dark:bg-white dark:shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground dark:text-white/70">Current</p>
                <p className="text-sm font-bold text-foreground dark:text-white">{tier?.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-white/60" />
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground dark:text-white/70">{nextTier ? "Next" : "Status"}</p>
                <p className="text-sm font-bold text-foreground dark:text-white">{nextTier?.name ?? "Maxed Out"}</p>
              </div>
            </div>
            {nextTier && (
              <p className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-center text-[11px] font-semibold text-emerald-800 dark:bg-white/15 dark:text-white">
                {membership?.pointsToNextTier?.toLocaleString()} pts to {nextTier.name} · unlocks {nextTier.discountPercent}% pricing
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat band ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-border bg-card p-3.5 sm:p-4" style={tierColorVars({ primary: s.accent, secondary: s.ink })}>
            <div className="flex items-center gap-2">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-(--tier-ink)/10 dark:bg-(--tier)/10", TIER_TEXT)}>
                <s.icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
            </div>
            <p className={cn("mt-2 min-w-0 break-words [overflow-wrap:anywhere] text-lg font-black sm:text-xl whitespace-normal", TIER_TEXT)}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Class ladder ──────────────────────────────────────────── */}
      <div className="rounded-[14px] border border-primary/25 bg-primary/8 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-foreground">
                {ACTION_AUTO_SERVICE_DISCOUNT_PERCENT}% off eligible services
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Show your virtual card QR at participating service locations. Stores can verify your {dealerName} customer benefit with {ACTION_AUTO_BENEFITS_REP.name}.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Button asChild size="sm" className="rounded-xl">
              <Link href="/customer?tab=vehicles&add=vehicle">Register VIN</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <Link href="/customer/network">Find Shops</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-1.5">
          <h3 className="text-sm font-black uppercase tracking-wide text-foreground">The Class Ladder</h3>
          <span className="text-[11px] font-medium text-muted-foreground">+2% pricing each class</span>
        </div>
        {loadingTiers ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
            {(allTiers ?? []).map((t) => {
              const Icon = TIER_ICONS[t.slug] ?? Car;
              const isCurrent = t.slug === tier?.slug;
              const unlocked = lifetime >= t.minPoints;
              return (
                // Your class: Suprah mint with a green outline on light screens,
                // the class gradient on dark screens (2026-11-18).
                <div
                  key={t.slug}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all sm:p-3",
                    isCurrent
                      ? "border-primary/50 bg-linear-160 from-primary/8 to-primary/20 shadow-lg dark:border-transparent dark:[background-image:var(--tier-grad)]"
                      : unlocked
                        ? "border-border bg-muted/30"
                        : "border-dashed border-muted-foreground/40 bg-muted/10",
                  )}
                  style={{
                    ...tierColorVars(t.colorTheme),
                    ...(isCurrent ? { "--tier-grad": `linear-gradient(160deg, ${grad[0]}, ${grad[1] ?? primary})` } : {}),
                  } as React.CSSProperties}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      isCurrent ? "bg-card shadow-sm dark:bg-white/20 dark:shadow-none" : "bg-muted",
                      (isCurrent || unlocked) && TIER_TEXT,
                    )}
                  >
                    {unlocked ? (
                      <Icon className={cn("h-5 w-5", isCurrent && "dark:text-white")} />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className={cn("text-[11px] font-black uppercase tracking-tight sm:text-xs text-foreground", isCurrent && "dark:text-white")}>
                    {t.name}
                  </p>
                  <p className={cn("text-[11px] font-semibold tabular-nums text-muted-foreground", isCurrent && "dark:text-white/80")}>
                    {t.minPoints.toLocaleString()} pts
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px] font-black uppercase",
                      isCurrent ? "bg-primary/15 text-emerald-800 dark:bg-white/20 dark:text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.discountPercent > 0 ? `${t.discountPercent}% off` : "Base"}
                  </span>
                  {isCurrent && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow dark:bg-white dark:text-zinc-900">
                      You
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="perks">
        <TabsList className="mb-4">
          <TabsTrigger value="perks">Perks</TabsTrigger>
          <TabsTrigger value="earn">Earn Points</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="perks">
          {loadingTiers ? (
            <Skeleton className="h-72 w-full rounded-[14px]" />
          ) : (
            <>
              {/* Phones and tablets: pick a class, see its perk checklist — the
                  7-tier table needs a wide screen (2026-11-17: up to lg, and the
                  class chips wrap instead of scrolling sideways) */}
              <div className="space-y-3 lg:hidden">
                <div className="flex flex-wrap gap-2">
                  {(allTiers ?? []).map((t) => {
                    const selected = t.slug === (mobilePerkTier ?? tier?.slug);
                    return (
                      <button
                        key={t.slug}
                        onClick={() => setMobilePerkTier(t.slug)}
                        className={cn(
                          "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                          selected
                            ? "border-transparent bg-(--tier-ink) text-white dark:bg-(--tier) dark:text-zinc-950"
                            : "border-border text-muted-foreground",
                        )}
                        style={tierColorVars(t.colorTheme)}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
                <div className="overflow-hidden rounded-[14px] border border-border bg-card divide-y divide-border">
                  {PERK_ROWS.map((row, ri) => {
                    const selSlug = mobilePerkTier ?? tier?.slug;
                    const selIdx = (allTiers ?? []).findIndex((t) => t.slug === selSlug);
                    const selTier = (allTiers ?? [])[selIdx];
                    const has = ri === 0 ? true : selIdx >= ri;
                    return (
                      <div key={row} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-[12px] font-medium text-foreground">{row}</span>
                        {ri === 0 ? (
                          <span
                            className={cn("text-xs font-black shrink-0", selTier && selTier.discountPercent > 0 && TIER_TEXT)}
                            style={tierColorVars(selTier?.colorTheme)}
                          >
                            {selTier && selTier.discountPercent > 0 ? `${selTier.discountPercent}%` : "—"}
                          </span>
                        ) : has ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                        ) : (
                          <span className="text-sm text-muted-foreground shrink-0">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Larger screens: full side-by-side comparison that fits the width */}
              <div className="hidden overflow-hidden rounded-[14px] border border-border bg-card lg:block">
                <div>
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="w-40 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground xl:w-56">
                          Perk
                        </th>
                        {(allTiers ?? []).map((t) => (
                          <th
                            key={t.slug}
                            className={cn(
                              "px-2 py-3 text-center text-[11px] font-black uppercase tracking-tight break-words [overflow-wrap:anywhere] whitespace-normal",
                              TIER_TEXT,
                              t.slug === tier?.slug && "bg-(--tier-ink)/8 dark:bg-(--tier)/8",
                            )}
                            style={tierColorVars(t.colorTheme)}
                          >
                            {t.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERK_ROWS.map((row, ri) => (
                        <tr key={row} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 text-[12px] font-medium text-foreground break-words [overflow-wrap:anywhere] whitespace-normal">{row}</td>
                          {(allTiers ?? []).map((t, ti) => (
                            <td
                              key={t.slug}
                              className={cn("px-2 py-3 text-center", t.slug === tier?.slug && "bg-(--tier-ink)/5 dark:bg-(--tier)/4")}
                              style={tierColorVars(t.colorTheme)}
                            >
                              {ri === 0 ? (
                                <span className={cn("text-xs font-black", t.discountPercent > 0 && TIER_TEXT)}>
                                  {t.discountPercent > 0 ? `${t.discountPercent}%` : "—"}
                                </span>
                              ) : ti >= ri ? (
                                <Check className="mx-auto h-4 w-4 text-primary" strokeWidth={3} />
                              ) : (
                                <span className="text-base text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="earn">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EARN_METHODS.map((m) => (
              <div key={m.label} className="group flex items-start gap-3 rounded-[14px] border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">{m.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{m.desc}</p>
                  <p className="mt-1.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[12px] font-black text-primary">
                    {m.pts}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[14px]" />)}
            </div>
          ) : !history?.transactions?.length ? (
            <div className="rounded-[14px] border border-dashed border-border py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Gauge className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No points on the board yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Book a service visit or shop parts to start earning.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.transactions.map((tx) => {
                const meta = SOURCE_META[tx.sourceType] ?? SOURCE_META.admin_adjustment;
                const Icon = meta.icon;
                return (
                  <div key={tx._id} className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-3.5">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="min-w-0 break-words [overflow-wrap:anywhere] text-[13px] font-semibold text-foreground whitespace-normal">{tx.description}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(tx.createdAt)} · {meta.label}</p>
                    </div>
                    <span className={cn("shrink-0 text-[15px] font-black tabular-nums", tx.delta > 0 ? "text-primary" : "text-destructive")}>
                      {tx.delta > 0 ? "+" : ""}{tx.delta.toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {history.total > historyPage * 20 && (
                <Button variant="outline" className="mt-2 w-full rounded-xl" onClick={() => setHistoryPage((p) => p + 1)}>
                  Load more
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <MembershipCardModal isOpen={cardOpen} onOpenChange={setCardOpen} />
    </div>
  );
}
