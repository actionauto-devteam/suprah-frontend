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
import { GripHorizontal, Maximize2, MessageSquare, Mic, MicOff, PhoneOff, PictureInPicture2, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuprahMeet, type MeetJoinOptions } from "@/hooks/useSuprahMeet";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";

type MeetApi = ReturnType<typeof useSuprahMeet>;

type PictureInPictureVideo = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (mode: "picture-in-picture") => boolean;
  webkitSetPresentationMode?: (mode: "picture-in-picture") => void;
};

interface MeetSessionCtx {
  meet: MeetApi;
  /** Code of the session this provider is running, or null when idle. */
  activeCode: string | null;
  /** Join a meeting (no-op if it's already the active session). */
  open: (code: string, options?: MeetJoinOptions) => void;
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

  const open = React.useCallback((code: string, options?: MeetJoinOptions) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    if (activeRef.current === clean) return;           // already this session
    if (activeRef.current) return;                     // busy — room page shows the choice
    if (usedRef.current) { window.location.reload(); return; } // fresh hook for a fresh session
    usedRef.current = true;
    activeRef.current = clean;
    setActiveCode(clean);
    void meetRef.current.join(clean, options);
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

  const { ref: dragRef, style: dragStyle, dragging, grabbing, handlers: dragHandlers } = useMiniWindowDrag(visible);
  const miniVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const openPictureInPicture = React.useCallback(async () => {
    const video = miniVideoRef.current as PictureInPictureVideo | null;
    if (!video) return;

    try {
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
        await video.requestPictureInPicture();
        return;
      }
      if (video.webkitSupportsPresentationMode?.("picture-in-picture")) {
        video.webkitSetPresentationMode?.("picture-in-picture");
      }
    } catch {
      // Picture-in-Picture is permission and platform dependent. The in-app
      // Mini Meet remains available when the browser declines the request.
    }
  }, []);

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
    <div ref={dragRef} style={dragStyle} {...dragHandlers}
      className={cn("fixed z-[70] w-64 cursor-grab touch-none select-none overflow-hidden rounded-2xl border bg-[#0a1410]/95 text-emerald-50 backdrop-blur transition-[scale,box-shadow,border-color] duration-200 ease-out",
        dragging
          ? "scale-[1.04] border-emerald-400/60 shadow-[0_28px_60px_-12px_rgba(16,185,129,0.55)] ring-2 ring-emerald-400/50"
          : grabbing
            ? "scale-[0.98] border-emerald-400/50 shadow-2xl shadow-emerald-950/60"
            : "border-emerald-400/25 shadow-2xl shadow-emerald-950/60 hover:border-emerald-400/45",
        !dragStyle && "bottom-[max(1rem,env(safe-area-inset-bottom))] right-4")}>
      {/* Picture — click anywhere on it to return to the full meeting */}
      <button onClick={back} className="relative block h-36 w-full cursor-grab bg-[#0f1f19] text-left"
        title="Drag to move · click to return to the meeting">
        {tile ? (
          <video ref={(el) => {
            miniVideoRef.current = el;
            meet.bindVideoTile(tile.tileId, el);
          }} autoPlay playsInline
            muted={tile === selfTile}
            className={cn("absolute inset-0 h-full w-full",
              contentTile ? "object-contain" : "object-cover", mirror && "-scale-x-100")} />
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <SuprahMeetLogo className="size-10 opacity-90" />
          </span>
        )}
        <span className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-[#071410]/90 to-transparent px-2.5 py-1.5 text-xs">
          <GripHorizontal className="size-3.5 shrink-0 text-emerald-200/60" aria-hidden />
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
        {tile ? <button onClick={() => void openPictureInPicture()} title="Pop out video when your browser supports Picture-in-Picture" aria-label="Pop out video" data-mini-control
          className="grid h-9 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-emerald-400/25 bg-[#142a21] text-emerald-100 transition-colors hover:bg-[#1a3529]">
          <PictureInPicture2 className="size-4" />
        </button> : null}
        <button onClick={back} data-mini-control
          className="relative h-9 flex-1 cursor-pointer rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-xs font-medium text-emerald-200 hover:bg-emerald-400/20">
          {meet.chatUnread > 0 ? <MessageSquare className="mr-1 inline size-3.5" /> : null} Return
          {meet.chatUnread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-[#071410]">{meet.chatUnread > 99 ? "99+" : meet.chatUnread}</span>}
        </button>
        <button onClick={() => void meet.leave()} title="End call" aria-label="End call" data-mini-control
          className="grid h-9 w-10 cursor-pointer place-items-center rounded-lg border border-rose-400/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
          <PhoneOff className="size-4" />
        </button>
      </div>
    </div>
  );
}

const MINI_POS_KEY = "suprah-meet-mini-pos";
const MINI_MARGIN = 12;
const DRAG_THRESHOLD = 6;

type MiniRatio = { rx: number; ry: number };
type MiniBounds = { minX: number; maxX: number; minY: number; maxY: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function loadMiniRatio(): MiniRatio {
  try {
    const raw = JSON.parse(localStorage.getItem(MINI_POS_KEY) || "null");
    if (raw && Number.isFinite(raw.rx) && Number.isFinite(raw.ry)) {
      return { rx: clamp01(raw.rx), ry: clamp01(raw.ry) };
    }
  } catch {
    return { rx: 1, ry: 1 };
  }
  return { rx: 1, ry: 1 };
}

function saveMiniRatio(r: MiniRatio) {
  try {
    localStorage.setItem(MINI_POS_KEY, JSON.stringify(r));
  } catch {
    return;
  }
}

function readSafeInsets() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;inset:0;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  document.body.removeChild(probe);
  return insets;
}

function useMiniWindowDrag(visible: boolean) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = React.useState<MiniRatio>({ rx: 1, ry: 1 });
  const [bounds, setBounds] = React.useState<MiniBounds | null>(null);
  const [dragPos, setDragPos] = React.useState<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = React.useState(false);
  const cursorLockRef = React.useRef<HTMLStyleElement | null>(null);
  const boundsRef = React.useRef<MiniBounds | null>(null);
  const suppressClickRef = React.useRef(false);
  const detachRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => { setRatio(loadMiniRatio()); }, []);

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const vv = window.visualViewport;
    const vw = vv?.width ?? window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const inset = readSafeInsets();
    const minX = MINI_MARGIN + inset.left;
    const minY = MINI_MARGIN + inset.top;
    const next: MiniBounds = {
      minX,
      minY,
      maxX: Math.max(minX, vw - el.offsetWidth - MINI_MARGIN - inset.right),
      maxY: Math.max(minY, vh - el.offsetHeight - MINI_MARGIN - inset.bottom),
    };
    boundsRef.current = next;
    setBounds(next);
  }, []);

  React.useLayoutEffect(() => {
    if (!visible) return;
    measure();
    const vv = window.visualViewport;
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    vv?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      vv?.removeEventListener("resize", measure);
    };
  }, [visible, measure]);

  const lockGrabbingCursor = () => {
    if (cursorLockRef.current) return;
    const tag = document.createElement("style");
    tag.textContent = "*,*::before,*::after{cursor:grabbing!important;user-select:none!important}";
    document.head.appendChild(tag);
    cursorLockRef.current = tag;
  };

  const unlockGrabbingCursor = () => {
    cursorLockRef.current?.remove();
    cursorLockRef.current = null;
  };

  React.useEffect(() => () => detachRef.current?.(), []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const b = boundsRef.current;
    const el = ref.current;
    if (!b || !el) return;
    detachRef.current?.();
    const onControl = !!(e.target as HTMLElement | null)?.closest?.("[data-mini-control]");
    if (!onControl) {
      setPressed(true);
      if (e.pointerType === "mouse") lockGrabbingCursor();
    }
    const rect = el.getBoundingClientRect();
    const pointerId = e.pointerId;
    const startX = e.clientX, startY = e.clientY;
    const originX = rect.left, originY = rect.top;
    let dragging = false;

    const place = (clientX: number, clientY: number) => {
      const cur = boundsRef.current ?? b;
      return {
        cur,
        x: Math.min(cur.maxX, Math.max(cur.minX, originX + (clientX - startX))),
        y: Math.min(cur.maxY, Math.max(cur.minY, originY + (clientY - startY))),
      };
    };

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        setPressed(true);
        if (ev.pointerType === "mouse") lockGrabbingCursor();
      }
      ev.preventDefault();
      const { x, y } = place(ev.clientX, ev.clientY);
      setDragPos({ x, y });
    };

    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      detach();
      if (!dragging) return;
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      const { cur, x, y } = place(ev.clientX, ev.clientY);
      const spanX = cur.maxX - cur.minX, spanY = cur.maxY - cur.minY;
      const next = {
        rx: spanX > 0 ? clamp01((x - cur.minX) / spanX) : 1,
        ry: spanY > 0 ? clamp01((y - cur.minY) / spanY) : 1,
      };
      setRatio(next);
      saveMiniRatio(next);
      setDragPos(null);
    };

    const detach = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      detachRef.current = null;
      setPressed(false);
      unlockGrabbingCursor();
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    detachRef.current = detach;
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const style: React.CSSProperties | undefined = dragPos
    ? { left: dragPos.x, top: dragPos.y }
    : bounds
      ? {
          left: bounds.minX + ratio.rx * (bounds.maxX - bounds.minX),
          top: bounds.minY + ratio.ry * (bounds.maxY - bounds.minY),
        }
      : undefined;

  return {
    ref,
    style,
    dragging: !!dragPos,
    grabbing: pressed || !!dragPos,
    handlers: { onPointerDown, onClickCapture, onDragStart: (e: React.DragEvent) => e.preventDefault() },
  };
}

function MiniBtn({ on, onClick, label, iconOn, iconOff }: {
  on: boolean; onClick: () => void; label: string;
  iconOn: React.ReactNode; iconOff: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={label} aria-pressed={on} data-mini-control
      className={cn("grid h-9 w-10 cursor-pointer place-items-center rounded-lg border transition-colors",
        on ? "border-emerald-400/20 bg-[#142a21] hover:bg-[#1a3529]"
           : "border-rose-400/40 bg-rose-500/15 text-rose-300")}>
      {on ? iconOn : iconOff}
      <span className="sr-only">{label}</span>
    </button>
  );
}
