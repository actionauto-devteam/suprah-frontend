"use client";

/**
 * Suprah YapLine — floating dock.
 *
 * Mounted ONCE in the dashboard layout (next to Pulse360Popup) so live audio,
 * incoming broadcasts, and the mini-player survive navigation across every
 * route — CRM, Dashboard, Projects, Reports, Inventory, all of it. The store
 * behind it is a module-level singleton, so there is no provider to add.
 *
 * Shape:
 *   - nothing live anywhere → renders null (zero footprint)
 *   - otherwise → a single ORB (broadcast icon) and nothing else
 *   - tap the orb → the full panel expands; minimize collapses back to the orb
 *
 * The orb is the only resting state. It carries everything you need to know at
 * a glance — live channel count, whether your mic is open, whether someone is
 * talking right now — without occupying the corner of the screen.
 *
 * Mic model is open-mic: tap to unmute, tap again to mute. No holding. The
 * configured key (default `) toggles the mic from anywhere outside a text
 * field, so you can keep typing and still jump on the line.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Volume2,
  VolumeX,
  Minus,
  RadioTower,
  Maximize2,
  LogIn,
  PhoneOff,
  Headphones,
  UserPlus,
  Megaphone,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  useYapLine,
  yapline,
  getRemoteScreenStream,
  MAX_JOINED_CHANNELS,
  type YapQuality,
} from "@/lib/yapline-store";
import { useSupraSpaceMessenger } from "@/context/SupraSpaceMessengerContext";
import { YapLineInviteModal } from "@/components/yapline/YapLineInviteModal";
import { YapLineSummonMenu } from "@/components/yapline/YapLineSummonMenu";
import { useDraggableWidget } from "@/hooks/useDraggableWidget";

const ini = (name?: string | null) =>
  (name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const QUALITY_DOT: Record<YapQuality, string> = {
  good: "bg-emerald-400",
  fair: "bg-amber-400",
  poor: "bg-rose-500",
  unknown: "bg-muted-foreground/40",
};

const QUALITY_LABEL: Record<YapQuality, string> = {
  good: "Strong",
  fair: "Fair",
  poor: "Weak",
  unknown: "Measuring…",
};

/* ────────────────────────────────────────────────────────────────────────── */

function ScreenVideo({
  userId,
  version,
  className,
}: {
  userId: string;
  version: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stream = getRemoteScreenStream(userId);
    if (el.srcObject !== stream) el.srcObject = stream;
    // Screen video is muted, so autoplay policy never blocks it — but a
    // paused element after a tab restore needs the nudge.
    void el.play().catch(() => {
      /* resumes on the next render/gesture */
    });
  }, [userId, version]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={cn("size-full bg-black object-contain", className)}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export function YapLineDock() {
  const s = useYapLine();
  const router = useRouter();
  const { conversations } = useSupraSpaceMessenger();
  const [mounted, setMounted] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [inviteConv, setInviteConv] = React.useState<
    { _id: string; name?: string; members: Array<{ _id: string }> } | null
  >(null);
  const { setNode, style: dragStyle, handleProps } = useDraggableWidget("yapline-dock-pos");

  React.useEffect(() => setMounted(true), []);

  const cur = s.current;
  const liveSessions = Object.values(s.sessions);
  const curSession = cur ? s.sessions[cur.conversationId] : null;
  const monitorList = Object.values(s.monitors);
  const monitorIds = new Set(monitorList.map((m) => m.conversationId));
  // "Others" = live lines you're neither talking on nor already listening to.
  const others = liveSessions.filter(
    (l) => l.conversationId !== cur?.conversationId && !monitorIds.has(l.conversationId)
  );
  const joinedCount = (cur ? 1 : 0) + monitorList.length;

  const participants = curSession?.participants ?? [];
  const liveConv = cur ? conversations.find((c) => c._id === cur.conversationId) : null;
  const sharerId = curSession?.screenSharerId ?? null;
  const remoteSharerId = sharerId && sharerId !== s.myUserId ? sharerId : null;
  const speakingNow = participants.filter((p) => p.speaking && p.userId !== s.myUserId);

  const micOpen = !!cur && !cur.micMuted;
  const collapsed = s.minimized;

  /* ── Mic toggle key: tap to unmute, tap again to mute ─────────────────── */
  React.useEffect(() => {
    if (!cur) return;
    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== s.pttKey || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      void yapline.toggleMic();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur, s.pttKey]);

  if (!mounted) return null;
  if (!cur && liveSessions.length === 0 && monitorList.length === 0) return null;

  /* ── The orb: the dock's only resting state ───────────────────────────── */
  const orb = (
    <button
      {...handleProps}
      onClick={() => {
        yapline.setMinimized(false);
        if (s.audioBlocked) void yapline.resumeAudio();
      }}
      aria-label="Open YapLine — drag to reposition"
      title="Drag to reposition"
      className="group pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-900/40 ring-1 ring-inset ring-white/25 transition-transform duration-200 hover:scale-105 active:scale-95"
    >
      {/* Expanding halo — pulses while anyone is talking, steady otherwise */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full",
          speakingNow.length > 0 || micOpen
            ? "animate-ping bg-emerald-400/40"
            : liveSessions.length > 0 && "bg-emerald-400/15"
        )}
      />
      <RadioTower className="relative size-6 text-white" />

      {/* Live channel count */}
      {liveSessions.length > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-4 text-white ring-2 ring-background">
          {liveSessions.length}
        </span>
      )}

      {/* Listening-elsewhere pip: you're monitoring other channels too */}
      {monitorList.length > 0 && (
        <span className="absolute -left-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-cyan-500 ring-2 ring-background">
          <Headphones className="size-3 text-white" />
        </span>
      )}

      {/* Mic state pip — instantly readable without expanding */}
      {cur && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full ring-2 ring-background",
            micOpen ? "bg-emerald-400" : "bg-zinc-700"
          )}
        >
          {micOpen ? (
            <Mic className="size-3 text-emerald-950" />
          ) : (
            <MicOff className="size-3 text-white/80" />
          )}
        </span>
      )}
    </button>
  );

  /* ── Expanded panel ───────────────────────────────────────────────────── */
  const panel = (
    <div className="pointer-events-auto w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-emerald-500/20 bg-card/95 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
      {/* Header */}
      <div
        {...handleProps}
        title="Drag to reposition"
        className="flex items-center gap-2.5 border-b border-border/40 bg-linear-to-r from-emerald-500/10 to-transparent px-3.5 py-3"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/30 ring-1 ring-inset ring-white/20">
          <RadioTower className="size-4.5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[13px] font-black tracking-tight">
            Suprah <span className="text-emerald-500">YapLine</span>
          </p>
          <p className="truncate text-[10px] font-medium text-muted-foreground/70">
            {cur ? cur.conversationName || "Channel" : `${liveSessions.length} live channel${liveSessions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {cur && (
          <span className="flex shrink-0 items-center gap-1" title={QUALITY_LABEL[cur.quality]}>
            <span className={cn("size-2 rounded-full", QUALITY_DOT[cur.quality])} />
          </span>
        )}
        <button
          onClick={() => yapline.setMinimized(true)}
          aria-label="Minimize"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Minus className="size-4" />
        </button>
      </div>

      {/* No TURN relay: remote participants may fail to connect entirely.
          Surfaced here so it reads as a setup gap, not a mystery outage. */}
      {cur && !s.relayReady && (
        <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-[10px] font-medium leading-relaxed text-amber-500">
          <Megaphone className="mt-0.5 size-3 shrink-0" />
          <span>
            No relay server configured — people on other networks may not connect.
          </span>
        </div>
      )}

      {/* Sound blocked by the browser — one tap fixes it */}
      {s.audioBlocked && (
        <button
          onClick={() => void yapline.resumeAudio()}
          className="flex w-full items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-left text-[11px] font-bold text-amber-500 transition-colors hover:bg-amber-500/15"
        >
          <VolumeX className="size-3.5 shrink-0" />
          Tap to enable sound for this tab
        </button>
      )}

      {cur ? (
        <div className="space-y-3 p-3.5">
          {/* Participants */}
          <div className="flex flex-wrap items-center gap-2">
            {participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-1.5">
                <span className="relative">
                  <Avatar
                    className={cn(
                      "size-8 ring-2 transition-all",
                      p.speaking ? "ring-emerald-400" : "ring-border/40"
                    )}
                  >
                    <AvatarImage src={p.avatar || undefined} />
                    <AvatarFallback className="bg-emerald-600 text-[9px] font-bold text-white">
                      {ini(p.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  {p.speaking && (
                    <span className="pointer-events-none absolute inset-0 animate-ping rounded-full ring-2 ring-emerald-400/60" />
                  )}
                  {p.sharingScreen && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-cyan-500 ring-2 ring-card">
                      <MonitorUp className="size-2 text-white" />
                    </span>
                  )}
                  {p.listenOnly && !p.speaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-zinc-600 ring-2 ring-card">
                      <Headphones className="size-2 text-white" />
                    </span>
                  )}
                </span>
              </div>
            ))}
            {liveConv?.type === "group" && (
              <button
                onClick={() => setInviteConv(liveConv as any)}
                aria-label="Invite to channel"
                className="flex size-8 items-center justify-center rounded-full border border-dashed border-border/60 text-muted-foreground/60 transition-colors hover:border-emerald-500/50 hover:text-emerald-500"
              >
                <UserPlus className="size-3.5" />
              </button>
            )}
          </div>

          {/* Incoming screen */}
          {remoteSharerId && (
            <button
              onClick={() => setFullscreen(true)}
              className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-black"
            >
              <ScreenVideo userId={remoteSharerId} version={cur.screenVersion} />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/80 to-transparent px-2.5 py-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                  Live screen
                </span>
                <Maximize2 className="size-3.5 text-white/80" />
              </span>
            </button>
          )}

          {/* Mic — the main control. Tap to open, tap to close. */}
          <button
            onClick={() => void yapline.toggleMic()}
            className={cn(
              "flex w-full select-none items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]",
              micOpen
                ? "bg-linear-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                : "border border-border/50 bg-background/60 text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500"
            )}
          >
            {micOpen ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            {micOpen ? "Mic live — tap to mute" : "Mic muted — tap to talk"}
          </button>

          {/* Secondary controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => (cur.screenSharing ? yapline.stopScreenShare() : void yapline.startScreenShare())}
              title={cur.screenSharing ? "Stop sharing" : "Share screen"}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                cur.screenSharing
                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-400"
                  : "border-border/50 text-muted-foreground/70 hover:border-cyan-500/40 hover:text-cyan-400"
              )}
            >
              {cur.screenSharing ? <MonitorX className="size-3.5" /> : <MonitorUp className="size-3.5" />}
              <span className="hidden xs:inline">Screen</span>
            </button>

            <button
              onClick={() => yapline.setDeafened(!cur.deafened)}
              title={cur.deafened ? "Undeafen" : "Deafen"}
              className={cn(
                "flex items-center justify-center rounded-xl border px-2.5 py-2 transition-all active:scale-95",
                cur.deafened
                  ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                  : "border-border/50 text-muted-foreground/70 hover:border-emerald-500/40 hover:text-emerald-500"
              )}
            >
              {cur.deafened ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </button>

            <YapLineSummonMenu
              conversationId={cur.conversationId}
              members={(liveConv?.members as any) || []}
              activeParticipantIds={participants.map((p) => p.userId)}
              myUserId={s.myUserId}
              trigger={
                <button
                  title="Ping the channel"
                  className="flex items-center justify-center rounded-xl border border-border/50 px-2.5 py-2 text-muted-foreground/70 transition-all hover:border-amber-500/40 hover:text-amber-500 active:scale-95"
                >
                  <Megaphone className="size-3.5" />
                </button>
              }
            />

            <button
              onClick={() => void yapline.leave()}
              title="Leave channel"
              className="flex items-center justify-center rounded-xl border border-rose-500/30 px-2.5 py-2 text-rose-500/80 transition-all hover:bg-rose-500/15 hover:text-rose-400 active:scale-95"
            >
              <PhoneOff className="size-3.5" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Volume2 className="size-3.5 shrink-0 text-muted-foreground/50" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={cur.volume}
              onChange={(e) => yapline.setVolume(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-emerald-500"
            />
          </div>

          <button
            onClick={() => router.push("/crm/yapline")}
            className="w-full rounded-xl border border-border/40 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors hover:border-emerald-500/30 hover:text-emerald-500"
          >
            Open YapLine
          </button>
        </div>
      ) : (
        <div className="p-3.5 text-[11px] text-muted-foreground/70">
          {monitorList.length > 0
            ? "Listening in. Pick “Talk here” on a channel to bring your mic over."
            : "Lines are open below — Listen to tune in, or Talk to bring your mic."}
        </div>
      )}

      {/* ── Live channels ──────────────────────────────────────────────────
          Every line that's on the air right now, with two ways in:
            Listen → tune in ALONGSIDE the current channel (multi-channel,
                     receive-only, like scanning several radio channels)
            Talk   → make it the active channel, where your mic lives
          Channels you're already monitoring show their own volume controls. */}
      {(others.length > 0 || monitorList.length > 0) && (
        <div className="border-t border-border/40 bg-background/40">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
              Live channels
            </span>
            <span className="text-[9px] font-bold tabular-nums text-muted-foreground/40">
              {joinedCount}/{MAX_JOINED_CHANNELS}
            </span>
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto px-2 pb-2.5 [scrollbar-width:thin]">
            {/* Channels you're monitoring right now */}
            {monitorList.map((mon) => {
              const sess = s.sessions[mon.conversationId];
              const talkers = sess?.participants.filter((p) => p.speaking).length ?? 0;
              return (
                <div
                  key={mon.conversationId}
                  className="rounded-xl border border-cyan-500/25 bg-cyan-500/8 px-2.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Headphones className="size-3 shrink-0 text-cyan-400" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold">
                      {mon.conversationName || sess?.conversationName || "Channel"}
                    </span>
                    {talkers > 0 && (
                      <span className="shrink-0 animate-pulse text-[9px] font-black uppercase tracking-widest text-emerald-400">
                        Talking
                      </span>
                    )}
                    <button
                      onClick={() => yapline.setMonitorDeafened(mon.conversationId, !mon.deafened)}
                      title={mon.deafened ? "Unmute this channel" : "Mute this channel"}
                      className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
                    >
                      {mon.deafened ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
                    </button>
                    <button
                      onClick={() => yapline.leaveMonitor(mon.conversationId)}
                      title="Stop listening"
                      className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-rose-400"
                    >
                      <X className="size-3" />
                    </button>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={mon.volume}
                      onChange={(e) =>
                        yapline.setMonitorVolume(mon.conversationId, Number(e.target.value))
                      }
                      className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-cyan-500"
                    />
                    <button
                      onClick={() => void yapline.join(mon.conversationId, mon.conversationName)}
                      className="shrink-0 rounded-lg border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 transition-colors hover:bg-emerald-500/15"
                    >
                      Talk here
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Live channels you haven't tuned into yet */}
            {others.map((live) => {
              const talkers = live.participants.filter((p) => p.speaking).length;
              return (
                <div
                  key={live.conversationId}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/30"
                >
                  <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold">
                      {live.conversationName || "Channel"}
                    </p>
                    <p className="truncate text-[9px] font-medium text-muted-foreground/50">
                      {live.participants.length} on the line
                      {talkers > 0 && " · talking now"}
                    </p>
                  </div>
                  <button
                    onClick={() => void yapline.joinMonitor(live.conversationId, live.conversationName)}
                    disabled={joinedCount >= MAX_JOINED_CHANNELS}
                    title="Listen alongside your current channel"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-cyan-500/30 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-400 transition-colors hover:bg-cyan-500/15 disabled:pointer-events-none disabled:opacity-35"
                  >
                    <Headphones className="size-3" />
                    Listen
                  </button>
                  <button
                    onClick={() => void yapline.join(live.conversationId, live.conversationName)}
                    title="Move your mic to this channel"
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-500 transition-colors hover:bg-emerald-500/20"
                  >
                    <LogIn className="size-3" />
                    Talk
                  </button>
                </div>
              );
            })}
          </div>

          {joinedCount >= MAX_JOINED_CHANNELS && (
            <p className="px-3 pb-2 text-[9px] font-medium text-amber-500/80">
              Channel limit reached — leave one to tune into another.
            </p>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(
    <>
      <div
        ref={setNode}
        style={dragStyle}
        className="pointer-events-none fixed bottom-24 right-3 z-70 flex flex-col items-end gap-2 md:bottom-5 md:right-5"
      >
        {collapsed ? orb : panel}
      </div>

      {/* Full-screen incoming screen viewer */}
      {fullscreen && remoteSharerId && cur && (
        <div className="fixed inset-0 z-90 flex flex-col bg-black/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
              Live screen
            </span>
            <button
              onClick={() => setFullscreen(false)}
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 p-3 pt-0">
            <ScreenVideo
              userId={remoteSharerId}
              version={cur.screenVersion}
              className="rounded-2xl"
            />
          </div>
        </div>
      )}

      {inviteConv && (
        <YapLineInviteModal
          conv={inviteConv}
          onClose={() => setInviteConv(null)}
          onInvited={() => setInviteConv(null)}
        />
      )}
    </>,
    document.body
  );
}

export default YapLineDock;