"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CarFront, LayoutDashboard, ClipboardList, Tag, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MembershipCardModal } from "@/components/customer/MembershipCardModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOwnedVehicles, deleteVehicle, OwnedVehicle } from "@/lib/api/vehicles";
import { LogServiceModal } from "@/components/customer/LogServiceModal";
import { UpdateMileageModal } from "@/components/customer/UpdateMileageModal";
import { AddVehicleModal } from "@/components/customer/AddVehicleModal";
import { EditVehicleModal } from "@/components/customer/EditVehicleModal";
import { OverviewTab } from "@/components/customer/garage/OverviewTab";
import { VehiclesTab } from "@/components/customer/garage/VehiclesTab";
import { ServiceLogTab } from "@/components/customer/garage/ServiceLogTab";
import { AuctionListings } from "@/components/customer/auction/AuctionListings";
import { useSearchParams } from "next/navigation";
import { resolveImageUrl } from "@/lib/utils";
import { useUser } from "@/providers/AuthProvider";
import { useProfileContext } from "@/context/ProfileContext";

function getVehicleId(vehicle: OwnedVehicle | null | undefined) {
  return vehicle?.id || vehicle?._id || "";
}

const TAB_VALUES = ["overview", "vehicles", "sell", "history"];

function CustomerDashboardContent() {
  const { user } = useUser();
  const { avatarUrl } = useProfileContext();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && TAB_VALUES.includes(tabParam) ? tabParam : "overview";

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchOwnedVehicles,
  });

  const [selectedVehicle, setSelectedVehicle] = React.useState<OwnedVehicle | null>(null);
  const [isLogServiceOpen, setIsLogServiceOpen] = React.useState(false);
  const [isUpdateMileageOpen, setIsUpdateMileageOpen] = React.useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = React.useState(false);
  const [isMembershipCardOpen, setIsMembershipCardOpen] = React.useState(false);

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

  const handleLogService = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsLogServiceOpen(true); };
  const handleUpdateMileage = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsUpdateMileageOpen(true); };
  const handleEditVehicle = (v: OwnedVehicle) => { setSelectedVehicle(v); setIsEditVehicleOpen(true); };
  const handleDeleteVehicle = async (v: OwnedVehicle) => {
    if (!window.confirm(`Remove your ${v.year} ${v.make} from your garage? This cannot be undone.`)) return;
    try {
      await deleteVehicle(v.id);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      if (selectedVehicle?.id === v.id) setSelectedVehicle(null);
    } catch { }
  };

  const [hour, setHour] = React.useState<number | null>(null);
  React.useEffect(() => { setHour(new Date().getHours()); }, []);
  const h = hour ?? new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";
  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || "M";

  return (
    <div className="min-h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-600">
      <Tabs defaultValue={initialTab} className="space-y-5">

        {/* ─── Page header + Tabs ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Hero header — matches Wishlist / Shop Vehicles styling */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-primary/0" />
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-primary/8 to-transparent pointer-events-none" />
            <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/6 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-emerald-500/4 blur-2xl pointer-events-none" />

            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[72px] sm:text-[96px] font-black text-primary/5 uppercase leading-none select-none pointer-events-none tracking-tight"
              aria-hidden
            >
              GARAGE
            </div>

            <div className="relative px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                      Member Portal
                    </span>
                  </div>

                  <div>
                    <h1 className="text-3xl xs:text-4xl sm:text-5xl font-black tracking-tight leading-none text-foreground uppercase">
                      My <span className="text-primary">Garage</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                      {greeting}, {firstName}.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    onClick={() => setIsMembershipCardOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl font-semibold h-9 border-green-600/40 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">My Card</span>
                  </Button>
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={resolveImageUrl(avatarUrl !== null ? avatarUrl : user?.imageUrl)} />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-base">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>

          <TooltipProvider>
            <TabsList className="flex w-full sm:w-fit gap-1 rounded-2xl border border-border/50 bg-muted/40 p-1 h-auto dark:bg-zinc-900/60 dark:border-zinc-800">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="overview"
                    className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Overview</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Snapshot of your garage activity</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="vehicles"
                    className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
                  >
                    <CarFront className="h-3.5 w-3.5" />
                    <span>
                      <span className="hidden xs:inline">My </span>Vehicles
                    </span>
                    {vehicles && vehicles.length > 0 && (
                      <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 text-primary text-[9px] font-black px-1">
                        {vehicles.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>Vehicles registered to your account</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="sell"
                    className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Auction </span>Listing
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>List your car for sale</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="history"
                    className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Service </span>Log
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>History of services on your vehicles</TooltipContent>
              </Tooltip>
            </TabsList>
          </TooltipProvider>
        </div>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-0">
          <VehiclesTab
            vehicles={vehicles}
            isLoading={isLoadingVehicles}
            onAdd={() => setIsAddVehicleOpen(true)}
            onEdit={handleEditVehicle}
            onDelete={handleDeleteVehicle}
            onLogService={handleLogService}
            onUpdateMileage={handleUpdateMileage}
          />
        </TabsContent>

        <TabsContent value="sell" className="mt-0">
          <AuctionListings />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <ServiceLogTab vehicles={vehicles} onLogService={handleLogService} />
        </TabsContent>
      </Tabs>

      {/* ─── Modals ───────────────────────────────────────────────── */}
      <LogServiceModal vehicle={selectedVehicle} isOpen={isLogServiceOpen} onOpenChange={setIsLogServiceOpen} />
      <UpdateMileageModal vehicle={selectedVehicle} isOpen={isUpdateMileageOpen} onOpenChange={setIsUpdateMileageOpen} />
      <AddVehicleModal isOpen={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen} />
      <EditVehicleModal vehicle={selectedVehicle} isOpen={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen} />
      <MembershipCardModal isOpen={isMembershipCardOpen} onOpenChange={setIsMembershipCardOpen} />
    </div>
  );
}

export default function CustomerDashboard() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <CustomerDashboardContent />
    </React.Suspense>
  );
}
