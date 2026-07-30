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
import { useRouter } from "next/navigation";
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

export function YapLineDock() {
  const s = useYapLine();
  const router = useRouter();
  const [expandedScreen, setExpandedScreen] = React.useState(false);
  const cur = s.current;
  const session = cur ? s.sessions[cur.conversationId] : null;

  const speaker = session?.participants.find(
    (p) => p.speaking && p.userId !== s.myUserId
  );
  const sharer =
    session?.screenSharerId && session.screenSharerId !== s.myUserId
      ? session.participants.find((p) => p.userId === session.screenSharerId)
      : null;

  // Sessions live elsewhere that I'm not part of.
  const otherLive = Object.values(s.sessions).filter(
    (x) => x.conversationId !== cur?.conversationId
  );

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

  // Nothing anywhere → zero footprint.
  if (!cur && otherLive.length === 0) return null;

  const q = QUALITY_META[cur?.quality || "unknown"];

  return (
    <>
      {/* Full-screen viewer for a shared screen */}
      {expandedScreen && sharer && cur && (
        <div
          className="fixed inset-0 z-[90] flex flex-col bg-black/85 backdrop-blur-sm p-4 sm:p-8"
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

      <div className="fixed bottom-24 right-3 z-[70] flex flex-col items-end gap-2 md:bottom-5 md:right-5">
        {/* ── Live-elsewhere pills ── */}
        {otherLive.slice(0, 2).map((live) => (
          <button
            key={live.conversationId}
            onClick={() => yapline.join(live.conversationId, live.conversationName)}
            className="group flex items-center gap-2 rounded-full border border-emerald-500/30 bg-card/80 py-1.5 pl-2 pr-3 shadow-lg shadow-emerald-500/10 backdrop-blur-xl transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10 active:scale-95"
          >
            <span className="relative flex size-6 items-center justify-center rounded-full bg-emerald-500/15">
              <RadioTower className="size-3.5 text-emerald-400" />
              <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-rose-500" />
            </span>
            <span className="max-w-36 truncate text-[11px] font-bold text-foreground">
              {live.conversationName || "Direct YapLine"}
            </span>
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
              <LogIn className="size-3" /> Join
            </span>
          </button>
        ))}

        {/* ── Current session ── */}
        {cur && (s.minimized ? (
          <button
            onClick={() => yapline.setMinimized(false)}
            className={cn(
              "flex items-center gap-2 rounded-full border bg-card/80 py-2 pl-2.5 pr-3.5 shadow-lg backdrop-blur-xl transition-all active:scale-95",
              cur.transmitting
                ? "border-emerald-400/60 shadow-emerald-500/25"
                : speaker
                  ? "border-cyan-400/50 shadow-cyan-500/20"
                  : "border-border/40"
            )}
          >
            <span className={cn(
              "flex size-6 items-center justify-center rounded-full",
              cur.transmitting ? "bg-emerald-500 text-white animate-pulse" : "bg-emerald-500/15 text-emerald-400"
            )}>
              <RadioTower className="size-3.5" />
            </span>
            <span className="max-w-32 truncate text-[11px] font-bold">
              {cur.transmitting ? "Transmitting…" : speaker ? `${speaker.fullName.split(" ")[0]} speaking` : cur.conversationName || "YapLine"}
            </span>
            <span className={cn("size-1.5 rounded-full", q.dot)} />
          </button>
        ) : (
          <div className="w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-white/10 bg-card/80 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
            {/* Header */}
            <div className="relative flex items-center gap-2 border-b border-border/30 px-4 py-2.5">
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
              <button onClick={() => yapline.setMinimized(true)} className="rounded-lg p-1.5 text-muted-foreground/50 hover:bg-muted/40 hover:text-foreground">
                <Minus className="size-3.5" />
              </button>
              <button onClick={() => yapline.leave()} className="rounded-lg p-1.5 text-muted-foreground/50 hover:bg-rose-500/10 hover:text-rose-500">
                <X className="size-3.5" />
              </button>
            </div>

            {/* Incoming screen share preview */}
            {sharer && (
              <div className="relative border-b border-border/30 bg-black/40 p-2">
                <ScreenView
                  userId={sharer.userId}
                  version={cur.screenVersion}
                  className="h-36 cursor-zoom-in"
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

            {/* Participants */}
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

            {/* Controls */}
            <div className="flex items-center gap-2 border-t border-border/30 px-3 py-3">
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

            {/* Volume + hint */}
            <div className="flex items-center gap-3 px-4 pb-3">
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
                className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-emerald-500"
              >
                Open YapLine
              </button>
            </div>
            <p className="hidden px-4 pb-2 text-center text-[9px] font-medium text-muted-foreground/40 md:block">
              Tip: hold <kbd className="rounded border border-border/40 bg-muted/30 px-1">`</kbd> anywhere to talk
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

export default YapLineDock;