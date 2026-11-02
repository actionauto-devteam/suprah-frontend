"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CallRecordingPlayer } from "@/components/communications/CallRecordingPlayer";
import { formatSmsRecipient } from "@/lib/api/leadComposer";
import { fmtFullDateTimeMDT } from "@/lib/timezone";
import { callDuration, callLine, canListenTo, useRecordingAccess, useRecordingInsights, type ConversationCall } from "./CallCard";

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
  const canListen = canListenTo(useRecordingAccess(), call.recording);
  const insights = useRecordingInsights(call.recording, open && canListen);
  const details = insights.data?.recording;
  const points = details?.summaryPoints || [];
  const handledBy = outbound ? call.placedBy : call.answeredBy;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{call.recording?.kind === "voicemail" ? "Voicemail details" : "Call details"}</SheetTitle>
          <SheetDescription>{outbound ? `Call to ${customerName}` : `Call from ${customerName}`}</SheetDescription>
        </SheetHeader>
        {call.recording && canListen && (
          <section aria-label="Call summary" className="space-y-3 px-4">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{call.recording.kind === "voicemail" ? "Voicemail summary" : "Call summary"}</h3>
              {points.length > 0 ? (
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
                  {points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {insights.isPending ? "Loading..." : details?.summaryError || "The summary shows here a few minutes after the call ends."}
                </p>
              )}
            </div>
            {details?.summarySentiment && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer sentiment</h3>
                <p className="mt-1.5 text-sm">{details.summarySentiment}</p>
              </div>
            )}
          </section>
        )}
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
          {call.recording && canListen && details?.transcript && (
            <section aria-label="Transcript" className="mt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Transcript</h3>
              <p className="mt-1.5 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-3 text-sm">{details.transcript}</p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
