"use client";

import React from "react";
import {
  CreditCard,
  Check,
  Loader2,
  Users,
  ShieldCheck,
  Sparkles,
  Lock,
  FlaskConical,
} from "lucide-react";
import { useOrg } from "@/hooks/useOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  SUBSCRIPTION_TIERS,
  FEATURE_MATRIX,
  getTierDefinition,
  SubscriptionTierId,
  FeatureValue,
} from "@/data/subscriptionTiers";

const ACCENT_STYLES: Record<string, { icon: string; ring: string; badge: string; bar: string }> = {
  zinc: {
    icon: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    ring: "ring-zinc-500/20",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    bar: "bg-zinc-400/60",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    ring: "ring-blue-500/30",
    badge: "bg-blue-500/10 text-blue-600",
    bar: "bg-linear-to-r from-blue-500 to-blue-400",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600",
    ring: "ring-violet-500/30",
    badge: "bg-violet-500/10 text-violet-600",
    bar: "bg-linear-to-r from-violet-500 to-violet-400",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    ring: "ring-emerald-500/30",
    badge: "bg-emerald-500/10 text-emerald-600",
    bar: "bg-linear-to-r from-emerald-500 to-emerald-400",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600",
    ring: "ring-amber-500/30",
    badge: "bg-amber-500/10 text-amber-600",
    bar: "bg-linear-to-r from-amber-500 to-amber-400",
  },
};

function renderFeatureValue(value: FeatureValue) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="size-4 text-emerald-500 mx-auto" />
    ) : (
      <span className="text-muted-foreground/30 mx-auto block text-center">—</span>
    );
  }
  return <span className="text-[11px] sm:text-xs font-semibold text-foreground/80">{value}</span>;
}

export default function SubscriptionPlans() {
  const { organization, isLoaded } = useOrg();

  const currentTierId: SubscriptionTierId = organization?.subscription?.tier || "suprah_go";
  const currentTier = getTierDefinition(currentTierId);
  const isOnOrigin = currentTierId === "suprah_origin";

  const seatsUsed = organization?.members?.length ?? 0;
  const seatLimit = organization?.subscription?.seatLimit ?? currentTier.seatLimit;

  const purchasableTiers = SUBSCRIPTION_TIERS.filter((t) => t.purchasable);
  const comparisonTiers = isOnOrigin
    ? [...purchasableTiers, getTierDefinition("suprah_origin")]
    : purchasableTiers;

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-500">
      <header className="min-h-16 border-b flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2.5 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CreditCard className="size-4" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-base sm:text-lg font-extrabold tracking-tight uppercase">
              Subscription
              <Badge variant="outline" className="gap-1 text-[9px] font-black uppercase tracking-widest border-amber-500/30 bg-amber-500/10 text-amber-600 px-1.5 h-4.5">
                <FlaskConical className="size-2.5" /> Testing
              </Badge>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Plans &amp; Billing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-secondary">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Plan:
            </span>
            <span className="text-xs font-black text-primary whitespace-nowrap">
              {currentTier.name}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-secondary">
            <Users className="size-3.5 text-primary shrink-0" />
            <span className="text-xs font-black text-primary whitespace-nowrap">
              {seatsUsed} / {seatLimit ?? "∞"} seats
            </span>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-screen-2xl mx-auto space-y-8 lg:space-y-10">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter uppercase">
              Choose Your Plan
            </h2>
            <p className="text-sm text-muted-foreground font-medium max-w-2xl">
              Every plan unlocks more of the Suprah platform for your dealership — from Autrix AI to
              full storefront tools for your customers. Prices are per organization, billed monthly.
            </p>
          </div>

          <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden">
            <CardContent className="p-5 sm:p-6 flex items-start sm:items-center gap-4">
              <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <FlaskConical className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest text-amber-600">
                  This page is in testing
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Plan details and pricing below are still being finalized. Switching plans isn&apos;t
                  live yet — reach out to your Suprah contact if you&apos;d like to change tiers early.
                </p>
              </div>
            </CardContent>
          </Card>

          {isOnOrigin && (
            <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden">
              <CardContent className="p-5 sm:p-6 flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-widest text-amber-600">
                    Suprah Origin — Internal Creator Tier
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                    ActionAutoUtah runs on the platform&apos;s own internal tier — unlimited everything,
                    plus earliest access to features in development. Assigned only by Suprah staff.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
            {purchasableTiers.map((tier) => {
              const isCurrent = tier.id === currentTierId;
              const accent = ACCENT_STYLES[tier.accent] ?? ACCENT_STYLES.zinc;
              const Icon = tier.icon;

              return (
                <Card
                  key={tier.id}
                  className={cn(
                    "relative flex flex-col h-full overflow-hidden pt-0 transition-all duration-300",
                    isCurrent
                      ? cn("ring-2 shadow-lg", accent.ring)
                      : "hover:shadow-xl hover:-translate-y-1",
                    tier.id === "suprah_premium_pro" && !isCurrent && "border-primary/30",
                  )}
                >
                  <div className={cn("h-1.5 w-full shrink-0", accent.bar)} />

                  {tier.id === "suprah_premium_pro" && (
                    <Badge className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-none text-[9px] font-black uppercase tracking-widest px-3 py-1 shadow-md">
                      Most Popular
                    </Badge>
                  )}

                  <CardHeader className="pb-0 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={cn("size-11 rounded-2xl flex items-center justify-center", accent.icon)}>
                        <Icon className="size-5" />
                      </div>
                      {isCurrent && (
                        <Badge variant="secondary" className={cn("text-[9px] font-black uppercase tracking-widest border-none", accent.badge)}>
                          Current Plan
                        </Badge>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight">{tier.name}</CardTitle>
                      <CardDescription className="text-xs mt-1.5 leading-relaxed">
                        {tier.tagline}
                      </CardDescription>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black tracking-tight">${tier.price}</span>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        / mo
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col flex-1 pt-5">
                    <ul className="space-y-2.5 flex-1">
                      {tier.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs leading-relaxed">
                          <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-foreground/80 font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5 space-y-1.5">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full h-10 text-xs font-black uppercase tracking-widest" disabled>
                          <Check className="size-4" /> Current Plan
                        </Button>
                      ) : (
                        <>
                          <Button className="w-full h-10 text-xs font-black uppercase tracking-widest" variant="outline" disabled>
                            <Lock className="size-3.5" /> Not Available Yet
                          </Button>
                          <p className="text-[10px] text-center text-muted-foreground font-medium">
                            Plan switching is still in testing
                          </p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Full Feature Comparison
            </h3>
            <Card className="overflow-hidden py-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground p-4 w-70">
                        Feature
                      </th>
                      {comparisonTiers.map((tier) => (
                        <th
                          key={tier.id}
                          className={cn(
                            "text-center font-black uppercase tracking-widest text-[10px] p-4",
                            tier.id === currentTierId ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {tier.shortName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_MATRIX.map((category) => (
                      <React.Fragment key={category.id}>
                        <tr className="bg-muted/20">
                          <td
                            colSpan={comparisonTiers.length + 1}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary/80"
                          >
                            {category.name}
                          </td>
                        </tr>
                        {category.features.map((feature, idx) => (
                          <tr
                            key={feature.id}
                            className={cn(
                              "border-b border-border/40 last:border-0",
                              idx % 2 === 1 && "bg-muted/10",
                            )}
                          >
                            <td className="p-4 text-xs font-semibold text-foreground/80">
                              {feature.label}
                            </td>
                            {comparisonTiers.map((tier) => (
                              <td key={tier.id} className="p-4 text-center">
                                {renderFeatureValue(feature.values[tier.id])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <p className="text-[11px] text-muted-foreground font-medium px-1">
              Pricing, limits, and feature availability shown here may change before this page
              leaves testing. No card details are collected on this page.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
