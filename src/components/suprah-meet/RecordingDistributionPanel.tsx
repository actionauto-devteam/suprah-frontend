"use client";

/**
 * Post-meeting recording distribution (host/admin only).
 * Shows recording + AI-summary readiness, the attendee list with the best
 * email on file for each (internal CRM emails, guest-entered emails), lets
 * the host review/untick recipients, then "Send Recording & AI Summary".
 * Duplicate-safe: an already-sent banner appears and resending requires an
 * explicit confirm. Per-recipient delivery status is shown after sending.
 */

import * as React from "react";
import { CheckCircle2, Circle, Loader2, Mail, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { isAxiosError } from 'axios';

const deliveryError = (error: unknown, fallback: string) =>
  isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

const Dot = ({ ok, busy, label }: { ok: boolean; busy: boolean; label: string }) => (
  <span className="flex items-center gap-1.5 text-sm">
    {ok ? <CheckCircle2 className="size-4 text-emerald-500" />
      : busy ? <Loader2 className="size-4 animate-spin text-emerald-500" />
      : <Circle className="size-4 text-muted-foreground/40" />}
    <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
  </span>
);

interface Recipient { key: string; name: string; email: string | null; kind: "internal" | "guest"; }
interface DistState {
  recordingStatus: string; hasVideo: boolean;
  aiStatus: string; hasSummary: boolean;
  mailConfigured: boolean;
  alreadySent: { sentAt: string; count: number } | null;
  recipients: Recipient[];
}
interface SendResult { email: string; name?: string; status: "sent" | "failed"; error?: string; }

export function RecordingDistributionPanel({ code }: { code: string }) {
  const [state, setState] = React.useState<DistState | null>(null);
  const [denied, setDenied] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [sending, setSending] = React.useState(false);
  const [confirmResend, setConfirmResend] = React.useState(false);
  const [retryingFailed, setRetryingFailed] = React.useState(false);
  const [results, setResults] = React.useState<SendResult[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const selectionInitialized = React.useRef(false);

  const load = React.useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/crm/meet/meetings/${code}/distribution`);
      const d: DistState = res.data?.data;
      setState(d);
      setError(null);
      if (!selectionInitialized.current) {
        selectionInitialized.current = true;
        setPicked(new Set(d.recipients.filter((r) => r.email).map((r) => r.key)));
      }
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 403) setDenied(true);
      else setError(deliveryError(err, 'Could not load report delivery. Try again.'));
    }
  }, [code]);

  // Poll until both the recording and the AI summary have settled.
  React.useEffect(() => {
    void load();
  }, [load]);
  React.useEffect(() => {
    const busy = !state || state.recordingStatus === 'processing' || state.recordingStatus === 'recording' ||
      state.aiStatus === 'transcribing' || state.aiStatus === 'summarizing';
    if (!busy) return;
    const t = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(t);
  }, [load, state]);

  if (denied) return null;
  if (state === null) return error ? <div role="alert" className="mt-4 text-sm text-destructive">{error} <Button variant="outline" onClick={() => void load()}>Try again</Button></div> : null;
  if (!state.hasVideo && state.recordingStatus === "idle" && !state.hasSummary) return null;

  const recordingReady = state.recordingStatus === "ready" && state.hasVideo;
  const aiBusy = state.aiStatus === "transcribing" || state.aiStatus === "summarizing";
  const withEmail = state.recipients.filter((r) => r.email);
  const selected = withEmail.filter((r) => picked.has(r.key));
  const canSend = (recordingReady || state.hasSummary) && !aiBusy && state.mailConfigured && selected.length > 0 && !sending;

  const toggle = (key: string) =>
    setPicked((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const send = async () => {
    if (state.alreadySent && !confirmResend && !retryingFailed) { setConfirmResend(true); return; }
    setSending(true); setError(null); setResults(null);
    try {
      const res = await apiClient.post(`/api/crm/meet/meetings/${code}/distribute`, {
        resend: confirmResend,
        recipients: selected.map((r) => ({ email: r.email, name: r.name, kind: r.kind })),
      }, { timeout: 15 * 60_000 });
      const sentResults: SendResult[] = res.data?.data?.results ?? [];
      setResults(sentResults);
      if (sentResults.some(r => r.status === 'failed')) {
        const failedEmails = new Set(sentResults.filter(r => r.status === 'failed').map(r => r.email));
        setPicked(new Set(state.recipients.filter(r => r.email && failedEmails.has(r.email)).map(r => r.key)));
      }
      setConfirmResend(false);
      void load();
    } catch (err: unknown) {
      setError(deliveryError(err, 'Sending failed. Try again or ask your administrator to check email delivery.'));
    } finally { setSending(false); }
  };

  return (
    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Mail className="size-4 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-sm font-semibold">{recordingReady ? 'Send recording & AI summary' : state.hasSummary ? 'Send AI summary' : 'Meeting report'}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Email the selected attendees a personal, expiring link to the meeting report.
      </p>

      <div className="mb-3 flex flex-wrap gap-4">
        <Dot ok={recordingReady} busy={state.recordingStatus === 'processing' || state.recordingStatus === 'recording'}
          label={recordingReady ? 'Recording ready' : state.recordingStatus === 'failed' ? 'Recording failed' : state.recordingStatus === 'idle' ? 'No recording' : 'Recording processing…'} />
        <Dot ok={state.hasSummary} busy={aiBusy} label={state.hasSummary ? "AI summary ready" : aiBusy ? "AI summary generating…" : "AI summary not available"} />
      </div>

      {state.alreadySent && !results && (
        <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Already sent to {state.alreadySent.count} recipient{state.alreadySent.count === 1 ? "" : "s"} on{" "}
          {new Date(state.alreadySent.sentAt).toLocaleString("en-US", {
            timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          })}{" "}MT. Sending again will re-deliver to the people selected below.
        </p>
      )}
      {!state.mailConfigured && (
        <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
          Meeting email is unavailable. Ask your administrator to configure the email sender.
        </p>
      )}

      <div className="mb-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-background/60 p-2">
        {state.recipients.map((r) => (
          <label key={r.key}
            className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
              r.email ? "cursor-pointer hover:bg-emerald-500/5" : "opacity-50")}>
            <input type="checkbox" className="accent-emerald-600"
              disabled={!r.email} checked={r.email ? picked.has(r.key) : false}
              onChange={() => toggle(r.key)} />
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            {r.kind === "guest" && (
              <span className="rounded bg-sky-400/15 px-1.5 py-px text-[9px] font-medium text-sky-600 dark:text-sky-300">Guest</span>
            )}
            <span className="max-w-[45%] truncate text-xs text-muted-foreground">
              {r.email ?? "no email on file"}
            </span>
          </label>
        ))}
        {state.recipients.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No participants found.</p>
        )}
      </div>

      {error && <p role="alert" className="mb-2 text-sm text-rose-500">{error}</p>}

      {results ? (
        <div aria-live="polite" className="space-y-1 rounded-xl border border-border/60 bg-background/60 p-2 text-sm">
          {results.map((r) => (
            <div key={r.email} className="flex items-center gap-2 px-2 py-1">
              {r.status === "sent"
                ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                : <XCircle className="size-4 shrink-0 text-rose-500" />}
              <span className="min-w-0 flex-1 truncate">{r.email}</span>
              <span className="text-xs text-muted-foreground">{r.status === "sent" ? "Delivered to mail server" : r.error || "failed"}</span>
            </div>
          ))}
          {results.some(r => r.status === 'failed') && <Button variant="outline" disabled={sending}
            onClick={() => { setResults(null); setConfirmResend(false); setRetryingFailed(true); }}>Retry failed recipients</Button>}
          {!results.some(r => r.status === 'failed') && <Button variant="outline"
            onClick={() => { setResults(null); setConfirmResend(false); setRetryingFailed(false); }}>Review recipients</Button>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!canSend} onClick={() => void send()}
            className="bg-emerald-600 hover:bg-emerald-500">
            {sending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Mail className="mr-1.5 size-4" />}
            {confirmResend ? 'Confirm resend' : retryingFailed ? 'Retry failed recipients' : state.alreadySent
              ? recordingReady ? 'Resend Recording & AI Summary' : 'Resend AI Summary'
              : recordingReady ? 'Send Recording & AI Summary' : 'Send AI Summary'}
            {selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
          {confirmResend && (
            <Button variant="outline" onClick={() => setConfirmResend(false)}>Cancel</Button>
          )}
          {!recordingReady && (
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1.5 size-3.5" /> Check again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
