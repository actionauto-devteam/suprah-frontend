"use client";

import * as React from "react";
import { toast } from "sonner";
import { Delete, Loader2, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSmsRecipient } from "@/lib/api/leadComposer";
import { useCommStore } from "@/lib/communicationStore";
import { useTelnyxRTC } from "@/hooks/useTelnyxRTC";
import { DIAL_KEYS, last10, toE164 } from "@/lib/phoneDialing";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

interface DialPadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone?: string;
  name?: string;
  leadId?: string;
}

export function DialPadDialog({ open, onOpenChange, phone = "", name, leadId }: DialPadDialogProps) {
  const { dial } = useTelnyxRTC();
  const { getToken } = useAuth();
  const { activeCall, softphoneReady } = useCommStore();
  const [number, setNumber] = React.useState("");
  const [calling, setCalling] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saveLead, setSaveLead] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setNumber(formatSmsRecipient(phone) || phone);
    setCalling(false);
    setError("");
    setSaveLead(false);
    setFirstName("");
  }, [open, phone]);

  const target = toE164(number);
  const sameAsLead = Boolean(leadId) && last10(number) === last10(phone);

  const leadForNumber = async (e164: string): Promise<{ id: string; existing: boolean }> => {
    const headers = { Authorization: `Bearer ${await getToken()}` };
    const key = last10(e164);
    const found = await apiClient.get("/api/leads", { params: { search: key, limit: 10, page: 1 }, headers });
    const match = ((found.data?.data?.leads || []) as Array<{ _id: string; phone?: string }>).find((lead) => last10(lead.phone || "") === key);
    if (match) return { id: match._id, existing: true };
    const created = await apiClient.post("/api/leads/", { firstName: firstName.trim() || "Unknown", phone: e164, email: "" }, { headers });
    const id = created.data?.data?._id as string | undefined;
    if (!id) throw new Error("The lead was not saved");
    return { id, existing: false };
  };

  const startCall = async () => {
    if (!target || calling) return;
    setCalling(true);
    setError("");
    try {
      let callLeadId = sameAsLead ? leadId : undefined;
      let displayName = sameAsLead ? name : undefined;
      if (!sameAsLead && saveLead) {
        try {
          const lead = await leadForNumber(target);
          callLeadId = lead.id;
          displayName = lead.existing ? undefined : firstName.trim() || undefined;
          toast.success(lead.existing ? "This number is already a lead. The call is saved on that lead." : "Lead added. The call is saved on it.");
        } catch (err) {
          setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Couldn't add the lead, so the call was not started. Try again.");
          return;
        }
      }
      await dial(target, { leadId: callLeadId, displayName });
      onOpenChange(false);
    } catch (err) {
      setError((err as { userMessage?: string })?.userMessage || "Couldn't start the call. Please try again.");
    } finally {
      setCalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-xs grid-cols-[minmax(0,1fr)] rounded-2xl sm:max-w-xs">
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle className="truncate">{name ? `Call ${name}` : "Call"}</DialogTitle>
          <DialogDescription>Check the number, then press Call.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value.replace(/[^\d*#+()\-\s]/g, "").slice(0, 32))}
            aria-label="Phone number to call"
            placeholder="Enter a number"
            inputMode="tel"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-center text-base font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
          />
          {number && (
            <button
              type="button"
              onClick={() => setNumber((value) => value.slice(0, -1))}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted"
              aria-label="Delete last digit"
            >
              <Delete className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mx-auto grid w-fit grid-cols-3 gap-2">
          {DIAL_KEYS.map((key) => (
            <button
              key={key.digit}
              type="button"
              onClick={() => setNumber((value) => `${value}${key.digit}`.slice(0, 32))}
              aria-label={`Dial ${key.digit}`}
              className="flex h-14 w-14 flex-col items-center justify-center rounded-full border bg-muted/40 hover:bg-muted"
            >
              <span className="text-lg font-semibold leading-none">{key.digit}</span>
              {key.letters && <span className="mt-0.5 text-[9px] tracking-widest text-muted-foreground">{key.letters}</span>}
            </button>
          ))}
        </div>
        {!sameAsLead && (
          <div className="space-y-2 rounded-lg border p-2.5">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 shrink-0" checked={saveLead} onChange={(event) => setSaveLead(event.target.checked)} />
              Add this number to Leads
            </label>
            {saveLead && (
              <>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value.slice(0, 60))}
                  aria-label="Customer first name"
                  placeholder="First name (optional)"
                  autoComplete="off"
                  className="h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-[11px] text-muted-foreground">If the number is already a lead, the call is saved on that lead instead.</p>
              </>
            )}
          </div>
        )}
        {error && <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
        {activeCall && <p role="status" className="text-center text-xs text-muted-foreground">You&apos;re already on a call.</p>}
        <button
          type="button"
          onClick={() => void startCall()}
          disabled={!target || calling || Boolean(activeCall)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
          Call
        </button>
        {!softphoneReady && !activeCall && <p className="text-center text-xs text-muted-foreground">Connecting your phone line...</p>}
      </DialogContent>
    </Dialog>
  );
}
