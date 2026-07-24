"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2, X, Car, Tag, Milestone, ShieldCheck, MapPin, Info } from "lucide-react";

import { InventoryFilters } from "@/components/inventory-filters";
import { InventoryPagination } from "@/components/inventory-pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Vehicle } from "@/types/inventory";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

interface VehiclePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelectedVehicles: Vehicle[];
  onConfirmSelection: (vehicles: Vehicle[]) => void;
}

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

// ---
const STYLES = `
.vpm-container {
  --brand-success: #10b981;
  --card-border-color: #e2e8f0;
  --card-shadow-hover: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -6px rgba(0, 0, 0, 0.04);
}

.dark .vpm-container {
  --card-border-color: #1f2937;
}

/* Horizontal track matrix generating exactly 3 vehicles vertically per line column */
.vpm-horizontal-matrix-track {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(3, 125px);
  gap: 12px;
  overflow-x: scroll !important; 
  overflow-y: hidden !important;
  padding-bottom: 16px; 
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  scrollbar-width: auto !important; 
  scrollbar-color: #475569 #e2e8f0;
}

.dark .vpm-horizontal-matrix-track {
  scrollbar-color: #94a3b8 #1e293b;
}

/* High-contrast webkit scrollbar rules ensuring it is always highly visible */
.vpm-horizontal-matrix-track::-webkit-scrollbar {
  height: 14px !important;
  display: block !important;
}
.vpm-horizontal-matrix-track::-webkit-scrollbar-track {
  background: #e2e8f0 !important;
  border-radius: 10px !important;
}
.vpm-horizontal-matrix-track::-webkit-scrollbar-thumb {
  background: #334155 !important;
  border-radius: 10px !important;
  border: 2px solid #cbd5e1 !important;
}
.vpm-horizontal-matrix-track::-webkit-scrollbar-thumb:hover {
  background: #0f172a !important;
}

.dark .vpm-horizontal-matrix-track::-webkit-scrollbar-track { 
  background: #1e293b !important; 
}
.dark .vpm-horizontal-matrix-track::-webkit-scrollbar-thumb { 
  background: #94a3b8 !important; 
  border: 2px solid #1e293b !important;
}
.dark .vpm-horizontal-matrix-track::-webkit-scrollbar-thumb:hover { 
  background: #f8fafc !important; 
}

/* Wide gallery horizontal row cards layout - optimized vertical height */
.vpm-h-gallery-card {
  background: white;
  border: 1.5px solid var(--card-border-color);
  border-radius: 16px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 16px;
  width: 480px; 
  height: 125px;
  scroll-snap-align: start;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.01);
}

.dark .vpm-h-gallery-card {
  background: #111827;
}

@media (max-width: 540px) {
  .vpm-h-gallery-card {
    width: 325px;
    gap: 12px;
    padding: 10px;
    height: 125px;
  }
}

.vpm-h-gallery-card:hover {
  border-color: #94a3b8;
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-1px);
}

.vpm-h-gallery-card.is-selected {
  border-color: var(--brand-success);
  background: rgba(16, 185, 129, 0.02);
  box-shadow: 0 0 0 2px var(--brand-success);
}

.vpm-thumb-wrapper-frame {
  width: 130px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid var(--card-border-color);
  position: relative;
  flex-shrink: 0;
}

.dark .vpm-thumb-wrapper-frame { background: #070b14; }

@media (max-width: 540px) {
  .vpm-thumb-wrapper-frame {
    width: 95px;
    height: 95px;
  }
}

.vpm-thumb-wrapper-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.95;
}

/* Design Overlays */
.vpm-pending-label {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(239, 68, 68, 0.95);
  color: white;
  font-weight: 800;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 10;
}

.vpm-location-overlay-text {
  position: absolute;
  bottom: 18px;
  left: 0;
  right: 0;
  text-align: center;
  color: white;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  z-index: 10;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  padding: 6px 0 2px;
}

.vpm-split-marketing-tags {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  z-index: 10;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.92);
  font-weight: 700;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.vpm-details-data-pane {
  min-width: 0;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100px;
}

@media (max-width: 540px) {
  .vpm-details-data-pane {
    height: 95px;
  }
}

.vpm-headline-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.vpm-vehicle-heading {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}
.dark .vpm-vehicle-heading { color: #f8fafc; }

.vpm-vehicle-sub-trim {
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  margin-top: 1px;
}
.dark .vpm-vehicle-sub-trim { color: #94a3b8; }

.vpm-pricing-wrapper-block {
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: flex-end;
  color: #1e3a8a;
}
.dark .vpm-pricing-wrapper-block { color: #38bdf8; }

.vpm-price-value-text {
  font-size: 15px;
  font-weight: 800;
  font-family: var(--mono);
}

.vpm-specs-dense-grid {
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  border-top: 1px dashed #e2e8f0;
  padding-top: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}
.dark .vpm-specs-dense-grid { border-color: #374151; color: #94a3b8; }
`;

export function VehiclePickerModal({
  open,
  onOpenChange,
  initialSelectedVehicles,
  onConfirmSelection,
}: VehiclePickerModalProps) {
  const { getToken } = useAuth();

  const [vehicleFilters, setVehicleFilters] = React.useState(createVehicleFilters);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [vehiclePage, setVehiclePage] = React.useState(1);
  const [vehicleTotalPages, setVehicleTotalPages] = React.useState(1);
  const [vehicleTotal, setVehicleTotal] = React.useState(0);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [vehicleError, setVehicleError] = React.useState<string | null>(null);
  const [selectedVehicles, setSelectedVehicles] = React.useState<Vehicle[]>([]);

  React.useEffect(() => {
    const id = "vpm-horizontal-matrix-maximized";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setSelectedVehicles(initialSelectedVehicles || []);
      setVehicleFilters(createVehicleFilters());
      setVehiclePage(1);
    }
  }, [open, initialSelectedVehicles]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(vehicleFilters.search.trim());
      setVehiclePage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [vehicleFilters.search]);

  React.useEffect(() => {
    if (!open) return;
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
          if (value === undefined || value === "" || value === "all") delete requestParams[key];
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
        setVehicleError(err?.response?.data?.message || err?.message || "Failed to load inventory");
        setVehicles([]);
      } finally {
        /* FIXED: Replaced internal instruction token with valid finally handler block */
        if (isActive) setIsLoading(false);
      }
    };

    fetchVehicles();
    return () => { isActive = false; };
  }, [open, vehiclePage, debouncedSearch, vehicleFilters, getToken]);

  const toggleVehicleSelection = (vehicle: Vehicle) => {
    setSelectedVehicles((prev) => {
      const isAlreadySelected = prev.some((v) => v.id === vehicle.id);
      if (isAlreadySelected) return prev.filter((v) => v.id !== vehicle.id);
      return [...prev, vehicle];
    });
  };

  const handleSaveSelection = () => {
    onConfirmSelection(selectedVehicles);
    onOpenChange(false);
  };

  const handleClearSelection = () => {
    setSelectedVehicles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vpm-container max-w-[1800px] w-[98vw] h-[95vh] overflow-hidden p-0 z-[250] flex flex-col rounded-3xl border-none shadow-2xl bg-white dark:bg-gray-950">
        
        {/* Modal Header */}
        <DialogHeader className="px-8 py-6 border-b bg-white dark:bg-gray-900/50 backdrop-blur-xl shrink-0 flex flex-row items-center justify-between gap-6">
          <div className="space-y-1 flex-1 min-w-0">
            <DialogTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
              Select Inventory Assets
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 truncate">
              Exactly 3 vehicles are stacked per column line. Use the high-visibility scrollbar at the bottom to browse horizontally.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Badge variant="secondary" className="px-3.5 py-1.5 text-xs rounded-full font-bold">
              {selectedVehicles.length} Selected
            </Badge>
            <Button 
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-5 rounded-xl shadow-md transition-all" 
              onClick={handleSaveSelection}
            >
              Confirm Selection
            </Button>
          </div>
        </DialogHeader>

        {/* Outer Content Body Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 modal-scrollbar bg-gray-50/50 dark:bg-black/10 flex flex-col gap-6 justify-start">
          <div className="w-full bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0">
            <InventoryFilters
              filters={vehicleFilters}
              onFilterChange={(k, v) => setVehicleFilters(p => ({ ...p, [k]: v }))}
              onBulkFilterChange={(f) => setVehicleFilters(f)}
              onClearFilters={() => setVehicleFilters(createVehicleFilters())}
            />
          </div>

          {vehicleError && (
            <Alert variant="destructive" className="rounded-xl py-3 border-2 shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-semibold text-xs">{vehicleError}</AlertDescription>
            </Alert>
          )}

          <div className="flex-1 flex items-center min-h-0 w-full pt-2">
            {isLoading ? (
              <div className="vpm-horizontal-matrix-track w-full">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="vpm-h-gallery-card bg-muted/20 animate-pulse border-dashed" />
                ))}
              </div>
            ) : vehicles.length > 0 ? (
              <div className="vpm-horizontal-matrix-track w-full">
                {vehicles.map((vehicle) => {
                  const isSelected = selectedVehicles.some((v) => v.id === vehicle.id);
                  const isPending = vehicle.status?.toLowerCase() === 'pending' || vehicle.status?.toLowerCase() === 'sale pending';
                  
                  const calculatedMonthlyEstimate = vehicle.price ? Math.round((vehicle.price * 0.018) + 45) : 345;

                  return (
                    <div 
                      key={vehicle.id} 
                      onClick={() => toggleVehicleSelection(vehicle)}
                      className={`vpm-h-gallery-card group ${isSelected ? "active-selection" : ""}`}
                    >
                      {/* Thumbnail Image frame */}
                      <div className="vpm-thumb-wrapper-frame">
                        {vehicle.image ? (
                          <img src={vehicle.image} alt="" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300 bg-gray-100 dark:bg-gray-900">
                            <Car className="h-4 w-4 stroke-[1.5]" />
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white p-0.5 rounded-full shadow-lg z-20">
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </div>
                        )}

                        {isPending && <div className="vpm-pending-label">Sale Pending</div>}
                        
                        <div className="vpm-location-overlay-text">
                          {vehicle.location || "OREM"}
                        </div>
                        
                        <div className="vpm-split-marketing-tags">
                          <div>Home Delivery</div>
                          <div>Online Financing</div>
                        </div>
                      </div>

                      {/* Info Pane Details */}
                      <div className="vpm-details-data-pane">
                        <div className="vpm-headline-row">
                          <div className="min-w-0">
                            <div className="vpm-vehicle-heading truncate">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            <div className="vpm-vehicle-sub-trim truncate">
                              {vehicle.trim || "A-SPEC"}
                            </div>
                          </div>
                          
                          <div className="vpm-pricing-wrapper-block shrink-0">
                            <span className="vpm-price-value-text">${calculatedMonthlyEstimate}</span>
                            <span className="text-[11px] font-bold text-slate-400">/mo</span>
                            <Info size={12} className="text-slate-400 ml-0.5" />
                          </div>
                        </div>

                        <div className="vpm-specs-dense-grid">
                          <span>Mileage: {vehicle.mileage?.toLocaleString() || "0"}</span>
                          <span>|</span>
                          <span>Stock #: {vehicle.stockNumber || "M21704"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full text-center py-12 border border-dashed rounded-2xl bg-muted/10 space-y-1">
                <Car className="h-10 w-10 mx-auto opacity-20 text-muted-foreground" />
                <p className="text-sm font-medium text-gray-400">No matching vehicle assets found in stock.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Pagination Footer Controls Row */}
        <div className="px-8 py-5 border-t bg-card flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="w-full sm:w-auto overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(vehicleTotalPages > 1 || vehicleTotal > 0) && (
              <InventoryPagination
                currentPage={vehiclePage}
                totalPages={vehicleTotalPages}
                onPageChange={setVehiclePage}
                limit={12}
                totalCount={vehicleTotal}
              />
            )}
          </div>
          <Button variant="outline" size="sm" className="text-xs h-8 px-5 w-full sm:w-auto rounded-xl" onClick={() => onOpenChange(false)}>
            Close View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}