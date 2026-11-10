"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import {
  DEAL_STAGE_LABELS,
  OPEN_DEAL_STAGES,
  afterSaleError,
  createDeal,
  searchDealLeads,
  type DealLeadOption,
  type DealStage,
} from "@/lib/api/afterSale";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:h-10 sm:text-sm";

export function NewDealDialog({
  open,
  onOpenChange,
  team,
  canAssign,
  presetLeads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Array<{ id: string; name: string }>;
  canAssign: boolean;
  presetLeads?: Array<{ id: string; name: string; vehicle: string; status: string }>;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [lead, setLead] = React.useState<{ id: string; name: string; vehicle: string } | null>(null);
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [stage, setStage] = React.useState<DealStage>("new");
  const [assignedTo, setAssignedTo] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebounced("");
    setLead(presetLeads?.length === 1 ? presetLeads[0] : null);
    setTitle("");
    setAmount("");
    setStage("new");
    setAssignedTo("");
    setError("");
  }, [open, presetLeads]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const results = useQuery({
    queryKey: ["crm-deal-lead-search", debounced],
    queryFn: async () => searchDealLeads(await getToken(), debounced),
    enabled: open && !presetLeads && debounced.length >= 2,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      createDeal(await getToken(), {
        leadId: lead!.id,
        title: title.trim() || undefined,
        amount: amount.trim() === "" ? null : Number(amount),
        stage,
        ...(canAssign && assignedTo ? { assignedTo } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      toast.success("Deal created");
      onOpenChange(false);
    },
    onError: (err) => setError(afterSaleError(err, "Couldn't create the deal. Please try again.")),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!lead) return setError("Pick the lead for this deal.");
    if (amount.trim() && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) return setError("Enter the amount as a number, for example 24500.");
    mutation.mutate();
  };

  const options: DealLeadOption[] | Array<{ id: string; name: string; vehicle: string; status: string; phone?: string }> = presetLeads || results.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby="new-deal-description">
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription id="new-deal-description">A deal follows one lead and one vehicle from first offer to Won or Lost.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {lead ? (
            <div className="flex items-start justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <p className="wrap-break-word text-sm font-medium">{lead.name}</p>
                <p className="wrap-break-word text-xs text-muted-foreground">{lead.vehicle || "No vehicle on the lead"}</p>
              </div>
              {(!presetLeads || presetLeads.length > 1) && (
                <button type="button" onClick={() => setLead(null)} className="h-9 shrink-0 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {!presetLeads && (
                <label className="block space-y-1 text-xs font-medium">
                  Find the lead
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone or email" className={cn(fieldClass, "pl-9")} autoFocus />
                  </span>
                </label>
              )}
              {!presetLeads && debounced.length >= 2 && results.isFetching && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </p>
              )}
              {options.length > 0 && (
                <ul className="max-h-60 space-y-1 overflow-y-auto" aria-label="Leads">
                  {options.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => setLead({ id: option.id, name: option.name, vehicle: option.vehicle })}
                        className="w-full rounded-lg border px-3 py-2 text-left hover:bg-muted"
                      >
                        <span className="block wrap-break-word text-sm font-medium">{option.name}</span>
                        <span className="block wrap-break-word text-xs text-muted-foreground">
                          {[option.vehicle || "No vehicle", option.status, "phone" in option ? option.phone : ""].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!presetLeads && debounced.length >= 2 && !results.isFetching && !options.length && <p className="text-xs text-muted-foreground">No leads match.</p>}
              {presetLeads && !presetLeads.length && <p className="text-xs text-muted-foreground">This customer has no leads to start a deal from.</p>}
            </div>
          )}

          <label className="block space-y-1 text-xs font-medium">
            Title (optional)
            <input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 150))} placeholder={lead ? `${lead.name}${lead.vehicle ? ` - ${lead.vehicle}` : ""}` : "Customer name and vehicle"} className={fieldClass} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium">
              Stage
              <select value={stage} onChange={(event) => setStage(event.target.value as DealStage)} className={fieldClass}>
                {OPEN_DEAL_STAGES.map((value) => (
                  <option key={value} value={value}>
                    {DEAL_STAGE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium">
              Amount (optional)
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} className={fieldClass} />
            </label>
          </div>
          {canAssign ? (
            <label className="block space-y-1 text-xs font-medium">
              Owner
              <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className={fieldClass}>
                <option value="">The lead&apos;s assigned team member</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">You will own this deal.</p>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-lg border px-4 text-sm font-medium hover:bg-muted sm:h-10">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !lead}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 sm:h-10"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create deal
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
