"use client";

import * as React from "react";
import Link from "next/link";
import { CarInventoryCard } from "@/components/car-inventory-card";
import type { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import { RefreshCw, Star, Package, ArrowLeftRight, Heart, X, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import { ShopInventoryFilters } from "@/components/shop-inventory-filters";
import { InventoryPagination } from "@/components/inventory-pagination";
import { useAuth } from "@/providers/AuthProvider";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useInventoryActions } from "@/hooks/useInventoryActions";
import { VehicleInquiryModal } from "@/components/vehicle-inquiry-modal";
import { ShippingQuoteModal } from "@/components/shipping-quote-modal";
import { VehicleDetailsModal } from "@/components/vehicle-details-modal";
import { FinanceApplicationModal } from "@/components/finance-application-modal";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import ShopAssistant from "@/components/ShopAssistant";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSavedVehicles, saveVehicle, removeSavedVehicle } from "@/lib/api/savedVehicles";
import { ComparisonTray } from "@/components/customer/ComparisonTray";
import { BookTestDriveModal } from "@/components/customer/BookTestDriveModal";
import { TradeInEstimatorModal } from "@/components/customer/TradeInEstimatorModal";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

const CARD_FALLBACK = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop";

type SortOption =
  | "price-asc"
  | "price-desc"
  | "mileage-asc"
  | "mileage-desc"
  | "year-desc"
  | "year-asc"
  | "make-asc"
  | "make-desc"
  | "demand-desc"
  | "low-performing-desc";

const SHOP_SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "year-desc", label: "Year: Newest First" },
  { value: "year-asc", label: "Year: Oldest First" },
  { value: "mileage-asc", label: "Mileage: Low to High" },
  { value: "mileage-desc", label: "Mileage: High to Low" },
  { value: "make-asc", label: "Make: A to Z" },
  { value: "make-desc", label: "Make: Z to A" },
  { value: "demand-desc", label: "Most Popular" },
];

function SavedVehiclesFloatingButton({ savedVehicles }: { savedVehicles: Vehicle[] }) {
  const [open, setOpen] = React.useState(false);
  const count = savedVehicles.length;

  return (
    <>
      {/* Floating pill button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed left-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] md:bottom-8 md:left-6 z-30",
          "flex items-center gap-2 rounded-full shadow-lg transition-all duration-200",
          "border backdrop-blur-md",
          count > 0
            ? "bg-rose-500/90 hover:bg-rose-500 border-rose-400/40 text-white pr-3 pl-2.5 py-2"
            : "bg-background/90 hover:bg-card border-border/60 text-muted-foreground hover:text-foreground px-3 py-2",
          "hover:shadow-xl hover:scale-105 active:scale-95",
        )}
        aria-label="View saved vehicles"
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-all",
            count > 0 ? "fill-white text-white" : "text-muted-foreground",
          )}
        />
        {count > 0 && (
          <span className="text-xs font-black tabular-nums">{count}</span>
        )}
      </button>

      {/* Saved vehicles panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="saved-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="saved-panel"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
              className={cn(
                "fixed right-0 top-0 bottom-0 z-50 w-72 sm:w-80",
                "flex flex-col border-l border-border/60 bg-background shadow-2xl",
              )}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/10">
                    <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">Saved</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "vehicle" : "vehicles"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Saved list */}
              <div className="flex-1 overflow-y-auto py-2">
                {count === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-12">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Heart className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No saved vehicles</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tap the heart icon on any vehicle to save it here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {savedVehicles.map((v) => {
                      const imgSrc = resolveImageUrl(v.image) || CARD_FALLBACK;
                      return (
                        <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                          <img
                            src={imgSrc}
                            alt={`${v.year} ${v.make} ${v.model}`}
                            onError={(e) => { (e.target as HTMLImageElement).src = CARD_FALLBACK; }}
                            className="h-12 w-16 rounded-lg object-cover shrink-0 border border-border/30"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate leading-snug">
                              {v.year} {v.make} {v.model}
                            </p>
                            {v.trim && (
                              <p className="text-[10px] text-muted-foreground truncate">{v.trim}</p>
                            )}
                            <p className="text-xs font-black text-primary mt-0.5">
                              ${v.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Panel footer */}
              <div className="px-4 py-3 border-t border-border/50 shrink-0 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                <Link href="/customer/saved" onClick={() => setOpen(false)}>
                  <Button className="w-full gap-2 h-10 rounded-xl font-semibold" size="sm">
                    View Wishlist
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ShopVehiclesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [shippingRates, setShippingRates] = React.useState<Record<string, number>>({});
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const fetchSequenceRef = React.useRef(0);
  const queryClient = useQueryClient();

  const { data: savedVehiclesData = [] } = useQuery({
    queryKey: ["savedVehicles"],
    queryFn: fetchSavedVehicles,
  });
  const savedVehicleIds = React.useMemo(
    () => new Set((savedVehiclesData as Vehicle[]).map((v: Vehicle) => v.id)),
    [savedVehiclesData],
  );
  const saveMutation = useMutation({
    mutationFn: saveVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["savedVehicles"] }),
  });
  const unsaveMutation = useMutation({
    mutationFn: removeSavedVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["savedVehicles"] }),
  });
  const handleToggleSave = React.useCallback(
    (vehicle: Vehicle, newState: boolean) => {
      if (newState) saveMutation.mutate(vehicle.id);
      else unsaveMutation.mutate(vehicle.id);
    },
    [saveMutation, unsaveMutation],
  );

  const [comparedVehicles, setComparedVehicles] = React.useState<Vehicle[]>([]);
  const comparedIds = React.useMemo(
    () => new Set(comparedVehicles.map((v) => v.id)),
    [comparedVehicles],
  );
  const toggleCompare = React.useCallback(
    (vehicleId: string) => {
      setComparedVehicles((prev) => {
        const existing = prev.find((v) => v.id === vehicleId);
        if (existing) return prev.filter((v) => v.id !== vehicleId);
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        if (!vehicle || prev.length >= 3) return prev;
        return [...prev, vehicle];
      });
    },
    [vehicles],
  );

  const [isTestDriveOpen, setIsTestDriveOpen] = React.useState(false);
  const [isTradeInOpen, setIsTradeInOpen] = React.useState(false);

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
    handleCallUs,
    handleVideo,
    handleGetQuote,
  } = useInventoryActions();

  const [page, setPage] = React.useState(Number(searchParams.get("page")) || 1);
  const [limit, setLimit] = React.useState(Number(searchParams.get("limit")) || 12);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  const [filters, setFilters] = React.useState<any>({
    search: searchParams.get("search") || "",
    make: searchParams.get("make") || undefined,
    model: searchParams.get("model") || undefined,
    status: searchParams.get("status") || "all",
    year: searchParams.get("year") ? Number(searchParams.get("year")) : undefined,
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    minMileage: searchParams.get("minMileage") ? Number(searchParams.get("minMileage")) : undefined,
    maxMileage: searchParams.get("maxMileage") ? Number(searchParams.get("maxMileage")) : undefined,
    bodyStyle: searchParams.get("bodyStyle") || undefined,
    location: searchParams.get("location") || undefined,
    highDemand: searchParams.get("highDemand") === "true" ? true : undefined,
    lowPerforming: searchParams.get("lowPerforming") === "true" ? true : undefined,
    sortBy: searchParams.get("sortBy") || "",
    sortOrder: searchParams.get("sortOrder") || "",
  });

  const [debouncedSearch, setDebouncedSearch] = React.useState(filters.search);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchVehicles = React.useCallback(async () => {
    const currentSequence = ++fetchSequenceRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get("/api/vehicles/marketplace", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, ...filters, search: debouncedSearch },
        timeout: 15000,
      });

      const responseData = response.data?.data ?? response.data;
      const vehiclesFromResponse = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.vehicles)
          ? responseData.vehicles
          : Array.isArray(responseData?.data?.vehicles)
            ? responseData.data.vehicles
            : [];

      const totalFromResponse =
        responseData?.pagination?.total ?? responseData?.total ?? vehiclesFromResponse.length;
      const totalPagesFromResponse =
        responseData?.pagination?.totalPages ??
        (limit > 0 ? Math.max(1, Math.ceil(totalFromResponse / limit)) : 1);

      if (currentSequence !== fetchSequenceRef.current) return;
      setVehicles(vehiclesFromResponse);
      setTotal(totalFromResponse);
      setTotalPages(totalPagesFromResponse);
      setLastUpdated(new Date());
    } catch (err) {
      if (currentSequence !== fetchSequenceRef.current) return;
      const axiosError = err as AxiosError;
      if (axiosError.code !== "ERR_CANCELED") {
        const status = axiosError.response?.status;
        if (status === 401 || status === 403) {
          setError("Your session has expired. Please sign in again.");
        } else {
          setError(
            (axiosError.response?.data as any)?.message ||
            axiosError.message ||
            "Failed to load vehicles",
          );
        }
      }
    } finally {
      if (currentSequence === fetchSequenceRef.current) setIsLoading(false);
    }
  }, [debouncedSearch, filters, getToken, limit, page]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== "" && filters[key] !== "all") {
        params.set(key, filters[key]);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    fetchVehicles();
  }, [
    page, limit, debouncedSearch,
    filters.make, filters.model, filters.status, filters.year,
    filters.minPrice, filters.maxPrice, filters.minMileage, filters.maxMileage,
    filters.bodyStyle, filters.location, filters.highDemand, filters.lowPerforming,
    filters.sortBy, filters.sortOrder,
    fetchVehicles,
  ]);

  React.useEffect(() => {
    const interval = setInterval(() => fetchVehicles(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "", make: undefined, model: undefined, status: "all", year: undefined,
      minPrice: undefined, maxPrice: undefined, minMileage: undefined, maxMileage: undefined,
      bodyStyle: undefined, location: undefined, highDemand: undefined, lowPerforming: undefined,
      sortBy: "", sortOrder: "",
    });
    setPage(1);
  };

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
      alert(`Quote created! Rate: $${data.rate}`);
      setShippingOpen(false);
    } catch (error) {
      console.error("Error creating quote:", error);
    }
  };

  const handleSortChange = (value: string) => {
    const sortMap: Record<string, { sortBy: string; sortOrder: string }> = {
      "price-asc": { sortBy: "price", sortOrder: "asc" },
      "price-desc": { sortBy: "price", sortOrder: "desc" },
      "mileage-asc": { sortBy: "mileage", sortOrder: "asc" },
      "mileage-desc": { sortBy: "mileage", sortOrder: "desc" },
      "year-desc": { sortBy: "year", sortOrder: "desc" },
      "year-asc": { sortBy: "year", sortOrder: "asc" },
      "make-asc": { sortBy: "make", sortOrder: "asc" },
      "make-desc": { sortBy: "make", sortOrder: "desc" },
      "demand-desc": { sortBy: "demand", sortOrder: "desc" },
      "low-performing-desc": { sortBy: "low-performing", sortOrder: "desc" },
    };
    const mapped = sortMap[value] ?? { sortBy: "", sortOrder: "" };
    setFilters((prev: any) => ({ ...prev, ...mapped }));
  };

  const currentSortValue = React.useMemo((): SortOption | "" => {
    const key = `${filters.sortBy}-${filters.sortOrder}`;
    const aliases: Record<string, SortOption> = {
      "price-asc": "price-asc", "price-desc": "price-desc",
      "mileage-asc": "mileage-asc", "mileage-desc": "mileage-desc",
      "year-desc": "year-desc", "year-asc": "year-asc",
      "make-asc": "make-asc", "make-desc": "make-desc",
      "demand-desc": "demand-desc", "low-performing-desc": "low-performing-desc",
    };
    return aliases[key] ?? "";
  }, [filters.sortBy, filters.sortOrder]);

  const vehicleCards = React.useMemo(
    () =>
      vehicles.map((vehicle) => (
        <CarInventoryCard
          key={vehicle.id}
          vehicle={vehicle}
          viewMode={viewMode}
          shippingPrice={shippingRates[vehicle.id]}
          onCheckAvailability={handleCheckAvailability}
          onApplyNow={handleApplyNow}
          onCallUs={handleCallUs}
          onVideo={handleVideo}
          onGetQuote={handleGetQuote}
          onVehicleClick={handleVehicleClick}
          isSaved={savedVehicleIds.has(vehicle.id)}
          onToggleSave={handleToggleSave}
          isComparing={comparedIds.has(vehicle.id)}
          onToggleCompare={toggleCompare}
          canCompareMore={comparedVehicles.length < 3}
        />
      )),
    [
      vehicles, shippingRates, viewMode,
      handleCheckAvailability, handleApplyNow, handleCallUs, handleVideo, handleGetQuote, handleVehicleClick,
      savedVehicleIds, handleToggleSave, comparedIds, toggleCompare, comparedVehicles.length,
    ],
  );

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Error Loading Vehicles</h2>
            <p className="text-sm text-red-500/80 mb-4">{error}</p>
            <Button
              onClick={fetchVehicles}
              variant="outline"
              size="sm"
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-8xl flex-col space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0">
        <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2.5 min-w-0">

              {/* Eyebrow label */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                  Marketplace
                </span>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none text-foreground uppercase">
                  Shop{" "}
                  <span className="text-primary">Vehicles</span>
                </h1>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  Member-exclusive pricing on every listing
                </p>
              </div>

              {/* Stat pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground tabular-nums">
                  {isLoading ? (
                    <span className="inline-block h-2.5 w-6 rounded-full animate-pulse bg-muted-foreground/20" />
                  ) : total}
                  {" "}available
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/12">
                  <Star className="h-3 w-3" />
                  Member Pricing
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Package className="h-3 w-3" />
                  Shipping Quotes
                </span>
              </div>
            </div>

            {/* Right: Actions + Live indicator */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8 rounded-xl border-border/50"
                  onClick={() => setIsTradeInOpen(true)}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Trade-In</span>
                </Button>
                <button
                  onClick={fetchVehicles}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs font-medium transition-all",
                    "text-foreground disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {isLoading ? "Updating..." : lastUpdated
                  ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}`
                  : "Live"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-2">
        <ShopInventoryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          apiPath="/api/vehicles/marketplace/filters"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentSortValue={currentSortValue}
          onSortChange={handleSortChange}
          sortOptions={SHOP_SORT_OPTIONS}
        />
        <p className="text-xs text-muted-foreground px-0.5">
          <span className="font-bold text-foreground tabular-nums">{total}</span>{" "}
          vehicle{total !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* ─── Vehicle Grid / List ──────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                : "flex flex-col gap-2.5",
            )}
          >
            {[...Array(viewMode === "grid" ? 8 : 6)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl bg-muted animate-pulse dark:bg-zinc-900",
                  viewMode === "grid" ? "aspect-5/4" : "h-24",
                )}
              />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Package className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">No vehicles found</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Try adjusting your filters or clearing them to see more results.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-1.5 rounded-xl">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                  : "flex flex-col gap-2.5",
              )}
            >
              {vehicleCards}
            </div>

            <InventoryPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              limit={limit}
              onLimitChange={setLimit}
              totalCount={total}
            />
          </div>
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────────────── */}
      <ShippingQuoteModal
        open={openModals.shipping}
        onOpenChange={setShippingOpen}
        vehicles={vehicles}
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
        onBookTestDrive={() => { setDetailsOpen(false); setIsTestDriveOpen(true); }}
        isComparing={selectedVehicle ? comparedIds.has(selectedVehicle.id) : false}
        onToggleCompare={toggleCompare}
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
      <BookTestDriveModal
        vehicle={selectedVehicle}
        isOpen={isTestDriveOpen}
        onOpenChange={setIsTestDriveOpen}
      />
      <TradeInEstimatorModal
        isOpen={isTradeInOpen}
        onOpenChange={setIsTradeInOpen}
      />

      {/* ─── Floating elements ───────────────────────────────────── */}
      <ShopAssistant mode="float" vehicleHrefBase="/shop" />

      <SavedVehiclesFloatingButton savedVehicles={savedVehiclesData as Vehicle[]} />

      <ComparisonTray
        vehicles={comparedVehicles}
        onRemove={(id) => setComparedVehicles((prev) => prev.filter((v) => v.id !== id))}
        onClear={() => setComparedVehicles([])}
        onCompare={() => router.push(`/customer/compare?ids=${comparedVehicles.map((v) => v.id).join(",")}`)}
      />
    </div>
  );
}

export default function ShopVehiclesPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <ShopVehiclesContent />
    </React.Suspense>
  );
}
