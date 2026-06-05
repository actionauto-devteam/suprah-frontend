"use client";

import * as React from "react";
import { CarInventoryCard } from "@/components/car-inventory-card";
import type { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import { RefreshCw, Star, Package } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import ShopAssistant from "@/components/ShopAssistant";

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
  { value: "make-asc", label: "Make (A–Z)" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "year-desc", label: "Year: Newest" },
  { value: "demand-desc", label: "Most Inquiries" },
  { value: "low-performing-desc", label: "Low Performing" },
];

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
    sortBy: searchParams.get("sortBy") || "make",
    sortOrder: searchParams.get("sortOrder") || "asc",
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
      console.error("[Shop] Error fetching vehicles:", err);
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
    page,
    limit,
    debouncedSearch,
    filters.make,
    filters.model,
    filters.status,
    filters.year,
    filters.minPrice,
    filters.maxPrice,
    filters.minMileage,
    filters.maxMileage,
    filters.bodyStyle,
    filters.location,
    filters.highDemand,
    filters.lowPerforming,
    filters.sortBy,
    filters.sortOrder,
    fetchVehicles,
  ]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchVehicles();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      make: undefined,
      model: undefined,
      status: "all",
      year: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minMileage: undefined,
      maxMileage: undefined,
      bodyStyle: undefined,
      location: undefined,
      highDemand: undefined,
      lowPerforming: undefined,
      sortBy: "make",
      sortOrder: "asc",
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
      "price-asc":           { sortBy: "price",         sortOrder: "asc" },
      "price-desc":          { sortBy: "price",         sortOrder: "desc" },
      "mileage-asc":         { sortBy: "mileage",       sortOrder: "asc" },
      "mileage-desc":        { sortBy: "mileage",       sortOrder: "desc" },
      "year-desc":           { sortBy: "year",          sortOrder: "desc" },
      "make-asc":            { sortBy: "make",          sortOrder: "asc" },
      "demand-desc":         { sortBy: "demand",        sortOrder: "desc" },
      "low-performing-desc": { sortBy: "low-performing", sortOrder: "desc" },
    };
    const mapped = sortMap[value] ?? { sortBy: "make", sortOrder: "asc" };
    setFilters((prev: any) => ({ ...prev, ...mapped }));
  };

  const currentSortValue = React.useMemo((): SortOption => {
    const key = `${filters.sortBy}-${filters.sortOrder}`;
    const aliases: Record<string, SortOption> = {
      "price-asc":           "price-asc",
      "price-desc":          "price-desc",
      "mileage-asc":         "mileage-asc",
      "mileage-desc":        "mileage-desc",
      "year-desc":           "year-desc",
      "make-asc":            "make-asc",
      "demand-desc":         "demand-desc",
      "low-performing-desc": "low-performing-desc",
    };
    return aliases[key] ?? "make-asc";
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
        />
      )),
    [vehicles, shippingRates, viewMode, handleCheckAvailability, handleApplyNow, handleCallUs, handleVideo, handleGetQuote, handleVehicleClick],
  );

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Vehicles</h2>
            <p className="text-red-500/80 mb-4">{error}</p>
            <button
              onClick={fetchVehicles}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-8xl flex-col space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="shrink-0 pb-5 border-b border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 min-w-0">
            {/* Eyebrow */}
            <div className="flex items-center gap-2.5">
              <div className="h-px w-6 bg-primary" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80 leading-none">
                Marketplace
              </span>
            </div>

            {/* Title with hover tooltip */}
            <div className="relative group/hdrtip">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase leading-none cursor-default select-none text-foreground">
                Shop{" "}
                <span className="text-primary">Vehicles</span>
              </h1>
              <div
                className={cn(
                  "pointer-events-none absolute top-full left-0 mt-3 w-64 z-20",
                  "rounded-xl border border-border/80 bg-popover/95 backdrop-blur-sm p-4 shadow-xl",
                  "opacity-0 translate-y-1 group-hover/hdrtip:opacity-100 group-hover/hdrtip:translate-y-0",
                  "transition-all duration-200",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Star className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-bold text-foreground">Member Exclusive</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Browse our premium inventory and take advantage of Member Exclusive pricing — available to Suprah members only.
                </p>
              </div>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-3 py-1 text-xs font-semibold text-foreground tabular-nums">
                {isLoading ? (
                  <span className="inline-block h-2.5 w-8 rounded animate-pulse bg-muted-foreground/20" />
                ) : (
                  total
                )}{" "}
                Available
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Star className="h-3 w-3" />
                Member Pricing
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Package className="h-3 w-3" />
                Shipping Quotes
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0 mt-1">
            <button
              onClick={fetchVehicles}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                "border-border bg-card hover:bg-muted hover:border-primary/40 text-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              title="Refresh inventory"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {isLoading ? "Updating..." : lastUpdated ? `Updated ${formatDistanceToNow(lastUpdated, { addSuffix: true })}` : "Live"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="shrink-0">
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

        {/* Vehicle count line */}
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-bold text-foreground tabular-nums">{total}</span> vehicles found
        </p>
      </div>

      {/* ── Vehicle Grid / List ───────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                : "flex flex-col gap-2.5",
            )}
          >
            {[...Array(viewMode === "grid" ? 6 : 8)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl bg-zinc-100 animate-pulse dark:bg-zinc-900",
                  viewMode === "grid" ? "h-72" : "h-24",
                )}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
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

      {/* ── Suprah Autrix — AI vehicle recommendation assistant ──────────────── */}
      {/* Floating launcher; overlays the page without affecting the grid layout. */}
      {/* Set `vehicleHrefBase` to your dedicated vehicle-detail route. Or reuse  */}
      {/* the existing details modal by passing onViewVehicle (see note below).  */}
      <ShopAssistant mode="float" vehicleHrefBase="/shop" />
    </div>
  );
}

export default function ShopVehiclesPage() {
  return (
    <React.Suspense
      fallback={<div className="p-8 flex items-center justify-center">Loading...</div>}
    >
      <ShopVehiclesContent />
    </React.Suspense>
  );
}