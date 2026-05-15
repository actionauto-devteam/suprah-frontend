"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check } from "lucide-react";

import { InventoryFilters } from "@/components/inventory-filters";
import { InventoryPagination } from "@/components/inventory-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/types/inventory";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

const DRAFT_STORAGE_KEY = "crm-appointment-draft";

type AppointmentDraft = {
    version?: number;
    resume?: boolean;
    formData?: Record<string, unknown>;
    selectedVehicles?: Vehicle[];
    meta?: Record<string, unknown>;
};

const createVehicleFilters = () => ({
    search: "",
    make: undefined as string | undefined,
    model: undefined as string | undefined,
    status: "all",
    year: undefined as number | undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minMileage: undefined as number | undefined,
    maxMileage: undefined as number | undefined,
    bodyStyle: undefined as string | undefined,
    location: undefined as string | undefined,
    sortBy: "make",
    sortOrder: "asc",
});

export default function AppointmentVehiclePickerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getToken } = useAuth();

    const returnToParam = searchParams.get("returnTo") || "/crm/appointments";
    const returnTo = decodeURIComponent(returnToParam);

    const [vehicleFilters, setVehicleFilters] = React.useState(createVehicleFilters);
    const [debouncedSearch, setDebouncedSearch] = React.useState("");
    const [vehiclePage, setVehiclePage] = React.useState(1);
    const [vehicleTotalPages, setVehicleTotalPages] = React.useState(1);
    const [vehicleTotal, setVehicleTotal] = React.useState(0);
    const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [vehicleError, setVehicleError] = React.useState<string | null>(null);
    const [selectedVehicles, setSelectedVehicles] = React.useState<Vehicle[]>([]);

    const readDraft = React.useCallback((): AppointmentDraft | null => {
        if (typeof window === "undefined") return null;
        const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (!stored) return null;

        try {
            return JSON.parse(stored) as AppointmentDraft;
        } catch {
            return null;
        }
    }, []);

    const writeDraft = React.useCallback((draft: AppointmentDraft) => {
        if (typeof window === "undefined") return;
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }, []);

    React.useEffect(() => {
        const draft = readDraft();
        setSelectedVehicles(draft?.selectedVehicles || []);
    }, [readDraft]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(vehicleFilters.search.trim());
            setVehiclePage(1);
        }, 350);

        return () => clearTimeout(timer);
    }, [vehicleFilters.search]);

    React.useEffect(() => {
        let isActive = true;

        const fetchVehicles = async () => {
            setIsLoading(true);
            setVehicleError(null);

            try {
                const token = await getToken();
                if (!token) throw new Error("Authentication required");

                const requestParams: Record<string, unknown> = {
                    page: vehiclePage,
                    limit: 12,
                    ...vehicleFilters,
                    search: debouncedSearch || undefined,
                };

                Object.keys(requestParams).forEach((key) => {
                    const value = requestParams[key];
                    if (value === undefined || value === "" || value === "all") {
                        delete requestParams[key];
                    }
                });

                const response = await apiClient.get("/api/vehicles", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: requestParams,
                });

                const data = response.data?.data || response.data;
                if (!isActive) return;

                setVehicles(data.vehicles || []);
                setVehicleTotalPages(data.pagination?.totalPages || 1);
                setVehicleTotal(data.pagination?.total || 0);
            } catch (err: any) {
                if (!isActive) return;
                setVehicleError(
                    err?.response?.data?.message || err?.message || "Failed to load vehicles",
                );
                setVehicles([]);
                setVehicleTotalPages(1);
                setVehicleTotal(0);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };

        fetchVehicles();
        return () => {
            isActive = false;
        };
    }, [vehiclePage, debouncedSearch, vehicleFilters, getToken]);

    const handleVehicleFilterChange = (key: string, value: any) => {
        setVehicleFilters((prev) => ({ ...prev, [key]: value }));
        setVehiclePage(1);
    };

    const handleVehicleBulkFilterChange = (nextFilters: any) => {
        setVehicleFilters(nextFilters);
        setVehiclePage(1);
    };

    const handleVehicleClearFilters = () => {
        setVehicleFilters(createVehicleFilters());
        setVehiclePage(1);
    };

    const handleBack = () => {
        const draft = readDraft() || { version: 1 };
        draft.resume = true;
        writeDraft(draft);
        router.push(returnTo);
    };

    const toggleVehicleSelection = (vehicle: Vehicle) => {
        setSelectedVehicles((prev) => {
            const isAlreadySelected = prev.some((v) => v.id === vehicle.id);
            if (isAlreadySelected) {
                return prev.filter((v) => v.id !== vehicle.id);
            } else {
                return [...prev, vehicle];
            }
        });
    };

    const handleConfirmSelection = () => {
        const draft = readDraft() || { version: 1 };
        writeDraft({
            ...draft,
            selectedVehicles: selectedVehicles,
            resume: true,
        });
        router.push(returnTo);
    };

    const handleClearSelection = () => {
        setSelectedVehicles([]);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b bg-card">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-semibold tracking-tight">Select Vehicles</h1>
                            <p className="text-sm text-muted-foreground">
                                Browse the inventory and choose multiple vehicles for this appointment.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={handleBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to appointment
                            </Button>
                            {selectedVehicles.length > 0 && (
                                <Button variant="ghost" onClick={handleClearSelection}>
                                    Clear all ({selectedVehicles.length})
                                </Button>
                            )}
                            <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleConfirmSelection}>
                                Confirm Selection ({selectedVehicles.length})
                              </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
                <InventoryFilters
                    filters={vehicleFilters}
                    onFilterChange={handleVehicleFilterChange}
                    onBulkFilterChange={handleVehicleBulkFilterChange}
                    onClearFilters={handleVehicleClearFilters}
                />

                {vehicleError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{vehicleError}</AlertDescription>
                    </Alert>
                )}

                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="h-44 rounded-lg border bg-muted/40 animate-pulse" />
                        ))}
                    </div>
                ) : vehicles.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {vehicles.map((vehicle) => {
                            const isSelected = selectedVehicles.some((v) => v.id === vehicle.id);
                            return (
                                <button
                                    key={vehicle.id}
                                    type="button"
                                    onClick={() => toggleVehicleSelection(vehicle)}
                                    className={`rounded-lg border p-3 text-left transition hover:border-emerald-400 text-card-foreground ${isSelected
                                            ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5"
                                            : "border-border bg-card"
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted relative">
                                            {vehicle.image ? (
                                                <img
                                                    src={vehicle.image}
                                                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                                    No image
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold leading-tight">
                                                        {vehicle.year} {vehicle.make} {vehicle.model}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Stock #{vehicle.stockNumber} • {vehicle.location || "Unknown location"}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                                                        Selected
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                VIN {vehicle.vin} • {vehicle.mileage?.toLocaleString() || "0"} mi
                                            </p>
                                            <p className="text-sm font-semibold text-emerald-600">
                                                ${vehicle.price?.toLocaleString() || "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No vehicles found.</p>
                )}

                {(vehicleTotalPages > 1 || vehicleTotal > 0) && (
                    <div className="border-t pt-4">
                        <InventoryPagination
                            currentPage={vehiclePage}
                            totalPages={vehicleTotalPages}
                            onPageChange={setVehiclePage}
                            limit={12}
                            totalCount={vehicleTotal}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}