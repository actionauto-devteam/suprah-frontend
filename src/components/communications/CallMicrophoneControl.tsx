"use client";

import * as React from "react";
import { Mic } from "lucide-react";
import { listMicrophones, savedMicrophoneId, type MicrophoneOption } from "@/lib/callMicrophone";
import { switchCallMicrophone } from "@/hooks/useTelnyxRTC";

const SILENT_LEVEL = 0.03;
const SILENT_WARNING_MS = 6000;
const TEST_DURATION_MS = 15000;

interface CallMicrophoneControlProps {
  variant: "light" | "dark";
  autoStart?: boolean;
  muted?: boolean;
}

export function CallMicrophoneControl({ variant, autoStart = false, muted = false }: CallMicrophoneControlProps) {
  const dark = variant === "dark";
  const selectId = React.useId();
  const [microphones, setMicrophones] = React.useState<MicrophoneOption[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [testing, setTesting] = React.useState(autoStart);
  const [level, setLevel] = React.useState(0);
  const [silent, setSilent] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);

  const loadMicrophones = React.useCallback(async () => {
    const options = await listMicrophones().catch(() => [] as MicrophoneOption[]);
    setMicrophones(options);
    setSelectedId((current) => {
      if (current && options.some((option) => option.id === current)) return current;
      const saved = savedMicrophoneId();
      return options.some((option) => option.id === saved) ? saved : options[0]?.id || "";
    });
  }, []);

  React.useEffect(() => {
    void loadMicrophones();
    const devices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!devices?.addEventListener) return;
    const onChange = () => void loadMicrophones();
    devices.addEventListener("devicechange", onChange);
    return () => devices.removeEventListener("devicechange", onChange);
  }, [loadMicrophones]);

  React.useEffect(() => {
    if (!testing) {
      setLevel(0);
      setSilent(false);
      return;
    }
    let stopped = false;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let meterTimer = 0;
    let stopTimer = 0;
    let quietSince = Date.now();

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedId ? { deviceId: { exact: selectedId } } : true,
        });
      } catch {
        if (!stopped) {
          setBlocked(true);
          setTesting(false);
        }
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setBlocked(false);
      void loadMicrophones();
      context = new AudioContext();
      await context.resume().catch(() => undefined);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      meterTimer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const value = Math.min(1, Math.sqrt(sum / samples.length) * 4);
        setLevel(value);
        if (value > SILENT_LEVEL) quietSince = Date.now();
        setSilent(Date.now() - quietSince > SILENT_WARNING_MS);
      }, 120);
      if (!autoStart) stopTimer = window.setTimeout(() => setTesting(false), TEST_DURATION_MS);
    };
    void start();

    return () => {
      stopped = true;
      window.clearInterval(meterTimer);
      window.clearTimeout(stopTimer);
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close().catch(() => undefined);
    };
  }, [testing, selectedId, autoStart, loadMicrophones]);

  const choose = (id: string) => {
    setSelectedId(id);
    void switchCallMicrophone(id);
  };

  const showMuted = dark && muted;
  const note = blocked
    ? "Allow microphone access for Suprah in your browser, then try again."
    : showMuted
      ? "You're muted, so the customer can't hear you."
      : testing && silent
        ? "We don't hear anything from this microphone. Pick another one, or check that it's plugged in and not muted."
        : microphones.length === 0 && !testing
          ? "Press Test microphone. Your browser will ask to use it."
          : "";

  return (
    <div
      data-testid="call-microphone-control"
      className={`space-y-2 rounded-xl border p-2.5 ${dark ? "mt-3 border-white/10 bg-white/5" : "border-border bg-muted/30"}`}
    >
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className={`flex shrink-0 items-center gap-1.5 text-[11px] font-semibold ${dark ? "text-slate-300" : "text-muted-foreground"}`}>
          <Mic className="h-3.5 w-3.5" />
          Microphone
        </label>
        {!autoStart && (
          <button
            type="button"
            onClick={() => setTesting((value) => !value)}
            className="ml-auto shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
          >
            {testing ? "Stop test" : "Test microphone"}
          </button>
        )}
      </div>
      {microphones.length > 0 && (
        <select
          id={selectId}
          data-testid="call-microphone"
          value={selectedId}
          onChange={(event) => choose(event.target.value)}
          className={`h-9 w-full min-w-0 truncate rounded-lg border px-2 text-xs outline-none focus:ring-2 ${dark ? "border-white/15 bg-slate-900 text-white focus:ring-cyan-400/40" : "border-border bg-background focus:ring-primary/30"}`}
        >
          {microphones.map((microphone) => (
            <option key={microphone.id} value={microphone.id}>
              {microphone.label}
            </option>
          ))}
        </select>
      )}
      {testing && (
        <div
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
          data-testid="call-microphone-level"
          className={`h-1.5 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-muted"}`}
        >
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
        </div>
      )}
      {testing && !autoStart && !silent && !blocked && (
        <p className={`text-[11px] ${dark ? "text-slate-400" : "text-muted-foreground"}`}>Speak now. The bar should move when you talk.</p>
      )}
      {note && (
        <p role="status" data-testid="call-microphone-note" className={`text-[11px] ${dark ? "text-amber-300" : "text-amber-700 dark:text-amber-300"}`}>
          {note}
        </p>
      )}
    </div>
  );
}
