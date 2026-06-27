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
  InventoryVehicle,
  CustomerLite,
  TransferableDeal,
  GarageTransferRecord,
} from "@/lib/api/garageReview";
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

// ─────────────────────────────────────────────────────────────────────────────

export default function GarageReviewPage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"transfer" | "auction">("transfer");

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
                Inventory &amp; Auction
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicle transfers &amp; auction listing approvals
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("transfer")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === "transfer"
                ? "bg-card dark:bg-zinc-800 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Car className="h-3.5 w-3.5" /> Vehicle Transfer
          </button>
          <button
            onClick={() => setActiveTab("auction")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
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
              <button onClick={() => setSelectedVehicle(null)} className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 -m-1.5 px-1.5 py-1.5">
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
              <button onClick={() => setSelectedCustomer(null)} className="text-[11px] text-muted-foreground hover:text-red-500 flex items-center gap-1 -m-1.5 px-1.5 py-1.5">
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
                    <Badge className="text-[9px] h-5 px-2 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-0">Refreshed</Badge>
                  ) : (
                    <Badge className="text-[9px] h-5 px-2 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-0">Transferred</Badge>
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
