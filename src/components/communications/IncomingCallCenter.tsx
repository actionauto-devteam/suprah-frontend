"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Grid3x3, Phone, PhoneOff, Mic, MicOff, Pause, Play, PhoneIncoming, Loader2 } from "lucide-react";
import { useCommStore, commActions, type ActiveCallState } from "@/lib/communicationStore";
import { useTelnyxRTC } from "@/hooks/useTelnyxRTC";
import { formatSmsRecipient } from "@/lib/api/leadComposer";
import { DIAL_KEYS } from "@/lib/phoneDialing";
import { CallRecordingControls } from './CallRecordingControls';
import { CallTimer } from './CallTimer';

function CallControl({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className="flex min-w-0 flex-col items-center gap-1 text-[11px] font-medium text-slate-200 disabled:opacity-40">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${active ? "border-amber-400/50 bg-amber-500/20 text-amber-300" : "border-white/15 bg-white/5 hover:bg-white/10"}`}>
        {children}
      </span>
      {label}
    </button>
  );
}

function CallWindow({ call, onHangup, onMute, onHold, onDigit }: { call: ActiveCallState; onHangup: () => void; onMute: () => void; onHold: (hold: boolean) => boolean; onDigit: (digit: string) => boolean }) {
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [digits, setDigits] = useState("");
  const live = call.phase === "active";
  const heading = live ? "Active call" : call.kind === "inbound" ? "Connecting call" : "Calling";
  const line = [call.lineLabel, call.fromNumber ? formatSmsRecipient(call.fromNumber) || call.fromNumber : ""].filter(Boolean).join(" · ");
  const number = formatSmsRecipient(call.phoneNumber) || call.phoneNumber;
  const showNumber = Boolean(call.displayName) && call.displayName !== call.phoneNumber;
  const press = (digit: string) => {
    if (onDigit(digit)) setDigits((value) => `${value}${digit}`.slice(-24));
  };
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--mobile-bottom-nav-offset,0px)+0.75rem)] z-[9991] sm:inset-x-auto sm:bottom-4 sm:right-24 sm:w-80">
      <section aria-label="Call window" className="max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-cyan-400/30 bg-slate-950/95 p-4 text-white shadow-2xl shadow-cyan-500/20 backdrop-blur">
        <p className="break-words text-xs font-semibold text-slate-300">
          {heading}{line ? ` on ${line}` : ""}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${live ? "bg-gradient-to-br from-emerald-500 to-cyan-500" : "bg-slate-700"}`}>
            <Phone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{call.displayName || number}</p>
            {showNumber && <p className="truncate text-xs text-slate-300">{number}</p>}
            <p className="text-xs text-slate-400" role="status">
              {live ? (
                <>
                  {call.onHold ? "On hold · " : ""}
                  <CallTimer startedAt={call.startedAt} />
                </>
              ) : call.phase === "ringing" ? (
                "Ringing..."
              ) : (
                "Connecting..."
              )}
            </p>
          </div>
        </div>
        {keypadOpen && (
          <div className="mt-3">
            <p aria-label="Digits sent" className="min-h-5 text-center text-sm font-semibold tabular-nums tracking-widest">{digits}</p>
            <div className="mx-auto mt-1 grid w-fit grid-cols-3 gap-2">
              {DIAL_KEYS.map((key) => (
                <button key={key.digit} type="button" onClick={() => press(key.digit)} aria-label={`Send ${key.digit}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base font-semibold hover:bg-white/10">
                  {key.digit}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-4 gap-1">
          <CallControl label={call.onHold ? "Resume" : "Hold"} active={call.onHold} disabled={!live} onClick={() => onHold(!call.onHold)}>
            {call.onHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </CallControl>
          <CallControl label="Keypad" active={keypadOpen} disabled={!live} onClick={() => setKeypadOpen((open) => !open)}>
            <Grid3x3 className="h-4 w-4" />
          </CallControl>
          <CallControl label={call.muted ? "Unmute" : "Mute"} active={call.muted} onClick={onMute}>
            {call.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </CallControl>
          <button type="button" onClick={onHangup} aria-label="End call" className="flex min-w-0 flex-col items-center gap-1 text-[11px] font-medium text-slate-200">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-md shadow-red-500/40 transition hover:bg-red-400">
              <PhoneOff className="h-4 w-4" />
            </span>
            End call
          </button>
        </div>
        <div className="mt-3">
          <CallRecordingControls callId={call.callLogId} />
        </div>
      </section>
    </div>
  );
}

export default function IncomingCallCenter() {
  const [mounted, setMounted] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const { incomingCalls, activeCall, callNotice } = useCommStore();
  const { answerInbound, hangup, toggleMute, toggleHold, sendDigit } = useTelnyxRTC();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!callNotice) return;
    const timer = setTimeout(() => commActions.clearCallNotice(), 6000);
    return () => clearTimeout(timer);
  }, [callNotice]);
  if (!mounted) return null;

  const answer = async (call: (typeof incomingCalls)[number]) => {
    if (claiming) return;
    setClaiming(call._id);
    setClaimError(null);
    try {
      await answerInbound(call._id, {
        phoneNumber: call.from,
        displayName: call.customerName || call.from,
        fromNumber: call.to,
        lineLabel: call.lineLabel,
      });
    } catch (err: any) {
      const code = err?.response?.status;
      setClaimError(
        err?.userMessage ||
          (code === 409
            ? "Another teammate answered this call."
            : err?.response?.data?.message || "Couldn't answer the call.")
      );
      setTimeout(() => setClaimError(null), 6000);
    } finally {
      setClaiming(null);
    }
  };

  return createPortal(
    <>
      {/* ------------------------- ringing toasts ------------------------- */}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[9990] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        aria-live="polite"
      >
        {claimError && (
          <div className="pointer-events-auto max-w-sm rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 shadow-lg dark:bg-amber-950/80 dark:text-amber-300" role="alert">
            {claimError}
          </div>
        )}

        {callNotice && !claimError && (
          <div className="pointer-events-auto max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-lg dark:border-white/10 dark:bg-slate-900 dark:text-slate-200" role="status">
            {callNotice}
          </div>
        )}

        {incomingCalls.map((call) => (
          <div
            key={call._id}
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-400/30 bg-white shadow-2xl shadow-emerald-500/20 motion-safe:animate-[commRing_1.6s_ease-in-out_infinite] dark:border-emerald-400/25 dark:bg-slate-950/95 dark:backdrop-blur"
            role="alertdialog"
            aria-label={`Incoming call from ${call.customerName || call.from}`}
          >
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />
            <div className="flex items-center gap-3 p-4">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30">
                <PhoneIncoming className="h-5 w-5" />
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400/50 motion-safe:animate-ping" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Incoming call
                </p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {call.customerName || "Unknown caller"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{call.from}</p>
                {call.lineLabel && (
                  <p className="break-words text-xs font-medium text-cyan-700 dark:text-cyan-400">Called {call.lineLabel}</p>
                )}
                {call.routing?.selectedLabel && (
                  <p className="break-words text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {call.routing.selectedLabel}{call.routing.stage === 'reception' && call.routing.type !== 'language' ? ' - Reception' : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => answer(call)}
                  disabled={claiming === call._id || Boolean(activeCall)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/40 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
                  aria-label="Answer call"
                  title={activeCall ? "You're already on a call" : "Answer"}
                >
                  {claiming === call._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => commActions.dismissIncoming(call._id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Dismiss (keep ringing for teammates)"
                  title="Dismiss for me"
                >
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeCall && <CallWindow key={activeCall.clientCallId || activeCall.callLogId || activeCall.phoneNumber} call={activeCall} onHangup={hangup} onMute={toggleMute} onHold={toggleHold} onDigit={sendDigit} />}

      <style jsx global>{`
        @keyframes commRing {
          0%,
          100% {
            transform: translateY(0);
          }
          10% {
            transform: translateY(-2px);
          }
          20% {
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="commRing"] {
            animation: none !important;
          }
        }
      `}</style>
    </>,
    document.body
  );
}
