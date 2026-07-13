"use client";

import * as React from "react";
import { Car, Package, RefreshCw } from "lucide-react";
import { CarInventoryCard } from "@/components/car-inventory-card";
import { PremiumVehicleCard } from "@/components/customer/PremiumVehicleCard";
import { ShippingQuoteModal } from "@/components/shipping-quote-modal";
import { VehicleDetailsModal } from "@/components/vehicle-details-modal";
import { VehicleInquiryModal } from "@/components/vehicle-inquiry-modal";
import { FinanceApplicationModal } from "@/components/finance-application-modal";
import { Button } from "@/components/ui/button";
import type { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import { ShopInventoryFilters } from "@/components/shop-inventory-filters";
import { InventoryPagination } from "@/components/inventory-pagination";
import { useAuth } from "@/providers/AuthProvider";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useInventoryActions } from "@/hooks/useInventoryActions";
import { useOrg } from "@/hooks/useOrg";
import { cn } from "@/lib/utils";

type SortOption =
  | "price-asc"
  | "price-desc"
  | "mileage-asc"
  | "mileage-desc"
  | "year-desc"
  | "createdAt-desc"
  | "year-asc"
  | "make-asc"
  | "make-desc"
  | "model-asc"
  | "model-desc"
  | "stockNumber-asc"
  | "stockNumber-desc"
  | "location-asc"
  | "location-desc"
  | "age-asc"
  | "age-desc"
  | "status-asc"
  | "status-desc"
  | "created-asc"
  | "created-desc"
  | "recent-asc"
  | "recent-desc"
  | "cost-asc"
  | "cost-desc"
  | "demand-desc"
  | "low-performing-desc";

const INVENTORY_SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "make-asc", label: "Make (A-Z)" },
  { value: "make-desc", label: "Make (Z-A)" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "mileage-asc", label: "Mileage: Low to High" },
  { value: "mileage-desc", label: "Mileage: High to Low" },
  { value: "year-desc", label: "Year: Newest" },
  { value: "year-asc", label: "Year: Oldest" },
  { value: "age-asc", label: "Newest on Lot" },
  { value: "age-desc", label: "Oldest on Lot" },
  { value: "created-desc", label: "Recently Added" },
  { value: "demand-desc", label: "Most Inquiries" },
  { value: "low-performing-desc", label: "Low Performing" },
];

function InventoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { isCustomer } = useOrg();

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [shippingRates, setShippingRates] = React.useState<
    Record<string, number>
  >({});
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

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
  const [limit, setLimit] = React.useState(
    Number(searchParams.get("limit")) || 12,
  );
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  const [filters, setFilters] = React.useState<any>({
    search: searchParams.get("search") || "",
    make: searchParams.get("make") || undefined,
    model: searchParams.get("model") || undefined,
    status: searchParams.get("status") || "all",
    year: searchParams.get("year")
      ? Number(searchParams.get("year"))
      : undefined,
    minPrice: searchParams.get("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined,
    maxPrice: searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined,
    minMileage: searchParams.get("minMileage")
      ? Number(searchParams.get("minMileage"))
      : undefined,
    maxMileage: searchParams.get("maxMileage")
      ? Number(searchParams.get("maxMileage"))
      : undefined,
    bodyStyle: searchParams.get("bodyStyle") || undefined,
    location: searchParams.get("location") || undefined,
    highDemand: searchParams.get("highDemand") === "true" ? true : undefined,
    lowPerforming:
      searchParams.get("lowPerforming") === "true" ? true : undefined,
    sortBy: searchParams.get("sortBy") || "make",
    sortOrder: searchParams.get("sortOrder") || "asc",
  });

  const [debouncedSearch, setDebouncedSearch] = React.useState(filters.search);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== undefined &&
        filters[key] !== "" &&
        filters[key] !== "all"
      ) {
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
  ]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await apiClient.get("/api/vehicles", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit,
          ...filters,
          search: debouncedSearch,
        },
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
        responseData?.pagination?.total ??
        responseData?.total ??
        vehiclesFromResponse.length;

      const totalPagesFromResponse =
        responseData?.pagination?.totalPages ??
        (limit > 0 ? Math.max(1, Math.ceil(totalFromResponse / limit)) : 1);

      setVehicles(vehiclesFromResponse);
      setTotal(totalFromResponse);
      setTotalPages(totalPagesFromResponse);
    } catch (err) {
      console.error("[Inventory] Error fetching vehicles:", err);
      const axiosError = err as AxiosError;
      if (axiosError.code !== "ERR_CANCELED") {
        setError(
          (axiosError.response?.data as any)?.message ||
          axiosError.message ||
          "Failed to load vehicles",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSortChange = (value: string) => {
    let sortBy = "createdAt";
    let sortOrder = "desc";

    switch (value as SortOption) {
      case "price-asc":
        sortBy = "price";
        sortOrder = "asc";
        break;
      case "price-desc":
        sortBy = "price";
        sortOrder = "desc";
        break;
      case "mileage-asc":
        sortBy = "mileage";
        sortOrder = "asc";
        break;
      case "mileage-desc":
        sortBy = "mileage";
        sortOrder = "desc";
        break;
      case "year-desc":
        sortBy = "year";
        sortOrder = "desc";
        break;
      case "createdAt-desc":
        sortBy = "createdAt";
        sortOrder = "desc";
        break;
      case "year-asc":
        sortBy = "year";
        sortOrder = "asc";
        break;
      case "make-asc":
        sortBy = "make";
        sortOrder = "asc";
        break;
      case "make-desc":
        sortBy = "make";
        sortOrder = "desc";
        break;
      case "model-asc":
        sortBy = "model";
        sortOrder = "asc";
        break;
      case "model-desc":
        sortBy = "model";
        sortOrder = "desc";
        break;
      case "stockNumber-asc":
        sortBy = "stockNumber";
        sortOrder = "asc";
        break;
      case "stockNumber-desc":
        sortBy = "stockNumber";
        sortOrder = "desc";
        break;
      case "location-asc":
        sortBy = "location";
        sortOrder = "asc";
        break;
      case "location-desc":
        sortBy = "location";
        sortOrder = "desc";
        break;
      case "age-asc":
        sortBy = "age";
        sortOrder = "asc";
        break;
      case "age-desc":
        sortBy = "age";
        sortOrder = "desc";
        break;
      case "status-asc":
        sortBy = "status";
        sortOrder = "asc";
        break;
      case "status-desc":
        sortBy = "status";
        sortOrder = "desc";
        break;
      case "created-asc":
        sortBy = "created";
        sortOrder = "asc";
        break;
      case "created-desc":
        sortBy = "created";
        sortOrder = "desc";
        break;
      case "recent-asc":
        sortBy = "recent";
        sortOrder = "asc";
        break;
      case "recent-desc":
        sortBy = "recent";
        sortOrder = "desc";
        break;
      case "cost-asc":
        sortBy = "cost";
        sortOrder = "asc";
        break;
      case "cost-desc":
        sortBy = "cost";
        sortOrder = "desc";
        break;
      case "demand-desc":
        sortBy = "demand";
        sortOrder = "desc";
        break;
      case "low-performing-desc":
        sortBy = "low-performing";
        sortOrder = "desc";
        break;
    }

    setFilters((prev: any) => ({ ...prev, sortBy, sortOrder }));
  };

  const currentSortValue = React.useMemo(() => {
    if (filters.sortBy === "price" && filters.sortOrder === "asc")
      return "price-asc";
    if (filters.sortBy === "price" && filters.sortOrder === "desc")
      return "price-desc";
    if (filters.sortBy === "mileage" && filters.sortOrder === "asc")
      return "mileage-asc";
    if (filters.sortBy === "mileage" && filters.sortOrder === "desc")
      return "mileage-desc";
    if (filters.sortBy === "year" && filters.sortOrder === "desc")
      return "year-desc";
    if (filters.sortBy === "make" && filters.sortOrder === "asc")
      return "make-asc";
    if (filters.sortBy === "demand" && filters.sortOrder === "desc")
      return "demand-desc";
    if (filters.sortBy === "low-performing" && filters.sortOrder === "desc")
      return "low-performing-desc";
    return "make-asc";
  }, [filters.sortBy, filters.sortOrder]);

  const handleCalculateQuote = async (formData: ShippingQuoteFormData) => {
    try {
      const token = await getToken();
      const response = await apiClient.post(
        "/api/quotes",
        {
          ...formData,
          toZip: formData.zipCode,
          toAddress: formData.fullAddress,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = response.data?.data || response.data;
      if (formData.vehicleId) {
        setShippingRates((prev) => ({
          ...prev,
          [formData.vehicleId!]: data.rate,
        }));
      }

      alert(`Quote created successfully! Rate: $${data.rate}`);
      setShippingOpen(false);
    } catch (error) {
      console.error("[Quote] Error creating quote:", error);
      alert("Failed to create quote");
    }
  };

  const handleCreateLoad = (vehicle: Vehicle) => {
    const params = new URLSearchParams();
    params.set("vin", vehicle.vin || "");
    params.set("make", vehicle.make || "");
    params.set("model", vehicle.model || "");
    params.set("year", vehicle.year?.toString() || "");
    params.set("location", vehicle.location || "");
    params.set("stockNumber", vehicle.stockNumber || "");

    router.push(`/transportation/create-load?${params.toString()}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 sm:p-8">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-destructive mb-2">
              Error Loading Inventory
            </h2>
            <p className="text-sm text-destructive/80 mb-4">{error}</p>
            <button
              onClick={fetchVehicles}
              className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-8xl flex-col gap-4 sm:gap-5 px-3 sm:px-4 py-4 sm:py-6">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0">
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-primary/0" />
          <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/6 blur-3xl pointer-events-none" />

          <div className="relative px-4 sm:px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                    Dealership
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-none text-foreground uppercase">
                    All <span className="text-primary">Inventory</span>
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Manage and review every vehicle on the lot
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground tabular-nums">
                    {isLoading ? (
                      <span className="inline-block h-2.5 w-6 rounded-full animate-pulse bg-muted-foreground/20" />
                    ) : total}
                    {" "}vehicles
                  </span>
                </div>
              </div>

              <button
                onClick={fetchVehicles}
                disabled={isLoading}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs font-medium transition-all shrink-0",
                  "text-foreground disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────── */}
      <div className="shrink-0">
        <ShopInventoryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          apiPath="/api/vehicles/filters"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentSortValue={currentSortValue}
          onSortChange={handleSortChange}
          sortOptions={INVENTORY_SORT_OPTIONS}
        />
      </div>

      {/* ─── Vehicle Grid / List ──────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                : "flex flex-col gap-2.5",
            )}
          >
            {[...Array(viewMode === "grid" ? 8 : 6)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl bg-muted animate-pulse dark:bg-zinc-900",
                  viewMode === "grid" ? "h-100" : "h-24",
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
          <div className="space-y-6 sm:space-y-8">
            <div
              className={cn(
                "items-stretch",
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                  : "flex flex-col gap-2.5",
              )}
            >
              {vehicles.map((vehicle) =>
                viewMode === "grid" ? (
                  <PremiumVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    shippingPrice={shippingRates[vehicle.id]}
                    onGetQuote={handleGetQuote}
                    onVehicleClick={handleVehicleClick}
                    onCheckAvailability={handleCheckAvailability}
                    onApplyNow={handleApplyNow}
                    onCallUs={handleCallUs}
                    onVideo={handleVideo}
                    onCreateLoad={!isCustomer ? handleCreateLoad : undefined}
                  />
                ) : (
                  <CarInventoryCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    viewMode="list"
                    shippingPrice={shippingRates[vehicle.id]}
                    onGetQuote={handleGetQuote}
                    onVehicleClick={handleVehicleClick}
                    onCheckAvailability={handleCheckAvailability}
                    onApplyNow={handleApplyNow}
                    onCallUs={handleCallUs}
                    onVideo={handleVideo}
                  />
                ),
              )}
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
        shippingQuote={
          selectedVehicle ? shippingRates[selectedVehicle.id] : null
        }
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

export default function InventoryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gap-3 p-8 text-muted-foreground">
          <Car className="h-5 w-5 animate-pulse" />
          Loading inventory...
        </div>
      }
    >
      <InventoryContent />
    </React.Suspense>
  );
}
