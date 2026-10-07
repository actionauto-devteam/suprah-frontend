"use client";

/**
 * Suprah Meet — external GUEST room (public page, no Suprah account).
 *
 * Reached via the shareable link /meet/<code> (hosts copy it from the room's
 * Info panel). This page is in the dashboard layout's PUBLIC_PATHS bypass, so
 * it renders bare: it owns its own useSuprahMeet() instance and its own hidden
 * <audio> element (guests don't have the CRM's MeetSessionProvider).
 *
 * Flow: name/email form → guest pass (JWT in sessionStorage, refresh-safe) →
 * waiting room if the meeting is private / not started → compact meeting UI.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Hand, Hourglass, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff,
  ScreenShareOff, Send, SwitchCamera, Users, Video, VideoOff, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useSuprahMeet, type RosterEntry, type TileInfo } from "@/hooks/useSuprahMeet";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";

type Gate = "form" | "checking" | "waiting" | "notlive" | "denied" | "over" | "in";

export default function SuprahMeetGuestPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code || "")).toUpperCase();
  const meet = useSuprahMeet();

  const [gate, setGate] = React.useState<Gate>("form");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [title, setTitle] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [panel, setPanel] = React.useState<"none" | "chat" | "people">("none");
  const [chatDraft, setChatDraft] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const joinedRef = React.useRef(false);

  const tokenKey = `meet-guest-${code}`;

  // Ask (or re-ask) the backend for access; keeps polling while waiting or
  // while the meeting hasn't started. Refresh-safe: the guest pass is kept in
  // sessionStorage and re-sent, so the same waiting-room spot is reused.
  const request = React.useCallback(async (guestName: string, guestEmail: string) => {
    try {
      const stored = sessionStorage.getItem(tokenKey);
      const res = await apiClient.post(
        `/api/crm/meet/guest/${code}/request`,
        { name: guestName, email: guestEmail },
        stored ? { headers: { Authorization: `Bearer ${stored}` } } : undefined
      );
      const d = res.data?.data ?? {};
      if (d.guestToken) sessionStorage.setItem(tokenKey, d.guestToken);
      if (d.title) setTitle(d.title);
      if (d.ended) { setGate("over"); return; }
      if (d.denied) { setGate("denied"); return; }
      if (d.admitted && d.live) {
        if (!joinedRef.current) {
          joinedRef.current = true;
          setGate("in");
          void meet.join(code, { token: sessionStorage.getItem(tokenKey) || "" });
        }
        return;
      }
      // Admitted but not started yet, or still in the waiting room → keep polling.
      setGate(d.admitted ? "notlive" : "waiting");
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Could not reach the meeting. Check the link and try again.");
      setGate("form");
    }
  }, [code, meet, tokenKey]);

  React.useEffect(() => {
    if (gate !== "waiting" && gate !== "notlive") return;
    const t = setInterval(() => { void request(name, email); }, 3500);
    return () => clearInterval(t);
  }, [gate, request, name, email]);

  React.useEffect(() => {
    if (panel === "chat") { meet.markChatRead(); chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }
  }, [panel, meet.chatMessages.length, meet]);
  React.useEffect(() => {
    if (meet.notice) { setToast(meet.notice); meet.clearNotice(); }
  }, [meet.notice, meet]);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const submit = () => {
    const n = name.trim();
    if (n.length < 2) { setFormError("Please enter your name."); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFormError("That email doesn't look right — fix it or leave it empty.");
      return;
    }
    setFormError(null);
    setGate("checking");
    void request(n, email.trim());
  };

  const sendChat = () => { meet.sendChat(chatDraft); setChatDraft(""); };

  const people = Object.values(meet.roster);
  const contentTile = meet.tiles.find((t) => t.isContent);
  const cameraTiles = meet.tiles.filter((t) => !t.isContent);
  const tilesByAttendee = new Map(cameraTiles.map((t) => [t.attendeeId, t]));
  const gridCls = (n: number) =>
    n <= 1 ? "grid-cols-1" : n === 2 ? "grid-cols-1 sm:grid-cols-2"
    : n <= 4 ? "grid-cols-2" : n <= 9 ? "grid-cols-2 md:grid-cols-3"
    : "grid-cols-3 md:grid-cols-4";

  /* ── Pre-meeting screens ────────────────────────────────────────────── */
  if (gate === "form" || gate === "checking") {
    return (
      <Shell>
        <SuprahMeetLogo className="size-14" />
        <h1 className="text-xl font-semibold">Join the meeting</h1>
        <p className="max-w-sm text-sm text-emerald-200/60">
          You&apos;ve been invited to <span className="font-medium text-emerald-200">{title ?? code}</span> on
          Suprah Meet. No account needed — just tell us who you are.
        </p>
        <div className="w-full max-w-sm space-y-2.5 text-left">
          <div>
            <label className="mb-1 block text-xs text-emerald-200/60">Your name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Alex Carter"
              className="w-full rounded-xl border border-emerald-400/20 bg-[#0f1f19] px-3 py-2.5 text-sm text-emerald-50 placeholder:text-emerald-200/30 focus:border-emerald-400/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-emerald-200/60">
              Email <span className="text-emerald-200/40">(optional — for the recording & summary afterwards)</span>
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} type="email"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-emerald-400/20 bg-[#0f1f19] px-3 py-2.5 text-sm text-emerald-50 placeholder:text-emerald-200/30 focus:border-emerald-400/50 focus:outline-none" />
          </div>
          {formError && <p className="text-xs text-rose-400">{formError}</p>}
          <Button className="w-full bg-emerald-600 hover:bg-emerald-500" disabled={gate === "checking"}
            onClick={submit}>
            {gate === "checking" ? "Checking…" : "Ask to join"}
          </Button>
          <p className="text-center text-[11px] text-emerald-200/40">
            You&apos;ll join as a <span className="text-sky-300">guest</span> — the host can see you&apos;re external.
          </p>
        </div>
      </Shell>
    );
  }

  if (gate === "waiting" || gate === "notlive") {
    return (
      <Shell>
        <div className="grid size-16 place-items-center rounded-2xl bg-emerald-500/10">
          <Hourglass className="size-8 animate-pulse text-emerald-500" />
        </div>
        <p className="text-lg font-medium">
          {gate === "waiting" ? "Asking the host to let you in" : "Waiting for the host to start"}
        </p>
        <p className="max-w-md text-sm text-emerald-200/60">
          {gate === "waiting"
            ? "The host has been notified. You'll join automatically the moment they admit you — keep this page open."
            : "You're in! The meeting hasn't started yet; you'll join automatically the moment the host starts it."}
        </p>
        <p className="text-xs text-emerald-200/40">{title ?? code}</p>
      </Shell>
    );
  }

  if (gate === "denied") {
    return (
      <Shell>
        <SuprahMeetLogo className="size-12" />
        <p className="text-lg font-medium">The host didn&apos;t admit you</p>
        <p className="max-w-md text-sm text-emerald-200/60">
          Your request to join was declined. If you think this is a mistake, contact the person who invited you.
        </p>
      </Shell>
    );
  }

  if (gate === "over" || meet.phase === "ended") {
    return (
      <Shell>
        <SuprahMeetLogo className="size-12" />
        <p className="text-lg font-medium">This meeting has ended</p>
        {meet.endedReason && <p className="max-w-md text-sm text-emerald-200/60">{meet.endedReason}</p>}
        <p className="text-sm text-emerald-200/60">Thanks for joining{name ? `, ${name.split(" ")[0]}` : ""}. You can close this tab.</p>
      </Shell>
    );
  }

  if (meet.phase === "error") {
    return (
      <Shell>
        <SuprahMeetLogo className="size-12" />
        <p className="text-lg font-medium">Couldn&apos;t join this meeting</p>
        <p className="max-w-md text-sm text-emerald-200/60">{meet.error}</p>
        <Button onClick={() => { joinedRef.current = false; setGate("form"); }}>Try again</Button>
      </Shell>
    );
  }

  /* ── In-meeting (compact room) ──────────────────────────────────────── */
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#071410] text-emerald-50">
      {/* Remote audio — this page owns its own element (no provider here). */}
      <audio ref={meet.bindAudio} autoPlay style={{ display: "none" }} />

      <header className="flex items-center gap-2 border-b border-emerald-400/15 bg-[#0a1410]/80 px-3 py-2.5 backdrop-blur">
        <SuprahMeetLogo className="size-7 shrink-0" />
        <span className="truncate text-sm font-medium">{meet.meeting?.title ?? title ?? "Suprah Meet"}</span>
        <span className="shrink-0 rounded bg-sky-400/15 px-1.5 py-px text-[10px] font-medium text-sky-300">GUEST</span>
        <div className="flex-1" />
        <span className="shrink-0 text-xs text-emerald-200/50">{code}</span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:p-3">
        {contentTile ? (
          <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-2 md:grid-cols-[1fr_200px] md:grid-rows-1">
            <GuestVideo tile={contentTile} bind={meet.bindVideoTile} contain />
            <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto">
              {people.map((p) => (
                <GuestTile key={p.attendeeId} person={p} tile={tilesByAttendee.get(p.attendeeId)}
                  bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === p.attendeeId}
                  isSelf={p.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera}
                  className="h-24 w-40 shrink-0 md:h-auto md:w-full md:shrink" />
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("grid min-h-0 flex-1 auto-rows-fr gap-2 overflow-y-auto", gridCls(people.length))}>
            {people.map((p) => (
              <GuestTile key={p.attendeeId} person={p} tile={tilesByAttendee.get(p.attendeeId)}
                bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === p.attendeeId}
                isSelf={p.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera} />
            ))}
            {people.length === 0 && (
              <div className="grid place-items-center text-sm text-emerald-200/60">
                {meet.phase === "joining" ? "Connecting…" : "Waiting for others…"}
              </div>
            )}
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-emerald-400/15 bg-[#0a1410]/80 p-2 backdrop-blur">
          <GuestCtl on={meet.micOn} onClick={() => void meet.toggleMic()}
            label={meet.micOn ? "Mute" : "Unmute"}
            iconOn={<Mic className="size-5" />} iconOff={<MicOff className="size-5" />} />
          <GuestCtl on={meet.camOn} onClick={() => void meet.toggleCam()} label="Camera"
            iconOn={<Video className="size-5" />} iconOff={<VideoOff className="size-5" />} />
          {meet.camOn && meet.videoDeviceCount > 1 && (
            <GuestCtl on onClick={() => void meet.switchCamera()} label="Flip camera"
              iconOn={<SwitchCamera className="size-5" />} iconOff={<SwitchCamera className="size-5" />} />
          )}
          <GuestCtl on={!meet.sharing} accent onClick={() => void meet.toggleShare()}
            label={meet.sharing ? "Stop share" : "Share screen"}
            iconOn={<MonitorUp className="size-5" />} iconOff={<ScreenShareOff className="size-5" />} />
          <GuestCtl on={!meet.handRaised} accent onClick={meet.toggleHand}
            label={meet.handRaised ? "Lower hand" : "Raise hand"}
            iconOn={<Hand className="size-5" />} iconOff={<Hand className="size-5" />} />
          <GuestCtl on={panel !== "chat"} accent onClick={() => setPanel(panel === "chat" ? "none" : "chat")}
            label="Chat" badge={panel !== "chat" && meet.chatUnread > 0 ? meet.chatUnread : undefined}
            iconOn={<MessageSquare className="size-5" />} iconOff={<MessageSquare className="size-5" />} />
          <GuestCtl on={panel !== "people"} accent onClick={() => setPanel(panel === "people" ? "none" : "people")}
            label="People" badge={people.length}
            iconOn={<Users className="size-5" />} iconOff={<Users className="size-5" />} />
          <Button variant="destructive" className="ml-1 h-11 rounded-xl px-4"
            onClick={() => void meet.leave()}>
            <PhoneOff className="mr-1.5 size-4" /> Leave
          </Button>
        </footer>
      </main>

      {/* Chat / People overlay */}
      {panel !== "none" && (
        <div className="absolute inset-0 z-30 flex flex-col bg-[#0f1f19]/95 backdrop-blur md:left-auto md:w-80 md:border-l md:border-emerald-400/15">
          <div className="flex items-center border-b border-emerald-400/15 text-sm">
            <span className="flex-1 px-4 py-3 font-semibold capitalize text-emerald-300">
              {panel === "people" ? `People (${people.length})` : "Chat"}
            </span>
            <button onClick={() => setPanel("none")} className="grid w-12 place-items-center self-stretch text-emerald-200/60 hover:text-emerald-200">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {panel === "chat" ? (
              <>
                {meet.chatMessages.length === 0 && (
                  <p className="pt-8 text-center text-xs text-emerald-200/50">Messages are visible to everyone in the call.</p>
                )}
                {meet.chatMessages.map((msg) => (
                  <div key={msg.id} className={cn("max-w-[85%] rounded-xl border px-3 py-2 text-sm",
                    msg.isSelf ? "ml-auto rounded-br-sm border-emerald-400/30 bg-emerald-400/10"
                               : "rounded-bl-sm border-emerald-400/15 bg-[#142a21]")}>
                    <p className="mb-0.5 text-[10px] text-emerald-200/60">{msg.isSelf ? "You" : msg.name}</p>
                    {msg.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            ) : (
              people.map((p) => (
                <div key={p.attendeeId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                  <GuestBubble name={p.name} avatar={p.avatar} />
                  <span className="min-w-0 flex-1 truncate">
                    {p.name}{p.attendeeId === meet.selfAttendeeId ? " (you)" : ""}
                  </span>
                  {p.isGuest && <span className="rounded bg-sky-400/15 px-1.5 py-px text-[9px] text-sky-300">Guest</span>}
                  {p.muted ? <MicOff className="size-3.5 text-rose-400" /> : <Mic className="size-3.5 text-emerald-400" />}
                </div>
              ))
            )}
          </div>
          {panel === "chat" && (
            <div className="flex gap-2 border-t border-emerald-400/15 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Message everyone"
                className="min-w-0 flex-1 rounded-lg border border-emerald-400/15 bg-[#0a1410] px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/40 focus:border-emerald-400/40 focus:outline-none" />
              <Button size="icon" className="bg-emerald-600 hover:bg-emerald-500" onClick={sendChat} disabled={!chatDraft.trim()}>
                <Send className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="absolute bottom-24 left-1/2 z-40 w-max max-w-[90%] -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-[#142a21] px-4 py-2 text-center text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Guest building blocks ──────────────────────────────────────────────── */
/** Centered full-page wrapper for the pre-meeting screens. Lives at module
 *  scope: defining it inside the page component gave it a NEW identity every
 *  render, so React remounted the whole form on each keystroke and the name
 *  input lost focus after every character. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#071410] p-6 text-center text-emerald-50">
      {children}
    </div>
  );
}

function guestInitials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function GuestBubble({ name, avatar, size = "sm" }: { name: string; avatar?: string | null; size?: "sm" | "lg" }) {
  const [broken, setBroken] = React.useState(false);
  const cls = size === "lg" ? "size-20 text-xl ring-2 ring-emerald-400/25" : "size-8 text-xs ring-1 ring-emerald-400/20";
  const url = avatar ? resolveImageUrl(avatar) : "";
  return url && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} onError={() => setBroken(true)} className={cn("rounded-full object-cover", cls)} />
  ) : (
    <span className={cn("grid place-items-center rounded-full bg-emerald-400/10 font-semibold text-emerald-300", cls)}>
      {guestInitials(name)}
    </span>
  );
}

function GuestVideo({ tile, bind, contain }: {
  tile: TileInfo; bind: (tileId: number, el: HTMLVideoElement | null) => void; contain?: boolean;
}) {
  return (
    <div className="min-h-0 overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#0f1f19]">
      <video ref={(el) => bind(tile.tileId, el)} autoPlay playsInline
        className={cn("h-full w-full", contain ? "object-contain" : "object-cover")} />
    </div>
  );
}

function GuestTile({ person, tile, bind, speaking, isSelf, mirror, className }: {
  person: RosterEntry; tile?: TileInfo;
  bind: (tileId: number, el: HTMLVideoElement | null) => void;
  speaking: boolean; isSelf: boolean; mirror: boolean; className?: string;
}) {
  return (
    <div className={cn("relative min-h-24 overflow-hidden rounded-2xl border bg-[#0f1f19]",
      speaking ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]" : "border-emerald-400/15", className)}>
      {tile ? (
        <video ref={(el) => bind(tile.tileId, el)} autoPlay playsInline muted={isSelf}
          className={cn("absolute inset-0 h-full w-full object-cover", isSelf && mirror && "-scale-x-100")} />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <GuestBubble name={person.name} avatar={person.avatar} size="lg" />
        </div>
      )}
      {person.handRaised && (
        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20">
          <Hand className="size-3.5 text-amber-300" />
        </span>
      )}
      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full border border-emerald-400/15 bg-[#071410]/85 px-2.5 py-1 text-xs backdrop-blur">
        {person.muted ? <MicOff className="size-3 shrink-0 text-rose-400" /> : <Mic className="size-3 shrink-0 text-emerald-400" />}
        <span className="truncate">{person.name}{isSelf ? " (you)" : ""}</span>
        {person.isGuest && <span className="rounded bg-sky-400/20 px-1 text-[9px] font-medium text-sky-200">GUEST</span>}
      </div>
    </div>
  );
}

function GuestCtl({ on, onClick, label, iconOn, iconOff, accent, badge }: {
  on: boolean; onClick: () => void; label: string;
  iconOn: React.ReactNode; iconOff: React.ReactNode; accent?: boolean; badge?: number;
}) {
  return (
    <button onClick={onClick} title={label} aria-pressed={on}
      className={cn("relative grid h-11 w-12 place-items-center rounded-xl border transition-all hover:scale-105",
        on ? "border-emerald-400/15 bg-[#142a21] hover:bg-[#1a3529]"
           : accent ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
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