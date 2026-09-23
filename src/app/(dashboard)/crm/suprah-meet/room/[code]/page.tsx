"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Circle, Copy, Hand, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff,
  ScreenShareOff, Send, SmilePlus, SwitchCamera, Users, Video, VideoOff, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useSuprahMeet, type RosterEntry, type TileInfo } from "@/hooks/useSuprahMeet";
import { MeetingSummaryPanel } from "@/components/suprah-meet/MeetingSummaryPanel";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";

const REACTION_EMOJIS = ["👍", "🎉", "❤️", "😂", "👏", "🤔"];

export default function SuprahMeetRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(String(params.code || "")).toUpperCase();
  const meet = useSuprahMeet();

  const [panel, setPanel] = React.useState<"none" | "chat" | "people">("none");
  const [showReactions, setShowReactions] = React.useState(false);
  const [chatDraft, setChatDraft] = React.useState("");
  const [elapsed, setElapsed] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const joinedRef = React.useRef(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!joinedRef.current && code) { joinedRef.current = true; void meet.join(code); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  React.useEffect(() => {
    if (meet.phase !== "in") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [meet.phase]);

  React.useEffect(() => {
    if (panel === "chat") { meet.markChatRead(); chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }
  }, [panel, meet.chatMessages.length, meet]);

  // Surface non-fatal hook notices (e.g. recording failed on AWS).
  React.useEffect(() => {
    if (meet.notice) { setToast(meet.notice); meet.clearNotice(); }
  }, [meet.notice, meet]);

  React.useEffect(() => {
    if (!toast) return;
    // Longer for error-length messages, brief for confirmations.
    const t = setTimeout(() => setToast(null), toast.length > 40 ? 6000 : 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const contentTile = meet.tiles.find((t) => t.isContent);
  const cameraTiles = meet.tiles.filter((t) => !t.isContent);
  const tilesByAttendee = new Map(cameraTiles.map((t) => [t.attendeeId, t]));
  const people = Object.values(meet.roster);
  const raised = people.filter((p) => p.handRaised);

  const sendChat = () => { meet.sendChat(chatDraft); setChatDraft(""); };
  const copyCode = () => { void navigator.clipboard?.writeText(code).catch(() => {}); setToast("Meeting code copied"); };

  if (meet.phase === "error") {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-4 p-6 text-center">
        <SuprahMeetLogo className="size-12" />
        <p className="text-lg font-medium">Couldn&apos;t join this meeting</p>
        <p className="max-w-md text-sm text-muted-foreground">{meet.error}</p>
        <Button onClick={() => router.push("/crm/suprah-meet")}>Back to Suprah Meet</Button>
      </div>
    );
  }

  if (meet.phase === "ended") {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <div className="mb-1 flex items-center gap-2.5">
          <SuprahMeetLogo className="size-9" />
          <h1 className="text-xl font-semibold">Meeting ended</h1>
        </div>
        <p className="mb-1 text-sm text-muted-foreground">{meet.meeting?.title} · {code}</p>
        {meet.endedReason && <p className="mb-5 text-sm text-emerald-600 dark:text-emerald-400">{meet.endedReason}</p>}
        <MeetingSummaryPanel code={code} />
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/crm/suprah-meet")}>Back to Suprah Meet</Button>
          {meet.endedReason?.includes("another device") && (
            <Button onClick={() => location.reload()}>Rejoin here</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#071410] text-emerald-50">
      {/* Digital backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute left-1/3 top-0 size-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <audio ref={meet.bindAudio} autoPlay className="hidden" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center gap-2 border-b border-emerald-400/15 bg-[#0a1410]/80 px-3 py-2.5 backdrop-blur md:gap-3 md:px-4">
        <SuprahMeetLogo className="size-7 shrink-0 md:size-8" />
        <span className="truncate text-sm font-medium">{meet.meeting?.title ?? "Suprah Meet"}</span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> {fmt(elapsed)}
        </span>
        {meet.recording && (
          <span className="flex shrink-0 animate-pulse items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/15 px-2.5 py-0.5 text-xs text-rose-300">
            <Circle className="size-2 fill-current" /> REC
          </span>
        )}
        <div className="flex-1" />
        <button onClick={copyCode}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-dashed border-emerald-400/30 px-2.5 py-1 text-xs text-emerald-200/80 hover:border-emerald-400/60 hover:text-emerald-300">
          {code} <Copy className="size-3" />
        </button>
      </header>

      {/* Raised-hand queue */}
      {raised.length > 0 && (
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto border-b border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs md:px-4">
          <Hand className="size-3.5 shrink-0 text-amber-400" />
          {raised.map((p) => (
            <span key={p.attendeeId} className="shrink-0 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-amber-200">
              {p.name}{p.attendeeId === meet.selfAttendeeId ? " (you)" : ""}
            </span>
          ))}
          <span className="shrink-0 text-amber-200/60">raised a hand</span>
        </div>
      )}

      {/* Stage */}
      <div className="relative z-10 flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:gap-3 md:p-3">
          {contentTile ? (
            <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-2 md:grid-cols-[1fr_220px] md:grid-rows-1 md:gap-3">
              <TileVideo tile={contentTile} bind={meet.bindVideoTile} contain
                className="min-h-0 border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]" />
              <div className="flex gap-2 overflow-x-auto md:flex-col md:gap-3 md:overflow-y-auto">
                {people.map((p) => (
                  <PersonTile key={p.attendeeId} person={p} tile={tilesByAttendee.get(p.attendeeId)}
                    bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === p.attendeeId}
                    isSelf={p.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera}
                    className="h-24 w-40 shrink-0 md:h-auto md:w-full md:shrink" />
                ))}
              </div>
            </div>
          ) : (
            <div className={cn("grid min-h-0 flex-1 auto-rows-fr gap-2 md:gap-3",
              people.length <= 1 && "grid-cols-1",
              people.length === 2 && "grid-cols-1 sm:grid-cols-2",
              people.length > 2 && "grid-cols-2 lg:grid-cols-3")}>
              {people.map((p) => (
                <PersonTile key={p.attendeeId} person={p} tile={tilesByAttendee.get(p.attendeeId)}
                  bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === p.attendeeId}
                  isSelf={p.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera} />
              ))}
              {people.length === 0 && (
                <div className="grid place-items-center">
                  <div className="flex flex-col items-center gap-3 text-sm text-emerald-200/60">
                    <SuprahMeetLogo className="size-14 opacity-90" />
                    {meet.phase === "joining" ? "Connecting to the meeting…" : "Waiting for others…"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating reactions */}
          <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center">
            <div className="relative h-0 w-full max-w-lg">
              {meet.reactions.map((r, i) => (
                <span key={r.id}
                  className="absolute bottom-0 flex animate-[meet-float_3.4s_ease-out_forwards] flex-col items-center"
                  style={{ left: `${12 + ((i * 17) % 76)}%` }}>
                  <span className="text-3xl drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">{r.emoji}</span>
                  <span className="mt-0.5 rounded-full bg-[#0a1410]/90 px-2 py-0.5 text-[10px] text-emerald-200">{r.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Control dock */}
          <footer className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-emerald-400/15 bg-[#0a1410]/80 p-2 backdrop-blur md:gap-2">
            <Ctl on={meet.micOn} onClick={meet.toggleMic} label={meet.micOn ? "Mute" : "Unmute"}
              iconOn={<Mic className="size-5" />} iconOff={<MicOff className="size-5" />} />
            <Ctl on={meet.camOn} onClick={() => void meet.toggleCam()} label="Camera"
              iconOn={<Video className="size-5" />} iconOff={<VideoOff className="size-5" />} />
            {meet.camOn && meet.videoDeviceCount > 1 && (
              <Ctl on onClick={() => void meet.switchCamera()}
                label={meet.isBackCamera ? "Front cam" : "Back cam"}
                iconOn={<SwitchCamera className="size-5" />} iconOff={<SwitchCamera className="size-5" />} />
            )}
            <Ctl on={!meet.sharing} accent onClick={() => void meet.toggleShare()}
              label={meet.sharing ? "Stop share" : "Share"}
              iconOn={<MonitorUp className="size-5" />} iconOff={<ScreenShareOff className="size-5" />} />
            <Ctl on={!meet.handRaised} accent onClick={meet.toggleHand}
              label={meet.handRaised ? "Lower hand" : "Raise hand"}
              iconOn={<Hand className="size-5" />} iconOff={<Hand className="size-5" />} />

            <div className="relative">
              <Ctl on onClick={() => setShowReactions((v) => !v)} label="React"
                iconOn={<SmilePlus className="size-5" />} iconOff={<SmilePlus className="size-5" />} />
              {showReactions && (
                <div className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 gap-1 rounded-full border border-emerald-400/25 bg-[#142a21] p-1.5 shadow-xl shadow-emerald-500/10">
                  {REACTION_EMOJIS.map((e) => (
                    <button key={e} className="rounded-full p-1.5 text-xl transition-transform hover:scale-125"
                      onClick={() => { meet.sendReaction(e); setShowReactions(false); }}>{e}</button>
                  ))}
                </div>
              )}
            </div>

            <Ctl on={panel !== "chat"} accent onClick={() => setPanel(panel === "chat" ? "none" : "chat")}
              label="Chat" badge={panel !== "chat" && meet.chatUnread > 0 ? meet.chatUnread : undefined}
              iconOn={<MessageSquare className="size-5" />} iconOff={<MessageSquare className="size-5" />} />
            <Ctl on={panel !== "people"} accent onClick={() => setPanel(panel === "people" ? "none" : "people")}
              label="People" badge={people.length}
              iconOn={<Users className="size-5" />} iconOff={<Users className="size-5" />} />

            {meet.canControl && (
              <Ctl on={!meet.recording} rec
                onClick={() => void (meet.recording ? meet.stopRecording() : meet.startRecording())}
                label={meet.recording ? "Stop rec" : "Record"}
                iconOn={<Circle className="size-5" />} iconOff={<Circle className="size-5 fill-current" />} />
            )}

            <Button variant="destructive" className="ml-1 h-11 rounded-xl px-4 md:px-5" onClick={() => void meet.leave()}>
              <PhoneOff className="mr-1.5 size-4" /> Leave
            </Button>
            {meet.canControl && (
              <Button variant="outline"
                className="hidden h-11 rounded-xl border-rose-400/40 px-4 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 sm:inline-flex"
                onClick={() => void meet.endMeeting()}>End for all</Button>
            )}
          </footer>
        </main>

        {/* Side panel: full-screen sheet on phones, docked column on md+ */}
        {panel !== "none" && (
          <aside className="absolute inset-0 z-30 flex flex-col border-emerald-400/15 bg-[#0f1f19]/95 backdrop-blur md:static md:inset-auto md:w-80 md:border-l">
            <div className="flex border-b border-emerald-400/15 text-sm">
              {(["chat", "people"] as const).map((t) => (
                <button key={t} onClick={() => setPanel(t)}
                  className={cn("flex-1 py-3 capitalize md:py-2.5",
                    panel === t ? "border-b-2 border-emerald-400 font-semibold text-emerald-300" : "text-emerald-200/60")}>
                  {t === "people" ? `People (${people.length})` : "Chat"}
                </button>
              ))}
              <button onClick={() => setPanel("none")} className="grid w-12 place-items-center text-emerald-200/60 hover:text-emerald-200">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {panel === "chat" ? (
                <>
                  {meet.chatMessages.length === 0 && (
                    <p className="pt-8 text-center text-xs text-emerald-200/50">
                      Messages here are visible to everyone in the call.
                    </p>
                  )}
                  {meet.chatMessages.map((m) => (
                    <div key={m.id} className={cn("max-w-[85%] rounded-xl border px-3 py-2 text-sm",
                      m.isSelf
                        ? "ml-auto rounded-br-sm border-emerald-400/30 bg-emerald-400/10"
                        : "rounded-bl-sm border-emerald-400/15 bg-[#142a21]")}>
                      <p className="mb-0.5 text-[10px] text-emerald-200/60">
                        {m.isSelf ? "You" : m.name} · {new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                      {m.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              ) : (
                people.map((p) => (
                  <div key={p.attendeeId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-emerald-400/5">
                    <ProfileBubble name={p.name} avatar={p.avatar} />
                    <span className="min-w-0 flex-1 truncate">
                      {p.name}{p.attendeeId === meet.selfAttendeeId ? " (you)" : ""}
                    </span>
                    {p.handRaised && <Hand className="size-3.5 text-amber-400" />}
                    {p.muted ? <MicOff className="size-3.5 text-rose-400" /> : <Mic className="size-3.5 text-emerald-400" />}
                  </div>
                ))
              )}
            </div>

            {panel === "chat" && (
              <div className="flex gap-2 border-t border-emerald-400/15 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Message everyone"
                  className="min-w-0 flex-1 rounded-lg border border-emerald-400/15 bg-[#0a1410] px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/40 focus:border-emerald-400/40 focus:outline-none" />
                <Button size="icon" className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={sendChat} disabled={!chatDraft.trim()}>
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </aside>
        )}
      </div>

      {toast && (
        <div className="absolute bottom-24 left-1/2 z-40 w-max max-w-[90%] -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-[#142a21] px-4 py-2 text-center text-sm">
          {toast}
        </div>
      )}

      <style jsx global>{`
        @keyframes meet-float {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-240px) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

/** CRM profile photo with initials fallback. */
function ProfileBubble({ name, avatar, size = "sm" }: {
  name: string; avatar?: string | null; size?: "sm" | "lg";
}) {
  const [broken, setBroken] = React.useState(false);
  const cls = size === "lg"
    ? "size-20 text-xl ring-2 ring-emerald-400/25 shadow-[0_0_24px_rgba(52,211,153,0.2)]"
    : "size-8 text-xs ring-1 ring-emerald-400/20";
  const url = avatar ? resolveImageUrl(avatar) : "";
  return url && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} onError={() => setBroken(true)}
      className={cn("rounded-full object-cover", cls)} />
  ) : (
    <span className={cn("grid place-items-center rounded-full bg-emerald-400/10 font-semibold text-emerald-300", cls)}>
      {initials(name)}
    </span>
  );
}

function TileVideo({ tile, bind, className, contain }: {
  tile: TileInfo; bind: (tileId: number, el: HTMLVideoElement | null) => void;
  className?: string; contain?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-emerald-400/15 bg-[#0f1f19]", className)}>
      <video ref={(el) => bind(tile.tileId, el)} autoPlay playsInline
        className={cn("h-full w-full", contain ? "object-contain" : "object-cover")} />
    </div>
  );
}

function PersonTile({ person, tile, bind, speaking, isSelf, mirror, className }: {
  person: RosterEntry; tile?: TileInfo;
  bind: (tileId: number, el: HTMLVideoElement | null) => void;
  speaking: boolean; isSelf: boolean; mirror: boolean; className?: string;
}) {
  return (
    <div className={cn("relative min-h-24 overflow-hidden rounded-2xl border bg-[#0f1f19] transition-shadow duration-300 md:min-h-28",
      speaking
        ? "border-emerald-400 shadow-[0_0_0_1px_theme(colors.emerald.400),0_0_28px_rgba(52,211,153,0.4)]"
        : "border-emerald-400/15",
      className)}>
      {tile ? (
        <video ref={(el) => bind(tile.tileId, el)} autoPlay playsInline muted={isSelf}
          className={cn("absolute inset-0 h-full w-full object-cover", isSelf && mirror && "-scale-x-100")} />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <ProfileBubble name={person.name} avatar={person.avatar} size="lg" />
        </div>
      )}
      {person.handRaised && (
        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20"
          title="Hand raised">
          <Hand className="size-3.5 text-amber-300" />
        </span>
      )}
      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full border border-emerald-400/15 bg-[#071410]/85 px-2.5 py-1 text-xs backdrop-blur">
        {person.muted ? <MicOff className="size-3 shrink-0 text-rose-400" /> : <Mic className="size-3 shrink-0 text-emerald-400" />}
        <span className="truncate">{person.name}{isSelf ? " (you)" : ""}</span>
      </div>
    </div>
  );
}

function Ctl({ on, onClick, label, iconOn, iconOff, accent, rec, badge }: {
  on: boolean; onClick: () => void; label: string;
  iconOn: React.ReactNode; iconOff: React.ReactNode;
  accent?: boolean; rec?: boolean; badge?: number;
}) {
  return (
    <button onClick={onClick} title={label} aria-pressed={on}
      className={cn("relative grid h-11 w-12 place-items-center rounded-xl border transition-all hover:scale-105 md:w-13",
        on
          ? "border-emerald-400/15 bg-[#142a21] hover:bg-[#1a3529]"
          : rec
            ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
            : accent
              ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
              : "border-rose-400/40 bg-rose-500/15 text-rose-300")}>
      {on ? iconOn : iconOff}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-[#071410]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}