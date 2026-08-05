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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  useYapLine,
  yapline,
  getRemoteScreenStream,
  type YapQuality,
} from "@/lib/yapline-store";

const ini = (name?: string | null) =>
  (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

interface Conv {
  _id: string;
  type: "direct" | "group";
  name?: string | null;
  emoji?: string | null;
  avatar?: string | null;
  members: Array<{ _id: string; fullName?: string; avatar?: string | null }>;
  // Recency fields — the conversations endpoint may expose any of these;
  // convRecency() tries them in order so "latest first" works regardless.
  lastMessageAt?: string | null;
  lastMessage?: { createdAt?: string } | null;
  updatedAt?: string;
  createdAt?: string;
}

/** Channels per page in the rail. */
const CHANNELS_PER_PAGE = 10;

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

/** Compact page-number window: 1 … around current … last. */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p);
  if (current < total - 2) out.push("…");
  out.push(total);
  return out;
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

export default function YapLinePage() {
  const s = useYapLine();
  const [convs, setConvs] = React.useState<Conv[]>(() => convsCache ?? []);
  const [loading, setLoading] = React.useState(() => convsCache === null);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

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

  // ── Pagination: 10 channels per page, latest first ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / CHANNELS_PER_PAGE));
  // New search results shrink the list — snap back to page 1.
  React.useEffect(() => {
    setPage(1);
  }, [query]);
  // Clamp if the list shrinks under the current page (e.g. a session ends).
  const safePage = Math.min(page, totalPages);
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const paged = React.useMemo(
    () => filtered.slice((safePage - 1) * CHANNELS_PER_PAGE, safePage * CHANNELS_PER_PAGE),
    [filtered, safePage]
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-350 flex-col gap-4 p-3 pb-24 sm:p-6 md:pb-8 lg:flex-row animate-in fade-in duration-500">
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
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-black text-emerald-500">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Live
                  </span>
                )}
              </h1>
              <p className="truncate text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
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
            paged.map((c) => {
              const live = s.sessions[c._id];
              const isCurrent = cur?.conversationId === c._id;
              const name = convDisplayName(c, s.myUserId);
              return (
                <button
                  key={c._id}
                  onClick={() => !isCurrent && yapline.join(c._id, name)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all",
                    isCurrent
                      ? "border-emerald-500/40 bg-emerald-500/8"
                      : "border-transparent hover:border-border/40 hover:bg-background/40"
                  )}
                >
                  <span className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm",
                    c.type === "group" ? "bg-cyan-500/10 text-cyan-400" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {c.emoji || (c.type === "group" ? <Hash className="size-4" /> : <Users className="size-4" />)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{name}</p>
                    <p className="truncate text-[10px] text-muted-foreground/50">
                      {live
                        ? `${live.participants.length} on the line`
                        : `${c.members?.length ?? 0} members`}
                    </p>
                  </div>
                  {live && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-rose-500">
                      <span className="size-1.5 animate-pulse rounded-full bg-rose-500" /> Live
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Pager: 10 channels per page, latest first ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border/30 px-3 py-2.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
              className="flex items-center gap-1 rounded-xl border border-border/40 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 transition-all hover:border-emerald-500/30 hover:text-emerald-500 active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Numbered pages on ≥sm; compact "page X / Y" on phones */}
            <div className="hidden items-center gap-1 sm:flex">
              {pageWindow(safePage, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-[10px] font-bold text-muted-foreground/40">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={p === safePage ? "page" : undefined}
                    className={cn(
                      "size-7 rounded-lg text-[10px] font-black tabular-nums transition-all active:scale-95",
                      p === safePage
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                        : "border border-border/40 text-muted-foreground/70 hover:border-emerald-500/30 hover:text-emerald-500"
                    )}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <span className="text-[10px] font-black tabular-nums text-muted-foreground/60 sm:hidden">
              {safePage} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-1 rounded-xl border border-border/40 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 transition-all hover:border-emerald-500/30 hover:text-emerald-500 active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* Auto-listen preference */}
        <div className="border-t border-border/30 p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold">Auto-listen</p>
              <p className="text-[10px] leading-relaxed text-muted-foreground/50">
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
        </div>
      </aside>

      {/* ── Stage ── */}
      <main className="flex min-h-96 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl">
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
                <p className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest", q.tone)}>
                  <Signal className="size-3" /> {q.label}
                  <span className="text-muted-foreground/40">· {session.participants.length} on the line</span>
                </p>
              </div>
              <button
                onClick={() => yapline.leave()}
                className="flex items-center gap-1.5 rounded-xl border border-border/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 transition-colors hover:border-rose-500/30 hover:text-rose-500"
              >
                <LogOut className="size-3.5" /> Leave
              </button>
            </div>

            {/* Screen / participant stage */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {remoteSharer && (
                <div className="relative mb-4 h-72 sm:h-96">
                  <StageScreen userId={remoteSharer.userId} version={cur.screenVersion} />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white/90">
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
                    className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
                  >
                    Stop
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                    <p className="max-w-full truncate text-xs font-bold">
                      {p.userId === s.myUserId ? "You" : p.fullName}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      {p.speaking ? "Speaking" : p.listenOnly ? "Listening" : "Standby"}
                    </p>
                  </div>
                ))}
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
                <span className="hidden text-[9px] font-medium text-muted-foreground/40 md:block">
                  Hold <kbd className="rounded border border-border/40 bg-muted/30 px-1">`</kbd> to talk from any page
                </span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}