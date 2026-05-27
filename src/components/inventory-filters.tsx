"use client";

import * as React from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api-client";
import type { FilterOptions } from "@/types/inventory";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/providers/AuthProvider";

interface InventoryFiltersProps {
  filters: any;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  apiPath?: string; // New prop to allow context-specific filter endpoints
}

export function InventoryFilters({
  filters,
  onFilterChange,
  onBulkFilterChange,
  onClearFilters,
  apiPath = "/api/vehicles/filters", // Default to staff-level filters
}: InventoryFiltersProps & { onBulkFilterChange?: (newFilters: any) => void }) {
  const [filterOptions, setFilterOptions] =
    React.useState<FilterOptions | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasFetched, setHasFetched] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const { getToken } = useAuth();
  const fetchSequenceRef = React.useRef(0);

  // Local state for pending filter changes
  const [pendingFilters, setPendingFilters] = React.useState(filters);

  const buildFilterParams = React.useCallback((sourceFilters: any) => {
    const params: Record<string, any> = {};
    const keys = [
      "make",
      "model",
      "status",
      "year",
      "location",
      "bodyStyle",
      "minPrice",
      "maxPrice",
      "minMileage",
      "maxMileage",
    ];

    keys.forEach((key) => {
      const value = sourceFilters?.[key];
      if (value !== undefined && value !== "" && value !== "all") {
        params[key] = value;
      }
    });

    return params;
  }, []);

  const fetchFilters = React.useCallback(
    async (sourceFilters: any) => {
      const currentSequence = ++fetchSequenceRef.current;
      setIsLoading(true);
      setFetchError(null);
      try {
        const token = await getToken();
        const response = await apiClient.get(apiPath, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: buildFilterParams(sourceFilters),
          timeout: 10000,
        });

        if (currentSequence !== fetchSequenceRef.current) return;

        setFilterOptions(response.data.data ?? null);
        setHasFetched(true);
      } catch (error) {
        if (currentSequence !== fetchSequenceRef.current) return;

        console.error("Failed to fetch filter options:", error);
        setFetchError(
          "Unable to load filter options. You can still use available controls.",
        );
      } finally {
        if (currentSequence === fetchSequenceRef.current) {
          setIsLoading(false);
        }
      }
    },
    [apiPath, buildFilterParams, getToken],
  );

  React.useEffect(() => {
    if (hasFetched || isLoading) return;
    fetchFilters(filters);
  }, [hasFetched, isLoading, fetchFilters, filters]);

  React.useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchFilters(pendingFilters);
    }, 220);

    return () => clearTimeout(timer);
  }, [isOpen, pendingFilters, fetchFilters]);

  // Sync pending filters with prop filters when sheet opens or filters change externally
  React.useEffect(() => {
    if (isOpen) {
      setPendingFilters(filters);
    }
  }, [isOpen, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Search remains immediate (debounced in parent)
    onFilterChange("search", e.target.value);
  };

  const handlePendingChange = (key: string, value: any) => {
    setPendingFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    if (onBulkFilterChange) {
      onBulkFilterChange(pendingFilters);
    } else {
      // Fallback if bulk handler not provided
      Object.keys(pendingFilters).forEach((key) => {
        if (pendingFilters[key] !== filters[key]) {
          onFilterChange(key, pendingFilters[key]);
        }
      });
    }
    setIsOpen(false);
  };

  const clearPendingFilters = () => {
    const clearedState = {
      ...pendingFilters,
      make: undefined,
      model: undefined,
      status: "all",
      year: undefined, // ensure these match the initial state structure if needed
      minPrice: undefined,
      maxPrice: undefined,
      minMileage: undefined,
      maxMileage: undefined,
      bodyStyle: undefined,
      location: undefined,
      highDemand: undefined,
      lowPerforming: undefined,
    };
    setPendingFilters(clearedState);
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) =>
      key !== "search" &&
      key !== "page" &&
      key !== "limit" &&
      key !== "sortBy" &&
      key !== "sortOrder" &&
      filters[key],
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by VIN, Make, Model, or Stock #..."
            className="pl-9"
            value={filters.search || ""}
            onChange={handleSearchChange}
          />
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0 px-3 sm:px-4">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1.5 font-normal"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-75 sm:w-100 flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Filter Inventory</SheetTitle>
              <SheetDescription>
                Refine your vehicle search with detailed options.
              </SheetDescription>
            </SheetHeader>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto pr-2">
              {(isLoading || fetchError) && (
                <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground flex items-center justify-between gap-3">
                  <span>{fetchError ?? "Loading filter options..."}</span>
                  {fetchError && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => fetchFilters(pendingFilters)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              )}

              <>
                {/* Make Filter */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Make</h4>
                  <Select
                    value={pendingFilters.make || "all"}
                    onValueChange={(value: string) =>
                      handlePendingChange(
                        "make",
                        value === "all" ? undefined : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Makes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Makes</SelectItem>
                      {(filterOptions?.makes ?? []).map((make) => (
                        <SelectItem key={make} value={make}>
                          {make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Filter */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Model</h4>
                  <Select
                    value={pendingFilters.model || "all"}
                    onValueChange={(value: string) =>
                      handlePendingChange(
                        "model",
                        value === "all" ? undefined : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Models" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Models</SelectItem>
                      {(filterOptions?.models ?? []).map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Status Filter */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Status</h4>
                  <Select
                    value={pendingFilters.status || "all"}
                    onValueChange={(value: string) =>
                      handlePendingChange(
                        "status",
                        value === "all" ? undefined : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {(filterOptions?.statuses?.length
                        ? filterOptions.statuses
                        : ["Ready for Sale", "In Recon", "Sold"]
                      ).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Range */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Year</h4>
                  <Select
                    value={String(pendingFilters.year || "all")}
                    onValueChange={(value: string) =>
                      handlePendingChange(
                        "year",
                        value === "all" ? undefined : Number(value),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {(filterOptions?.years ?? []).map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Price Range */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Price Range</h4>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="w-full"
                      value={pendingFilters.minPrice || ""}
                      onChange={(e) =>
                        handlePendingChange(
                          "minPrice",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      className="w-full"
                      value={pendingFilters.maxPrice || ""}
                      onChange={(e) =>
                        handlePendingChange(
                          "maxPrice",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </div>
                </div>

                {/* Mileage Range */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Mileage</h4>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="w-full"
                      value={pendingFilters.minMileage || ""}
                      onChange={(e) =>
                        handlePendingChange(
                          "minMileage",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      className="w-full"
                      value={pendingFilters.maxMileage || ""}
                      onChange={(e) =>
                        handlePendingChange(
                          "maxMileage",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Body Style Filter */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Body Style</h4>
                  <Select
                    value={pendingFilters.bodyStyle || "all"}
                    onValueChange={(value: string) =>
                      handlePendingChange(
                        "bodyStyle",
                        value === "all" ? undefined : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Body Styles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Styles</SelectItem>
                      {(filterOptions?.bodyStyles ?? []).map((style) => (
                        <SelectItem key={style} value={style}>
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Location</h4>
                  <Select
                    value={pendingFilters.location || "all"}
                    onValueChange={(value: string) =>
                      handlePendingChange(
                        "location",
                        value === "all" ? undefined : value,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[70]">
                      <SelectItem value="all">All Locations</SelectItem>
                      {(filterOptions?.locations ?? []).map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* High Demand Filter */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      High Demand Only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show vehicles with at least one inquiry
                    </p>
                  </div>
                  <Switch
                    checked={!!pendingFilters.highDemand}
                    onCheckedChange={(checked) =>
                      handlePendingChange(
                        "highDemand",
                        checked ? true : undefined,
                      )
                    }
                  />
                </div>

                {/* Low Performing Filter */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Low Performing Only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      No inquiries &amp; 30+ days on lot
                    </p>
                  </div>
                  <Switch
                    checked={!!pendingFilters.lowPerforming}
                    onCheckedChange={(checked) =>
                      handlePendingChange(
                        "lowPerforming",
                        checked ? true : undefined,
                      )
                    }
                  />
                </div>
              </>
            </div>

            <div className="py-2 px-6 border-t mt-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={clearPendingFilters}
              >
                Reset
              </Button>
              <Button type="button" className="flex-1" onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Summary (Optional, good for UX) */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries(filters).map(([key, value]) => {
            if (
              !value ||
              key === "search" ||
              key === "page" ||
              key === "limit" ||
              key === "sortBy" ||
              key === "sortOrder"
            )
              return null;
            return (
              <Badge
                key={key}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {key}: {value as React.ReactNode}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  // Clearing a single filter immediately or we could technically defer this too but immediate is standard for "chips"
                  onClick={() => onFilterChange(key, undefined)}
                />
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
