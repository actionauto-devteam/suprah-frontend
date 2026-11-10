"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Loader2, Lock, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { fmtShortDateTimeMDT } from "@/lib/timezone";
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  DEAL_STAGE_STYLES,
  addDealOffer,
  afterSaleError,
  deleteDeal,
  formatMoney,
  updateDeal,
  type Deal,
  type DealStage,
} from "@/lib/api/afterSale";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:h-10 sm:text-sm";

const LEAD_SOLD_MESSAGES: Record<string, string> = {
  changed: "The lead is now marked Sold.",
  already: "The lead was already marked Sold.",
  do_not_contact: "The lead is marked Do Not Contact, so its status was not changed.",
  conflict: "The lead's status changed at the same time, so it was not marked Sold. Check the lead.",
  missing: "The lead was not found, so it was not marked Sold.",
};

function historyText(entry: Deal["history"][number]): string {
  switch (entry.action) {
    case "created":
      return `Created in ${DEAL_STAGE_LABELS[entry.to as DealStage] || entry.to}`;
    case "stage":
      return `Moved from ${DEAL_STAGE_LABELS[entry.from as DealStage] || entry.from} to ${DEAL_STAGE_LABELS[entry.to as DealStage] || entry.to}`;
    case "assigned":
      return entry.to ? `Assigned to ${entry.to}` : "Removed the owner";
    case "amount":
      return entry.to === null && entry.from === null ? "Changed the amount" : `Changed the amount to ${entry.to ? formatMoney(Number(entry.to)) : "none"}`;
    case "offer":
      return entry.to === "customer" ? "Added a customer offer" : "Added a dealership offer";
    case "lead_sold":
      return "Marked the lead Sold";
    default:
      return entry.action;
  }
}

export function DealDetailDialog({
  deal,
  open,
  onOpenChange,
  team,
  canAssign,
}: {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Array<{ id: string; name: string }>;
  canAssign: boolean;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [stage, setStage] = React.useState<DealStage>("new");
  const [markSold, setMarkSold] = React.useState(true);
  const [lostReason, setLostReason] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [offerAmount, setOfferAmount] = React.useState("");
  const [offerFrom, setOfferFrom] = React.useState<"customer" | "dealership">("customer");
  const [offerNote, setOfferNote] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!deal) return;
    setStage(deal.stage);
    setMarkSold(true);
    setLostReason(deal.lostReason || "");
    setAmount(deal.amount === null ? "" : String(deal.amount));
    setOfferAmount("");
    setOfferNote("");
    setConfirmDelete(false);
    setError("");
  }, [deal]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
  };

  const update = useMutation({
    mutationFn: async (body: Parameters<typeof updateDeal>[2]) => updateDeal(await getToken(), deal!.id, body),
    onSuccess: (result) => {
      refresh();
      toast.success("Deal saved", result.leadSold ? { description: LEAD_SOLD_MESSAGES[result.leadSold] || undefined } : undefined);
      setError("");
    },
    onError: (err) => setError(afterSaleError(err, "Couldn't save the deal. Please try again.")),
  });

  const offer = useMutation({
    mutationFn: async () => addDealOffer(await getToken(), deal!.id, { amount: Number(offerAmount), from: offerFrom, note: offerNote.trim() }),
    onSuccess: () => {
      refresh();
      setOfferAmount("");
      setOfferNote("");
      toast.success("Offer added");
      setError("");
    },
    onError: (err) => setError(afterSaleError(err, "Couldn't add the offer. Please try again.")),
  });

  const remove = useMutation({
    mutationFn: async () => deleteDeal(await getToken(), deal!.id),
    onSuccess: () => {
      refresh();
      toast.success("Deal deleted");
      onOpenChange(false);
    },
    onError: (err) => setError(afterSaleError(err, "Couldn't delete the deal.")),
  });

  if (!deal) return null;
  const busy = update.isPending || offer.isPending || remove.isPending;
  const stageChanged = stage !== deal.stage;

  const saveStage = () => {
    setError("");
    if (stage === "lost" && !lostReason.trim()) {
      setError("Say why the deal was lost.");
      return;
    }
    update.mutate({ stage, ...(stage === "lost" ? { lostReason: lostReason.trim() } : {}), ...(stage === "won" ? { markLeadSold: markSold } : {}) });
  };

  const saveAmount = () => {
    setError("");
    const value = amount.trim() === "" ? null : Number(amount);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setError("Enter the amount as a number, for example 24500.");
      return;
    }
    update.mutate({ amount: value });
  };

  const submitOffer = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const value = Number(offerAmount);
    if (!offerAmount.trim() || !Number.isFinite(value) || value < 0) {
      setError("Enter the offer as a number, for example 23900.");
      return;
    }
    offer.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" aria-describedby="deal-detail-description">
        <DialogHeader>
          <DialogTitle className="wrap-break-word pr-8">{deal.title}</DialogTitle>
          <DialogDescription id="deal-detail-description" className="wrap-break-word">
            {deal.customerName || "Customer"}
            {deal.vehicle.label ? ` · ${deal.vehicle.label}` : ""}
            {deal.vehicle.stock ? ` · Stock ${deal.vehicle.stock}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", DEAL_STAGE_STYLES[deal.stage])}>{deal.stageLabel}</span>
          <span className="text-xs text-muted-foreground">Owner: {deal.assignedName || "Nobody"}</span>
          {deal.createdBy.kind === "automation" && <span className="text-xs text-muted-foreground">· Created by an automation</span>}
        </div>
        {deal.stage === "lost" && deal.lostReason && <p className="wrap-break-word text-sm text-muted-foreground">Lost because: {deal.lostReason}</p>}

        <div className="flex flex-wrap gap-2">
          <Link href={`/crm/leads?leadId=${deal.leadId}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
            Open lead
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {deal.customerId && (
            <Link href={`/crm/customers/${deal.customerId}?tab=deals`} className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
              Customer record
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {!deal.canEdit && (
          <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
            Only managers, admins and the deal owner can see the amounts and change this deal.
          </p>
        )}

        {deal.canEdit && (
          <section className="space-y-2 rounded-lg border p-3" aria-label="Change the stage">
            <label className="block space-y-1 text-xs font-medium">
              Stage
              <select value={stage} onChange={(event) => setStage(event.target.value as DealStage)} className={fieldClass} disabled={busy}>
                {DEAL_STAGE_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {DEAL_STAGE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            {stage === "won" && stageChanged && (
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" checked={markSold} onChange={(event) => setMarkSold(event.target.checked)} className="h-4 w-4" />
                Also mark the lead Sold
              </label>
            )}
            {stage === "lost" && (
              <label className="block space-y-1 text-xs font-medium">
                Why was it lost?
                <input value={lostReason} onChange={(event) => setLostReason(event.target.value.slice(0, 300))} className={fieldClass} placeholder="For example: bought elsewhere" />
              </label>
            )}
            <button
              type="button"
              onClick={saveStage}
              disabled={busy || (!stageChanged && !(stage === "lost" && lostReason.trim() !== (deal.lostReason || "")))}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 sm:h-10 sm:w-auto"
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save stage
            </button>
          </section>
        )}

        {deal.canEdit && canAssign && (
          <label className="block space-y-1 text-xs font-medium">
            Owner
            <select value={deal.assignedTo || ""} disabled={busy} onChange={(event) => update.mutate({ assignedTo: event.target.value || null })} className={fieldClass}>
              <option value="">Nobody</option>
              {deal.assignedTo && !team.some((member) => member.id === deal.assignedTo) && <option value={deal.assignedTo}>{deal.assignedName || "Former team member"}</option>}
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {deal.amountsVisible && (
          <section className="space-y-3 rounded-lg border p-3" aria-label="Amounts">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block flex-1 space-y-1 text-xs font-medium">
                Deal amount (USD)
                <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} className={fieldClass} disabled={!deal.canEdit || busy} placeholder="Not set" />
              </label>
              {deal.canEdit && (
                <button type="button" onClick={saveAmount} disabled={busy || amount === (deal.amount === null ? "" : String(deal.amount))} className="h-11 shrink-0 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40 sm:h-10">
                  Save amount
                </button>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold">Offers ({deal.offers.length})</h3>
              {deal.offers.length ? (
                <ul className="space-y-1.5">
                  {deal.offers
                    .slice()
                    .reverse()
                    .map((item) => (
                      <li key={item.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <span className="font-semibold">{formatMoney(item.amount)}</span>
                        <span className="text-muted-foreground"> from {item.from === "customer" ? "the customer" : "the dealership"}</span>
                        {item.note && <p className="wrap-break-word text-xs">{item.note}</p>}
                        <p className="text-[11px] text-muted-foreground">
                          {item.by?.name || "Team member"} · {fmtShortDateTimeMDT(item.at)}
                        </p>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No offers yet.</p>
              )}
              {deal.canEdit && (
                <form onSubmit={submitOffer} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-label="Add an offer">
                  <label className="space-y-1 text-xs font-medium">
                    Offer (USD)
                    <input inputMode="decimal" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value.replace(/[^0-9.]/g, ""))} className={fieldClass} />
                  </label>
                  <label className="space-y-1 text-xs font-medium">
                    From
                    <select value={offerFrom} onChange={(event) => setOfferFrom(event.target.value as "customer" | "dealership")} className={fieldClass}>
                      <option value="customer">The customer</option>
                      <option value="dealership">The dealership</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium sm:col-span-2">
                    Note (optional)
                    <input value={offerNote} onChange={(event) => setOfferNote(event.target.value.slice(0, 500))} className={fieldClass} />
                  </label>
                  <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40 sm:col-span-2 sm:h-10 sm:justify-self-start">
                    {offer.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add offer
                  </button>
                </form>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Amounts are only shown to managers, admins and the deal owner. The AI agent never sees them.</p>
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <details className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium">History ({deal.history.length})</summary>
          <ol className="space-y-1 px-3 pb-3">
            {deal.history
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="text-xs">
                  {historyText(entry)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {entry.by?.name || "Team member"} · {fmtShortDateTimeMDT(entry.at)}
                  </span>
                </li>
              ))}
          </ol>
        </details>

        {canAssign && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            {confirmDelete ? (
              <>
                <span className="text-sm">Delete this deal for good?</span>
                <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                  Keep it
                </button>
                <button type="button" onClick={() => remove.mutate()} disabled={busy} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-500/10 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
                Delete deal
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
