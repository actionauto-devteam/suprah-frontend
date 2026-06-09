"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useInventoryActions } from "@/hooks/useInventoryActions";
import { VehicleInquiryModal } from "@/components/vehicle-inquiry-modal";
import { ShippingQuoteModal } from "@/components/shipping-quote-modal";
import { FinanceApplicationModal } from "@/components/finance-application-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import type { Vehicle, ShippingQuoteFormData } from "@/types/inventory";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  TruckIcon,
  GitCompareArrows,
} from "lucide-react";
import Link from "next/link";

const FALLBACK =
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop";

const SPEC_ROWS: Array<{ label: string; key: keyof Vehicle | string }> = [
  { label: "Make", key: "make" },
  { label: "Model", key: "model" },
  { label: "Year", key: "year" },
  { label: "Price", key: "price" },
  { label: "Mileage", key: "mileage" },
  { label: "Body Style", key: "bodyStyle" },
  { label: "Engine", key: "engine" },
  { label: "Transmission", key: "transmission" },
  { label: "Drivetrain", key: "driveTrain" },
  { label: "Fuel Type", key: "fuelType" },
  { label: "Exterior Color", key: "exteriorColor" },
  { label: "Interior Color", key: "interiorColor" },
  { label: "Stock #", key: "stockNumber" },
  { label: "VIN", key: "vin" },
  { label: "Status", key: "status" },
  { label: "Location", key: "location" },
];

function formatValue(key: string, value: any): string {
  if (value === undefined || value === null || value === "" || value === "N/A")
    return "—";
  if (key === "price") return `$${Number(value).toLocaleString()}`;
  if (key === "mileage") return `${Number(value).toLocaleString()} mi`;
  return String(value);
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const rawIds = searchParams.get("ids") || "";
  const ids = Array.from(new Set(rawIds.split(",").filter(Boolean))).slice(0, 3);

  const { data: vehicles = [], isLoading, isError } = useQuery({
    queryKey: ["compareVehicles", ids],
    queryFn: async () => {
      const token = await getToken();
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiClient
            .get(`/api/vehicles/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.data?.data || r.data),
        ),
      );
      return results
        .filter((r): r is PromiseFulfilledResult<Vehicle> => r.status === "fulfilled")
        .map((r) => r.value as Vehicle);
    },
    enabled: ids.length > 0,
  });

  const [shippingRates, setShippingRates] = React.useState<Record<string, number>>({});

  const {
    selectedVehicle,
    openModals,
    setInquiryOpen,
    setFinanceOpen,
    setShippingOpen,
    handleCheckAvailability,
    handleApplyNow,
    handleGetQuote,
  } = useInventoryActions();

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

  // Find lowest price and mileage for highlighting
  const lowestPrice = Math.min(...vehicles.map((v: Vehicle) => v.price).filter(Boolean));
  const lowestMileage = Math.min(...vehicles.map((v: Vehicle) => v.mileage).filter(Boolean));

  if (ids.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <GitCompareArrows className="h-16 w-16 text-muted-foreground/30" />
        <div>
          <h2 className="text-xl font-bold">Not enough vehicles to compare</h2>
          <p className="text-sm text-muted-foreground mt-1">Select at least 2 vehicles from the shop.</p>
        </div>
        <Link href="/customer/shop">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${ids.length}, 1fr)` }}>
          {[...Array((ids.length + 1) * 6)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || vehicles.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-muted-foreground">Failed to load vehicles for comparison.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const colCount = vehicles.length;

  return (
    <div className="mx-auto w-full max-w-8xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-px w-6 bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
              Side by Side
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase leading-none text-foreground">
            Compare <span className="text-primary">Vehicles</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <Link href="/customer/shop">
            <Button variant="outline" size="sm">Browse More</Button>
          </Link>
        </div>
      </div>

      {/* Comparison table — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div
          className="min-w-140"
          style={{ display: "grid", gridTemplateColumns: `180px repeat(${colCount}, 1fr)`, gap: "0" }}
        >
          {/* ── Vehicle header row ── */}
          {/* Empty label cell */}
          <div className="p-3 border-b border-border/40" />
          {vehicles.map((vehicle: Vehicle) => (
            <div key={vehicle.id} className="p-3 border-b border-border/40 border-l border-l-border/20">
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-xl aspect-4/3 bg-muted">
                  <img
                    src={vehicle.image || FALLBACK}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                  />
                </div>
                <div>
                  <p className="font-bold text-sm leading-snug text-foreground">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  {vehicle.trim && (
                    <p className="text-xs text-muted-foreground">{vehicle.trim}</p>
                  )}
                </div>
                {vehicle.status && (
                  <Badge variant="secondary" className="text-[10px]">{vehicle.status}</Badge>
                )}
              </div>
            </div>
          ))}

          {/* ── Spec rows ── */}
          {SPEC_ROWS.map((row, rowIdx) => (
            <React.Fragment key={row.key as string}>
              {/* Label cell */}
              <div
                className={cn(
                  "px-3 py-2.5 text-xs font-semibold text-muted-foreground border-b border-border/30",
                  rowIdx % 2 === 0 ? "bg-muted/20" : "bg-transparent",
                )}
              >
                {row.label}
              </div>
              {/* Value cells */}
              {vehicles.map((vehicle: Vehicle) => {
                const rawVal = (vehicle as any)[row.key as string];
                const formatted = formatValue(row.key as string, rawVal);

                const isLowest =
                  (row.key === "price" && vehicle.price === lowestPrice && lowestPrice > 0) ||
                  (row.key === "mileage" && vehicle.mileage === lowestMileage && lowestMileage > 0);

                return (
                  <div
                    key={vehicle.id}
                    className={cn(
                      "px-3 py-2.5 text-sm border-b border-border/30 border-l border-l-border/20",
                      rowIdx % 2 === 0 ? "bg-muted/20" : "bg-transparent",
                    )}
                  >
                    <span className={cn(
                      "font-medium",
                      isLowest ? "text-primary font-bold" : "text-foreground",
                    )}>
                      {isLowest && <span className="mr-1 text-[10px] font-bold text-primary">▼</span>}
                      {formatted}
                    </span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* ── Action row ── */}
          <div className="p-3 border-t border-border/40 bg-muted/10" />
          {vehicles.map((vehicle: Vehicle) => (
            <div
              key={vehicle.id}
              className="p-3 border-t border-border/40 border-l border-l-border/20 bg-muted/10 space-y-2"
            >
              <Button
                size="sm"
                className="w-full gap-1.5 text-xs font-bold"
                onClick={() => handleApplyNow(vehicle)}
              >
                <DollarSign className="h-3.5 w-3.5" /> Apply for Financing
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => handleCheckAvailability(vehicle)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Inquire
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => handleGetQuote(vehicle)}
              >
                <TruckIcon className="h-3.5 w-3.5 text-emerald-500" /> Get Quote
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
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
      <ShippingQuoteModal
        open={openModals.shipping}
        onOpenChange={setShippingOpen}
        vehicles={vehicles}
        defaultVehicle={selectedVehicle}
        onCalculate={handleCalculateQuote}
      />
    </div>
  );
}

export default function ComparePage() {
  return (
    <React.Suspense fallback={<div className="p-8 flex items-center justify-center">Loading...</div>}>
      <CompareContent />
    </React.Suspense>
  );
}
