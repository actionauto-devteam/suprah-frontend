"use client";

import * as React from "react";
import { Check, ChevronDown, RefreshCw } from "lucide-react";
import { CarInventoryCard } from "@/components/car-inventory-card";
import { PremiumVehicleCard } from "@/components/customer/PremiumVehicleCard";
import { ShippingQuoteModal } from "@/components/shipping-quote-modal";
import { VehicleDetailsModal } from "@/components/vehicle-details-modal";
import { VehicleInquiryModal } from "@/components/vehicle-inquiry-modal";
import { FinanceApplicationModal } from "@/components/finance-application-modal";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import { InventoryFilters } from "@/components/inventory-filters";
import { InventoryPagination } from "@/components/inventory-pagination";
import { useAuth } from "@/providers/AuthProvider";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useInventoryActions } from "@/hooks/useInventoryActions";
import { useOrg } from "@/hooks/useOrg";
import { LayoutGrid, Table as TableIcon } from "lucide-react";

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

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isPremiumView, setIsPremiumView] = React.useState(true);
  const [shippingRates, setShippingRates] = React.useState<
    Record<string, number>
  >({});
  const [isSortSheetOpen, setIsSortSheetOpen] = React.useState(false);

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
  const { isCustomer } = useOrg();

  // Pagination State
  const [page, setPage] = React.useState(Number(searchParams.get("page")) || 1);
  const [limit, setLimit] = React.useState(
    Number(searchParams.get("limit")) || 12,
  );
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filter State
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

  // Debounced search term
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

  // Auto-modal logic removed as we now use dedicated vehicle pages

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleBulkFilterChange = (newFilters: any) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters }));
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

  const handleSortChange = (value: SortOption) => {
    let sortBy = "createdAt";
    let sortOrder = "desc";

    switch (value) {
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

  const currentSortLabel = React.useMemo(() => {
    return (
      INVENTORY_SORT_OPTIONS.find((option) => option.value === currentSortValue)
        ?.label ?? "Make (A-Z)"
    );
  }, [currentSortValue]);

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
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              Error Loading Inventory
            </h2>
            <p className="text-destructive/80 mb-4">{error}</p>
            <button
              onClick={fetchVehicles}
              className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-8xl mx-auto px-4 py-4 space-y-4">
          <InventoryFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onBulkFilterChange={handleBulkFilterChange}
            onClearFilters={handleClearFilters}
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                <span className="font-bold text-foreground">{total}</span>{" "}
                Vehicles Found
              </p>
              <button
                onClick={fetchVehicles}
                disabled={isLoading}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Sort by
              </span>
              <div className="relative hidden md:block">
                <select
                  value={currentSortValue}
                  onChange={(e) =>
                    handleSortChange(e.target.value as SortOption)
                  }
                  className="appearance-none border border-border rounded px-3 py-1.5 pr-8 text-sm bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all cursor-pointer"
                >
                  {INVENTORY_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <div className="md:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSortSheetOpen(true)}
                  className="h-9 min-w-42.5 justify-between gap-2"
                >
                  <span className="truncate">{currentSortLabel}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <Sheet open={isSortSheetOpen} onOpenChange={setIsSortSheetOpen}>
                <SheetContent
                  side="bottom"
                  className="rounded-t-2xl p-0 max-h-[70vh]"
                  showCloseButton={false}
                >
                  <SheetHeader className="border-b border-border px-4 py-3">
                    <SheetTitle className="text-base font-semibold">
                      Sort Inventory
                    </SheetTitle>
                  </SheetHeader>
                  <div className="max-h-[65vh] overflow-y-auto p-2">
                    {INVENTORY_SORT_OPTIONS.map((option) => {
                      const isSelected = currentSortValue === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            handleSortChange(option.value);
                            setIsSortSheetOpen(false);
                          }}
                          className={`w-full rounded-md px-3 py-3 text-left text-sm flex items-center justify-between transition-colors ${isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                        >
                          <span>{option.label}</span>
                          {isSelected ? <Check className="h-4 w-4" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-8xl mx-auto px-4 py-8 w-full bg-muted/20 rounded-xl">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-100 bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            <div
              className={`grid gap-6 items-stretch ${isPremiumView ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}
            >
              {vehicles.map((vehicle) =>
                isPremiumView ? (
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
                    shippingPrice={shippingRates[vehicle.id]}
                    onGetQuote={handleGetQuote}
                    onVehicleClick={handleVehicleClick}
                    onCheckAvailability={handleCheckAvailability}
                    onApplyNow={handleApplyNow}
                    onCallUs={handleCallUs}
                    onVideo={handleVideo}
                    onCreateLoad={!isCustomer ? handleCreateLoad : undefined}
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
        <div className="min-h-screen flex items-center justify-center p-8">
          Loading...
        </div>
      }
    >
      <InventoryContent />
    </React.Suspense>
  );
}
