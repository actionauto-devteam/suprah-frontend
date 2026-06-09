"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  Calendar,
  BellRing,
  MapPin,
  GaugeCircle,
  CarFront,
  Pencil,
  Trash2,
  LifeBuoy,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOwnedVehicles, OwnedVehicle } from "@/lib/api/vehicles";
import { fetchServiceHistory, ServiceRecord } from "@/lib/api/services";
import { apiClient } from "@/lib/api-client";
import { LogServiceModal } from "@/components/customer/LogServiceModal";
import { UpdateMileageModal } from "@/components/customer/UpdateMileageModal";
import { AddVehicleModal } from "@/components/customer/AddVehicleModal";
import { EditVehicleModal } from "@/components/customer/EditVehicleModal";
import { deleteVehicle } from "@/lib/api/vehicles";
import { useTheme } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/lib/utils";

// Helper to calculate progress bar
const calculateServiceProgress = (current: number, nextDue: number) => {
  if (!nextDue || nextDue <= current) return 100;
  const interval = Math.min(5000, nextDue); // roughly a standard oil interval
  const base = nextDue - interval;
  const progress = ((current - base) / interval) * 100;
  return Math.max(0, Math.min(progress, 100));
};

function buildVehiclePhotoFallback(
  vehicle: Pick<OwnedVehicle, "year" | "make" | "model">,
) {
  const query = encodeURIComponent(
    `${vehicle.year} ${vehicle.make} ${vehicle.model} car`,
  );
  return `https://source.unsplash.com/featured/1600x900/?${query}`;
}

function getVehicleImageSrc(vehicle: OwnedVehicle) {
  const rawCandidates = [
    vehicle.images?.[0],
    (vehicle as any).imageUrl,
    (vehicle as any).image,
  ];

  for (const candidate of rawCandidates) {
    const resolved = resolveImageUrl(candidate);
    if (resolved) return resolved;
  }

  return buildVehiclePhotoFallback(vehicle);
}

function GarageVehicleImage({ vehicle }: { vehicle: OwnedVehicle }) {
  const initialSrc = React.useMemo(
    () => getVehicleImageSrc(vehicle),
    [vehicle],
  );
  const placeholderSrc = React.useMemo(
    () => buildVehiclePhotoFallback(vehicle),
    [vehicle],
  );
  const [src, setSrc] = React.useState(initialSrc);
  const [fallbackTried, setFallbackTried] = React.useState(false);

  React.useEffect(() => {
    setSrc(initialSrc);
  }, [initialSrc]);

  return (
    <img
      src={src}
      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700"
      onError={() => {
        if (!fallbackTried) {
          setFallbackTried(true);
          setSrc(placeholderSrc);
          return;
        }
        setSrc("/placeholder-avatar.png");
      }}
    />
  );
}

function getVehicleId(vehicle: OwnedVehicle | null | undefined) {
  return vehicle?.id || vehicle?._id || "";
}

export default function MyGaragePage() {
  const { theme } = useTheme();

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchOwnedVehicles,
  });

  const [selectedVehicle, setSelectedVehicle] =
    React.useState<OwnedVehicle | null>(null);
  const [isLogServiceOpen, setIsLogServiceOpen] = React.useState(false);
  const [isUpdateMileageOpen, setIsUpdateMileageOpen] = React.useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = React.useState(false);

  // Select the first vehicle automatically if none is selected
  React.useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;

    if (!selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
      return;
    }

    const selectedId = getVehicleId(selectedVehicle);
    const stillExists = vehicles.some((v) => getVehicleId(v) === selectedId);
    if (!stillExists) {
      setSelectedVehicle(vehicles[0]);
    }
  }, [vehicles, selectedVehicle]);

  const selectedVehicleId = getVehicleId(selectedVehicle);

  const { data: serviceHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["serviceHistory", selectedVehicleId],
    queryFn: () => fetchServiceHistory(selectedVehicleId),
    enabled: Boolean(selectedVehicleId),
  });

  const queryClient = useQueryClient();

  const handleLogService = (vehicle: OwnedVehicle) => {
    setSelectedVehicle(vehicle);
    setIsLogServiceOpen(true);
  };

  const handleUpdateMileage = (vehicle: OwnedVehicle) => {
    setSelectedVehicle(vehicle);
    setIsUpdateMileageOpen(true);
  };

  const handleEditVehicle = (vehicle: OwnedVehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditVehicleOpen(true);
  };

  const handleDeleteVehicle = async (vehicle: OwnedVehicle) => {
    if (
      window.confirm(
        `Are you sure you want to remove your ${vehicle.year} ${vehicle.make} from your garage? This action cannot be undone.`,
      )
    ) {
      try {
        await deleteVehicle(vehicle.id);
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        if (selectedVehicle?.id === vehicle.id) {
          setSelectedVehicle(null);
        }
        alert("Vehicle removed successfully.");
      } catch (error) {
        console.error("Failed to delete vehicle", error);
        alert("An error occurred while removing the vehicle.");
      }
    }
  };

  return (
    <div
      data-theme={theme}
      style={{ colorScheme: theme }}
      className="min-h-full bg-background space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            My Garage
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-lg">
            Manage your Action Auto vehicles, track maintenance, and access
            exclusive partner discounts.
          </p>
        </div>
        <Button
          onClick={() => setIsAddVehicleOpen(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl px-6 h-11 font-semibold"
        >
          + Add Vehicle
        </Button>
      </div>

      {isLoadingVehicles ? (
        <div className="h-64 flex items-center justify-center border rounded-3xl animate-pulse bg-zinc-50 dark:bg-zinc-900/50">
          <p className="text-muted-foreground font-medium">
            Loading your garage...
          </p>
        </div>
      ) : !vehicles || vehicles.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center">
          <CarFront className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold">No Vehicles Found</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            It looks like your vehicle hasn&apos;t been synced from the
            dealership yet. If you recently purchased a car, our support team
            can help get it linked.
          </p>
          <div className="flex gap-3 mt-5">
            <Button asChild className="rounded-xl font-semibold">
              <Link href="/customer/support">
                <LifeBuoy className="w-4 h-4 mr-2" /> Contact Support
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAddVehicleOpen(true)}
              className="rounded-xl font-semibold"
            >
              + Add Vehicle Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {vehicles.map((vehicle) => {
            const isSelected = getVehicleId(vehicle) === selectedVehicleId;
            const estimatedNextInterval = vehicle.currentMileage + 3000; // Simple heuristic for mock
            const serviceProgress = calculateServiceProgress(
              vehicle.currentMileage,
              estimatedNextInterval,
            );
            const isServiceDueSoon = serviceProgress > 80;

            return (
              <div
                key={getVehicleId(vehicle)}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Left Col: Image & Identity */}
                <div className="lg:col-span-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedVehicle(vehicle)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedVehicle(vehicle);
                      }
                    }}
                    className={`relative overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl group border h-full min-h-87.5 w-full text-left ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-zinc-800"
                    }`}
                  >
                    <div className="absolute inset-0">
                      <GarageVehicleImage vehicle={vehicle} />
                      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
                    </div>

                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditVehicle(vehicle);
                        }}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2 rounded-xl text-white border border-white/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteVehicle(vehicle);
                        }}
                        className="bg-red-500/80 hover:bg-red-600 backdrop-blur-md p-2 rounded-xl text-white border border-red-500/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-zinc-300 font-medium tracking-widest uppercase drop-shadow-md">
                            Active Vehicle
                          </p>
                          {vehicle.source === "DEALERSHIP_TRANSFER" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 backdrop-blur-md">
                              ✓ Added by
                              {vehicle.dealershipName
                                ? ` ${vehicle.dealershipName}`
                                : " dealership"}
                            </span>
                          )}
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-xl">
                          {vehicle.year} {vehicle.make}
                        </h2>
                        <p className="text-xl text-zinc-200 font-medium mt-1 drop-shadow-md">
                          {vehicle.model} {vehicle.trim && `- ${vehicle.trim}`}
                        </p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:text-right">
                        <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-1">
                          VIN #
                        </p>
                        <p className="text-zinc-100 font-mono text-sm tracking-wider">
                          {vehicle.vin}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Col: Health Engine */}
                <div className="flex flex-col gap-6">
                  {/* Service Health Card */}
                  <Card className="flex-1 p-6 rounded-3xl border-border/40 shadow-sm bg-zinc-50 dark:bg-zinc-900/50 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold tracking-tight">
                        Vehicle Health
                      </h3>
                      <div
                        className={`p-2 rounded-full ${isServiceDueSoon ? "bg-amber-100 text-amber-600 dark:bg-amber-500/10" : "bg-green-100 text-green-600 dark:bg-green-500/10"}`}
                      >
                        {isServiceDueSoon ? (
                          <BellRing className="w-5 h-5" />
                        ) : (
                          <Settings className="w-5 h-5" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <GaugeCircle className="w-4 h-4" /> Current
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">
                              {vehicle.currentMileage.toLocaleString()} mi
                            </span>
                            <button
                              onClick={() => handleUpdateMileage(vehicle)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Update
                            </button>
                          </div>
                        </div>
                        <Progress
                          value={serviceProgress}
                          className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>
                            Due: ~{estimatedNextInterval.toLocaleString()} mi
                          </span>
                        </div>
                      </div>

                      {isServiceDueSoon && (
                        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3">
                          <BellRing className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="font-semibold text-amber-800 dark:text-amber-500 text-sm">
                              Service Recommended Soon
                            </h4>
                            <p className="text-amber-700/80 dark:text-amber-400/80 text-xs mt-1">
                              You are approaching your next service interval.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 space-y-3">
                      <Button
                        variant="outline"
                        className="w-full rounded-xl font-semibold h-11"
                        onClick={() => handleLogService(vehicle)}
                      >
                        Log New Service Result
                      </Button>
                      <Button
                        className="w-full rounded-xl font-semibold h-11 bg-green-600 hover:bg-green-700 text-white shadow-md active:scale-95 transition-transform"
                        onClick={() =>
                          (window.location.href = "/customer/network")
                        }
                      >
                        Find Jiffy Lube Locations
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}

          {/* Service History List (tied to selected car) */}
          {selectedVehicle && (
            <div className="pt-8 border-t border-border/50">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight">
                    Digital Logbook
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    Showing history for {selectedVehicle.year}{" "}
                    {selectedVehicle.make} {selectedVehicle.model}
                  </p>
                </div>
              </div>

              {isLoadingHistory ? (
                <p className="text-muted-foreground animate-pulse">
                  Loading service history...
                </p>
              ) : !serviceHistory || serviceHistory.length === 0 ? (
                <div className="p-8 text-center border rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border-dashed">
                  <Settings className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No service records found for this vehicle.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleLogService(selectedVehicle)}
                  >
                    Log the first service
                  </Button>
                </div>
              ) : (
                <div className="max-h-[36rem] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceHistory.map((record) => (
                      <div
                        key={record._id}
                        className="p-5 flex flex-row rounded-2xl border border-border/40 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm transition-colors items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-zinc-500 w-5 h-5"
                          >
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">
                            {record.serviceType.replace(/_/g, " ")}
                          </h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3" /> {record.locationName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Odometer: {record.mileageAtService.toLocaleString()}{" "}
                            mi
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-foreground">
                            {record.cost ? `$${record.cost.toFixed(2)}` : "--"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <LogServiceModal
        vehicle={selectedVehicle}
        isOpen={isLogServiceOpen}
        onOpenChange={setIsLogServiceOpen}
      />

      <UpdateMileageModal
        vehicle={selectedVehicle}
        isOpen={isUpdateMileageOpen}
        onOpenChange={setIsUpdateMileageOpen}
      />

      <AddVehicleModal
        isOpen={isAddVehicleOpen}
        onOpenChange={setIsAddVehicleOpen}
      />
    </div>
  );
}