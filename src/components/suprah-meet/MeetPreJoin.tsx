"use client";

import * as React from "react";
import { Copy, Link2, Mic, MicOff, Users, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";

export type MeetJoinChoices = { mic: boolean; camera: boolean };
export type MeetPreJoinParticipant = { fullName: string; avatar?: string | null; isGuest?: boolean };

/**
 * Device check used before an actual Chime attendee is created.  Preview media
 * is deliberately a short-lived browser stream: it gives people a chance to
 * check permissions and framing without joining the meeting or broadcasting
 * anything to the room.
 */
export function MeetPreJoin({
  title,
  code,
  onJoin,
  onCancel,
  joinLabel = "Join now",
  participants = [],
}: {
  title: string;
  code: string;
  onJoin: (choices: MeetJoinChoices) => void;
  onCancel?: () => void;
  joinLabel?: string;
  /** A best-effort live roster supplied before the attendee connection starts. */
  participants?: MeetPreJoinParticipant[];
}) {
  const [choices, setChoices] = React.useState<MeetJoinChoices>({ mic: false, camera: false });
  const [problem, setProblem] = React.useState<string | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const previewRef = React.useRef<HTMLVideoElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  const stopPreview = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  React.useEffect(() => stopPreview, [stopPreview]);

  const apply = React.useCallback(async (next: MeetJoinChoices) => {
    setProblem(null);
    stopPreview();
    if (!next.mic && !next.camera) {
      setChoices(next);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: next.mic,
        video: next.camera,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play().catch(() => {});
      }
      setChoices(next);
    } catch {
      // Do not claim a device is enabled when the browser/OS declined it.
      setChoices({ mic: false, camera: false });
      setProblem("Suprah Meet could not access that device. Check browser permissions, then try again or join without it.");
    }
  }, [stopPreview]);

  const toggle = (key: keyof MeetJoinChoices) => {
    void apply({ ...choices, [key]: !choices[key] });
  };

  const join = () => {
    stopPreview();
    onJoin(choices);
  };

  const copyMeetingLink = async () => {
    try {
      await navigator.clipboard?.writeText(`${window.location.origin}/meet/${encodeURIComponent(code)}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard availability is browser-controlled; joining still works.
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#071410] p-4 text-emerald-50 sm:p-6">
      <main className="mx-auto grid min-h-[calc(100dvh-6rem)] max-w-4xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#0f1f19] shadow-2xl shadow-emerald-950/40">
          <div className="relative aspect-video bg-[#06100c]">
            {choices.camera ? (
              <video ref={previewRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(16,185,129,.18),transparent_55%)]">
                <SuprahMeetLogo className="size-20 opacity-90" />
              </div>
            )}
            <span className="absolute bottom-3 left-3 rounded-full border border-emerald-400/20 bg-[#071410]/85 px-3 py-1 text-xs backdrop-blur">
              {choices.camera ? "Camera preview" : "Camera is off"}
            </span>
          </div>
          <div className="border-t border-emerald-400/15 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-emerald-300" />
              <p className="text-sm font-medium">In the meeting now</p>
              <span className="ml-auto rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-200">{participants.length}</span>
            </div>
            {participants.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {participants.slice(0, 8).map((person, index) => (
                  <span key={`${person.fullName}-${index}`} className="flex max-w-full items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[.06] py-1 pl-1 pr-2.5 text-xs text-emerald-100">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-[9px] font-semibold text-white">{person.fullName.slice(0, 1).toUpperCase()}</span>
                    <span className="truncate">{person.fullName}{person.isGuest ? " (guest)" : ""}</span>
                  </span>
                ))}
                {participants.length > 8 && <span className="self-center text-xs text-emerald-100/55">+{participants.length - 8} more</span>}
              </div>
            ) : (
              <p className="mt-2 text-xs text-emerald-100/55">No one is connected yet. You can still join when you&apos;re ready.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-400/20 bg-[#0a1410] p-5 shadow-xl shadow-emerald-950/25 sm:p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <SuprahMeetLogo className="size-9" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[.14em] text-emerald-300/70">Ready to join?</p>
              <h1 className="truncate text-lg font-semibold">{title}</h1>
            </div>
          </div>
          <p className="mb-5 text-sm text-emerald-100/60">You join muted with your camera off unless you turn either on below. Nothing is shared until you press {joinLabel.toLowerCase()}.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => toggle("mic")} aria-pressed={choices.mic}
              className={cn("grid h-12 flex-1 place-items-center rounded-xl border transition-colors", choices.mic ? "border-emerald-400/45 bg-emerald-400/15 text-emerald-200" : "border-rose-400/35 bg-rose-500/10 text-rose-300")}>
              {choices.mic ? <Mic className="size-5" /> : <MicOff className="size-5" />}
              <span className="sr-only">{choices.mic ? "Turn microphone off" : "Turn microphone on"}</span>
            </button>
            <button type="button" onClick={() => toggle("camera")} aria-pressed={choices.camera}
              className={cn("grid h-12 flex-1 place-items-center rounded-xl border transition-colors", choices.camera ? "border-emerald-400/45 bg-emerald-400/15 text-emerald-200" : "border-rose-400/35 bg-rose-500/10 text-rose-300")}>
              {choices.camera ? <Video className="size-5" /> : <VideoOff className="size-5" />}
              <span className="sr-only">{choices.camera ? "Turn camera off" : "Turn camera on"}</span>
            </button>
          </div>
          <div className="mt-2 flex justify-between px-1 text-xs text-emerald-100/55"><span>Microphone</span><span>Camera</span></div>
          {problem && <p role="alert" className="mt-4 text-xs leading-5 text-amber-300">{problem}</p>}
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100/55">
            <span className="min-w-0 flex-1 truncate">Meeting code: {code}</span>
            <button type="button" onClick={() => void copyMeetingLink()} className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-emerald-200 hover:bg-emerald-400/10" title="Copy meeting link">
              {copied ? <Copy className="size-3" /> : <Link2 className="size-3" />}{copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <Button className="mt-5 h-11 w-full bg-emerald-600 hover:bg-emerald-500" onClick={join}>{joinLabel}</Button>
          {onCancel && <Button variant="ghost" className="mt-2 w-full text-emerald-100/70 hover:bg-emerald-400/10 hover:text-emerald-50" onClick={() => { stopPreview(); onCancel(); }}>Cancel</Button>}
        </section>
      </main>
    </div>
  );
}
