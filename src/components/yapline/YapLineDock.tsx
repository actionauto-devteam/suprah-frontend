"use client";

/**
 * Suprah YapLine — floating dock.
 *
 * Mounted ONCE in the dashboard layout (next to Pulse360Popup) so PTT audio,
 * incoming broadcasts, and the mini-player survive navigation across every
 * route — CRM, Dashboard, Projects, Reports, Inventory, all of it. The store
 * behind it is a module-level singleton, so there is no provider to add.
 *
 * States:
 *   - nothing live anywhere            → renders null (zero footprint)
 *   - live session(s) I haven't joined → compact LIVE pill with one-tap join
 *   - in a session, minimized          → status pill (transmit/receive glow)
 *   - in a session, expanded           → full mini-player
 *
 * Hold the mic button — or hold ` (backtick) anywhere outside a text field —
 * to talk. Release to go back to receive.
 */

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Mic,
  MonitorUp,
  MonitorX,
  Volume2,
  VolumeX,
  X,
  Minus,
  RadioTower,
  Maximize2,
  LogIn,
  GripHorizontal,
  PhoneOff,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  useYapLine,
  yapline,
  getRemoteScreenStream,
  type YapQuality,
} from "@/lib/yapline-store";

const ini = (name?: string | null) =>
  (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const QUALITY_META: Record<YapQuality, { dot: string; label: string }> = {
  good: { dot: "bg-emerald-400", label: "Good" },
  fair: { dot: "bg-amber-400", label: "Fair" },
  poor: { dot: "bg-rose-500", label: "Poor" },
  unknown: { dot: "bg-muted-foreground/40", label: "—" },
};

function ScreenView({ userId, version, className, onClick }: {
  userId: string;
  version: number;
  className?: string;
  onClick?: () => void;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const stream = getRemoteScreenStream(userId);
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => { });
    }
  }, [userId, version]);
  return (
    <video
      ref={ref}
      onClick={onClick}
      muted
      playsInline
      className={cn("w-full rounded-xl bg-black/60 object-contain", className)}
    />
  );
}

const DOCK_POS_KEY = "yapline_dock_pos";

function loadDockPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(DOCK_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") return parsed;
  } catch { /* ignore */ }
  return null;
}

function saveDockPos(pos: { x: number; y: number }) {
  try {
    localStorage.setItem(DOCK_POS_KEY, JSON.stringify(pos));
  } catch { /* ignore */ }
}

export function YapLineDock() {
  const s = useYapLine();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedScreen, setExpandedScreen] = React.useState(false);

  // ── "Live elsewhere" join list ─────────────────────────────────────────
  // Collapsed to one small chip by default so a busy org (several channels
  // live at once) doesn't stack up a wall of big pills before anyone has
  // even joined. Dismissing a channel just hides that pill locally (not a
  // "leave" — nothing to leave) until it stops being live, for anyone who
  // doesn't want to join it.
  const [liveExpanded, setLiveExpanded] = React.useState(false);
  const [dismissedLive, setDismissedLive] = React.useState<Set<string>>(new Set());

  // Suprah Space's chat composer sits flush against the bottom-right corner —
  // the dock's default offset would otherwise sit right on top of its Send
  // button. Lift the dock clear of the composer on that route only.
  const isSupraSpace = pathname === "/crm/supra-space";

  // ── Draggable positioning ──────────────────────────────────────────────
  // The dock defaults to bottom-right via CSS; once the user drags it, we
  // switch to an explicit left/top (persisted) so it stays wherever they put
  // it across reloads and route changes — this is the whole floating stack
  // (join pills + mini-player), so one handle moves everything together.
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dockPos, setDockPos] = React.useState<{ x: number; y: number } | null>(null);
  const dragRef = React.useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  const clampToViewport = React.useCallback((x: number, y: number) => {
    const el = containerRef.current;
    const w = el?.offsetWidth ?? 220;
    const h = el?.offsetHeight ?? 60;
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - h - 8);
    return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
  }, []);

  // Load the saved position once and clamp it against whatever's on screen
  // right now — a position saved from a wider/taller window (or a smaller
  // widget shape) could otherwise sit off-screen the moment it's restored.
  React.useLayoutEffect(() => {
    const loaded = loadDockPos();
    if (loaded) setDockPos(clampToViewport(loaded.x, loaded.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const onResize = () => setDockPos((prev) => (prev ? clampToViewport(prev.x, prev.y) : prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampToViewport]);

  // Re-clamp whenever the dock's own footprint changes shape — minimized
  // (~44px pill) vs. expanded (320px mini-player) vs. extra join-elsewhere
  // pills. A position saved while minimized can otherwise sit right at a
  // screen edge; joining a session forces minimized back to false (see
  // yapline-store's join()), and the panel balloons out from that same
  // corner with nothing pulling it back on-screen — this is what was
  // cutting the reopened panel off after drag → minimize → leave → rejoin.
  // useLayoutEffect so containerRef already reflects the new size by the
  // time we measure it, before the user sees a frame of the overflow.
  React.useLayoutEffect(() => {
    setDockPos((prev) => {
      if (!prev) return prev;
      const clamped = clampToViewport(prev.x, prev.y);
      if (clamped.x === prev.x && clamped.y === prev.y) return prev;
      saveDockPos(clamped);
      return clamped;
    });
  }, [s.current?.conversationId, s.minimized, liveExpanded, Object.keys(s.sessions).length, clampToViewport]);

  const beginDrag = React.useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onDragMove = React.useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    setDockPos(clampToViewport(drag.originX + dx, drag.originY + dy));
  }, [clampToViewport]);

  const endDrag = React.useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (drag?.moved) {
      setDockPos((prev) => {
        if (prev) saveDockPos(prev);
        return prev;
      });
    }
  }, []);

  const cur = s.current;
  const session = cur ? s.sessions[cur.conversationId] : null;

  const speaker = session?.participants.find(
    (p) => p.speaking && p.userId !== s.myUserId
  );
  const sharer =
    session?.screenSharerId && session.screenSharerId !== s.myUserId
      ? session.participants.find((p) => p.userId === session.screenSharerId)
      : null;

  // Sessions live elsewhere that I'm not part of, minus any I've dismissed.
  const otherLive = Object.values(s.sessions).filter(
    (x) => x.conversationId !== cur?.conversationId
  );
  const joinableLive = otherLive.filter((x) => !dismissedLive.has(x.conversationId));
  const otherLiveIds = otherLive.map((x) => x.conversationId).join(",");

  // A dismissed channel only stays hidden while it's actually live — once it
  // ends, forget it so the same conversation starting again shows fresh.
  React.useEffect(() => {
    setDismissedLive((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(otherLiveIds ? otherLiveIds.split(",") : []);
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [otherLiveIds]);

  // Keyboard PTT: hold ` outside inputs.
  React.useEffect(() => {
    if (!cur) return;
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === "`" && !e.repeat && !isTyping()) {
        e.preventDefault();
        void yapline.startTransmit();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "`") yapline.stopTransmit();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [cur?.conversationId]);

  // The full YapLine page already shows every live channel (with its own
  // "Live" tag and join-by-tap) and the active session's full-size controls —
  // the floating dock here would be a redundant popup fighting the page's own
  // controls for the same slice of screen, which is especially unusable on a
  // small phone. Skip it on that route.
  const isYapLinePage = pathname === "/crm/yapline";

  // Nothing anywhere (or everything live has been dismissed) → zero footprint.
  if (isYapLinePage || (!cur && joinableLive.length === 0)) return null;

  const q = QUALITY_META[cur?.quality || "unknown"];

  return (
    <>
      {/* Full-screen viewer for a shared screen */}
      {expandedScreen && sharer && cur && (
        <div
          className="fixed inset-0 z-90 flex flex-col bg-black/85 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setExpandedScreen(false)}
        >
          <div className="mb-2 flex items-center justify-between text-white/80">
            <p className="text-xs font-black uppercase tracking-widest">
              {sharer.fullName} is sharing · {cur.conversationName || "YapLine"}
            </p>
            <button className="rounded-lg p-1.5 hover:bg-white/10"><X className="size-4" /></button>
          </div>
          <ScreenView
            userId={sharer.userId}
            version={cur.screenVersion}
            className="min-h-0 flex-1 rounded-2xl"
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          "fixed z-70 flex flex-col items-end gap-2",
          !dockPos && (isSupraSpace
            ? "bottom-40 right-3 md:bottom-24 md:right-5"
            : "bottom-24 right-3 md:bottom-5 md:right-5")
        )}
        style={dockPos ? { left: dockPos.x, top: dockPos.y, right: "auto", bottom: "auto" } : undefined}
      >
        {/* ── Drag handle — grabs and repositions the whole dock ── */}
        <div
          onPointerDown={beginDrag}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          title="Drag to move"
          className="group flex h-6 w-16 shrink-0 touch-none cursor-grab select-none items-center justify-center gap-1 self-center rounded-full border border-border/60 bg-card/90 text-muted-foreground/70 shadow-md backdrop-blur-xl transition-all hover:border-emerald-500/50 hover:text-emerald-500 hover:shadow-emerald-500/20 active:cursor-grabbing active:scale-95"
        >
          <GripHorizontal className="size-4 transition-transform group-hover:scale-110" />
        </div>

        {/* ── Live-elsewhere: collapsed chip, or the full join list ── */}
        {joinableLive.length > 0 && (liveExpanded || joinableLive.length === 1 ? (
          <div className="w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-emerald-500/25 bg-card/85 shadow-xl shadow-emerald-500/10 backdrop-blur-xl">
            {joinableLive.length > 1 && (
              <div className="flex items-center justify-between gap-2 border-b border-border/30 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <RadioTower className="size-3.5" /> {joinableLive.length} live channels
                </p>
                <button
                  onClick={() => setLiveExpanded(false)}
                  title="Collapse"
                  className="rounded-lg p-1 text-muted-foreground/50 hover:bg-muted/40 hover:text-foreground"
                >
                  <Minus className="size-3.5" />
                </button>
              </div>
            )}
            <div className="max-h-56 space-y-1 overflow-y-auto p-1.5 no-scrollbar">
              {joinableLive.map((live) => (
                <div
                  key={live.conversationId}
                  className="group/row flex items-center gap-1.5 rounded-xl border border-border/30 bg-background/40 py-1.5 pl-2.5 pr-1.5 transition-colors hover:border-emerald-400/40"
                >
                  <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <RadioTower className="size-3.5 text-emerald-400" />
                    <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-rose-500" />
                  </span>
                  <button
                    onClick={() => {
                      void yapline.join(live.conversationId, live.conversationName);
                      setLiveExpanded(false);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-[11px] font-bold text-foreground"
                    title={live.conversationName || "Direct YapLine"}
                  >
                    {live.conversationName || "Direct YapLine"}
                  </button>
                  <button
                    onClick={() => {
                      void yapline.join(live.conversationId, live.conversationName);
                      setLiveExpanded(false);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-500 transition-colors hover:bg-emerald-500/20 active:scale-95"
                  >
                    <LogIn className="size-3" /> Join
                  </button>
                  <button
                    onClick={() => setDismissedLive((prev) => new Set(prev).add(live.conversationId))}
                    title="Not now — hide this channel"
                    className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40 opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-500 group-hover/row:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLiveExpanded(true)}
            className="group flex items-center gap-2 rounded-full border border-emerald-500/30 bg-card/80 py-1.5 pl-2 pr-2.5 shadow-lg shadow-emerald-500/10 backdrop-blur-xl transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10 active:scale-95"
          >
            <span className="relative flex size-6 items-center justify-center rounded-full bg-emerald-500/15">
              <RadioTower className="size-3.5 text-emerald-400" />
              <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-rose-500" />
            </span>
            <span className="text-[11px] font-bold text-foreground">
              {joinableLive.length} live channels
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-y-0.5" />
          </button>
        ))}

        {/* ── Current session ── */}
        {cur && (s.minimized ? (
          <button
            onClick={() => yapline.setMinimized(false)}
            title={cur.transmitting ? "Transmitting…" : speaker ? `${speaker.fullName.split(" ")[0]} speaking` : cur.conversationName || "YapLine"}
            className={cn(
              "relative flex size-11 shrink-0 items-center justify-center rounded-full border bg-card/80 shadow-lg backdrop-blur-xl transition-all active:scale-95",
              cur.transmitting
                ? "border-emerald-400/60 shadow-emerald-500/25"
                : speaker
                  ? "border-cyan-400/50 shadow-cyan-500/20"
                  : "border-border/40"
            )}
          >
            <span className={cn(
              "flex size-7 items-center justify-center rounded-full",
              cur.transmitting ? "bg-emerald-500 text-white animate-pulse" : "bg-emerald-500/15 text-emerald-400"
            )}>
              <RadioTower className="size-4" />
            </span>
            <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card", q.dot)} />
          </button>
        ) : (
          <div className="flex max-h-[min(32rem,calc(100dvh-7rem))] w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/80 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
            {/* Header — always visible: never scrolls away on a short viewport */}
            <div className="relative flex shrink-0 items-center gap-2 border-b border-border/30 px-4 py-2.5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/50 to-transparent" />
              <span className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-xl",
                cur.transmitting ? "bg-emerald-500 text-white" : "bg-emerald-500/15 text-emerald-400"
              )}>
                <RadioTower className={cn("size-4", cur.transmitting && "animate-pulse")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black tracking-tight">
                  {cur.conversationName || "Direct YapLine"}
                </p>
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span className={cn("size-1.5 rounded-full", q.dot)} />
                  {cur.joining ? "Connecting…" : cur.transmitting ? "Transmitting" : speaker ? "Receiving" : `Standby · ${q.label}`}
                </p>
              </div>
              <button onClick={() => yapline.setMinimized(true)} title="Minimize" className="rounded-lg p-1.5 text-muted-foreground/50 hover:bg-muted/40 hover:text-foreground">
                <Minus className="size-3.5" />
              </button>
              <button onClick={() => yapline.leave()} title="Leave YapLine" className="rounded-lg bg-rose-500/10 p-1.5 text-rose-500 hover:bg-rose-500/20">
                <PhoneOff className="size-3.5" />
              </button>
            </div>

            {/* Screen preview + participants — the only part that scrolls, so
                a tall session (screen share + a big roster) never pushes the
                talk/leave controls below a short mobile viewport. */}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
              {sharer && (
                <div className="relative border-b border-border/30 bg-black/40 p-2">
                  <ScreenView
                    userId={sharer.userId}
                    version={cur.screenVersion}
                    className="h-28 cursor-zoom-in sm:h-36"
                    onClick={() => setExpandedScreen(true)}
                  />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/90">
                    <MonitorUp className="size-3 text-cyan-400" /> {sharer.fullName.split(" ")[0]}'s screen
                  </div>
                  <button
                    onClick={() => setExpandedScreen(true)}
                    className="absolute bottom-3 right-3 rounded-lg bg-black/60 p-1.5 text-white/80 hover:text-white"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 no-scrollbar">
                {(session?.participants || []).map((p) => (
                  <div key={p.userId} className="flex shrink-0 flex-col items-center gap-1" title={p.fullName}>
                    <Avatar className={cn(
                      "size-8 ring-2 transition-all",
                      p.speaking ? "ring-emerald-400 shadow-md shadow-emerald-500/40" : "ring-border/40"
                    )}>
                      <AvatarImage src={p.avatar || undefined} />
                      <AvatarFallback className="bg-emerald-600 text-[9px] font-bold text-white">
                        {ini(p.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "max-w-12 truncate text-[8px] font-bold",
                      p.speaking ? "text-emerald-500" : "text-muted-foreground/60"
                    )}>
                      {p.userId === s.myUserId ? "You" : p.fullName.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls — always visible */}
            <div className="flex shrink-0 items-center gap-2 border-t border-border/30 px-3 py-3">
              {/* PTT — hold to talk */}
              <button
                onPointerDown={(e) => { e.preventDefault(); void yapline.startTransmit(); }}
                onPointerUp={() => yapline.stopTransmit()}
                onPointerLeave={() => cur.transmitting && yapline.stopTransmit()}
                onContextMenu={(e) => e.preventDefault()}
                className={cn(
                  "flex flex-1 select-none items-center justify-center gap-2 rounded-2xl py-2.5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98]",
                  cur.transmitting
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                    : "border border-emerald-500/30 bg-emerald-500/8 text-emerald-500 hover:bg-emerald-500/15"
                )}
              >
                <Mic className="size-4" />
                {cur.transmitting ? "On Air" : "Hold to Talk"}
              </button>

              {/* Screen share */}
              <button
                onClick={() => cur.screenSharing ? yapline.stopScreenShare() : void yapline.startScreenShare()}
                title={cur.screenSharing ? "Stop sharing screen" : "Share screen"}
                className={cn(
                  "rounded-xl p-2.5 transition-colors",
                  cur.screenSharing
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "border border-border/40 text-muted-foreground/70 hover:text-cyan-400 hover:border-cyan-500/30"
                )}
              >
                {cur.screenSharing ? <MonitorX className="size-4" /> : <MonitorUp className="size-4" />}
              </button>

              {/* Deafen */}
              <button
                onClick={() => yapline.setDeafened(!cur.deafened)}
                title={cur.deafened ? "Unmute incoming audio" : "Mute incoming audio"}
                className={cn(
                  "rounded-xl p-2.5 transition-colors",
                  cur.deafened
                    ? "bg-rose-500/15 text-rose-500"
                    : "border border-border/40 text-muted-foreground/70 hover:text-foreground"
                )}
              >
                {cur.deafened ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            </div>

            {/* Volume + hint — always visible */}
            <div className="flex shrink-0 items-center gap-3 px-4 pb-3">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(cur.volume * 100)}
                onChange={(e) => yapline.setVolume(Number(e.target.value) / 100)}
                className="h-1 flex-1 cursor-pointer accent-emerald-500"
                aria-label="Incoming volume"
              />
              <button
                onClick={() => router.push("/crm/yapline")}
                className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-emerald-500"
              >
                Open YapLine
              </button>
            </div>
            <p className="hidden shrink-0 px-4 pb-2 text-center text-[9px] font-medium text-muted-foreground/40 md:block">
              Tip: hold <kbd className="rounded border border-border/40 bg-muted/30 px-1">`</kbd> anywhere to talk
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

export default YapLineDock;