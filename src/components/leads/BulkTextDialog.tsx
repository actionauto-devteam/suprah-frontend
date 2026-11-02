"use client";

import * as React from "react";
import { isAxiosError } from "axios";
import { Check, Loader2, Search, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { formatSmsRecipient, newClientRequestId } from "@/lib/api/leadComposer";

type PickLead = { _id: string; firstName?: string; lastName?: string; phone?: string; status?: string };
type Outcome = { lead: PickLead; ok: boolean; reason?: string };

export const BULK_TEXT_LIMIT = 50;
const MESSAGE_LIMIT = 1000;

const leadName = (lead: PickLead) => [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || "No name";
const leadPhone = (lead: PickLead) => formatSmsRecipient(lead.phone) || lead.phone || "";

export function BulkTextDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (open: boolean) => void; onSent?: () => void }) {
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<{ key: string; leads: PickLead[] } | null>(null);
  const [picked, setPicked] = React.useState<PickLead[]>([]);
  const [message, setMessage] = React.useState("");
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [outcomes, setOutcomes] = React.useState<Outcome[] | null>(null);
  const sending = Boolean(progress) && !outcomes;

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setResults(null);
    setPicked([]);
    setMessage("");
    setProgress(null);
    setOutcomes(null);
  }, [open]);

  const key = search.trim();
  React.useEffect(() => {
    if (!open || key.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiClient.get("/api/leads", { params: { search: key, limit: 8, page: 1 } });
        if (!cancelled) setResults({ key, leads: res.data?.data?.leads || [] });
      } catch {
        if (!cancelled) setResults({ key, leads: [] });
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, key]);

  const found = key.length >= 2 && results?.key === key ? results.leads : null;
  const pickedIds = new Set(picked.map((lead) => lead._id));
  const full = picked.length >= BULK_TEXT_LIMIT;

  const toggle = (lead: PickLead) => {
    setPicked((current) =>
      current.some((item) => item._id === lead._id)
        ? current.filter((item) => item._id !== lead._id)
        : current.length >= BULK_TEXT_LIMIT
          ? current
          : [...current, lead]
    );
  };

  const send = async () => {
    const body = message.trim();
    if (!body || !picked.length || sending) return;
    const list = [...picked];
    const done: Outcome[] = [];
    setProgress({ done: 0, total: list.length });
    for (const lead of list) {
      try {
        await apiClient.post("/api/crm/communications/messages", {
          toPhone: lead.phone,
          body,
          leadId: lead._id,
          customerName: leadName(lead),
          clientRequestId: newClientRequestId(),
        });
        done.push({ lead, ok: true });
      } catch (err) {
        done.push({ lead, ok: false, reason: (isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : "") || "Couldn't send" });
      }
      setProgress({ done: done.length, total: list.length });
    }
    setOutcomes(done);
    onSent?.();
  };

  const sentCount = outcomes?.filter((item) => item.ok).length || 0;
  const failed = outcomes?.filter((item) => !item.ok) || [];

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[90dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle>Bulk Message</DialogTitle>
          <DialogDescription>Pick up to {BULK_TEXT_LIMIT} leads. Each one gets the same text in their own conversation.</DialogDescription>
        </DialogHeader>

        {outcomes ? (
          <div className="space-y-3" role="status">
            <p className="text-sm font-semibold">
              Sent to {sentCount} of {outcomes.length} lead{outcomes.length === 1 ? "" : "s"}.
            </p>
            {failed.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Not sent:</p>
                <ul className="space-y-1.5" aria-label="Texts not sent">
                  {failed.map(({ lead, reason }) => (
                    <li key={lead._id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
                      <span className="font-semibold">{leadName(lead)}</span> · {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="button" className="h-11 w-full sm:h-10" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-text-search">Add leads</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="bulk-text-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or phone number"
                  autoComplete="off"
                  disabled={sending}
                  className="h-11 pl-9 text-base sm:h-10 sm:text-sm"
                />
              </div>
              {key.length >= 2 && !found && (
                <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching...
                </p>
              )}
              {found && found.length === 0 && <p className="text-xs text-muted-foreground">No leads match.</p>}
              {found && found.length > 0 && (
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border p-1" aria-label="Search results">
                  {found.map((lead) => {
                    const chosen = pickedIds.has(lead._id);
                    const blocked = !lead.phone || (!chosen && full);
                    return (
                      <li key={lead._id}>
                        <button
                          type="button"
                          disabled={blocked || sending}
                          aria-pressed={chosen}
                          onClick={() => toggle(lead)}
                          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${chosen ? "border-primary bg-primary text-primary-foreground" : ""}`}>
                            {chosen && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{leadName(lead)}</span>
                            <span className="block truncate text-xs text-muted-foreground">{lead.phone ? leadPhone(lead) : "No phone number"}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                To: {picked.length} lead{picked.length === 1 ? "" : "s"}
                {full && <span className="font-normal text-muted-foreground"> (limit reached)</span>}
              </p>
              {picked.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Selected leads">
                  {picked.map((lead) => (
                    <li key={lead._id} className="flex max-w-full items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs">
                      <span className="truncate">{leadName(lead)}</span>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => toggle(lead)}
                        aria-label={`Remove ${leadName(lead)}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Search above and tap a lead to add them.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-text-message">Message</Label>
              <Textarea
                id="bulk-text-message"
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_LIMIT))}
                rows={4}
                disabled={sending}
                placeholder="Type your text"
                className="text-base sm:text-sm"
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {message.length}/{MESSAGE_LIMIT}
              </p>
            </div>

            <Button type="button" className="h-11 w-full sm:h-10" disabled={!message.trim() || !picked.length || sending} onClick={() => void send()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending && progress ? `Sending ${progress.done} of ${progress.total}...` : `Send to ${picked.length} lead${picked.length === 1 ? "" : "s"}`}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
