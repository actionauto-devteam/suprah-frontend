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

function compareText(a?: string, b?: string) {
  const left = a?.trim();
  const right = b?.trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function compareNumber(a?: number, b?: number) {
  const left = Number.isFinite(a) ? a! : undefined;
  const right = Number.isFinite(b) ? b! : undefined;
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}

function compareDate(a?: string, b?: string) {
  const left = a ? Date.parse(a) : Number.NaN;
  const right = b ? Date.parse(b) : Number.NaN;
  const validLeft = Number.isFinite(left);
  const validRight = Number.isFinite(right);
  if (!validLeft && !validRight) return 0;
  if (!validLeft) return 1;
  if (!validRight) return -1;
  return left - right;
}

function stableVehicleTieBreak(a: Vehicle, b: Vehicle) {
  return (
    compareText(a.make, b.make) ||
    compareText(a.model, b.model) ||
    compareText(a.stockNumber, b.stockNumber) ||
    compareText(a.id, b.id)
  );
}

function sortInventoryVehicles(
  items: Vehicle[],
  sortBy: string,
  sortOrder: string,
) {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    let result = 0;

    switch (sortBy) {
      case "price":
        result = compareNumber(a.price, b.price);
        break;
      case "mileage":
        result = compareNumber(a.mileage, b.mileage);
        break;
      case "year":
        result = compareNumber(a.year, b.year);
        break;
      case "make":
        result = compareText(a.make, b.make) || compareText(a.model, b.model);
        break;
      case "model":
        result = compareText(a.model, b.model);
        break;
      case "stockNumber":
        result = compareText(a.stockNumber, b.stockNumber);
        break;
      case "location":
        result = compareText(a.location, b.location);
        break;
      case "age":
        result = compareNumber(a.daysOnLot, b.daysOnLot);
        break;
      case "status":
        result = compareText(a.status, b.status);
        break;
      case "cost":
        result = compareNumber(a.cost, b.cost);
        break;
      case "created":
      case "createdAt":
      case "recent":
        result = compareDate(a.dateAdded, b.dateAdded);
        break;
      case "demand":
        result = compareNumber(a.leadCount ?? 0, b.leadCount ?? 0);
        break;
      case "low-performing": {
        // Match the backend definition: oldest vehicles first, then the fewest
        // inquiries. This is intentionally independent from sortOrder.
        const daysResult = compareNumber(b.daysOnLot, a.daysOnLot);
        if (daysResult !== 0) return daysResult;
        const leadResult = compareNumber(a.leadCount ?? 0, b.leadCount ?? 0);
        return leadResult || stableVehicleTieBreak(a, b);
      }
      default:
        result = compareText(a.make, b.make) || compareText(a.model, b.model);
        break;
    }

    return result === 0
      ? stableVehicleTieBreak(a, b)
      : result * direction;
  });
}

function InventoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { isCustomer } = useOrg();

  // Keep the complete filtered inventory in memory. Sorting and pagination are
  // derived locally, so choosing a sort option never performs a second request
  // and never replaces the grid with another server response.
  const [allVehicles, setAllVehicles] = React.useState<Vehicle[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const requestSequenceRef = React.useRef(0);
  const requestControllerRef = React.useRef<AbortController | null>(null);
  const hasLoadedOnceRef = React.useRef(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shippingRates, setShippingRates] = React.useState<Record<string, number>>({});
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
  const [limit, setLimit] = React.useState(Number(searchParams.get("limit")) || 12);

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
  const [metricsReady, setMetricsReady] = React.useState(false);
  const metricsRequestRef = React.useRef<Promise<void> | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const fetchVehicles = React.useCallback(
    async (showInitialLoader = false) => {
      const requestSequence = ++requestSequenceRef.current;
      requestControllerRef.current?.abort();

      const controller = new AbortController();
      requestControllerRef.current = controller;

      if (showInitialLoader && !hasLoadedOnceRef.current) {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const token = await getToken();
        const response = await apiClient.get("/api/vehicles", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            // Load the inventory data once, without the expensive lead-count
            // lookup. All normal filtering, sorting, and pagination happen
            // locally after this request.
            all: "true",
            sortBy: "make",
            sortOrder: "asc",
          },
          signal: controller.signal,
          timeout: 15000,
        });

        if (requestSequence !== requestSequenceRef.current) return;

        const responseData = response.data?.data ?? response.data;
        const vehiclesFromResponse = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.vehicles)
            ? responseData.vehicles
            : Array.isArray(responseData?.data?.vehicles)
              ? responseData.data.vehicles
              : [];

        setAllVehicles(vehiclesFromResponse);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        const axiosError = err as AxiosError;

        if (
          axiosError.code === "ERR_CANCELED" ||
          controller.signal.aborted ||
          requestSequence !== requestSequenceRef.current
        ) {
          return;
        }

        console.error("[Inventory] Error fetching vehicles:", err);
        setError(
          (axiosError.response?.data as any)?.message ||
            axiosError.message ||
            "Failed to load vehicles",
        );
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [getToken],
  );

  // Demand metrics are the only expensive part of the backend inventory query.
  // Fetch them separately and merge only `leadCount` into the existing vehicle
  // objects. This keeps the first render and every normal filter/sort action
  // independent from that lookup.
  const fetchDemandMetrics = React.useCallback(async () => {
    if (metricsReady) return;
    if (metricsRequestRef.current) return metricsRequestRef.current;

    const task = (async () => {
      try {
        const token = await getToken();
        const response = await apiClient.get("/api/vehicles", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            all: "true",
            includeMetrics: "true",
            metricsOnly: "true",
            sortBy: "make",
            sortOrder: "asc",
          },
          timeout: 20000,
        });

        const responseData = response.data?.data ?? response.data;
        const metricVehicles: Vehicle[] = Array.isArray(responseData?.vehicles)
          ? responseData.vehicles
          : [];

        const counts = new Map(
          metricVehicles.map((vehicle) => [vehicle.id, vehicle.leadCount ?? 0]),
        );

        setAllVehicles((current) =>
          current.map((vehicle) => {
            const leadCount = counts.get(vehicle.id);
            if (leadCount === undefined || vehicle.leadCount === leadCount) {
              return vehicle;
            }
            return { ...vehicle, leadCount };
          }),
        );
        setMetricsReady(true);
      } catch (err) {
        console.warn("[Inventory] Demand metrics prefetch failed:", err);
      } finally {
        metricsRequestRef.current = null;
      }
    })();

    metricsRequestRef.current = task;
    return task;
  }, [getToken, metricsReady]);

  React.useEffect(() => {
    void fetchVehicles(!hasLoadedOnceRef.current);
    return () => requestControllerRef.current?.abort();
  }, [fetchVehicles]);

  // Do not make demand metrics part of the critical page load. Warm them after
  // the inventory is already usable so "Most Inquiries" remains ready later.
  React.useEffect(() => {
    if (!hasLoadedOnceRef.current || metricsReady) return;

    let cancelled = false;
    const start = () => {
      if (!cancelled) void fetchDemandMetrics();
    };

    let idleId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = (window as any).requestIdleCallback(start, { timeout: 2500 });
      } else {
        start();
      }
    }, 6000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [allVehicles.length, fetchDemandMetrics, metricsReady]);

  const filteredVehicles = React.useMemo(() => {
    const search = debouncedSearch.trim().toLowerCase();

    return allVehicles.filter((vehicle) => {
      if (search) {
        const haystack = [
          vehicle.make,
          vehicle.model,
          vehicle.vin,
          vehicle.stockNumber,
          vehicle.year?.toString(),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      if (
        filters.make &&
        vehicle.make?.toLowerCase() !== String(filters.make).toLowerCase()
      ) {
        return false;
      }

      if (
        filters.model &&
        vehicle.model?.toLowerCase() !== String(filters.model).toLowerCase()
      ) {
        return false;
      }

      if (
        filters.status &&
        filters.status !== "all" &&
        vehicle.status !== filters.status
      ) {
        return false;
      }

      if (filters.year && vehicle.year !== Number(filters.year)) return false;

      if (
        filters.bodyStyle &&
        vehicle.bodyStyle?.toLowerCase() !==
          String(filters.bodyStyle).toLowerCase()
      ) {
        return false;
      }

      if (filters.location) {
        const location = vehicle.location?.toLowerCase() ?? "";
        if (!location.includes(String(filters.location).toLowerCase())) {
          return false;
        }
      }

      if (
        filters.minPrice !== undefined &&
        (vehicle.price ?? 0) < Number(filters.minPrice)
      ) {
        return false;
      }

      if (
        filters.maxPrice !== undefined &&
        (vehicle.price ?? 0) > Number(filters.maxPrice)
      ) {
        return false;
      }

      if (
        filters.minMileage !== undefined &&
        (vehicle.mileage ?? 0) < Number(filters.minMileage)
      ) {
        return false;
      }

      if (
        filters.maxMileage !== undefined &&
        (vehicle.mileage ?? 0) > Number(filters.maxMileage)
      ) {
        return false;
      }

      if (filters.highDemand && metricsReady && (vehicle.leadCount ?? 0) < 1) {
        return false;
      }

      if (
        filters.lowPerforming &&
        metricsReady &&
        !((vehicle.leadCount ?? 0) === 0 && (vehicle.daysOnLot ?? 0) >= 30)
      ) {
        return false;
      }

      return true;
    });
  }, [
    allVehicles,
    debouncedSearch,
    filters.make,
    filters.model,
    filters.status,
    filters.year,
    filters.bodyStyle,
    filters.location,
    filters.minPrice,
    filters.maxPrice,
    filters.minMileage,
    filters.maxMileage,
    filters.highDemand,
    filters.lowPerforming,
    metricsReady,
  ]);

  const sortedVehicles = React.useMemo(
    () =>
      sortInventoryVehicles(
        filteredVehicles,
        filters.sortBy,
        filters.sortOrder,
      ),
    [filteredVehicles, filters.sortBy, filters.sortOrder],
  );

  const total = sortedVehicles.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visibleVehicles = React.useMemo(() => {
    const start = (page - 1) * limit;
    return sortedVehicles.slice(start, start + limit);
  }, [sortedVehicles, page, limit]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Keep filters/sort/page shareable without invoking a Next.js navigation.
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== "" && value !== "all") {
        params.set(key, String(value));
      }
    });

    const nextUrl = `${pathname}?${params.toString()}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [
    pathname,
    page,
    limit,
    filters.search,
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

  const handleFilterChange = React.useCallback(
    (key: string, value: any) => {
      if (
        (key === "highDemand" || key === "lowPerforming") &&
        value &&
        !metricsReady
      ) {
        void fetchDemandMetrics();
      }

      setFilters((prev: any) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    [fetchDemandMetrics, metricsReady],
  );

  const handleClearFilters = React.useCallback(() => {
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
  }, []);

  const handleSortChange = React.useCallback(
    (value: string) => {
      let sortBy = "createdAt";
      let sortOrder = "desc";

      switch (value as SortOption) {
        case "price-asc": sortBy = "price"; sortOrder = "asc"; break;
        case "price-desc": sortBy = "price"; sortOrder = "desc"; break;
        case "mileage-asc": sortBy = "mileage"; sortOrder = "asc"; break;
        case "mileage-desc": sortBy = "mileage"; sortOrder = "desc"; break;
        case "year-desc": sortBy = "year"; sortOrder = "desc"; break;
        case "createdAt-desc": sortBy = "createdAt"; sortOrder = "desc"; break;
        case "year-asc": sortBy = "year"; sortOrder = "asc"; break;
        case "make-asc": sortBy = "make"; sortOrder = "asc"; break;
        case "make-desc": sortBy = "make"; sortOrder = "desc"; break;
        case "model-asc": sortBy = "model"; sortOrder = "asc"; break;
        case "model-desc": sortBy = "model"; sortOrder = "desc"; break;
        case "stockNumber-asc": sortBy = "stockNumber"; sortOrder = "asc"; break;
        case "stockNumber-desc": sortBy = "stockNumber"; sortOrder = "desc"; break;
        case "location-asc": sortBy = "location"; sortOrder = "asc"; break;
        case "location-desc": sortBy = "location"; sortOrder = "desc"; break;
        case "age-asc": sortBy = "age"; sortOrder = "asc"; break;
        case "age-desc": sortBy = "age"; sortOrder = "desc"; break;
        case "status-asc": sortBy = "status"; sortOrder = "asc"; break;
        case "status-desc": sortBy = "status"; sortOrder = "desc"; break;
        case "created-asc": sortBy = "created"; sortOrder = "asc"; break;
        case "created-desc": sortBy = "created"; sortOrder = "desc"; break;
        case "recent-asc": sortBy = "recent"; sortOrder = "asc"; break;
        case "recent-desc": sortBy = "recent"; sortOrder = "desc"; break;
        case "cost-asc": sortBy = "cost"; sortOrder = "asc"; break;
        case "cost-desc": sortBy = "cost"; sortOrder = "desc"; break;
        case "demand-desc":
          sortBy = "demand";
          sortOrder = "desc";
          if (!metricsReady) void fetchDemandMetrics();
          break;
        case "low-performing-desc":
          sortBy = "low-performing";
          sortOrder = "desc";
          if (!metricsReady) void fetchDemandMetrics();
          break;
      }

      setFilters((prev: any) => ({ ...prev, sortBy, sortOrder }));
      setPage(1);
    },
    [fetchDemandMetrics, metricsReady],
  );

  const currentSortValue = React.useMemo(() => {
    const value = `${filters.sortBy}-${filters.sortOrder}`;
    return INVENTORY_SORT_OPTIONS.some((option) => option.value === value)
      ? (value as SortOption)
      : "make-asc";
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

  const handleCreateLoad = React.useCallback((vehicle: Vehicle) => {
    const params = new URLSearchParams();
    params.set("vin", vehicle.vin || "");
    params.set("make", vehicle.make || "");
    params.set("model", vehicle.model || "");
    params.set("year", vehicle.year?.toString() || "");
    params.set("location", vehicle.location || "");
    params.set("stockNumber", vehicle.stockNumber || "");

    router.push(`/transportation/create-load?${params.toString()}`);
  }, [router]);

  if (error && !hasLoadedOnceRef.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 sm:p-8">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-destructive mb-2">
              Error Loading Inventory
            </h2>
            <p className="text-sm text-destructive/80 mb-4">{error}</p>
            <button
              onClick={() => fetchVehicles(true)}
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
                    {isInitialLoading ? (
                      <span className="inline-block h-2.5 w-6 rounded-full animate-pulse bg-muted-foreground/20" />
                    ) : total}
                    {" "}vehicles
                  </span>
                </div>
              </div>

              <button
                onClick={() => fetchVehicles(false)}
                disabled={isInitialLoading || isRefreshing}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs font-medium transition-all shrink-0",
                  "text-foreground disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", (isInitialLoading || isRefreshing) && "animate-spin")} />
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
        {isInitialLoading ? (
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
        ) : visibleVehicles.length === 0 ? (
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
              {visibleVehicles.map((vehicle) =>
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
        vehicles={visibleVehicles}
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