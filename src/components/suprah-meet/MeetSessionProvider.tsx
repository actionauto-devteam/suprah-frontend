"use client";

/**
 * MeetSessionProvider — owns the Suprah Meet session at the CRM-layout level.
 *
 * The `useSuprahMeet` hook instance lives HERE instead of inside the room
 * page, so navigating anywhere in Suprah Space no longer unmounts the meeting:
 * audio keeps playing (the <audio> element is mounted here), mic/cam state is
 * preserved, and a floating mini window appears until the user returns.
 *
 * Wire-up (one line): wrap the CRM layout's children with <MeetSessionProvider>.
 */

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuprahMeet } from "@/hooks/useSuprahMeet";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";

type MeetApi = ReturnType<typeof useSuprahMeet>;

interface MeetSessionCtx {
  meet: MeetApi;
  /** Code of the session this provider is running, or null when idle. */
  activeCode: string | null;
  /** Join a meeting (no-op if it's already the active session). */
  open: (code: string) => void;
  /** Forget the session (after leave/end). */
  close: () => void;
}

const Ctx = React.createContext<MeetSessionCtx | null>(null);

export function useMeetSession(): MeetSessionCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useMeetSession must be used inside <MeetSessionProvider>");
  return ctx;
}

export function MeetSessionProvider({ children }: { children: React.ReactNode }) {
  const meet = useSuprahMeet();
  const pathname = usePathname();
  const [activeCode, setActiveCode] = React.useState<string | null>(null);

  // Refs so open/close stay referentially stable (safe as effect deps).
  const meetRef = React.useRef(meet);
  meetRef.current = meet;
  const activeRef = React.useRef<string | null>(null);
  activeRef.current = activeCode;
  const usedRef = React.useRef(false); // a session has run on this hook instance

  const open = React.useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    if (activeRef.current === clean) return;           // already this session
    if (activeRef.current) return;                     // busy — room page shows the choice
    if (usedRef.current) { window.location.reload(); return; } // fresh hook for a fresh session
    usedRef.current = true;
    activeRef.current = clean;
    setActiveCode(clean);
    void meetRef.current.join(clean);
  }, []);

  const close = React.useCallback(() => {
    activeRef.current = null;
    setActiveCode(null);
  }, []);

  // When a session ends/errors while the user is NOT on its room page (they
  // minimized it), release the slot so a new meeting can be opened cleanly.
  const onOwnRoomPage =
    !!activeCode &&
    (pathname ?? "").toUpperCase().startsWith("/CRM/SUPRAH-MEET/ROOM/");
  React.useEffect(() => {
    if (!activeCode) return;
    if ((meet.phase === "ended" || meet.phase === "error") && !onOwnRoomPage) close();
  }, [meet.phase, activeCode, onOwnRoomPage, close]);

  const value = React.useMemo(
    () => ({ meet, activeCode, open, close }),
    [meet, activeCode, open, close]
  );

  // Memoize children: during a meeting the hook updates often (tiles, roster,
  // speaker), and the rest of the CRM shouldn't re-render for any of that.
  const stableChildren = React.useMemo(() => <>{children}</>, [children]);

  return (
    <Ctx.Provider value={value}>
      {/* Meeting audio lives here so sound continues while minimized. */}
      <audio ref={meet.bindAudio} autoPlay style={{ display: "none" }} />
      {stableChildren}
      <MiniMeetWindow />
    </Ctx.Provider>
  );
}

/* ── Floating mini window (shown whenever a session runs off its room page) ─ */
function MiniMeetWindow() {
  const { meet, activeCode } = useMeetSession();
  const pathname = usePathname();
  const router = useRouter();

  const onAnyRoomPage = (pathname ?? "").toUpperCase().startsWith("/CRM/SUPRAH-MEET/ROOM/");
  const visible =
    !!activeCode && !onAnyRoomPage && (meet.phase === "in" || meet.phase === "joining");

  // 1s tick for the elapsed chip (from the server's startedAt — a UTC instant).
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  const startedMs = meet.meeting?.startedAt ? new Date(meet.meeting.startedAt).getTime() : null;
  const elapsed = startedMs ? Math.max(0, Math.floor((nowMs - startedMs) / 1000)) : 0;
  const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
  const clock = `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // Best available picture: screen share → active speaker → yourself.
  const contentTile = meet.tiles.find((t) => t.isContent);
  const cameraTiles = meet.tiles.filter((t) => !t.isContent);
  const speakerTile = meet.activeSpeakerId
    ? cameraTiles.find((t) => t.attendeeId === meet.activeSpeakerId) : undefined;
  const selfTile = cameraTiles.find((t) => t.attendeeId === meet.selfAttendeeId);
  const tile = contentTile ?? speakerTile ?? selfTile ?? cameraTiles[0];
  const mirror = !!tile && tile === selfTile && !meet.isBackCamera;

  const back = () => router.push(`/crm/suprah-meet/room/${activeCode}`);

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[70] w-64 overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#0a1410]/95 text-emerald-50 shadow-2xl shadow-emerald-950/60 backdrop-blur">
      {/* Picture — click anywhere on it to return to the full meeting */}
      <button onClick={back} className="relative block h-36 w-full bg-[#0f1f19] text-left"
        title="Return to the meeting">
        {tile ? (
          <video ref={(el) => meet.bindVideoTile(tile.tileId, el)} autoPlay playsInline
            muted={tile === selfTile}
            className={cn("absolute inset-0 h-full w-full",
              contentTile ? "object-contain" : "object-cover", mirror && "-scale-x-100")} />
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <SuprahMeetLogo className="size-10 opacity-90" />
          </span>
        )}
        <span className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-[#071410]/90 to-transparent px-2.5 py-1.5 text-xs">
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
          <span className="min-w-0 flex-1 truncate font-medium">
            {meet.meeting?.title ?? activeCode}
          </span>
          <span className="shrink-0 text-emerald-300/90">
            {meet.phase === "joining" ? "Connecting…" : clock}
          </span>
        </span>
        <span className="absolute bottom-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-[#071410]/80 text-emerald-200/80">
          <Maximize2 className="size-3.5" />
        </span>
      </button>

      {/* Controls */}
      <div className="flex items-center gap-1.5 p-2">
        <MiniBtn on={meet.micOn} onClick={meet.toggleMic}
          label={meet.micOn ? "Mute" : "Unmute"}
          iconOn={<Mic className="size-4" />} iconOff={<MicOff className="size-4" />} />
        <MiniBtn on={meet.camOn} onClick={() => void meet.toggleCam()} label="Camera"
          iconOn={<Video className="size-4" />} iconOff={<VideoOff className="size-4" />} />
        <button onClick={back}
          className="h-9 flex-1 rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-xs font-medium text-emerald-200 hover:bg-emerald-400/20">
          Return
        </button>
        <button onClick={() => void meet.leave()} title="Leave the meeting"
          className="grid h-9 w-10 place-items-center rounded-lg border border-rose-400/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
          <PhoneOff className="size-4" />
        </button>
      </div>
    </div>
  );
}

function MiniBtn({ on, onClick, label, iconOn, iconOff }: {
  on: boolean; onClick: () => void; label: string;
  iconOn: React.ReactNode; iconOff: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={label} aria-pressed={on}
      className={cn("grid h-9 w-10 place-items-center rounded-lg border transition-colors",
        on ? "border-emerald-400/20 bg-[#142a21] hover:bg-[#1a3529]"
           : "border-rose-400/40 bg-rose-500/15 text-rose-300")}>
      {on ? iconOn : iconOff}
      <span className="sr-only">{label}</span>
    </button>
  );
}
