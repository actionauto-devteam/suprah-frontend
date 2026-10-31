"use client";

import * as React from "react";
import { Delete, Loader2, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSmsRecipient } from "@/lib/api/leadComposer";
import { useCommStore } from "@/lib/communicationStore";
import { useTelnyxRTC } from "@/hooks/useTelnyxRTC";
import { DIAL_KEYS, last10, toE164 } from "@/lib/phoneDialing";

interface DialPadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone?: string;
  name?: string;
  leadId?: string;
}

export function DialPadDialog({ open, onOpenChange, phone = "", name, leadId }: DialPadDialogProps) {
  const { dial } = useTelnyxRTC();
  const { activeCall, softphoneReady } = useCommStore();
  const [number, setNumber] = React.useState("");
  const [calling, setCalling] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setNumber(formatSmsRecipient(phone) || phone);
    setCalling(false);
    setError("");
  }, [open, phone]);

  const target = toE164(number);
  const sameAsLead = last10(number) === last10(phone);

  const startCall = async () => {
    if (!target || calling) return;
    setCalling(true);
    setError("");
    try {
      await dial(target, { leadId: sameAsLead ? leadId : undefined, displayName: sameAsLead ? name : undefined });
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
