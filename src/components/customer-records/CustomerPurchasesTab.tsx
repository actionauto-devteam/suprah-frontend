"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Car, Loader2, Pencil, Plus, Receipt, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { fmtDateMDT } from "@/lib/timezone";
import {
  afterSaleError,
  createCustomerPurchase,
  deleteCustomerPurchase,
  fetchCustomerPurchases,
  formatMoney,
  updateCustomerPurchase,
  type CustomerPurchaseItem,
  type PurchaseInput,
} from "@/lib/api/afterSale";
import type { CustomerLeadMarkedSold, CustomerRelatedLead } from "@/lib/api/customerRecords";

const fieldClass =
  "h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:h-10 sm:text-sm";

function todayDenver(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

function dateInputValue(value: string | null | undefined): string {
  if (!value) return todayDenver();
  return new Date(value).toISOString().slice(0, 10);
}

type FormState = {
  label: string;
  vin: string;
  stock: string;
  salePrice: string;
  soldAt: string;
  salespersonId: string;
  leadId: string;
  notes: string;
};

const emptyForm = (): FormState => ({ label: "", vin: "", stock: "", salePrice: "", soldAt: todayDenver(), salespersonId: "", leadId: "", notes: "" });

function usePurchases(customerId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["customer-purchases", customerId],
    queryFn: async () => fetchCustomerPurchases(await getToken(), customerId),
    staleTime: 15_000,
  });
}

function PurchaseDialog({
  open,
  onOpenChange,
  customerId,
  purchase,
  prefill,
  team,
  leads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  purchase: CustomerPurchaseItem | null;
  prefill: Partial<FormState> | null;
  team: Array<{ id: string; name: string }>;
  leads: CustomerRelatedLead[];
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setError("");
    if (purchase) {
      setForm({
        label: purchase.vehicle.label,
        vin: purchase.vehicle.vin,
        stock: purchase.vehicle.stock,
        salePrice: purchase.salePrice === null ? "" : String(purchase.salePrice),
        soldAt: dateInputValue(purchase.soldAt),
        salespersonId: purchase.salesperson.id || "",
        leadId: purchase.leadId || "",
        notes: purchase.notes,
      });
    } else {
      setForm({ ...emptyForm(), ...(prefill || {}) });
    }
  }, [open, purchase, prefill]);

  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const body: PurchaseInput = {
        vehicle: { label: form.label.trim(), vin: form.vin.trim(), stock: form.stock.trim() },
        salePrice: form.salePrice.trim() === "" ? null : Number(form.salePrice),
        soldAt: form.soldAt,
        salespersonId: form.salespersonId || null,
        notes: form.notes.trim(),
      };
      const token = await getToken();
      if (purchase) return updateCustomerPurchase(token, customerId, purchase.id, body);
      return createCustomerPurchase(token, customerId, { ...body, leadId: form.leadId || null });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customer-purchases", customerId] });
      toast.success(purchase ? "Purchase saved" : "Purchase added");
      onOpenChange(false);
    },
    onError: (err) => setError(afterSaleError(err, "Couldn't save the purchase. Please try again.")),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.label.trim() && !form.vin.trim() && !form.stock.trim()) return setError("Enter the vehicle, its VIN or its stock number.");
    if (form.salePrice.trim() && (!Number.isFinite(Number(form.salePrice)) || Number(form.salePrice) < 0)) return setError("Enter the sale price as a number, for example 24500.");
    if (!form.soldAt) return setError("Pick the date of the sale.");
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby="purchase-dialog-description">
        <DialogHeader>
          <DialogTitle>{purchase ? "Edit purchase" : "Add purchase"}</DialogTitle>
          <DialogDescription id="purchase-dialog-description">A vehicle this customer bought from us.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1 text-xs font-medium">
            Vehicle
            <input value={form.label} onChange={set("label")} placeholder="For example: 2021 Toyota RAV4 XLE" maxLength={160} className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium">
              VIN
              <input value={form.vin} onChange={set("vin")} maxLength={40} className={fieldClass} autoCapitalize="characters" />
            </label>
            <label className="space-y-1 text-xs font-medium">
              Stock number
              <input value={form.stock} onChange={set("stock")} maxLength={40} className={fieldClass} />
            </label>
            <label className="space-y-1 text-xs font-medium">
              Sale price (USD)
              <input inputMode="decimal" value={form.salePrice} onChange={(event) => setForm((current) => ({ ...current, salePrice: event.target.value.replace(/[^0-9.]/g, "") }))} placeholder="Not set" className={fieldClass} />
            </label>
            <label className="space-y-1 text-xs font-medium">
              Date of sale
              <input type="date" value={form.soldAt} onChange={set("soldAt")} className={fieldClass} />
            </label>
          </div>
          <label className="block space-y-1 text-xs font-medium">
            Salesperson
            <select value={form.salespersonId} onChange={set("salespersonId")} className={fieldClass}>
              <option value="">Not set</option>
              {purchase?.salesperson.id && !team.some((member) => member.id === purchase.salesperson.id) && <option value={purchase.salesperson.id}>{purchase.salesperson.name || "Former team member"}</option>}
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          {!purchase && leads.length > 0 && (
            <label className="block space-y-1 text-xs font-medium">
              Lead (optional)
              <select value={form.leadId} onChange={set("leadId")} className={fieldClass}>
                <option value="">No lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {[lead.vehicle || "No vehicle", lead.status, fmtDateMDT(lead.createdAt)].join(" · ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1 text-xs font-medium">
            Notes (optional)
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              maxLength={1000}
              className="w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:text-sm"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-lg border px-4 text-sm font-medium hover:bg-muted sm:h-10">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 sm:h-10">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {purchase ? "Save purchase" : "Add purchase"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseRow({ customerId, item, onEdit }: { customerId: string; item: CustomerPurchaseItem; onEdit: (item: CustomerPurchaseItem) => void }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);
  const remove = useMutation({
    mutationFn: async () => deleteCustomerPurchase(await getToken(), customerId, item.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customer-purchases", customerId] });
      toast.success("Purchase removed");
    },
    onError: (err) => {
      setConfirming(false);
      toast.error(afterSaleError(err, "Couldn't remove the purchase."));
    },
  });
  const ids = [item.vehicle.vin ? `VIN ${item.vehicle.vin}` : "", item.vehicle.stock ? `Stock ${item.vehicle.stock}` : ""].filter(Boolean).join(" · ");
  return (
    <li className="space-y-2 rounded-lg border p-3" data-testid="purchase-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="wrap-break-word text-sm font-semibold">{item.vehicle.label}</p>
          {ids && <p className="wrap-break-word text-xs text-muted-foreground">{ids}</p>}
        </div>
        <p className="text-base font-semibold tabular-nums">{item.salePrice === null ? <span className="text-xs font-normal text-muted-foreground">Price not set</span> : formatMoney(item.salePrice)}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Sold {fmtDateMDT(item.soldAt)}
        {item.salesperson.name ? ` · ${item.salesperson.name}` : ""} · {item.sourceLabel}
      </p>
      {item.notes && <p className="wrap-break-word whitespace-pre-wrap text-sm">{item.notes}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {item.leadId && (
          <Link href={`/crm/leads?leadId=${item.leadId}`} className="inline-flex min-h-9 items-center text-xs text-emerald-700 hover:underline dark:text-emerald-400">
            Open the lead
          </Link>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs">Remove this purchase?</span>
              <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
                Keep
              </button>
              <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="inline-flex h-9 items-center gap-1 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {remove.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Remove
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onEdit(item)} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button type="button" onClick={() => setConfirming(true)} className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-red-700 hover:bg-red-500/10 dark:text-red-400" aria-label={`Remove the ${item.vehicle.label} purchase`}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </>
          )}
        </span>
      </div>
    </li>
  );
}

export function CustomerPurchasesTab({ customerId, leads, soldLeads }: { customerId: string; leads: CustomerRelatedLead[]; soldLeads: CustomerLeadMarkedSold[] }) {
  const query = usePurchases(customerId);
  const [dialog, setDialog] = React.useState<{ purchase: CustomerPurchaseItem | null; prefill: Partial<FormState> | null } | null>(null);
  const items = query.data?.items || [];
  const recordedLeads = new Set(items.map((item) => item.leadId).filter(Boolean));
  const soldWithoutPurchase = soldLeads.filter((lead) => !recordedLeads.has(lead.leadId));

  return (
    <div className="space-y-3">
      <section className="rounded-xl border bg-card" aria-label="Purchases">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Purchases ({items.length})
          </h2>
          <button type="button" onClick={() => setDialog({ purchase: null, prefill: null })} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 sm:h-9">
            <Plus className="h-4 w-4" />
            Add purchase
          </button>
        </div>
        <div className="space-y-2 p-4">
          {query.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading purchases…
            </p>
          ) : query.isError ? (
            <div role="alert" className="text-center text-sm">
              <p>{afterSaleError(query.error, "Couldn't load the purchases.")}</p>
              <button type="button" onClick={() => void query.refetch()} className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          ) : items.length ? (
            <ul className="space-y-2">{items.map((item) => <PurchaseRow key={item.id} customerId={customerId} item={item} onEdit={(purchase) => setDialog({ purchase, prefill: null })} />)}</ul>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
              No purchases yet. A purchase is added when a deal is marked Won or a lead is marked Sold, or you can add one here.
            </p>
          )}
        </div>
      </section>

      {soldWithoutPurchase.length > 0 && (
        <section className="rounded-xl border bg-card" aria-label="Leads marked Sold without a purchase">
          <div className="border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold">Leads marked Sold without a purchase ({soldWithoutPurchase.length})</h2>
          </div>
          <ul className="space-y-2 p-4">
            {soldWithoutPurchase.map((lead) => (
              <li key={lead.leadId} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="wrap-break-word text-sm font-medium">{lead.vehicle || "No vehicle listed"}</p>
                  <p className="text-xs text-muted-foreground">{lead.markedAt ? `Marked Sold ${fmtDateMDT(lead.markedAt)}` : "Date not recorded"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/crm/leads?leadId=${lead.leadId}`} className="inline-flex h-10 items-center rounded-lg border px-3 text-xs font-medium hover:bg-muted sm:h-9">
                    Open lead
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDialog({ purchase: null, prefill: { label: lead.vehicle || "", leadId: lead.leadId, soldAt: lead.markedAt ? dateInputValue(lead.markedAt) : todayDenver() } })}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted sm:h-9"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add as purchase
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-4 pb-3 text-[11px] text-muted-foreground">These leads were marked Sold before purchases were recorded in Suprah.</p>
        </section>
      )}

      <PurchaseDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(null)}
        customerId={customerId}
        purchase={dialog?.purchase || null}
        prefill={dialog?.prefill || null}
        team={query.data?.team || []}
        leads={leads}
      />
    </div>
  );
}

export function CustomerOwnedVehicles({ customerId }: { customerId: string }) {
  const query = usePurchases(customerId);
  const items = query.data?.items || [];
  return (
    <section className="rounded-xl border bg-card" aria-label="Owned vehicles">
      <div className="border-b px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Car className="h-4 w-4 text-muted-foreground" />
          Bought from us ({items.length})
        </h2>
      </div>
      <div className="p-4">
        {query.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </p>
        ) : items.length ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border p-3">
                <p className="wrap-break-word text-sm font-medium">{item.vehicle.label}</p>
                <p className="mt-0.5 wrap-break-word text-xs text-muted-foreground">
                  {[item.vehicle.vin ? `VIN ${item.vehicle.vin}` : "", `Bought ${fmtDateMDT(item.soldAt)}`].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">No vehicles bought from us yet. They show here once a purchase is recorded.</p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">Vehicles saved in the customer app (My Garage) aren&apos;t linked to Customer Records yet.</p>
      </div>
    </section>
  );
}
