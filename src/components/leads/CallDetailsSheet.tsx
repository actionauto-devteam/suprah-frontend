"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CallRecordingPlayer } from "@/components/communications/CallRecordingPlayer";
import { formatSmsRecipient } from "@/lib/api/leadComposer";
import { fmtFullDateTimeMDT } from "@/lib/timezone";
import { callDuration, callLine, useRecordingPermissions, type ConversationCall } from "./CallCard";

const when = (value?: string | null) => (value ? fmtFullDateTimeMDT(value) : "");

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  );
}

export function CallDetailsSheet({ open, onOpenChange, call, outbound, customerName, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; call: ConversationCall; outbound: boolean; customerName: string; onChanged?: () => void }) {
  const canListen = useRecordingPermissions().includes("view");
  const handledBy = outbound ? call.placedBy : call.answeredBy;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
          <SheetDescription>{outbound ? `Call to ${customerName}` : `Call from ${customerName}`}</SheetDescription>
        </SheetHeader>
        <dl className="px-4">
          <Row label="Status" value={call.label} />
          <Row label="Direction" value={outbound ? "Outgoing" : "Incoming"} />
          <Row label="Customer number" value={call.customerNumber ? formatSmsRecipient(call.customerNumber) || call.customerNumber : ""} />
          <Row label="Number used" value={callLine(call)} />
          <Row label="Handled by" value={handledBy} />
          <Row label="Menu choice" value={call.selectedOption} />
          <Row label="Started" value={when(call.startedAt)} />
          <Row label="Answered" value={when(call.answeredAt)} />
          <Row label="Ended" value={when(call.endedAt)} />
          <Row label="Length" value={callDuration(call.durationSec)} />
        </dl>
        <div className="px-4 pb-6">
          {!call.recording && <p className="text-sm text-muted-foreground">This call wasn&apos;t recorded.</p>}
          {call.recording && !canListen && <p className="text-sm text-muted-foreground">This call was recorded. Ask an admin for access to listen.</p>}
          {call.recording && canListen && open && <CallRecordingPlayer recordingId={call.recording.id} onChanged={onChanged} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
