"use client";

/**
 * Suprah YapLine — full page.  Save as: app/(dashboard)/crm/yapline/page.tsx
 *
 * Left rail: your SupraSpace conversations/channels (live ones surface first,
 * with a pulsing LIVE tag). Main stage: the active session — big hold-to-talk,
 * participant grid with speaking rings, screen-share viewer, and the
 * auto-listen preference. All realtime state comes from the same singleton
 * store as the dock and Dashboard widget.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import {
  RadioTower,
  Mic,
  MonitorUp,
  MonitorX,
  Volume2,
  VolumeX,
  Search,
  Users,
  Hash,
  LogOut,
  Radio,
  Signal,
  Pin,
  PinOff,
  UserPlus,
  X,
  Loader2,
  Check,
  Keyboard,
  Headphones,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  useYapLine,
  yapline,
  getRemoteScreenStream,
  MAX_JOINED_CHANNELS,
  type YapQuality,
} from "@/lib/yapline-store";
import { YapLineInviteModal } from "@/components/yapline/YapLineInviteModal";

const ini = (name?: string | null) =>
  (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

interface CrmUserLite {
  _id: string;
  fullName: string;
  username?: string;
  avatar?: string | null;
}

interface Conv {
  _id: string;
  type: "direct" | "group";
  name?: string | null;
  emoji?: string | null;
  avatar?: string | null;
  members: Array<{ _id: string; fullName?: string; avatar?: string | null }>;
  pinnedBy?: string[];
  // Recency fields — the conversations endpoint may expose any of these;
  // convRecency() tries them in order so "latest first" works regardless.
  lastMessageAt?: string | null;
  lastMessage?: { createdAt?: string } | null;
  updatedAt?: string;
  createdAt?: string;
}

// Module-level so the rail's conversations survive a route-away-and-back
// remount within the same tab — repeat navigation renders the last known
// list immediately instead of flashing the skeleton, while the effect below
// still revalidates against the network in the background.
let convsCache: Conv[] | null = null;

/** Best-effort "last activity" timestamp for latest-first ordering. */
function convRecency(c: Conv): number {
  const t =
    c.lastMessageAt || c.lastMessage?.createdAt || c.updatedAt || c.createdAt;
  const ms = t ? new Date(t).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

const QUALITY_META: Record<YapQuality, { tone: string; label: string }> = {
  good: { tone: "text-emerald-500", label: "Good connection" },
  fair: { tone: "text-amber-500", label: "Fair connection" },
  poor: { tone: "text-rose-500", label: "Poor connection" },
  unknown: { tone: "text-muted-foreground/50", label: "Measuring…" },
};

function convDisplayName(c: Conv, myId: string | null): string {
  if (c.name) return c.name;
  const other = c.members?.find((m) => m._id !== myId);
  return other?.fullName || "Direct Message";
}

function StageScreen({ userId, version }: { userId: string; version: number }) {
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
      muted
      playsInline
      className="h-full w-full rounded-2xl bg-black/70 object-contain"
    />
  );
}

/** One channel row in the rail — join on click, pin/invite on hover. */
function ChannelRow({
  c,
  s,
  isCurrent,
  isPinned,
  onTogglePin,
  onInvite,
}: {
  c: Conv;
  s: ReturnType<typeof useYapLine>;
  isCurrent: boolean;
  isPinned: boolean;
  onTogglePin: (c: Conv) => void;
  onInvite: (c: Conv) => void;
}) {
  const live = s.sessions[c._id];
  const name = convDisplayName(c, s.myUserId);
  const isSpeaking = (live?.speakingIds.length ?? 0) > 0;
  const isMonitored = !!s.monitors[c._id];
  const joinedCount = (s.current ? 1 : 0) + Object.keys(s.monitors).length;
  const atCap = joinedCount >= MAX_JOINED_CHANNELS;
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all",
        isCurrent
          ? "border-emerald-500/40 bg-emerald-500/8"
          : isMonitored
            ? "border-cyan-500/30 bg-cyan-500/5"
            : "border-transparent hover:border-border/40 hover:bg-background/40"
      )}
    >
      <button onClick={() => !isCurrent && yapline.join(c._id, name)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm",
          c.type === "group" ? "bg-cyan-500/10 text-cyan-400" : "bg-emerald-500/10 text-emerald-500"
        )}>
          {c.emoji || (c.type === "group" ? <Hash className="size-4" /> : <Users className="size-4" />)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">
            {name}
            {isMonitored && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-400">Monitoring</span>}
          </p>
          <p className="truncate text-[10px] text-muted-foreground/50">
            {live
              ? `${live.participants.length} on the line`
              : `${c.members?.length ?? 0} members`}
          </p>
        </div>
      </button>
      {live && (
        <span className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
          isSpeaking ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {isSpeaking ? <Mic className="size-2.5 animate-pulse" /> : <span className="size-1.5 animate-pulse rounded-full bg-rose-500" />}
          {isSpeaking ? "Talking" : "Live"}
        </span>
      )}
      <span className="hidden shrink-0 items-center gap-0.5 sm:group-hover:flex">
        {c.type === "group" && (
          <button
            onClick={() => onInvite(c)}
            title="Invite people"
            className="flex size-6.5 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-muted/60 hover:text-emerald-500"
          >
            <UserPlus className="size-3.5" />
          </button>
        )}
        {!isCurrent && (
          <button
            onClick={() => isMonitored ? yapline.leaveMonitor(c._id) : void yapline.joinMonitor(c._id, name)}
            disabled={!isMonitored && atCap}
            title={isMonitored ? "Stop monitoring" : atCap ? `Max ${MAX_JOINED_CHANNELS} channels — leave one first` : "Listen in without switching"}
            className={cn(
              "flex size-6.5 items-center justify-center rounded-lg hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-30",
              isMonitored ? "text-cyan-500" : "text-muted-foreground/60 hover:text-cyan-500"
            )}
          >
            <Headphones className="size-3.5" />
          </button>
        )}
        <button
          onClick={() => onTogglePin(c)}
          title={isPinned ? "Unpin channel" : "Pin channel"}
          className="flex size-6.5 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-muted/60 hover:text-emerald-500"
        >
          {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </button>
      </span>
    </div>
  );
}

/** Push-to-talk keybind row — click to capture the next key pressed. */
function PttKeyRow() {
  const s = useYapLine();
  const [capturing, setCapturing] = React.useState(false);

  React.useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") { setCapturing(false); return; }
      yapline.setPttKey(e.key);
      setCapturing(false);
      toast.success(`Push-to-talk key set to "${e.key}"`);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [capturing]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold">Push-to-talk key</p>
        <p className="text-[10px] leading-relaxed text-muted-foreground/50">
          Hold this key anywhere outside a text field to transmit.
        </p>
      </div>
      <button
        onClick={() => setCapturing(true)}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors",
          capturing
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
            : "border-border/40 text-muted-foreground/70 hover:border-emerald-500/30 hover:text-emerald-500"
        )}
      >
        <Keyboard className="size-3.5" />
        {capturing ? "Press a key…" : s.pttKey}
      </button>
    </div>
  );
}

export default function YapLinePage() {
  const s = useYapLine();
  const [convs, setConvs] = React.useState<Conv[]>(() => convsCache ?? []);
  const [loading, setLoading] = React.useState(() => convsCache === null);
  const [query, setQuery] = React.useState("");
  const [inviteConv, setInviteConv] = React.useState<Conv | null>(null);

  const cur = s.current;
  const session = cur ? s.sessions[cur.conversationId] : null;
  const sharer =
    session?.screenSharerId
      ? session.participants.find((p) => p.userId === session.screenSharerId)
      : null;
  const remoteSharer = sharer && sharer.userId !== s.myUserId ? sharer : null;
  const q = QUALITY_META[cur?.quality || "unknown"];

  React.useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/api/supraspace/conversations", { signal: controller.signal })
      .then((res) => {
        const data: Conv[] = res.data?.data || [];
        convsCache = data;
        setConvs(data);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? convs.filter((c) => convDisplayName(c, s.myUserId).toLowerCase().includes(term))
      : convs;
    // Live channels bubble to the top; within each group, latest activity first.
    return [...list].sort((a, b) => {
      const liveDiff = Number(!!s.sessions[b._id]) - Number(!!s.sessions[a._id]);
      if (liveDiff !== 0) return liveDiff;
      return convRecency(b) - convRecency(a);
    });
  }, [convs, query, s.sessions, s.myUserId]);

  const pinned = filtered.filter((c) => s.myUserId && c.pinnedBy?.includes(s.myUserId));
  const unpinned = filtered.filter((c) => !(s.myUserId && c.pinnedBy?.includes(s.myUserId)));

  const togglePin = React.useCallback(async (c: Conv) => {
    const isPinned = !!(s.myUserId && c.pinnedBy?.includes(s.myUserId));
    const next = !isPinned;
    setConvs((prev) => {
      const updated = prev.map((x) => x._id === c._id
        ? { ...x, pinnedBy: next ? [...(x.pinnedBy || []), s.myUserId!] : (x.pinnedBy || []).filter((id) => id !== s.myUserId) }
        : x);
      convsCache = updated;
      return updated;
    });
    try {
      await apiClient.post(`/api/supraspace/conversations/${c._id}/pin`, { pinned: next });
    } catch {
      toast.error("Could not update pin");
    }
  }, [s.myUserId]);

  const handleInvited = React.useCallback((convId: string, memberIds: string[]) => {
    setConvs((prev) => {
      const updated = prev.map((c) => c._id === convId
        ? { ...c, members: [...c.members, ...memberIds.map((id) => ({ _id: id }))] }
        : c);
      convsCache = updated;
      return updated;
    });
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-3 sm:p-6 lg:flex-row animate-in fade-in duration-500">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(700px_circle_at_15%_-5%,rgba(16,185,129,0.05),transparent_55%),radial-gradient(600px_circle_at_85%_0%,rgba(34,211,238,0.04),transparent_55%)]" />

      {/* ── Channel rail ── */}
      <aside className="flex w-full shrink-0 flex-col rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl lg:w-80">
        <div className="border-b border-border/30 p-4">
          <div className="flex items-center gap-2.5">
            {/* Solid green app tile — same branding treatment as Suprah Space. */}
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/20">
              <RadioTower className="size-5 text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-base font-black tracking-tight">
                <span className="truncate">
                  Suprah <span className="text-emerald-500">YapLine</span>
                </span>
                {Object.keys(s.sessions).length > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-black text-emerald-500">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Live
                  </span>
                )}
              </h1>
              <p className="truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Push-to-talk · Screen share
              </p>
            </div>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a channel or teammate…"
              className="w-full rounded-xl border border-border/40 bg-background/40 py-2 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-emerald-500/40"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 [scrollbar-width:thin]">
          {loading ? (
            [0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted/20" />
            ))
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground/50">No conversations found.</p>
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Pinned</p>
                  {pinned.map((c) => (
                    <ChannelRow key={c._id} c={c} s={s} isCurrent={cur?.conversationId === c._id} isPinned onTogglePin={togglePin} onInvite={setInviteConv} />
                  ))}
                  <p className="px-2 pb-1 pt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">All channels</p>
                </>
              )}
              {unpinned.map((c) => (
                <ChannelRow key={c._id} c={c} s={s} isCurrent={cur?.conversationId === c._id} isPinned={false} onTogglePin={togglePin} onInvite={setInviteConv} />
              ))}
            </>
          )}
        </div>

        {/* Auto-listen preference */}
        <div className="border-t border-border/30 p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold">Auto-listen</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground/50">
                Automatically tune in when a YapLine opens in one of your channels — from any page.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={s.autoListen}
              onClick={() => yapline.setAutoListen(!s.autoListen)}
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                s.autoListen ? "bg-emerald-500" : "bg-muted"
              )}
            >
              <span className={cn(
                "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
                s.autoListen ? "left-4.5" : "left-0.5"
              )} />
            </button>
          </label>
          <div className="mt-3 border-t border-border/20 pt-3">
            <PttKeyRow />
          </div>
        </div>
      </aside>

      {/* ── Stage ── */}
      <main className="flex min-h-96 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl">
        {Object.values(s.monitors).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-2">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-cyan-400">
              <Headphones className="size-3.5" /> Monitoring {Object.keys(s.monitors).length}/{MAX_JOINED_CHANNELS - (cur ? 1 : 0)}
            </span>
            {Object.values(s.monitors).map((mon) => {
              const monLive = s.sessions[mon.conversationId];
              const monSpeaking = (monLive?.speakingIds.length ?? 0) > 0;
              return (
                <span
                  key={mon.conversationId}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                    monSpeaking ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-border/40 bg-background/40 text-foreground/80"
                  )}
                >
                  {monSpeaking ? <Mic className="size-3 animate-pulse" /> : <Headphones className="size-3 text-cyan-400" />}
                  {mon.conversationName || "Channel"}
                  <button
                    onClick={() => yapline.setMonitorDeafened(mon.conversationId, !mon.deafened)}
                    title={mon.deafened ? "Unmute" : "Mute"}
                    className="text-muted-foreground/60 hover:text-foreground"
                  >
                    {mon.deafened ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
                  </button>
                  <button
                    onClick={() => yapline.leaveMonitor(mon.conversationId)}
                    title="Stop monitoring"
                    className="text-muted-foreground/60 hover:text-rose-500"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        {!cur || !session ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-emerald-500/10">
              <RadioTower className="size-8 text-emerald-500/70" />
            </span>
            <h2 className="text-lg font-black tracking-tight">The line is yours</h2>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground/60">
              Pick a channel or teammate on the left to open a YapLine. Everyone in that
              conversation can tune in instantly — hold the mic to talk, release to listen.
              Share your screen mid-session for demos and troubleshooting.
            </p>
            {s.error && <p className="text-[11px] font-medium text-rose-500">{s.error}</p>}
          </div>
        ) : (
          <>
            {/* Session header */}
            <div className="flex items-center gap-3 border-b border-border/30 px-5 py-3.5">
              <span className={cn(
                "flex size-9 items-center justify-center rounded-xl",
                cur.transmitting ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-500"
              )}>
                <RadioTower className={cn("size-4.5", cur.transmitting && "animate-pulse")} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-black tracking-tight">
                  {cur.conversationName || "Direct YapLine"}
                </h2>
                <p className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest", q.tone)}>
                  <Signal className="size-3" /> {q.label}
                  <span className="text-muted-foreground/40">· {session.participants.length} on the line</span>
                </p>
              </div>
              <button
                onClick={() => yapline.leave()}
                className="flex items-center gap-1.5 rounded-xl border border-border/40 px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground/70 transition-colors hover:border-rose-500/30 hover:text-rose-500"
              >
                <LogOut className="size-3.5" /> Leave
              </button>
            </div>

            {/* Screen / participant stage */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {remoteSharer && (
                <div className="relative mb-4 h-72 sm:h-96">
                  <StageScreen userId={remoteSharer.userId} version={cur.screenVersion} />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white/90">
                    <MonitorUp className="size-3 text-cyan-400" /> {remoteSharer.fullName} is sharing
                  </div>
                </div>
              )}
              {cur.screenSharing && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/6 px-4 py-3">
                  <MonitorUp className="size-4 text-cyan-400" />
                  <p className="flex-1 text-xs font-medium text-foreground/80">
                    You're sharing your screen with everyone on this line.
                  </p>
                  <button
                    onClick={() => yapline.stopScreenShare()}
                    className="text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* auto-fill instead of fixed breakpoint column counts — a hard "cols-4" cap
                  stops adding columns past lg regardless of how wide the stage actually gets
                  on larger monitors, leaving the grid visibly short of the available width.
                  This keeps adding 150px-min columns for as long as the container has room. */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                {session.participants.map((p) => (
                  <div
                    key={p.userId}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border bg-background/40 p-4 transition-all",
                      p.speaking
                        ? "border-emerald-400/60 shadow-md shadow-emerald-500/20"
                        : "border-zinc-300/80 shadow-sm dark:border-border/30 dark:shadow-none"
                    )}
                  >
                    <div className="relative">
                      <Avatar className={cn(
                        "size-14 ring-2 transition-all",
                        p.speaking ? "ring-emerald-400" : "ring-border/40"
                      )}>
                        <AvatarImage src={p.avatar || undefined} />
                        <AvatarFallback className="bg-emerald-600 text-sm font-bold text-white">
                          {ini(p.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      {p.speaking && (
                        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                          <Radio className="size-3" />
                        </span>
                      )}
                      {p.sharingScreen && (
                        <span className="absolute -bottom-1 -left-1 flex size-5 items-center justify-center rounded-full bg-cyan-500 text-white shadow">
                          <MonitorUp className="size-3" />
                        </span>
                      )}
                    </div>
                    <p className="max-w-full truncate text-sm font-bold">
                      {p.userId === s.myUserId ? "You" : p.fullName}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {p.speaking ? "Speaking" : p.listenOnly ? "Listening" : "Standby"}
                    </p>
                  </div>
                ))}
                {(() => {
                  const liveConv = convs.find((c) => c._id === cur.conversationId);
                  if (!liveConv || liveConv.type !== "group") return null;
                  return (
                    <button
                      onClick={() => setInviteConv(liveConv)}
                      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/40 p-4 text-muted-foreground/60 transition-colors hover:border-emerald-500/40 hover:text-emerald-500"
                    >
                      <span className="flex size-14 items-center justify-center rounded-full border border-dashed border-current">
                        <UserPlus className="size-5" />
                      </span>
                      <p className="text-sm font-bold">Invite</p>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Control deck */}
            <div className="border-t border-border/30 p-4">
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <button
                  onClick={() => yapline.setDeafened(!cur.deafened)}
                  title={cur.deafened ? "Unmute incoming" : "Mute incoming"}
                  className={cn(
                    "rounded-2xl p-3.5 transition-colors",
                    cur.deafened
                      ? "bg-rose-500/15 text-rose-500"
                      : "border border-border/40 text-muted-foreground/70 hover:text-foreground"
                  )}
                >
                  {cur.deafened ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </button>

                <button
                  onPointerDown={(e) => { e.preventDefault(); void yapline.startTransmit(); }}
                  onPointerUp={() => yapline.stopTransmit()}
                  onPointerLeave={() => cur.transmitting && yapline.stopTransmit()}
                  onContextMenu={(e) => e.preventDefault()}
                  className={cn(
                    "flex flex-1 select-none items-center justify-center gap-2.5 rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.99]",
                    cur.transmitting
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
                      : "border border-emerald-500/30 bg-emerald-500/8 text-emerald-500 hover:bg-emerald-500/15"
                  )}
                >
                  <Mic className="size-5" />
                  {cur.transmitting ? "On Air — release to stop" : "Hold to Talk"}
                </button>

                <button
                  onClick={() => cur.screenSharing ? yapline.stopScreenShare() : void yapline.startScreenShare()}
                  title={cur.screenSharing ? "Stop sharing" : "Share screen"}
                  className={cn(
                    "rounded-2xl p-3.5 transition-colors",
                    cur.screenSharing
                      ? "bg-cyan-500/15 text-cyan-400"
                      : "border border-border/40 text-muted-foreground/70 hover:border-cyan-500/30 hover:text-cyan-400"
                  )}
                >
                  {cur.screenSharing ? <MonitorX className="size-5" /> : <MonitorUp className="size-5" />}
                </button>
              </div>
              <div className="mx-auto mt-3 flex max-w-xl items-center gap-3">
                <Volume2 className="size-3.5 shrink-0 text-muted-foreground/40" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(cur.volume * 100)}
                  onChange={(e) => yapline.setVolume(Number(e.target.value) / 100)}
                  className="h-1 flex-1 cursor-pointer accent-emerald-500"
                  aria-label="Incoming volume"
                />
                <span className="hidden text-[11px] font-medium text-muted-foreground/40 md:block">
                  Hold <kbd className="rounded border border-border/40 bg-muted/30 px-1">{s.pttKey}</kbd> to talk from any page
                </span>
              </div>
            </div>
          </>
        )}
      </main>

      {inviteConv && (
        <YapLineInviteModal
          conv={inviteConv}
          onClose={() => setInviteConv(null)}
          onInvited={(ids) => handleInvited(inviteConv._id, ids)}
        />
      )}
    </div>
  );
}