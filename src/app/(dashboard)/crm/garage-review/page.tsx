"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Car,
  Search,
  User as UserIcon,
  Check,
  Loader2,
  KeyRound,
  Gauge,
  CheckCircle2,
  History,
  Link2,
  X,
  Wrench,
  ClipboardList,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  PackageCheck,
  ShieldCheck,
  Clock,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import {
  searchInventory,
  searchCustomers,
  fetchTransferableDeals,
  fetchTransfers,
  transferVehicleToGarage,
  fetchServiceQueue,
  fetchCustomerVehiclesForService,
  checkInVehicleForService,
  advanceServiceStatus,
  InventoryVehicle,
  CustomerLite,
  TransferableDeal,
  GarageTransferRecord,
  ActiveServiceRecord,
  OwnedVehicleLite,
  ServiceStatus,
} from "@/lib/api/garageReview";
import { initializeCrmSocket } from "@/lib/crmSocket.client";
import { AuctionApprovalTab } from "./AuctionApprovalTab";

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const statusTone = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("sold")) return "bg-zinc-500/90 text-white";
  if (s.includes("ready")) return "bg-emerald-500/90 text-white";
  return "bg-amber-500/90 text-white";
};

const SERVICE_STATUS_META: Record<ServiceStatus, { label: string; color: string; nextLabel: string; nextStatus: ServiceStatus | null }> = {
  received:      { label: "Car Received",     color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",    nextLabel: "Start Servicing",        nextStatus: "in_service" },
  in_service:    { label: "Being Serviced",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",        nextLabel: "Send to Quality Check",  nextStatus: "quality_check" },
  quality_check: { label: "Quality Check",    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400", nextLabel: "Mark Ready",             nextStatus: "ready" },
  ready:         { label: "Ready for Pickup", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", nextLabel: "Complete / Picked Up", nextStatus: "completed" },
  completed:     { label: "Completed",        color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",           nextLabel: "",                       nextStatus: null },
};

const SERVICE_TYPES = [
  { value: "OIL_CHANGE", label: "Oil Change" },
  { value: "TIRES",      label: "Tire Rotation / Replacement" },
  { value: "BRAKES",     label: "Brake Service" },
  { value: "INSPECTION", label: "Vehicle Inspection" },
  { value: "OTHER",      label: "Other / General Service" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function GarageReviewPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"transfer" | "service" | "auction">("transfer");

  // ── auth gate ──
  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) { router.replace("/crm"); return; }
    setToken(t);
  }, [router]);

  return (
    <div className="min-h-full bg-background">
      <div className="w-full px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary via-primary/70 to-primary/0" />
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-primary/8 to-transparent pointer-events-none" />
          <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/6 blur-3xl pointer-events-none" />

          <div className="relative px-5 py-5 sm:px-7 sm:py-6 flex items-center gap-3">
            <button
              onClick={() => router.push("/crm/dashboard")}
              className="h-9 w-9 rounded-xl border border-border/40 bg-background flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                  Garage Review
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-foreground">
                Inventory &amp; Service
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicle transfers, service status &amp; auction listing approvals
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("transfer")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === "transfer"
                ? "bg-card dark:bg-zinc-800 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Car className="h-3.5 w-3.5" /> Vehicle Transfer
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === "service"
                ? "bg-card dark:bg-zinc-800 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Wrench className="h-3.5 w-3.5" /> Service Queue
          </button>
          <button
            onClick={() => setActiveTab("auction")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === "auction"
                ? "bg-card dark:bg-zinc-800 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Gavel className="h-3.5 w-3.5" /> Auction Approval
          </button>
        </div>

        {/* Tab content */}
        {token && activeTab === "transfer" && <TransferTab token={token} />}
        {token && activeTab === "service" && <ServiceQueueTab token={token} />}
        {token && activeTab === "auction" && <AuctionApprovalTab token={token} />}
      </div>
    </div>
  );
}

// ─── TRANSFER TAB (existing functionality) ───────────────────────────────────

function TransferTab({ token }: { token: string }) {
  const [selectedVehicle, setSelectedVehicle] = React.useState<InventoryVehicle | null>(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerLite | null>(null);
  const [selectedDealId, setSelectedDealId] = React.useState<string>("");
  const [mileage, setMileage] = React.useState<string>("");

  const [vehicleQuery, setVehicleQuery] = React.useState("");
  const [customerQuery, setCustomerQuery] = React.useState("");
  const dVehicleQuery = useDebounced(vehicleQuery);
  const dCustomerQuery = useDebounced(customerQuery);

  const [vehicles, setVehicles] = React.useState<InventoryVehicle[]>([]);
  const [customers, setCustomers] = React.useState<CustomerLite[]>([]);
  const [deals, setDeals] = React.useState<TransferableDeal[]>([]);
  const [transfers, setTransfers] = React.useState<GarageTransferRecord[]>([]);

  const [loadingVehicles, setLoadingVehicles] = React.useState(false);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const refreshHistory = React.useCallback(async (t: string) => {
    try { setTransfers(await fetchTransfers(t)); } catch { /* non-fatal */ }
  }, []);

  React.useEffect(() => {
    if (!token) return;
    refreshHistory(token);
    fetchTransferableDeals(token).then(setDeals).catch(() => setDeals([]));
  }, [token, refreshHistory]);

  React.useEffect(() => {
    if (!token) return;
    setLoadingVehicles(true);
    searchInventory(token, dVehicleQuery)
      .then(setVehicles).catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, [token, dVehicleQuery]);

  React.useEffect(() => {
    if (!token) return;
    setLoadingCustomers(true);
    searchCustomers(token, dCustomerQuery)
      .then(setCustomers).catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [token, dCustomerQuery]);

  React.useEffect(() => {
    if (selectedVehicle) setMileage(String(selectedVehicle.mileage ?? ""));
  }, [selectedVehicle]);

  const canTransfer = !!selectedVehicle && !!selectedCustomer && !submitting;

  const handleTransfer = async () => {
    if (!selectedVehicle || !selectedCustomer) return;
    setSubmitting(true);
    try {
      const result = await transferVehicleToGarage(token, {
        vehicleId: selectedVehicle.id,
        customerId: selectedCustomer.id,
        dealId: selectedDealId || undefined,
        mileageOverride: mileage,
      });
      const refreshed = result.transfer?.status === "already_in_garage";
      toast.success(
        refreshed
          ? "Already in the customer's garage — record refreshed."
          : `Transferred to ${selectedCustomer.name}'s My Garage.`,
      );
      setSelectedVehicle(null); setSelectedCustomer(null);
      setSelectedDealId(""); setMileage("");
      setVehicleQuery(""); setCustomerQuery("");
      await refreshHistory(token);
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || "Transfer failed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Two-panel selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vehicle */}
        <Card className="p-5 rounded-2xl border-border/40 bg-card dark:bg-zinc-900/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Car className="h-4 w-4 text-emerald-500" /> 1 · Vehicle
            </h2>
            {selectedVehicle && (
              <button onClick={() => setSelectedVehicle(null)} className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {selectedVehicle ? (
            <SelectedRow image={selectedVehicle.image} title={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`} sub={`VIN ${selectedVehicle.vin}`} meta={selectedVehicle.status} />
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={vehicleQuery} onChange={(e) => setVehicleQuery(e.target.value)} placeholder="Search VIN, make, model, stock #…" className="pl-9 bg-muted/40 border-border/40" />
              </div>
              <ResultList loading={loadingVehicles} empty="No matching inventory.">
                {vehicles.map((v) => (
                  <button key={v.id} onClick={() => setSelectedVehicle(v)} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-emerald-400/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                    <Thumb image={v.image} fallback={<Car className="h-4 w-4 text-muted-foreground" />} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{v.year} {v.make} {v.model}</p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">{v.vin}</p>
                    </div>
                    <Badge className={cn("text-[9px] h-5 px-2 rounded-full border-0 shrink-0", statusTone(v.status))}>{v.status}</Badge>
                  </button>
                ))}
              </ResultList>
            </>
          )}
        </Card>

        {/* Customer */}
        <Card className="p-5 rounded-2xl border-border/40 bg-card dark:bg-zinc-900/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <UserIcon className="h-4 w-4 text-emerald-500" /> 2 · Customer
            </h2>
            {selectedCustomer && (
              <button onClick={() => setSelectedCustomer(null)} className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {selectedCustomer ? (
            <SelectedRow image={resolveImageUrl(selectedCustomer.avatar || undefined) || null} title={selectedCustomer.name} sub={selectedCustomer.email} meta={selectedCustomer.role} />
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Search name or email…" className="pl-9 bg-muted/40 border-border/40" />
              </div>
              <ResultList loading={loadingCustomers} empty="No matching customers.">
                {customers.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCustomer(c)} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-emerald-400/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                    <Thumb image={resolveImageUrl(c.avatar || undefined) || null} fallback={<UserIcon className="h-4 w-4 text-muted-foreground" />} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <Badge className="text-[9px] h-5 px-2 rounded-full capitalize bg-muted text-muted-foreground border-0 shrink-0">{c.role}</Badge>
                  </button>
                ))}
              </ResultList>
            </>
          )}
        </Card>
      </div>

      {/* Review + confirm */}
      <Card className="p-5 rounded-2xl border-border/40 bg-card dark:bg-zinc-900/60">
        <h2 className="text-sm font-bold text-foreground mb-4">3 · Review &amp; Transfer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Mileage at sale
            </label>
            <Input type="number" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="0" disabled={!selectedVehicle} className="bg-muted/40 border-border/40" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Link to deal (optional)
            </label>
            <select value={selectedDealId} onChange={(e) => setSelectedDealId(e.target.value)} className="w-full h-9 rounded-md border border-border/40 bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
              <option value="">No deal — standalone transfer</option>
              {deals.map((d) => (
                <option key={d._id} value={d._id}>{d.title}{d.contactName ? ` · ${d.contactName}` : ""} ({d.stage.replace("_", " ")})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            {selectedVehicle && selectedCustomer ? (
              <>Transferring <span className="font-semibold text-foreground">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</span> to <span className="font-semibold text-foreground">{selectedCustomer.name}</span>. The vehicle will be marked <strong>Sold</strong> and appear in their garage instantly.</>
            ) : "Select a vehicle and a customer to continue."}
          </p>
          <Button onClick={handleTransfer} disabled={!canTransfer} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 h-11 px-6 shrink-0 disabled:opacity-40">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Transfer to My Garage
          </Button>
        </div>
      </Card>

      {/* History */}
      <div>
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" /> Recent transfers
        </h2>
        {transfers.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-2xl bg-card dark:bg-zinc-900/40 border-border/40">
            <p className="text-sm text-muted-foreground">No transfers yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <div key={t._id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-card dark:bg-zinc-900/60">
                <div className="h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.vehicleLabel} → {t.customerName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.customerEmail} · {t.mileageAtTransfer.toLocaleString()} mi · by {t.performedByName}</p>
                </div>
                <div className="text-right shrink-0">
                  {t.status === "already_in_garage" ? (
                    <Badge className="text-[9px] h-5 px-2 rounded-full bg-amber-100 text-amber-600 border-0">Refreshed</Badge>
                  ) : (
                    <Badge className="text-[9px] h-5 px-2 rounded-full bg-emerald-100 text-emerald-600 border-0">Transferred</Badge>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SERVICE QUEUE TAB ────────────────────────────────────────────────────────

function ServiceQueueTab({ token }: { token: string }) {
  const [queue, setQueue] = React.useState<ActiveServiceRecord[]>([]);
  const [loadingQueue, setLoadingQueue] = React.useState(true);
  const [advancingId, setAdvancingId] = React.useState<string | null>(null);

  // Check-in form state
  const [checkinCustomerQuery, setCheckinCustomerQuery] = React.useState("");
  const dCheckinQuery = useDebounced(checkinCustomerQuery);
  const [checkinCustomers, setCheckinCustomers] = React.useState<CustomerLite[]>([]);
  const [loadingCheckinCustomers, setLoadingCheckinCustomers] = React.useState(false);
  const [selectedCheckinCustomer, setSelectedCheckinCustomer] = React.useState<CustomerLite | null>(null);

  const [customerVehicles, setCustomerVehicles] = React.useState<OwnedVehicleLite[]>([]);
  const [loadingVehicles, setLoadingVehicles] = React.useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState("");
  const [serviceType, setServiceType] = React.useState("");
  const [locationName, setLocationName] = React.useState("Action Auto Utah — Jiffy Lube");
  const [mileage, setMileage] = React.useState("");
  const [submittingCheckin, setSubmittingCheckin] = React.useState(false);

  const refreshQueue = React.useCallback(async () => {
    setLoadingQueue(true);
    try { setQueue(await fetchServiceQueue(token)); } catch { /* non-fatal */ }
    finally { setLoadingQueue(false); }
  }, [token]);

  React.useEffect(() => { refreshQueue(); }, [refreshQueue]);

  // Real-time socket: queue updates without page reload
  React.useEffect(() => {
    if (!token) return;
    const socket = initializeCrmSocket(token);

    const onCheckedIn = () => { refreshQueue(); };

    const onStatusUpdated = (data: { _id: string; vehicleId: string; serviceStatus: ServiceStatus }) => {
      setQueue((prev) =>
        prev.map((r) =>
          r._id === data._id ? { ...r, serviceStatus: data.serviceStatus } : r
        ).filter((r) => r.serviceStatus !== 'completed')
      );
    };

    socket.on('service:checked_in', onCheckedIn);
    socket.on('service:status_updated', onStatusUpdated);

    return () => {
      socket.off('service:checked_in', onCheckedIn);
      socket.off('service:status_updated', onStatusUpdated);
    };
  }, [token, refreshQueue]);

  // Customer search for check-in
  React.useEffect(() => {
    if (!dCheckinQuery) { setCheckinCustomers([]); return; }
    setLoadingCheckinCustomers(true);
    searchCustomers(token, dCheckinQuery)
      .then(setCheckinCustomers).catch(() => setCheckinCustomers([]))
      .finally(() => setLoadingCheckinCustomers(false));
  }, [token, dCheckinQuery]);

  // Load vehicles when customer selected
  React.useEffect(() => {
    if (!selectedCheckinCustomer) { setCustomerVehicles([]); setSelectedVehicleId(""); return; }
    setLoadingVehicles(true);
    fetchCustomerVehiclesForService(token, selectedCheckinCustomer.id)
      .then((v) => { setCustomerVehicles(v); if (v.length > 0) setSelectedVehicleId(v[0]._id); })
      .catch(() => setCustomerVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, [token, selectedCheckinCustomer]);

  // Auto-fill mileage when vehicle selected
  React.useEffect(() => {
    const v = customerVehicles.find((v) => v._id === selectedVehicleId);
    if (v) setMileage(String(v.currentMileage));
  }, [selectedVehicleId, customerVehicles]);

  const canCheckin = !!selectedCheckinCustomer && !!selectedVehicleId && !!serviceType && !!locationName && !!mileage && !submittingCheckin;

  const handleCheckin = async () => {
    if (!canCheckin) return;
    setSubmittingCheckin(true);
    try {
      await checkInVehicleForService(token, {
        vehicleId: selectedVehicleId,
        serviceType,
        locationName,
        mileageAtService: Number(mileage),
      });
      toast.success(`Vehicle checked in — status set to Car Received.`);
      // reset
      setSelectedCheckinCustomer(null);
      setCheckinCustomerQuery("");
      setCustomerVehicles([]);
      setSelectedVehicleId("");
      setServiceType("");
      setMileage("");
      await refreshQueue();
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || "Check-in failed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const handleAdvance = async (record: ActiveServiceRecord) => {
    const meta = SERVICE_STATUS_META[record.serviceStatus] ?? SERVICE_STATUS_META["received"];
    if (!meta.nextStatus) return;
    setAdvancingId(record._id);
    try {
      await advanceServiceStatus(token, record._id, meta.nextStatus);
      toast.success(`Status updated to "${SERVICE_STATUS_META[meta.nextStatus].label}"`);
      await refreshQueue();
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || "Status update failed.";
      toast.error(msg);
    } finally {
      setAdvancingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Check-in panel */}
      <Card className="p-5 rounded-2xl border-border/40 bg-card dark:bg-zinc-900/60">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <ClipboardList className="h-4 w-4 text-emerald-500" /> Check In a Vehicle
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Customer search */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">1 · Select Customer</p>
            {selectedCheckinCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Thumb image={resolveImageUrl(selectedCheckinCustomer.avatar || undefined) || null} fallback={<UserIcon className="h-4 w-4 text-muted-foreground" />} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{selectedCheckinCustomer.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{selectedCheckinCustomer.email}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedCheckinCustomer(null); setCheckinCustomerQuery(""); }} className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 shrink-0 ml-2">
                  <X className="h-3 w-3" /> Clear
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={checkinCustomerQuery} onChange={(e) => setCheckinCustomerQuery(e.target.value)} placeholder="Search customer name or email…" className="pl-9 bg-muted/40 border-border/40" />
                </div>
                {checkinCustomerQuery && (
                  <ResultList loading={loadingCheckinCustomers} empty="No matching customers.">
                    {checkinCustomers.map((c) => (
                      <button key={c.id} onClick={() => { setSelectedCheckinCustomer(c); setCheckinCustomerQuery(""); }} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-emerald-400/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                        <Thumb image={resolveImageUrl(c.avatar || undefined) || null} fallback={<UserIcon className="h-4 w-4 text-muted-foreground" />} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                        </div>
                      </button>
                    ))}
                  </ResultList>
                )}
              </div>
            )}
          </div>

          {/* Vehicle + service details */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">2 · Vehicle &amp; Service Details</p>

            {/* Vehicle select */}
            {loadingVehicles ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles…
              </div>
            ) : !selectedCheckinCustomer ? (
              <p className="text-xs text-muted-foreground py-2">Select a customer first</p>
            ) : customerVehicles.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No active vehicles in this customer&apos;s garage
              </div>
            ) : (
              <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} className="w-full h-9 rounded-md border border-border/40 bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                {customerVehicles.map((v) => (
                  <option key={v._id} value={v._id}>{v.year} {v.make} {v.model}{v.licensePlate ? ` — ${v.licensePlate}` : ""}</option>
                ))}
              </select>
            )}

            {/* Service type */}
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} disabled={!selectedCheckinCustomer} className="w-full h-9 rounded-md border border-border/40 bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50">
              <option value="">Select service type…</option>
              {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {/* Location + mileage */}
            <div className="grid grid-cols-2 gap-2">
              <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Location name" disabled={!selectedCheckinCustomer} className="bg-muted/40 border-border/40 disabled:opacity-50 text-sm" />
              <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="Current mileage" disabled={!selectedCheckinCustomer} className="bg-muted/40 border-border/40 disabled:opacity-50 text-sm" />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/40 flex justify-end">
          <Button onClick={handleCheckin} disabled={!canCheckin} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 h-11 px-6 disabled:opacity-40">
            {submittingCheckin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Check In Vehicle
          </Button>
        </div>
      </Card>

      {/* Active service queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" /> Active Service Queue
            {queue.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-1.5">
                {queue.length}
              </span>
            )}
          </h2>
          <button onClick={refreshQueue} disabled={loadingQueue} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", loadingQueue && "animate-spin")} />
            Refresh
          </button>
        </div>

        {loadingQueue ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : queue.length === 0 ? (
          <div className="p-10 text-center border border-dashed rounded-2xl bg-card dark:bg-zinc-900/40 border-border/40">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">No active services</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check in a vehicle above to start tracking service status.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((record) => {
              const meta = SERVICE_STATUS_META[record.serviceStatus] ?? SERVICE_STATUS_META["received"];
              const isAdvancing = advancingId === record._id;
              const lastUpdated = record.statusUpdatedAt
                ? new Date(record.statusUpdatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                : null;

              return (
                <div key={record._id} className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 overflow-hidden">
                  {/* Status color stripe */}
                  <div className={cn(
                    "h-1",
                    record.serviceStatus === "received"      && "bg-amber-400",
                    record.serviceStatus === "in_service"    && "bg-blue-500",
                    record.serviceStatus === "quality_check" && "bg-purple-500",
                    record.serviceStatus === "ready"         && "bg-emerald-500",
                    record.serviceStatus === "completed"     && "bg-muted-foreground/30",
                  )} />

                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Customer + vehicle info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                        {record.customer?.avatar ? (
                          <img src={resolveImageUrl(record.customer.avatar) || record.customer.avatar} className="h-full w-full rounded-full object-cover" alt="" />
                        ) : (
                          <UserIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {record.customer?.name ?? "Unknown customer"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {record.vehicle.year} {record.vehicle.make} {record.vehicle.model}
                          {record.vehicle.licensePlate ? ` · ${record.vehicle.licensePlate}` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {record.locationName}
                          {lastUpdated && <span className="text-muted-foreground"> · {lastUpdated}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Status badge + service type */}
                    <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                      <Badge className={cn("text-[10px] h-5 px-2.5 rounded-full border-0 font-semibold", meta.color)}>
                        {meta.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {record.serviceType.replace(/_/g, " ")} · {record.mileageAtService.toLocaleString()} mi
                      </span>
                    </div>

                    {/* Advance button */}
                    {meta.nextStatus && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvance(record)}
                        disabled={isAdvancing}
                        className="shrink-0 rounded-xl h-9 px-4 font-semibold gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white text-xs"
                      >
                        {isAdvancing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        {meta.nextLabel}
                      </Button>
                    )}
                  </div>

                  {/* Mini progress bar showing stages */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-1">
                      {(["received", "in_service", "quality_check", "ready"] as ServiceStatus[]).map((stage, i) => {
                        const stageIdx = ["received","in_service","quality_check","ready","completed"].indexOf(stage);
                        const currentIdx = ["received","in_service","quality_check","ready","completed"].indexOf(record.serviceStatus);
                        const done = stageIdx < currentIdx;
                        const active = stageIdx === currentIdx;
                        return (
                          <React.Fragment key={stage}>
                            <div className={cn(
                              "h-1.5 rounded-full transition-all",
                              done   ? "bg-emerald-500" :
                              active ? "bg-emerald-400 animate-pulse" :
                                       "bg-muted",
                              "flex-1",
                            )} />
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      {(["Received","Servicing","QC","Ready"] as const).map((l) => (
                        <span key={l} className="text-[9px] text-muted-foreground">{l}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared presentational helpers ───────────────────────────────────────────

function Thumb({ image, fallback }: { image: string | null; fallback: React.ReactNode }) {
  return (
    <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
      {image ? <img src={resolveImageUrl(image) || image} alt="" className="h-full w-full object-cover" /> : fallback}
    </div>
  );
}

function SelectedRow({ image, title, sub, meta }: { image: string | null; title: string; sub: string; meta: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
      <Thumb image={image} fallback={<Check className="h-4 w-4 text-emerald-500" />} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
      <Badge className="text-[9px] h-5 px-2 rounded-full capitalize bg-background/70 text-muted-foreground border-0 shrink-0">{meta}</Badge>
    </div>
  );
}

function ResultList({ loading, empty, children }: { loading: boolean; empty: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
      ) : hasChildren ? children : (
        <p className="text-xs text-muted-foreground text-center py-8">{empty}</p>
      )}
    </div>
  );
}
