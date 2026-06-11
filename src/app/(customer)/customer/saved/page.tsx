"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Clock,
} from "lucide-react";
import { CarInventoryCard } from "@/components/car-inventory-card";
import { VehicleDetailsModal } from "@/components/vehicle-details-modal";
import { VehicleInquiryModal } from "@/components/vehicle-inquiry-modal";
import { FinanceApplicationModal } from "@/components/finance-application-modal";
import { ShippingQuoteModal } from "@/components/shipping-quote-modal";
import { useInventoryActions } from "@/hooks/useInventoryActions";
import { fetchSavedVehicles, removeSavedVehicle } from "@/lib/api/savedVehicles";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import type { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortKey = "default" | "priceAsc" | "priceDesc" | "yearDesc";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "default", label: "Saved Order", icon: Clock },
  { key: "priceAsc", label: "Price: Low", icon: SortAsc },
  { key: "priceDesc", label: "Price: High", icon: SortDesc },
  { key: "yearDesc", label: "Newest Year", icon: SortDesc },
];

function WishlistContent() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = React.useState<SortKey>("default");

  const { data: savedVehicles = [], isLoading } = useQuery({
    queryKey: ["savedVehicles"],
    queryFn: fetchSavedVehicles,
  });

  const removeMutation = useMutation({
    mutationFn: removeSavedVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["savedVehicles"] }),
  });

  const {
    selectedVehicle,
    openModals,
    setDetailsOpen,
    setInquiryOpen,
    setFinanceOpen,
    setShippingOpen,
    handleVehicleClick,
    handleCheckAvailability,
    handleApplyNow,
    handleGetQuote,
  } = useInventoryActions();

  const [shippingRates, setShippingRates] = React.useState<Record<string, number>>({});

  const handleCalculateQuote = async (formData: ShippingQuoteFormData) => {
    try {
      const token = await getToken();
      const response = await apiClient.post(
        "/api/quotes",
        { ...formData, toZip: formData.zipCode, toAddress: formData.fullAddress },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = response.data?.data || response.data;
      if (formData.vehicleId) {
        setShippingRates((prev) => ({ ...prev, [formData.vehicleId!]: data.rate }));
      }
      setShippingOpen(false);
    } catch (err) {
      console.error("Error creating quote:", err);
    }
  };

  const handleToggleSave = (vehicle: Vehicle, _newState: boolean) => {
    removeMutation.mutate(vehicle.id);
  };

  const savedIds = new Set(savedVehicles.map((v: Vehicle) => v.id));

  const totalEstValue = React.useMemo(
    () => (savedVehicles as Vehicle[]).reduce((sum, v) => sum + (v.price ?? 0), 0),
    [savedVehicles],
  );

  const avgPrice = React.useMemo(
    () => savedVehicles.length > 0 ? totalEstValue / savedVehicles.length : 0,
    [totalEstValue, savedVehicles.length],
  );

  const sortedVehicles = React.useMemo(() => {
    const arr = [...(savedVehicles as Vehicle[])];
    if (sortBy === "priceAsc") return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sortBy === "priceDesc") return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sortBy === "yearDesc") return arr.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    return arr;
  }, [savedVehicles, sortBy]);

  const vehicleCount = (savedVehicles as Vehicle[]).length;
  const hasVehicles = vehicleCount > 0;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-8xl flex-col space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ─── Hero Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-500 via-rose-400 to-rose-500/0" />
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-rose-500/8 to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-rose-400/6 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-rose-500/4 blur-2xl pointer-events-none" />

        {/* Oversized watermark */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[72px] sm:text-[96px] font-black text-rose-500/5 uppercase leading-none select-none pointer-events-none tracking-tight"
          aria-hidden
        >
          LIST
        </div>

        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            {/* Left: title section */}
            <div className="space-y-2.5 min-w-0">
              <div className="flex items-center gap-2">
                <Heart className="h-3 w-3 fill-rose-500 text-rose-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-500/80">
                  Saved Vehicles
                </span>
              </div>

              <div>
                <h1 className="text-3xl xs:text-4xl sm:text-5xl font-black tracking-tight leading-none text-foreground uppercase">
                  Wish<span className="text-rose-500">list</span>
                </h1>
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {isLoading ? (
                  <span className="inline-block h-7 w-24 rounded-full bg-muted animate-pulse" />
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground tabular-nums">
                    <Heart className="h-3 w-3 fill-rose-500 text-rose-500 shrink-0" />
                    {vehicleCount} {vehicleCount === 1 ? "vehicle" : "vehicles"} saved
                  </span>
                )}

                {!isLoading && hasVehicles && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/12">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    ~${totalEstValue.toLocaleString()} est.
                  </span>
                )}

                {!isLoading && vehicleCount > 1 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground tabular-nums">
                    avg ${Math.round(avgPrice).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Right: action */}
            <div className="shrink-0">
              <Link href="/customer/shop">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 rounded-xl border-border/50 text-xs font-semibold hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Browse More</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sort Bar ─────────────────────────────────────────────────── */}
      {!isLoading && hasVehicles && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="text-xs text-muted-foreground font-medium shrink-0">Sort:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={cn(
                  "shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5",
                  sortBy === opt.key
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-muted animate-pulse dark:bg-zinc-900/60"
                style={{ aspectRatio: "5/4" }}
              />
            ))}
          </div>
        ) : !hasVehicles ? (

          /* ── Empty State ───────────────────────────────────────────── */
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/3 dark:bg-rose-500/5">
            <div className="absolute -right-12 -bottom-12 h-56 w-56 rounded-full bg-rose-500/6 blur-3xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-rose-400/4 blur-2xl pointer-events-none" />

            <div className="relative flex flex-col items-center gap-5 px-6 py-14 sm:py-20 text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
                  <Heart className="h-9 w-9 text-rose-400/50" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card border-2 border-rose-200 dark:border-rose-900/60">
                  <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                </div>
              </div>

              <div className="space-y-2 max-w-xs">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Your wishlist awaits
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Browse our inventory and tap the{" "}
                  <span className="inline-flex items-center gap-0.5 align-baseline text-rose-500 font-semibold">
                    <Heart className="h-3 w-3 fill-rose-500" /> heart
                  </span>{" "}
                  on any vehicle to save it here for quick access.
                </p>
              </div>

              <Link href="/customer/shop">
                <Button className="gap-2 rounded-xl font-semibold h-10 px-5" size="sm">
                  <ShoppingBag className="h-4 w-4" />
                  Browse Inventory
                </Button>
              </Link>
            </div>
          </div>

        ) : (

          /* ── Vehicle Grid ──────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {sortedVehicles.map((vehicle) => (
                <CarInventoryCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  viewMode="grid"
                  shippingPrice={shippingRates[vehicle.id]}
                  onCheckAvailability={handleCheckAvailability}
                  onApplyNow={handleApplyNow}
                  onGetQuote={handleGetQuote}
                  onVehicleClick={handleVehicleClick}
                  isSaved={savedIds.has(vehicle.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground/50 pb-2">
              Tap the{" "}
              <span className="inline-flex items-center gap-0.5 align-baseline text-rose-400">
                <Heart className="h-3 w-3 fill-rose-400" />
              </span>{" "}
              on any vehicle to remove it from your wishlist
            </p>
          </div>
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────────────────── */}
      <ShippingQuoteModal
        open={openModals.shipping}
        onOpenChange={setShippingOpen}
        vehicles={savedVehicles}
        defaultVehicle={selectedVehicle}
        onCalculate={handleCalculateQuote}
      />
      <VehicleDetailsModal
        isOpen={openModals.details}
        onClose={() => setDetailsOpen(false)}
        vehicle={selectedVehicle}
        onQuoteClick={() => setShippingOpen(true)}
        onInquiryClick={handleCheckAvailability}
        onApplyNow={handleApplyNow}
        shippingQuote={selectedVehicle ? shippingRates[selectedVehicle.id] : null}
      />
      <VehicleInquiryModal
        isOpen={openModals.inquiry}
        onClose={() => setInquiryOpen(false)}
        vehicle={selectedVehicle}
      />
      <FinanceApplicationModal
        isOpen={openModals.finance}
        onClose={() => setFinanceOpen(false)}
        vehicle={selectedVehicle}
      />
    </div>
  );
}

export default function WishlistPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <WishlistContent />
    </React.Suspense>
  );
}
