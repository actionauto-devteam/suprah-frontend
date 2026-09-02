"use client";

/**
 * Suprah YapLine — Dashboard widget.
 *
 * Sits directly below the Feeds panel on the Dashboard. Reads the same
 * singleton store as the dock, so "who is live / who is speaking" updates in
 * realtime with zero extra sockets; recent voice activity comes from
 * GET /api/crm/yapline/recent.
 *
 * Self-contained panel shell (matches the DashboardPanel look) so it can be
 * dropped into the dashboard grid without a cross-folder import. If you'd
 * rather wrap it in your shared <Panel>, the body composes cleanly.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { RadioTower, Mic, MicOff, MonitorUp, ArrowRight, Radio, Headphones, UserPlus, Megaphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useYapLine, yapline } from "@/lib/yapline-store";
import { useSupraSpaceMessenger } from "@/context/SupraSpaceMessengerContext";
import { YapLineInviteModal } from "@/components/yapline/YapLineInviteModal";
import { YapLineSummonMenu } from "@/components/yapline/YapLineSummonMenu";

const ini = (name?: string | null) =>
  (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function timeAgo(d: string | number | Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface RecentSession {
  _id: string;
  conversationId: string;
  conversationName?: string | null;
  startedBy?: { fullName?: string; avatar?: string } | null;
  startedAt: string;
  endedAt?: string | null;
  isActive: boolean;
  peakParticipants: number;
  activity: Array<{ userId: string; name: string; type: string; at: string }>;
}

const ACTIVITY_LABEL: Record<string, string> = {
  started: "opened the line",
  joined: "joined",
  left: "left",
  spoke: "spoke",
  screen_started: "shared their screen",
  screen_stopped: "stopped sharing",
  ended: "line closed",
};

export function YapLineWidget() {
  const router = useRouter();
  const s = useYapLine();
  const { conversations } = useSupraSpaceMessenger();
  const [recent, setRecent] = React.useState<RecentSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inviteConv, setInviteConv] = React.useState<{ _id: string; name?: string; members: Array<{ _id: string }> } | null>(null);

  const liveSessions = Object.values(s.sessions);
  const cur = s.current;
  const curSession = cur ? s.sessions[cur.conversationId] : null;

  // Talk on a channel you haven't joined yet: one tap joins the line AND
  // opens your mic, so you can start speaking immediately and keep speaking —
  // no button to hold down.
  const talkDown = React.useCallback(
    async (conversationId: string, conversationName?: string | null) => {
      if (s.current?.conversationId !== conversationId) {
        await yapline.join(conversationId, conversationName);
      }
      await yapline.setMicMuted(false);
    },
    [s.current?.conversationId]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      apiClient
        .get("/api/crm/yapline/recent", { params: { limit: 6 }, signal: controller.signal })
        .then((res) => setRecent(res.data?.data || []))
        .catch(() => { })
        .finally(() => setLoading(false));
    load();
    const id = setInterval(load, 60_000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return (
    <div className="yapline-scope relative rounded-3xl border border-border/40 bg-card/40 p-4 backdrop-blur-xl sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/40 to-transparent" />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/30 ring-1 ring-inset ring-white/20">
            <RadioTower className="size-4 text-white" />
            {liveSessions.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-rose-500 ring-2 ring-card" />
            )}
          </span>
          <div>
            <h3 className="text-sm font-black tracking-tight">
              Suprah <span className="text-emerald-500">YapLine</span>
            </h3>
            <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 sm:text-muted-foreground/50">
              {liveSessions.length > 0
                ? `${liveSessions.length} live ${liveSessions.length === 1 ? "channel" : "channels"}`
                : "All channels quiet"}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/crm/yapline")}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-emerald-500"
        >
          Open YapLine <ArrowRight className="size-3" />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* ── Live now ── */}
        <div className="space-y-2">
          <p className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 sm:text-muted-foreground/50">Live now</p>

          {/* My active session first */}
          {cur && curSession && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/6 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold">{cur.conversationName || "Direct YapLine"}</p>
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                  <Headphones className="size-3" /> Connected
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex -space-x-2 shrink-0">
                  {curSession.participants.slice(0, 5).map((p) => (
                    <Avatar
                      key={p.userId}
                      className={cn("size-6 ring-2 ring-card", p.speaking && "ring-emerald-400")}
                    >
                      <AvatarImage src={p.avatar || undefined} />
                      <AvatarFallback className="bg-emerald-600 text-[8px] font-bold text-white">
                        {ini(p.fullName)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <button
                    onClick={() => void yapline.toggleMic()}
                    className={cn(
                      "flex select-none items-center gap-1 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                      cur.micMuted
                        ? "border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                        : "bg-emerald-500 text-white"
                    )}
                  >
                    {cur.micMuted ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                    {cur.micMuted ? "Talk" : cur.transmitting ? "On Air" : "Live"}
                  </button>
                  {(() => {
                    const liveConv = conversations.find((c) => c._id === cur.conversationId);
                    return (
                      <YapLineSummonMenu
                        conversationId={cur.conversationId}
                        members={liveConv?.members || []}
                        activeParticipantIds={(s.sessions[cur.conversationId]?.participants || []).map((p) => p.userId)}
                        myUserId={s.myUserId}
                        trigger={
                          <button
                            title="Summon channel members"
                            className="rounded-lg border border-border/40 p-1.5 text-muted-foreground/60 hover:border-emerald-500/30 hover:text-emerald-500"
                          >
                            <Megaphone className="size-3" />
                          </button>
                        }
                      />
                    );
                  })()}
                  {(() => {
                    const liveConv = conversations.find((c) => c._id === cur.conversationId);
                    if (!liveConv || liveConv.type !== "group") return null;
                    return (
                      <button
                        onClick={() => setInviteConv(liveConv)}
                        title="Invite people"
                        className="rounded-lg border border-border/40 p-1.5 text-muted-foreground/60 hover:border-emerald-500/30 hover:text-emerald-500"
                      >
                        <UserPlus className="size-3" />
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => yapline.leave()}
                    className="rounded-lg border border-border/40 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hover:border-rose-500/30 hover:text-rose-500"
                  >
                    Leave
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Other live sessions */}
          {liveSessions
            .filter((live) => live.conversationId !== cur?.conversationId)
            .slice(0, 3)
            .map((live) => {
              const speaker = live.participants.find((p) => p.speaking);
              return (
                <div
                  key={live.conversationId}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/30 bg-background/40 p-3"
                >
                  <div className="flex -space-x-2 shrink-0">
                    {live.participants.slice(0, 3).map((p) => (
                      <Avatar
                        key={p.userId}
                        className={cn("size-7 ring-2 ring-card", p.speaking && "ring-emerald-400")}
                      >
                        <AvatarImage src={p.avatar || undefined} />
                        <AvatarFallback className="bg-emerald-600 text-[8px] font-bold text-white">
                          {ini(p.fullName)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{live.conversationName || "Direct YapLine"}</p>
                    <p className="flex items-center gap-1 truncate text-[11px] sm:text-[10px] font-medium text-muted-foreground/70 sm:text-muted-foreground/60">
                      {live.screenSharerId && <MonitorUp className="size-3 shrink-0 text-cyan-400" />}
                      {speaker
                        ? <><Radio className="size-3 shrink-0 animate-pulse text-emerald-500" /> {speaker.fullName.split(" ")[0]} speaking</>
                        : `${live.participants.length} on the line`}
                    </p>
                  </div>
                  <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto">
                    <button
                      onClick={() => yapline.join(live.conversationId, live.conversationName)}
                      title="Join and listen"
                      className="rounded-xl border border-border/40 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 transition-all hover:border-emerald-500/30 hover:text-emerald-500 active:scale-95"
                    >
                      Join
                    </button>
                    <button
                      onClick={() => void talkDown(live.conversationId, live.conversationName)}
                      title="Join this line with your mic open"
                      className="flex select-none items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 transition-all hover:bg-emerald-500/15 active:scale-95"
                    >
                      <Mic className="size-3" /> Talk
                    </button>
                  </div>
                </div>
              );
            })}

          {liveSessions.length === 0 && (
            <button
              onClick={() => router.push("/crm/yapline")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/40 bg-background/30 py-5 text-[11px] font-bold text-muted-foreground/50 transition-colors hover:border-emerald-500/30 hover:text-emerald-500"
            >
              <RadioTower className="size-3.5" /> Start a YapLine session
            </button>
          )}
        </div>

        {/* ── Recent activity ── */}
        <div className="space-y-2">
          <p className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 sm:text-muted-foreground/50">Recent activity</p>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-xl bg-muted/20" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-5 text-center text-xs text-muted-foreground/50">No YapLine activity yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recent.slice(0, 5).map((r) => {
                const last = r.activity?.[0];
                return (
                  <div
                    key={r._id}
                    className="flex items-center gap-2.5 rounded-xl border border-border/25 bg-background/30 px-3 py-2"
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        r.isActive ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/30"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold">
                        {r.conversationName || "Direct YapLine"}
                      </p>
                      <p className="truncate text-[11px] sm:text-[10px] text-muted-foreground/80 sm:text-muted-foreground/60">
                        {last
                          ? `${last.name.split(" ")[0]} ${ACTIVITY_LABEL[last.type] || last.type}`
                          : `Started by ${r.startedBy?.fullName?.split(" ")[0] || "someone"}`}
                        {" · "}
                        {timeAgo(last?.at || r.startedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] sm:text-[9px] font-bold text-muted-foreground/60 sm:text-muted-foreground/40">
                      peak {r.peakParticipants}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {inviteConv && (
        <YapLineInviteModal
          conv={inviteConv}
          onClose={() => setInviteConv(null)}
          onInvited={() => setInviteConv(null)}
        />
      )}
    </div>
  );
}

export default YapLineWidget;