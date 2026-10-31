"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, Headphones, Loader2, PhoneIncoming, PhoneMissed, PhoneOutgoing, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CallTimer } from "@/components/communications/CallTimer";
import { formatSmsRecipient } from "@/lib/api/leadComposer";
import { useCallRecordingApi, recordingError, type Recording, type RecordingAccess, type RecordingPermission } from "@/hooks/useCallRecordingApi";
import { cn } from "@/lib/utils";
import { CallDetailsSheet } from "./CallDetailsSheet";
import type { ConversationItem } from "@/lib/api/leadConversation";

export type ConversationCall = NonNullable<ConversationItem["call"]>;

const ENDED_TITLES: Record<string, string> = {
  completed: "Call Completed",
  missed: "Missed Call",
  failed: "Call Failed",
  canceled: "Call Not Connected",
};
const FAILED_STATUSES = ["missed", "failed", "canceled"];
const SETTLING_STATES = ["waiting", "disclosing", "starting", "start-pending", "recording", "pausing", "paused", "resuming", "processing"];
const STATE_LABELS: Record<string, string> = {
  failed: "Recording failed",
  unknown: "Recording needs attention",
};

export const callDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export const callLine = (call: ConversationCall) =>
  [call.lineLabel, call.number ? formatSmsRecipient(call.number) || call.number : ""].filter(Boolean).join(" · ");

export function useRecordingPermissions(enabled = true): RecordingPermission[] {
  const { request, orgId, authKey } = useCallRecordingApi();
  const query = useQuery({
    queryKey: ["call-recording-access", orgId, authKey],
    enabled,
    retry: false,
    staleTime: 60_000,
    queryFn: () => request<RecordingAccess>("get", "/recording-access"),
  });
  return query.data?.permissions || [];
}

function useCallRecording(call: ConversationCall, onChanged?: () => void) {
  const recording = call.recording;
  const { request, mediaUrl, orgId, authKey } = useCallRecordingApi();
  const permissions = useRecordingPermissions(Boolean(recording));
  const [source, setSource] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const live = useQuery({
    queryKey: ["conversation-call-recording", orgId, authKey, call.id],
    enabled: permissions.includes("view") && SETTLING_STATES.includes(recording?.state || ""),
    retry: false,
    refetchInterval: (current) => (current.state.data?.recording?.state === "ready" ? false : 5000),
    queryFn: () => request<{ recording: Recording | null }>("get", `/calls/${call.id}/recording`),
  });

  const open = async (mode: "play" | "download") => {
    if (!recording) return;
    setBusy(true);
    setError("");
    try {
      const detail = await request<{ recording: Recording }>("get", `/recordings/${recording.id}`);
      const fileId = detail.recording.files[0]?._id;
      if (!fileId) {
        setError("This recording has no audio yet.");
        return;
      }
      const session = await request<{ path: string }>("post", `/recordings/${recording.id}/media-session`, { mode, fileId });
      const url = mediaUrl(session.path);
      if (mode === "play") {
        setSource(url);
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `call-${recording.id}.mp3`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setError(recordingError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!recording || !window.confirm("Permanently delete this recording and revoke its shared links?")) return;
    setBusy(true);
    setError("");
    try {
      await request("delete", `/recordings/${recording.id}`);
      setSource("");
      onChanged?.();
    } catch (err) {
      setError(recordingError(err));
    } finally {
      setBusy(false);
    }
  };

  return { permissions, state: live.data?.recording?.state || recording?.state || "", source, setError, busy, error, open, remove };
}

export function CallCard({ call, outbound, customerName, timeLabel, onChanged }: { call: ConversationCall; outbound: boolean; customerName: string; timeLabel: string; onChanged?: () => void }) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const { permissions, state, source, setError, busy, error, open, remove } = useCallRecording(call, onChanged);
  const failed = FAILED_STATUSES.includes(call.status);
  const line = callLine(call);
  const Icon = failed ? PhoneMissed : outbound ? PhoneOutgoing : PhoneIncoming;

  if (call.live) {
    const since = new Date(call.answeredAt || call.startedAt || 0).getTime() || undefined;
    return (
      <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
        <div role="status" aria-label="Call in progress" className="w-full max-w-xs rounded-2xl bg-slate-900 p-3.5 text-white shadow-md dark:bg-slate-950 dark:ring-1 dark:ring-emerald-400/20">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><Icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Call in Progress</p>
              <p className="break-words text-xs text-slate-300">
                <CallTimer startedAt={since} />
                {line ? ` · ${line}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const duration = callDuration(call.durationSec);
  const canListen = permissions.includes("view");
  const canDownload = permissions.includes("download");
  const canDelete = permissions.includes("delete");
  const ready = Boolean(call.recording) && canListen && state === "ready";
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-emerald-400/15 dark:bg-[#0f1f19]">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white", failed ? "bg-red-500" : "bg-blue-600")}><Icon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ENDED_TITLES[call.status] || call.label}</p>
            <p className="break-words text-xs text-slate-500 dark:text-slate-400">{[duration, line].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        {call.recording && !canListen && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Headphones className="h-3.5 w-3.5" />Recorded</p>}
        {call.recording && canListen && !ready && <p role="status" className="mt-2 text-xs text-muted-foreground">{STATE_LABELS[state] || "Saving recording..."}</p>}
        {ready && (source ? (
          <audio key={source} controls autoPlay crossOrigin="use-credentials" preload="none" src={source} className="mt-2 h-10 w-full min-w-0" onError={() => setError("Playback stopped. Open the recording again.")} />
        ) : (
          <button type="button" disabled={busy} onClick={() => void open("play")} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border bg-muted/40 px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Headphones className="h-3.5 w-3.5" />}
            Play recording
          </button>
        ))}
        {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-2.5 flex items-stretch overflow-hidden rounded-lg border">
          <button type="button" onClick={() => setDetailsOpen(true)} className="min-h-10 min-w-0 flex-1 px-3 text-xs font-semibold hover:bg-muted">View call details</button>
          {ready && (canDownload || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" disabled={busy} aria-label="Recording options" className="flex min-h-10 w-10 shrink-0 items-center justify-center border-l hover:bg-muted disabled:opacity-50">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canDownload && <DropdownMenuItem onSelect={() => void open("download")}><Download className="h-4 w-4" />Download recording</DropdownMenuItem>}
                {canDelete && <DropdownMenuItem onSelect={() => void remove()}><Trash2 className="h-4 w-4" />Delete recording</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="mt-1.5 text-right text-[11px] text-slate-400 dark:text-slate-500">{timeLabel}</p>
      </div>
      <CallDetailsSheet open={detailsOpen} onOpenChange={setDetailsOpen} call={call} outbound={outbound} customerName={customerName} onChanged={onChanged} />
    </div>
  );
}
