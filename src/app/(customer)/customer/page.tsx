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
import { useRouter, useSearchParams } from "next/navigation";
import { resolveImageUrl } from "@/lib/utils";
import { useUser } from "@/providers/AuthProvider";
import { useProfileContext } from "@/context/ProfileContext";
import { useAlert } from "@/components/AlertDialog";

function getVehicleId(vehicle: OwnedVehicle | null | undefined) {
  return vehicle?.id || vehicle?._id || "";
}

const TAB_VALUES = ["overview", "vehicles", "sell", "history"];

/**
 * My Garage's tabs. On phones they're four equal columns with the icon above
 * a short name (like the Driver Portal's profile tabs); from sm up, one row
 * with the full names. Nothing spills out of the bar at any width.
 */
const GARAGE_TABS = [
  { value: "overview", icon: LayoutDashboard, short: "Overview", label: "Overview", tip: "Snapshot of your garage activity" },
  { value: "vehicles", icon: CarFront, short: "Vehicles", label: "My Vehicles", tip: "Vehicles registered to your account" },
  { value: "sell", icon: Tag, short: "Listing", label: "Auction Listing", tip: "List your car for sale" },
  { value: "history", icon: ClipboardList, short: "Service", label: "Service Log", tip: "History of services on your vehicles" },
] as const;

const GARAGE_TAB_CLASS =
  "min-w-0 h-auto flex-col sm:flex-row sm:flex-none rounded-xl px-1 sm:px-4 py-2 gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold aria-selected:bg-background aria-selected:shadow-sm aria-selected:text-foreground text-muted-foreground transition-all";

function CustomerDashboardContent() {
  const { user } = useUser();
  const { avatarUrl } = useProfileContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const addParam = searchParams.get("add");
  const urlTab = tabParam && TAB_VALUES.includes(tabParam) ? tabParam : "overview";
  const [activeTab, setActiveTab] = React.useState(urlTab);

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
  const { confirm, AlertComponent } = useAlert();

  // The tabs follow the address while the page is open, so links such as the
  // membership card's Register VIN switch tabs here too (2026-11-13), and a
  // tab the customer picks is kept in the address.
  React.useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);
  const selectTab = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/customer?tab=${tab}`, { scroll: false });
  };

  // "?add=vehicle" (Register VIN) opens Add vehicle once, then drops itself
  // from the address so going back or refreshing doesn't reopen it.
  React.useEffect(() => {
    if (addParam !== "vehicle") return;
    setIsAddVehicleOpen(true);
    router.replace(`/customer?tab=${urlTab}`, { scroll: false });
  }, [addParam, urlTab, router]);

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
    await confirm(
      "Remove vehicle?",
      `Remove your ${v.year} ${v.make} from your garage? This cannot be undone.`,
      async () => {
        await deleteVehicle(v.id);
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        if (selectedVehicle?.id === v.id) setSelectedVehicle(null);
      },
      "Remove",
    );
  };

  const [hour, setHour] = React.useState<number | null>(null);
  React.useEffect(() => { setHour(new Date().getHours()); }, []);
  const h = hour ?? new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";
  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || "M";

  return (
    <div className="min-h-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-600">
      <Tabs value={activeTab} onValueChange={selectTab} className="space-y-5">

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
            <TabsList className="grid w-full grid-cols-4 gap-1 rounded-2xl border border-border/50 bg-muted/40 p-1 h-auto sm:flex sm:w-fit dark:bg-zinc-900/60 dark:border-zinc-800">
              {GARAGE_TABS.map((tab) => (
                <Tooltip key={tab.value}>
                  <TooltipTrigger asChild>
                    <TabsTrigger value={tab.value} className={GARAGE_TAB_CLASS}>
                      <tab.icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                      <span className="flex min-w-0 max-w-full items-center justify-center gap-1">
                        <span className="truncate sm:hidden">{tab.short}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.value === "vehicles" && vehicles && vehicles.length > 0 && (
                          <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 px-1 text-[9px] font-black text-primary">
                            {vehicles.length}
                            <span className="sr-only"> vehicles</span>
                          </span>
                        )}
                      </span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{tab.tip}</TooltipContent>
                </Tooltip>
              ))}
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
      <AlertComponent />
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
