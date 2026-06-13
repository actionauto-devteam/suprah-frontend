"use client";

import * as React from "react";
import Link from "next/link";
import {
  CarFront,
  Pencil,
  Trash2,
  LifeBuoy,
  MapPin,
  GaugeCircle,
  BellRing,
  Zap,
  Plus,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OwnedVehicle } from "@/lib/api/vehicles";
import { resolveImageUrl, cn } from "@/lib/utils";

const calculateServiceProgress = (current: number, nextDue: number) => {
  if (!nextDue || nextDue <= current) return 100;
  const interval = Math.min(5000, nextDue);
  const base = nextDue - interval;
  return Math.max(0, Math.min(((current - base) / interval) * 100, 100));
};

function buildVehiclePhotoFallback(vehicle: Pick<OwnedVehicle, "year" | "make" | "model">) {
  const query = encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model} car`);
  return `https://source.unsplash.com/featured/1600x900/?${query}`;
}

function getVehicleImageSrc(vehicle: OwnedVehicle) {
  const rawCandidates = [vehicle.images?.[0], (vehicle as any).imageUrl, (vehicle as any).image];
  for (const candidate of rawCandidates) {
    const resolved = resolveImageUrl(candidate);
    if (resolved) return resolved;
  }
  return buildVehiclePhotoFallback(vehicle);
}

function GarageVehicleImage({ vehicle }: { vehicle: OwnedVehicle }) {
  const initialSrc = React.useMemo(() => getVehicleImageSrc(vehicle), [vehicle]);
  const placeholderSrc = React.useMemo(() => buildVehiclePhotoFallback(vehicle), [vehicle]);
  const [src, setSrc] = React.useState(initialSrc);
  const [fallbackTried, setFallbackTried] = React.useState(false);
  React.useEffect(() => { setSrc(initialSrc); }, [initialSrc]);
  return (
    <img
      src={src}
      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity duration-500"
      onError={() => {
        if (!fallbackTried) { setFallbackTried(true); setSrc(placeholderSrc); return; }
        setSrc("/placeholder-avatar.png");
      }}
    />
  );
}

interface VehiclesTabProps {
  vehicles: OwnedVehicle[] | undefined;
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (vehicle: OwnedVehicle) => void;
  onDelete: (vehicle: OwnedVehicle) => void;
  onLogService: (vehicle: OwnedVehicle) => void;
  onUpdateMileage: (vehicle: OwnedVehicle) => void;
}

export function VehiclesTab({
  vehicles,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  onLogService,
  onUpdateMileage,
}: VehiclesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground uppercase">
            My Vehicles
          </h2>
          {vehicles && vehicles.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"} in your garage
            </p>
          )}
        </div>
        <Button
          onClick={onAdd}
          size="sm"
          className="gap-1.5 rounded-xl font-semibold shrink-0 h-9"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Vehicle</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse dark:bg-zinc-900" />
          ))}
        </div>
      ) : !vehicles || vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <CarFront className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No Vehicles Yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Your vehicle hasn&apos;t been synced yet, or you haven&apos;t added one.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" className="rounded-xl gap-1.5">
              <Link href="/customer/support">
                <LifeBuoy className="h-3.5 w-3.5" /> Contact Support
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={onAdd} className="rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {vehicles.map((vehicle) => {
            const estimatedNext = vehicle.currentMileage + 3000;
            const svcProgress = calculateServiceProgress(vehicle.currentMileage, estimatedNext);
            const dueSoon = svcProgress > 80;

            return (
              <div key={vehicle.id} className="rounded-2xl overflow-hidden border border-border/40">

                {/* Cinematic vehicle banner */}
                <div className="relative h-60 sm:h-72 bg-zinc-900 group overflow-hidden">
                  <GarageVehicleImage vehicle={vehicle} />
                  <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

                  {/* Top-right action buttons */}
                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <button
                      onClick={() => onEdit(vehicle)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(vehicle)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/70 hover:bg-red-500 backdrop-blur-md border border-red-500/40 text-white transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Vehicle identity */}
                  <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-zinc-300 font-medium tracking-widest uppercase drop-shadow-md">
                          Active Vehicle
                        </p>
                        {(vehicle as any).source === "DEALERSHIP_TRANSFER" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 backdrop-blur-md">
                            ✓ Added by{(vehicle as any).dealershipName ? ` ${(vehicle as any).dealershipName}` : " dealership"}
                          </span>
                        )}
                      </div>
                      <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-xl">
                        {vehicle.year} {vehicle.make}
                      </h2>
                      <p className="text-xl text-zinc-200 font-medium mt-1 drop-shadow-md">
                        {vehicle.model}{vehicle.trim ? ` · ${vehicle.trim}` : ""}
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:text-right shrink-0">
                      <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-1">VIN</p>
                      <p className="text-zinc-100 font-mono text-sm tracking-wider">{vehicle.vin}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle details + health */}
                <div className="bg-card dark:bg-zinc-900/60 grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border/30">

                  {/* Health metrics */}
                  <div className="sm:col-span-2 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">Vehicle Health</p>
                      <div className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                        dueSoon
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                      )}>
                        {dueSoon ? <BellRing className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                        {dueSoon ? "Service Soon" : "Good Standing"}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <GaugeCircle className="h-3.5 w-3.5" />
                          Current mileage
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground tabular-nums">
                            {vehicle.currentMileage.toLocaleString()} mi
                          </span>
                          <button
                            onClick={() => onUpdateMileage(vehicle)}
                            className="text-[10px] text-primary font-semibold hover:underline"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                      <Progress value={svcProgress} className="h-2 rounded-full" />
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Next service ~{estimatedNext.toLocaleString()} mi
                      </p>
                    </div>

                    {vehicle.licensePlate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{vehicle.licensePlate}</span>
                        <span>·</span>
                        <span>{vehicle.color || "—"}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="p-3 sm:p-5 grid grid-cols-2 sm:flex sm:flex-col gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 rounded-xl font-semibold text-xs gap-1 sm:gap-1.5 border-border/50"
                      onClick={() => onLogService(vehicle)}
                    >
                      <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xxs:inline sm:hidden">Log</span>
                      <span className="hidden sm:inline">Log Service</span>
                    </Button>
                    <Button
                      size="sm"
                      className="w-full h-9 rounded-xl font-semibold text-xs gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => { window.location.href = "/customer/network"; }}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden xxs:inline sm:hidden">Find</span>
                      <span className="hidden sm:inline">Find Shop</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl gap-1.5 h-10 border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" /> Add Another Vehicle
          </Button>
        </div>
      )}
    </div>
  );
}
