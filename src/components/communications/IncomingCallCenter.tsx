"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming, Loader2 } from "lucide-react";
import { useCommStore, commActions } from "@/lib/communicationStore";
import { useTelnyxRTC } from "@/hooks/useTelnyxRTC";

function CallTimer({ startedAt }: { startedAt?: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!startedAt) return <span className="tabular-nums">00:00</span>;
  const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {mm}:{ss}
    </span>
  );
}

export default function IncomingCallCenter() {
  const [mounted, setMounted] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const { incomingCalls, activeCall } = useCommStore();
  const { answerInbound, hangup, toggleMute } = useTelnyxRTC();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const answer = async (call: (typeof incomingCalls)[number]) => {
    if (claiming) return;
    setClaiming(call._id);
    setClaimError(null);
    try {
      await answerInbound(call._id, {
        phoneNumber: call.from,
        displayName: call.customerName || call.from,
      });
    } catch (err: any) {
      const code = err?.response?.status;
      setClaimError(
        code === 409
          ? "Another teammate answered this call."
          : err?.response?.data?.message || "Couldn't answer the call."
      );
      setTimeout(() => setClaimError(null), 4000);
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
          <div className="pointer-events-auto rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 shadow-lg dark:bg-amber-950/80 dark:text-amber-300">
            {claimError}
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

      {/* ------------------------- active call bar ------------------------ */}
      {activeCall && (
        <div className="fixed inset-x-0 bottom-4 z-[9991] flex justify-center px-4">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-950/95 px-4 py-3 text-white shadow-2xl shadow-cyan-500/20 backdrop-blur">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                activeCall.phase === "active"
                  ? "bg-gradient-to-br from-emerald-500 to-cyan-500"
                  : "bg-slate-700"
              }`}
            >
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {activeCall.displayName || activeCall.phoneNumber}
              </p>
              <p className="text-xs text-slate-300">
                {activeCall.phase === "active" ? (
                  <CallTimer startedAt={activeCall.startedAt} />
                ) : activeCall.phase === "ringing" ? (
                  "Ringing…"
                ) : (
                  "Connecting…"
                )}
                <span className="ml-1.5 text-slate-400">
                  · {activeCall.kind === "inbound" ? "inbound" : "outbound"}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={toggleMute}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                activeCall.muted
                  ? "border-amber-400/50 bg-amber-500/20 text-amber-300"
                  : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
              aria-label={activeCall.muted ? "Unmute microphone" : "Mute microphone"}
            >
              {activeCall.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={hangup}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-md shadow-red-500/40 transition hover:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              aria-label="End call"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
