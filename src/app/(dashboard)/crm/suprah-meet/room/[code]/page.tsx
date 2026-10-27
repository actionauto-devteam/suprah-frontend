"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Armchair, Check, ChevronDown, ChevronLeft, ChevronRight, Circle, Copy, Hand, Hourglass,
  Info, LayoutGrid, MessageSquare, Mic, MicOff, Minimize2, MonitorUp, MoreVertical, PhoneOff,
  Pin, PinOff, ScreenShareOff, Search, Send, Share2, SmilePlus, SwitchCamera, UserPlus, Users, Video,
  VideoOff, Wand2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  MEET_SCENES, type RosterEntry, type TileInfo,
} from "@/hooks/useSuprahMeet";
import { useMeetSession } from "@/components/suprah-meet/MeetSessionProvider";
import { MeetingSummaryPanel } from "@/components/suprah-meet/MeetingSummaryPanel";
import { RecordingDistributionPanel } from "@/components/suprah-meet/RecordingDistributionPanel";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";
import { ShareMeetingDialog } from "@/components/suprah-meet/ShareMeetingDialog";
import { orderMeetPeople, pickMeetStage, splitMeetPeople } from "@/lib/meet-layout";
import { MeetCaptionsButton, MeetCaptionsPanel } from '@/components/suprah-meet/MeetCaptions';
import { MeetPreJoin } from "@/components/suprah-meet/MeetPreJoin";
import { MeetChatPeek } from "@/components/suprah-meet/MeetChatPeek";

const REACTION_EMOJIS = ["👍", "🎉", "❤️", "😂", "👏", "🤔"];

/* Picker swatch styling (backgrounds + Together Mode) */
const swatchCls =
  "relative grid h-14 place-items-end overflow-hidden rounded-lg border border-emerald-400/20 p-1 text-left transition-all hover:scale-[1.03]";
const swatchOnCls = "border-emerald-400 shadow-[0_0_0_1px_theme(colors.emerald.400)]";
const swatchLabelCls =
  "rounded bg-[#071410]/80 px-1 py-px text-[9px] leading-tight text-emerald-100";

/* ── Adjust view (Meet-style) — saved for future meetings ────────────────── */
type ViewLayout = "auto" | "tiled" | "spotlight" | "sidebar";
interface ViewSettings { layout: ViewLayout; maxTiles: number; hideNoVideo: boolean; }
const VIEW_LS_KEY = "suprah-meet-view";
const TILE_STEPS = [6, 9, 12, 16, 25, 49];
const VIEW_OPTIONS: { value: ViewLayout; label: string; desc: string }[] = [
  { value: "auto",      label: "Auto (dynamic)", desc: "Picks the best layout for how many people are here" },
  { value: "tiled",     label: "Tiled",          desc: "Everyone in an equal grid" },
  { value: "spotlight", label: "Spotlight",      desc: "Only the pinned person or whoever is talking" },
  { value: "sidebar",   label: "Sidebar",        desc: "One big video with everyone else on the side" },
];
const defaultView = (): ViewSettings => ({ layout: "auto", maxTiles: 16, hideNoVideo: false });
const loadView = (): ViewSettings => {
  try {
    const raw = localStorage.getItem(VIEW_LS_KEY);
    if (!raw) return defaultView();
    const v = JSON.parse(raw);
    return {
      layout: (["auto", "tiled", "spotlight", "sidebar"] as ViewLayout[]).includes(v.layout) ? v.layout : "auto",
      maxTiles: TILE_STEPS.includes(v.maxTiles) ? v.maxTiles : 16,
      hideNoVideo: Boolean(v.hideNoVideo),
    };
  } catch { return defaultView(); }
};

interface MeetDirectoryPerson {
  crmUserId: string; fullName: string; avatar: string | null; department: string | null;
  isHost: boolean; isGuest: boolean; joinedBefore: boolean; leftAt: string | null;
}
interface MeetDirectory { hostCrmUserId: string; people: MeetDirectoryPerson[]; }

export default function SuprahMeetRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(String(params.code || "")).toUpperCase();
  // The meeting session lives in MeetSessionProvider (mounted in the CRM
  // layout), so navigating away minimizes the meeting instead of killing it.
  const { meet, activeCode, open } = useMeetSession();

  const [panel, setPanel] = React.useState<"none" | "chat" | "people" | "info">("none");
  const [showReactions, setShowReactions] = React.useState(false);
  const [showBackgrounds, setShowBackgrounds] = React.useState(false);
  const [showTogether, setShowTogether] = React.useState(false);
  const [chatDraft, setChatDraft] = React.useState("");
  const [pinnedId, setPinnedId] = React.useState<string | null>(null);
  // Adjust view — persisted so the choice carries into future meetings.
  const [view, setView] = React.useState<ViewSettings>(() =>
    typeof window === "undefined" ? defaultView() : loadView());
  const [showViewDialog, setShowViewDialog] = React.useState(false);
  const [gridPage, setGridPage] = React.useState(0);
  const [autoMax, setAutoMax] = React.useState(16);
  React.useEffect(() => {
    try { localStorage.setItem(VIEW_LS_KEY, JSON.stringify(view)); } catch { /* private mode */ }
  }, [view]);
  React.useEffect(() => {
    const calc = () => setAutoMax(window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 12 : 20);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [toast, setToast] = React.useState<string | null>(null);
  // Waiting room: "checking" until the backend says we may join.
  const [gate, setGate] = React.useState<"checking" | "scheduled" | "admitted" | "waiting" | "denied" | "over">("checking");
  const [readyToJoin, setReadyToJoin] = React.useState(false);
  const [meetingTitle, setMeetingTitle] = React.useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = React.useState<string | null>(null);
  const [hostCanStart, setHostCanStart] = React.useState(false);
  const [waitingList, setWaitingList] = React.useState<{ crmUserId: string; fullName: string; avatar: string | null }[]>([]);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Waiting-room gate: hosts, admins/managers, and tagged attendees go straight
  // in; anyone joining purely by code asks the host first and polls until
  // admitted. Falls back to a direct join if the endpoint is unavailable.
  React.useEffect(() => {
    if (!code) return;
    if (activeCode && activeCode !== code) return; // busy screen handles this
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const check = async () => {
      try {
        const res = await apiClient.post(`/api/crm/meet/meetings/${code}/request-join`);
        const d = res.data?.data ?? {};
        if (cancelled) return;
        if (d.title) setMeetingTitle(d.title);
        if (d.scheduledAt) setScheduledAt(d.scheduledAt);
        setHostCanStart(Boolean(d.canStart));
        if (d.notStarted) {
          setGate("scheduled");
          timer = setTimeout(() => { void check(); }, 3000);
          return;
        }
        if (d.admitted) { setGate("admitted"); return; }
        if (d.denied) { setGate("denied"); return; }
        if (d.ended) { setGate("over"); return; }
        setGate("waiting");
        timer = setTimeout(() => { void check(); }, 3000); // keep asking; refresh-safe
      } catch {
        // Older backend or transient error → let the normal join path decide
        // (its error screen reports the real problem).
        if (!cancelled) setGate("admitted");
      }
    };
    void check();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [code, open, activeCode]);

  // Host side: poll the waiting queue while in the meeting.
  const refreshWaiting = React.useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/crm/meet/meetings/${code}/waiting`);
      setWaitingList(res.data?.data?.waiting ?? []);
    } catch { /* non-controllers get 403 — fine */ }
  }, [code]);
  React.useEffect(() => {
    if (meet.phase !== "in" || !meet.canControl) return;
    void refreshWaiting();
    const t = setInterval(() => { void refreshWaiting(); }, 4000);
    return () => clearInterval(t);
  }, [meet.phase, meet.canControl, refreshWaiting]);

  const respondWaiting = async (userId: string, action: "admit" | "deny") => {
    try {
      await apiClient.post(`/api/crm/meet/meetings/${code}/waiting/${userId}`, { action });
      await refreshWaiting();
    } catch { setToast("Could not update the waiting room."); }
  };

  // Elapsed is derived from the server's startedAt (a UTC instant), so it is
  // identical on every device and survives minimize/refresh.
  React.useEffect(() => {
    if (meet.phase !== "in") return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [meet.phase]);
  const startedMs = meet.meeting?.startedAt ? new Date(meet.meeting.startedAt).getTime() : null;
  const elapsed = startedMs ? Math.max(0, Math.floor((nowMs - startedMs) / 1000)) : 0;

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

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mm = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return h > 0 ? `${h}:${mm}` : mm;
  };

  const contentTile = meet.tiles.find((t) => t.isContent);
  const cameraTiles = meet.tiles.filter((t) => !t.isContent);
  const tilesByAttendee = new Map(cameraTiles.map((t) => [t.attendeeId, t]));
  const people = orderMeetPeople({
    people: Object.values(meet.roster), selfId: meet.selfAttendeeId || null,
    activeSpeakerId: meet.activeSpeakerId || null,
    hasVideo: (person) => tilesByAttendee.has(person.attendeeId),
  });
  const latestChat = meet.chatMessages.at(-1) ?? null;
  const raised = people.filter((p) => p.handRaised);

  // Adjust view: optionally hide camera-off tiles (like Meet's toggle).
  const stagePeople = view.hideNoVideo
    // A current speaker still belongs on stage even when camera-off tiles are
    // hidden; otherwise the active-speaker focus appears to fail for audio-only
    // attendees.
    ? people.filter((p) =>
        tilesByAttendee.has(p.attendeeId) ||
        p.attendeeId === meet.activeSpeakerId ||
        p.attendeeId === meet.selfAttendeeId)
    : people;

  // A pin auto-clears if that person leaves.
  React.useEffect(() => {
    if (pinnedId && !people.some((p) => p.attendeeId === pinnedId)) setPinnedId(null);
  }, [people, pinnedId]);
  const togglePin = (attendeeId: string) =>
    setPinnedId((prev) => (prev === attendeeId ? null : attendeeId));

  const selfId = meet.selfAttendeeId;
  const [lastSpeakerId, setLastSpeakerId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (meet.activeSpeakerId && meet.activeSpeakerId !== selfId) setLastSpeakerId(meet.activeSpeakerId);
  }, [meet.activeSpeakerId, selfId]);
  const stage = pickMeetStage({
    people: stagePeople, selfId, pinnedId, activeSpeakerId: meet.activeSpeakerId,
    lastSpeakerId, layout: view.layout, hasContent: Boolean(contentTile),
  });
  const heroPerson = stage.hero;
  const selfPerson = stage.self;
  const stageMode = stage.mode;
  const spotPerson = stageMode === "sidebar" ? heroPerson : null;

  const pageSize = view.layout === "tiled" ? view.maxTiles : Math.min(autoMax, view.maxTiles);
  // Keep the local tile in the last slot of every grid page. It means a
  // person can always verify their camera/mic state while paging through a
  // large call instead of finding themselves only on the final page.
  const selfForPages = stagePeople.find((p) => p.attendeeId === selfId) ?? null;
  const othersForPages = stagePeople.filter((p) => p.attendeeId !== selfId);
  const othersPerPage = Math.max(1, pageSize - (selfForPages ? 1 : 0));
  const pageCount = Math.max(1, Math.ceil(othersForPages.length / othersPerPage));
  const page = Math.min(gridPage, pageCount - 1);
  const pagePeople = [
    ...othersForPages.slice(page * othersPerPage, page * othersPerPage + othersPerPage),
    ...(selfForPages ? [selfForPages] : []),
  ];
  React.useEffect(() => { setGridPage((p) => Math.min(p, pageCount - 1)); }, [pageCount]);

  /** Grid columns tuned to how many tiles are on stage. */
  const gridCls = (n: number) =>
    n <= 1 ? "grid-cols-1"
    : n === 2 ? "grid-cols-1 sm:grid-cols-2"
    : n <= 4 ? "grid-cols-2"
    : n <= 9 ? "grid-cols-2 md:grid-cols-3"
    : n <= 12 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    : "grid-cols-3 md:grid-cols-4 xl:grid-cols-5";

  const [directory, setDirectory] = React.useState<MeetDirectory | null>(null);
  const loadDirectory = React.useCallback(async () => {
    const res = await apiClient.get(`/api/crm/meet/meetings/${code}/people`).catch(() => null);
    if (res?.data?.data) setDirectory(res.data.data as MeetDirectory);
  }, [code]);
  React.useEffect(() => {
    if (panel !== "people" || meet.phase !== "in") return;
    void loadDirectory();
    const t = setInterval(() => { void loadDirectory(); }, 15_000);
    return () => clearInterval(t);
  }, [panel, meet.phase, loadDirectory, people.length]);

  const sendChat = () => { meet.sendChat(chatDraft); setChatDraft(""); };
  const copyCode = () => { void navigator.clipboard?.writeText(code).catch(() => {}); setToast("Meeting code copied"); };
  const [showShare, setShowShare] = React.useState(false);

  // Already in a different meeting → don't hijack the running session.
  if (activeCode && activeCode !== code) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <SuprahMeetLogo className="size-12" />
        <p className="text-lg font-medium">You&apos;re already in a meeting</p>
        <p className="max-w-md text-sm text-muted-foreground">
          You&apos;re currently in <span className="font-medium text-foreground">{activeCode}</span>.
          Return to it, or leave it to join {code} instead.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => router.push(`/crm/suprah-meet/room/${activeCode}`)}>Return to {activeCode}</Button>
          <Button variant="outline"
            onClick={() => { void (async () => { await meet.leave(); location.reload(); })(); }}>
            Leave it and join {code}
          </Button>
        </div>
      </div>
    );
  }

  if (gate === "checking" && meet.phase !== "in" && meet.phase !== "joining") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6 text-center">
        <SuprahMeetLogo className="size-12 animate-pulse" />
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  if (gate === "waiting") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-emerald-500/10">
          <Hourglass className="size-8 animate-pulse text-emerald-500" />
        </div>
        <p className="text-lg font-medium">Asking the host to let you in</p>
        <p className="max-w-md text-sm text-muted-foreground">
          You&apos;re in the waiting room for <span className="font-medium text-foreground">{code}</span>.
          You&apos;ll join automatically the moment the host admits you — keep this page open.
          Refreshing is fine; your spot is saved.
        </p>
        <Button variant="outline" onClick={() => router.push("/crm/suprah-meet")}>Cancel</Button>
      </div>
    );
  }

  if (gate === "scheduled") {
    const when = scheduledAt
      ? new Date(scheduledAt).toLocaleString("en-US", {
          timeZone: "America/Denver", weekday: "long", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit", timeZoneName: "short",
        })
      : "the scheduled time";
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-emerald-500/10">
          <Hourglass className="size-8 animate-pulse text-emerald-500" />
        </div>
        <p className="text-lg font-medium">This meeting has not opened yet</p>
        <p className="max-w-md text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{meetingTitle ?? code}</span> is scheduled for {when}.
          You&apos;ll be taken to the device check when the host starts it or the scheduled time arrives.
        </p>
        <p className="text-xs text-muted-foreground">Keep this page open — refreshing is safe.</p>
        <Button variant="outline" onClick={() => router.push("/crm/suprah-meet")}>Back to Suprah Meet</Button>
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <SuprahMeetLogo className="size-12" />
        <p className="text-lg font-medium">The host didn&apos;t admit you</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Your request to join {code} was declined. If you think this is a mistake,
          contact the host directly.
        </p>
        <Button onClick={() => router.push("/crm/suprah-meet")}>Back to Suprah Meet</Button>
      </div>
    );
  }

  if (gate === "over") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <SuprahMeetLogo className="size-12" />
        <p className="text-lg font-medium">This meeting has ended</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {code} finished before you were admitted.
        </p>
        <Button onClick={() => router.push("/crm/suprah-meet")}>Back to Suprah Meet</Button>
      </div>
    );
  }

  // Admission and joining are intentionally separate. This gives every
  // internal attendee the same private device check before Chime receives
  // their attendee connection; the mini-meet only appears after this step.
  if (gate === "admitted" && !readyToJoin && meet.phase === "idle") {
    return (
      <MeetPreJoin
        title={meet.meeting?.title ?? meetingTitle ?? "Suprah Meet"}
        code={code}
        onJoin={({ mic, camera }) => {
          setReadyToJoin(true);
          open(code, { startMic: mic, startCam: camera });
        }}
        onCancel={() => router.push("/crm/suprah-meet")}
        joinLabel={hostCanStart ? "Start meeting" : "Join meeting"}
      />
    );
  }

  if (meet.phase === "error") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
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
        {/* Host/admin: email the recording + AI summary to attendees. Renders
            nothing for non-controllers or when nothing was recorded. */}
        <RecordingDistributionPanel code={code} />
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push("/crm/suprah-meet")}>Back to Suprah Meet</Button>
          {meet.endedReason?.includes("another device") && (
            <Button onClick={() => location.reload()}>Rejoin here</Button>
          )}
        </div>
      </div>
    );
  }

  // Native iOS app / mobile: h-full fills the dashboard's <main> exactly
  // (the old 100dvh-4rem overshot once the bottom nav and safe areas were in
  // play); min-w-0 + max-w-full keep the call UI from blowing out the
  // viewport width on phones.
  return (
    <div className="relative flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-hidden bg-[#071410] text-emerald-50">
      {/* Digital backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute left-1/3 top-0 size-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center gap-2 border-b border-emerald-400/15 bg-[#0a1410]/80 px-3 py-2.5 backdrop-blur md:gap-3 md:px-4">
        <SuprahMeetLogo className="size-7 shrink-0 md:size-8" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{meet.meeting?.title ?? "Suprah Meet"}</span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> {fmt(elapsed)}
        </span>
        {meet.recording && (
          <span className="flex shrink-0 animate-pulse items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/15 px-2.5 py-0.5 text-xs text-rose-300">
            <Circle className="size-2 fill-current" /> REC
          </span>
        )}
        <button onClick={() => setShowViewDialog(true)} title="Adjust view"
          className="grid size-8 shrink-0 place-items-center rounded-md border border-emerald-400/20 text-emerald-200/70 hover:border-emerald-400/50 hover:text-emerald-200">
          <LayoutGrid className="size-4" />
        </button>
        <button onClick={() => router.push("/crm/suprah-meet")}
          title="Minimize — the meeting keeps running while you browse Suprah Space"
          className="grid size-8 shrink-0 place-items-center rounded-md border border-emerald-400/20 text-emerald-200/70 hover:border-emerald-400/50 hover:text-emerald-200">
          <Minimize2 className="size-4" />
        </button>
        <button onClick={() => setShowShare(true)} title="Share invite" aria-label="Share invite"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200 hover:border-emerald-400/60 hover:text-emerald-100 sm:px-2.5">
          <Share2 className="size-4 sm:size-3.5" /> <span className="hidden sm:inline">Share</span>
        </button>
        <button onClick={copyCode}
          className="hidden shrink-0 items-center gap-1.5 rounded-md border border-dashed border-emerald-400/30 px-2.5 py-1 text-xs xs:flex text-emerald-200/80 hover:border-emerald-400/60 hover:text-emerald-300">
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

      {/* Waiting room queue (host / admins only) */}
      {meet.canControl && waitingList.length > 0 && (
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto border-b border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-xs md:px-4">
          <Hourglass className="size-3.5 shrink-0 text-sky-300" />
          <span className="shrink-0 text-sky-200/80">Waiting to join:</span>
          {waitingList.map((w) => (
            <span key={w.crmUserId}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-sky-400/15 px-2 py-0.5 text-sky-100">
              {w.fullName}
              <button title="Admit" onClick={() => void respondWaiting(w.crmUserId, "admit")}
                className="grid size-5 place-items-center rounded-full bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/40">
                <Check className="size-3" />
              </button>
              <button title="Don't admit" onClick={() => void respondWaiting(w.crmUserId, "deny")}
                className="grid size-5 place-items-center rounded-full bg-rose-500/25 text-rose-200 hover:bg-rose-500/40">
                <X className="size-3" />
              </button>
            </span>
          ))}
          {waitingList.length > 1 && (
            <button
              onClick={() => { waitingList.forEach((w) => void respondWaiting(w.crmUserId, "admit")); }}
              className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-0.5 text-emerald-200 hover:bg-emerald-400/25">
              Admit all
            </button>
          )}
        </div>
      )}

      {/* Stage */}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1">
        {/* Together Mode: one shared scene behind the whole grid — every
            camera is background-replaced with the SAME image, so tiles blend
            into a single room. */}
        {meet.togetherScene && !contentTile && (
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-80"
            style={{ background: MEET_SCENES.find((sc) => sc.key === meet.togetherScene)?.css }} />
        )}
        {meet.togetherScene && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border border-emerald-400/30 bg-[#071410]/80 px-3 py-1 text-[10px] tracking-widest text-emerald-300 backdrop-blur">
            TOGETHER MODE · {MEET_SCENES.find((sc) => sc.key === meet.togetherScene)?.label.toUpperCase()}
          </div>
        )}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden p-2 md:gap-3 md:p-3">
          {contentTile ? (
            <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[1fr_auto] gap-2 md:grid-cols-[1fr_220px] md:grid-rows-1 md:gap-3">
              <TileVideo tile={contentTile} bind={meet.bindVideoTile} contain
                className="min-h-0 border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]" />
              <div className="flex gap-2 overflow-x-auto md:flex-col md:gap-3 md:overflow-y-auto">
                {stagePeople.map((p) => (
                  <PersonTile key={p.attendeeId} person={p} tile={tilesByAttendee.get(p.attendeeId)}
                    bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === p.attendeeId}
                    isSelf={p.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera}
                    className="h-24 w-40 shrink-0 md:h-auto md:w-full md:shrink" />
                ))}
              </div>
            </div>
          ) : stageMode === "spotlight" && heroPerson ? (
            <div className="relative min-h-0 flex-1">
              <PersonTile person={heroPerson} tile={tilesByAttendee.get(heroPerson.attendeeId)}
                bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === heroPerson.attendeeId}
                isSelf={heroPerson.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera}
                pinned={heroPerson.attendeeId === pinnedId}
                onPin={() => togglePin(heroPerson.attendeeId)} className="h-full" />
              {stagePeople.length > 1 && (
                <button onClick={() => setPanel("people")}
                  className="absolute right-3 top-3 z-10 rounded-full border border-emerald-400/25 bg-[#071410]/85 px-2.5 py-1 text-[10px] text-emerald-200/80 backdrop-blur hover:border-emerald-400/50 hover:text-emerald-100">
                  +{stagePeople.length - 1} more · See everyone
                </button>
              )}
            </div>
          ) : stageMode === "pip" && heroPerson && selfPerson ? (
            <div className="relative min-h-0 flex-1">
              <PersonTile person={heroPerson} tile={tilesByAttendee.get(heroPerson.attendeeId)}
                bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === heroPerson.attendeeId}
                isSelf={heroPerson.attendeeId === selfId} mirror={!meet.isBackCamera}
                pinned={heroPerson.attendeeId === pinnedId}
                onPin={() => togglePin(heroPerson.attendeeId)} className="h-full" />
              <PersonTile person={selfPerson} tile={tilesByAttendee.get(selfPerson.attendeeId)}
                bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === selfPerson.attendeeId}
                isSelf mirror={!meet.isBackCamera} compact
                onPin={() => togglePin(selfPerson.attendeeId)}
                className="absolute bottom-3 right-3 z-10 h-24 w-36 shadow-2xl shadow-black/50 sm:h-32 sm:w-52" />
            </div>
          ) : spotPerson ? (
            <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[1fr_auto] gap-2 md:grid-cols-[1fr_220px] md:grid-rows-1 md:gap-3">
              <PersonTile person={spotPerson} tile={tilesByAttendee.get(spotPerson.attendeeId)}
                bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === spotPerson.attendeeId}
                isSelf={spotPerson.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera}
                pinned={spotPerson.attendeeId === pinnedId}
                onPin={() => togglePin(spotPerson.attendeeId)} className="min-h-0" />
              <div className="flex gap-2 overflow-x-auto md:flex-col md:gap-3 md:overflow-y-auto">
                {stagePeople.filter((p) => p.attendeeId !== spotPerson.attendeeId).map((p) => (
                  <PersonTile key={p.attendeeId} person={p} tile={tilesByAttendee.get(p.attendeeId)}
                    bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === p.attendeeId}
                    isSelf={p.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera}
                    onPin={() => togglePin(p.attendeeId)}
                    className="h-24 w-40 shrink-0 md:h-auto md:w-full md:shrink" />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <div className={cn("grid min-h-0 min-w-0 w-full flex-1 auto-rows-fr gap-2 overflow-y-auto md:gap-3", gridCls(pagePeople.length))}>
                {pagePeople.map((p) => (
                  <PersonTile key={p.attendeeId} person={p} tile={tilesByAttendee.get(p.attendeeId)}
                    bind={meet.bindVideoTile} speaking={meet.activeSpeakerId === p.attendeeId}
                    isSelf={p.attendeeId === meet.selfAttendeeId} mirror={!meet.isBackCamera}
                    onPin={() => togglePin(p.attendeeId)} />
                ))}
                {pagePeople.length === 0 && (
                  <div className="grid place-items-center">
                    <div className="flex max-w-xs flex-col items-center gap-3 text-center text-sm text-emerald-200/60">
                      <SuprahMeetLogo className="size-14 opacity-90" />
                      {people.length > 0
                        ? "No cameras are on. Turn off “Hide tiles without video” in Adjust view to see everyone."
                        : meet.phase === "joining" ? "Connecting to the meeting…" : "Waiting for others…"}
                    </div>
                  </div>
                )}
              </div>
              {pageCount > 1 && (
                <div className="flex shrink-0 items-center justify-center gap-2 text-xs text-emerald-200/70">
                  <button disabled={page === 0} onClick={() => setGridPage(page - 1)}
                    className="grid size-7 place-items-center rounded-full border border-emerald-400/20 hover:border-emerald-400/50 disabled:opacity-30">
                    <ChevronLeft className="size-4" />
                  </button>
                  <span>
                    {othersForPages.length === 0
                      ? "You"
                      : `${page * othersPerPage + 1}–${Math.min(othersForPages.length, (page + 1) * othersPerPage)}${selfForPages ? " + you" : ""}`} of {stagePeople.length}
                  </span>
                  <button disabled={page === pageCount - 1} onClick={() => setGridPage(page + 1)}
                    className="grid size-7 place-items-center rounded-full border border-emerald-400/20 hover:border-emerald-400/50 disabled:opacity-30">
                    <ChevronRight className="size-4" />
                  </button>
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

          <MeetChatPeek message={latestChat} onOpen={() => { setPanel("chat"); meet.markChatRead(); }} />

          {/* Control dock */}
          <MeetCaptionsPanel meet={meet} />
          <footer className="flex shrink-0 flex-nowrap items-center justify-start gap-1.5 overflow-x-auto rounded-2xl border border-emerald-400/15 bg-[#0a1410]/80 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:flex-wrap md:justify-center md:overflow-visible md:gap-2">
            <Ctl on={meet.micOn} onClick={() => void meet.toggleMic()} label={meet.micOn ? "Mute" : "Unmute"}
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
              <Ctl on onClick={() => { setShowReactions((v) => !v); setShowBackgrounds(false); setShowTogether(false); }} label="React"
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

            {/* Virtual background picker (hidden on browsers without WebGL2/WASM support) */}
            {meet.backgroundsSupported && (
              <div className="relative">
                <Ctl on={meet.background === "none"} accent
                  onClick={() => { setShowBackgrounds((v) => !v); setShowTogether(false); setShowReactions(false); }}
                  label="Background"
                  iconOn={<Wand2 className="size-5" />} iconOff={<Wand2 className="size-5" />} />
                {showBackgrounds && (
                  <div className="absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-2xl border border-emerald-400/25 bg-[#142a21] p-2 shadow-xl shadow-emerald-500/10">
                    {meet.togetherScene && (
                      <p className="mb-1.5 px-0.5 text-[10px] leading-snug text-amber-300/90">
                        Together Mode is on — it overrides personal backgrounds until it&apos;s turned off.
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button onClick={() => { void meet.setBackground("none"); setShowBackgrounds(false); }}
                        className={cn(swatchCls, "bg-[#0a1410]", meet.background === "none" && swatchOnCls)}>
                        <span className={swatchLabelCls}>None</span>
                      </button>
                      <button onClick={() => { void meet.setBackground("blur"); setShowBackgrounds(false); }}
                        className={cn(swatchCls, "bg-emerald-200/10 backdrop-blur", meet.background === "blur" && swatchOnCls)}>
                        <span className="absolute inset-2 rounded-full bg-emerald-300/20 blur-md" />
                        <span className={swatchLabelCls}>Blur</span>
                      </button>
                      {MEET_SCENES.map((sc) => (
                        <button key={sc.key} style={{ background: sc.css }}
                          onClick={() => { void meet.setBackground(sc.key); setShowBackgrounds(false); }}
                          className={cn(swatchCls, meet.background === sc.key && swatchOnCls)}>
                          <span className={swatchLabelCls}>{sc.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Together Mode — host/admins put everyone in the same room */}
            {meet.canControl && meet.backgroundsSupported && (
              <div className="relative">
                <Ctl on={!meet.togetherScene} accent
                  onClick={() => { setShowTogether((v) => !v); setShowBackgrounds(false); setShowReactions(false); }}
                  label="Together Mode"
                  iconOn={<Armchair className="size-5" />} iconOff={<Armchair className="size-5" />} />
                {showTogether && (
                  <div className="absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-2xl border border-emerald-400/25 bg-[#142a21] p-2 shadow-xl shadow-emerald-500/10">
                    <p className="mb-1.5 px-0.5 text-[10px] leading-snug text-emerald-200/70">
                      Everyone&apos;s camera gets the same scene, so the grid reads as one shared room.
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button onClick={() => { meet.toggleTogether(null); setShowTogether(false); }}
                        className={cn(swatchCls, "bg-[#0a1410]", !meet.togetherScene && swatchOnCls)}>
                        <span className={swatchLabelCls}>Off</span>
                      </button>
                      {MEET_SCENES.map((sc) => (
                        <button key={sc.key} style={{ background: sc.css }}
                          onClick={() => { meet.toggleTogether(sc.key); setShowTogether(false); }}
                          className={cn(swatchCls, meet.togetherScene === sc.key && swatchOnCls)}>
                          <span className={swatchLabelCls}>{sc.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Ctl on={panel !== "chat"} accent onClick={() => setPanel(panel === "chat" ? "none" : "chat")}
              label="Chat" badge={panel !== "chat" && meet.chatUnread > 0 ? meet.chatUnread : undefined}
              iconOn={<MessageSquare className="size-5" />} iconOff={<MessageSquare className="size-5" />} />
            <MeetCaptionsButton meet={meet} />
            <Ctl on={panel !== "people"} accent onClick={() => setPanel(panel === "people" ? "none" : "people")}
              label="People" badge={people.length}
              iconOn={<Users className="size-5" />} iconOff={<Users className="size-5" />} />

            {meet.canControl && (
              <Ctl on={!meet.recording} rec
                onClick={() => void (meet.recording ? meet.stopRecording() : meet.startRecording())}
                label={meet.recording ? "Stop rec" : "Record"}
                iconOn={<Circle className="size-5" />} iconOff={<Circle className="size-5 fill-current" />} />
            )}

            <Button variant="destructive" className="ml-1 h-11 shrink-0 rounded-xl px-4 md:px-5" onClick={() => void meet.leave()}>
              <PhoneOff className="mr-1.5 size-4" /> End call
            </Button>
            {meet.canEndForAll && (
              <Button variant="outline"
                title="End the meeting for everyone"
                className="h-11 shrink-0 rounded-xl border-rose-400/40 px-3 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 sm:px-4"
                onClick={() => void meet.endMeeting()}>
                <span className="sm:hidden">End all</span>
                <span className="hidden sm:inline">End for all</span>
              </Button>
            )}
          </footer>
        </main>

        {/* Side panel: full-screen sheet on phones, docked column on md+ */}
        {panel !== "none" && (
          <aside className="absolute inset-0 z-30 flex flex-col border-emerald-400/15 bg-[#0f1f19]/95 backdrop-blur md:static md:inset-auto md:w-80 md:border-l">
            <div className="flex border-b border-emerald-400/15 text-sm">
              {(["chat", "people", "info"] as const).map((t) => (
                <button key={t} onClick={() => setPanel(t)}
                  className={cn("flex-1 py-3 capitalize md:py-2.5",
                    panel === t ? "border-b-2 border-emerald-400 font-semibold text-emerald-300" : "text-emerald-200/60")}>
                  {t === "people" ? `People (${people.length})` : t === "info" ? "Info" : "Chat"}
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
                        {m.isSelf ? "You" : m.name} · {new Date(m.at).toLocaleTimeString("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" })} MT
                      </p>
                      {m.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              ) : panel === "info" ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-200/50">Title</p>
                    <p>{meet.meeting?.title ?? "Suprah Meet"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-200/50">Meeting code</p>
                    <button onClick={copyCode} className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200">
                      {code} <Copy className="size-3" />
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-200/50">Guest link</p>
                    <button onClick={() => setShowShare(true)}
                      className="mt-1 flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-200 hover:border-emerald-400/60 hover:text-emerald-100">
                      <Share2 className="size-3.5" /> Share invite
                    </button>
                    <p className="mt-1 text-[10px] text-emerald-200/40">
                      Send it by Gmail, Messenger, text, and more. Guests join from any browser — no Suprah account needed.
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-200/50">Started</p>
                    <p>{startedMs
                      ? new Date(startedMs).toLocaleTimeString("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" }) + " MT"
                      : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-200/50">Duration</p>
                    <p>{fmt(elapsed)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-200/50">In the room</p>
                    <p>{people.length} participant{people.length === 1 ? "" : "s"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-200/50">Recording</p>
                    <p>{meet.recording ? "Recording to the cloud" : "Not recording"}</p>
                  </div>
                  <p className="flex items-start gap-1.5 border-t border-emerald-400/10 pt-3 text-xs text-emerald-200/50">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    All times are Mountain time. Use the minimize button in the top bar to
                    keep the meeting running while you work elsewhere in Suprah Space.
                  </p>
                </div>
              ) : (
                <PeoplePanel people={people} selfId={selfId} directory={directory}
                  pinnedId={pinnedId} onTogglePin={togglePin} onAddPeople={() => setShowShare(true)} />
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

      {/* Adjust view dialog (Meet-style) */}
      {showViewDialog && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowViewDialog(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-emerald-400/25 bg-[#0f1f19] p-4 shadow-2xl shadow-emerald-950/50"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-semibold">Adjust view</h3>
              <button onClick={() => setShowViewDialog(false)}
                className="rounded-md p-1 text-emerald-200/60 hover:bg-emerald-400/10 hover:text-emerald-200">
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-emerald-200/50">Selection is saved for future meetings</p>

            <div className="space-y-1.5">
              {VIEW_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setView({ ...view, layout: o.value })}
                  className={cn("flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                    view.layout === o.value
                      ? "border-emerald-400/60 bg-emerald-400/10"
                      : "border-emerald-400/15 hover:border-emerald-400/35")}>
                  <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border",
                    view.layout === o.value ? "border-emerald-400" : "border-emerald-200/40")}>
                    {view.layout === o.value && <span className="size-2 rounded-full bg-emerald-400" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{o.label}</span>
                    <span className="block text-[11px] leading-snug text-emerald-200/50">{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-emerald-200/80">Tiles per page</p>
              {view.layout === "tiled" || view.layout === "auto" ? (
                <div className="mt-1.5 flex items-center gap-3">
                  <input type="range" min={0} max={TILE_STEPS.length - 1} step={1}
                    value={TILE_STEPS.indexOf(view.maxTiles)}
                    onChange={(e) => setView({ ...view, maxTiles: TILE_STEPS[Number(e.target.value)] })}
                    className="w-full accent-emerald-500" />
                  <span className="w-8 shrink-0 text-right text-sm text-emerald-300">{view.maxTiles}</span>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-emerald-200/50">
                  Not used in this layout.
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-emerald-400/10 pt-3.5">
              <span className="text-sm">Hide tiles without video</span>
              <button role="switch" aria-checked={view.hideNoVideo}
                onClick={() => setView({ ...view, hideNoVideo: !view.hideNoVideo })}
                className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  view.hideNoVideo ? "bg-emerald-500" : "bg-emerald-100/20")}>
                <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all",
                  view.hideNoVideo ? "left-[18px]" : "left-0.5")} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <ShareMeetingDialog
          meetings={[{ code, title: meet.meeting?.title ?? "Suprah Meet", scheduledAt: null, status: "live" }]}
          onClose={() => setShowShare(false)} />
      )}

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

function PersonTile({ person, tile, bind, speaking, isSelf, mirror, className, pinned, onPin, compact }: {
  person: RosterEntry; tile?: TileInfo;
  bind: (tileId: number, el: HTMLVideoElement | null) => void;
  speaking: boolean; isSelf: boolean; mirror: boolean; className?: string;
  pinned?: boolean; onPin?: () => void; compact?: boolean;
}) {
  return (
    <div className={cn("group relative min-h-24 overflow-hidden rounded-2xl border bg-[#0f1f19] transition-shadow duration-300 md:min-h-28",
      speaking
        ? "border-emerald-400 shadow-[0_0_0_1px_theme(colors.emerald.400),0_0_28px_rgba(52,211,153,0.4)]"
        : "border-emerald-400/15",
      className)}>
      {tile ? (
        <video ref={(el) => bind(tile.tileId, el)} autoPlay playsInline muted={isSelf}
          className={cn("absolute inset-0 h-full w-full object-cover", isSelf && mirror && "-scale-x-100")} />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <ProfileBubble name={person.name} avatar={person.avatar} size={compact ? "sm" : "lg"} />
        </div>
      )}
      {onPin && (
        <button onClick={onPin} aria-label={pinned ? `Unpin ${person.name}` : `Pin ${person.name}`}
          title={pinned ? "Unpin" : "Pin to your screen (only you see this)"}
          className={cn("absolute left-2 top-2 z-10 flex h-7 items-center gap-1 rounded-full border backdrop-blur transition-opacity focus-visible:opacity-100",
            compact ? "w-7 justify-center" : "px-2.5 text-[11px] font-medium",
            pinned
              ? "border-emerald-400/60 bg-emerald-500/30 text-emerald-50 opacity-100"
              : "border-emerald-400/25 bg-[#071410]/80 text-emerald-100 opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0")}>
          {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          {!compact && <span>{pinned ? "Unpin" : "Pin"}</span>}
        </button>
      )}
      {person.handRaised && (
        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20"
          title="Hand raised">
          <Hand className="size-3.5 text-amber-300" />
        </span>
      )}
      <div className={cn("absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full border border-emerald-400/15 bg-[#071410]/85 backdrop-blur",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs")}>
        {pinned && <Pin className="size-3 shrink-0 text-emerald-300" aria-label="Pinned" />}
        {person.muted ? <MicOff className="size-3 shrink-0 text-rose-400" /> : <Mic className="size-3 shrink-0 text-emerald-400" />}
        <span className="truncate">{person.name}{isSelf ? " (you)" : ""}</span>
        {person.isGuest && (
          <span className="rounded bg-sky-400/20 px-1 text-[9px] font-medium text-sky-200">GUEST</span>
        )}
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
      className={cn("relative grid h-11 w-12 shrink-0 place-items-center rounded-xl border transition-all hover:scale-105 md:w-13",
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

function PeopleGroup({ label, title, count, open, onToggle, children }: {
  label: string; title: string; count: number; open: boolean; onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/50">{label}</p>
      <div className="overflow-hidden rounded-xl border border-emerald-400/15">
        <button onClick={onToggle} aria-expanded={open}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-emerald-400/5">
          <span className="flex-1 text-left">{title}</span>
          <span className="text-emerald-200/70">{count}</span>
          <ChevronDown className={cn("size-4 text-emerald-200/60 transition-transform", open && "rotate-180")} />
        </button>
        {open && <div className="space-y-0.5 border-t border-emerald-400/10 p-1">{children}</div>}
      </div>
    </section>
  );
}

function PeopleNote({ text }: { text: string }) {
  return <p className="px-2 py-3 text-center text-xs text-emerald-200/50">{text}</p>;
}

function PeoplePanel({ people, selfId, directory, pinnedId, onTogglePin, onAddPeople }: {
  people: RosterEntry[]; selfId: string | null; directory: MeetDirectory | null;
  pinnedId: string | null; onTogglePin: (attendeeId: string) => void; onAddPeople: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [openIn, setOpenIn] = React.useState(true);
  const [openOut, setOpenOut] = React.useState(true);

  const hostId = directory?.hostCrmUserId ?? null;
  const { inMeeting, notInMeeting, notInTotal, byCrmId } = splitMeetPeople({
    roster: people, directory: directory?.people ?? null, hostCrmUserId: hostId, selfId, query: search,
  });

  return (
    <div className="space-y-3">
      <button onClick={onAddPeople}
        className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25">
        <UserPlus className="size-4" /> Add people
      </button>

      <label className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-[#0a1410] px-3 focus-within:border-emerald-400/50">
        <Search className="size-4 shrink-0 text-emerald-200/50" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for people" aria-label="Search for people"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-emerald-50 placeholder:text-emerald-200/40 focus:outline-none" />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search"
            className="grid size-6 place-items-center rounded-full text-emerald-200/60 hover:text-emerald-100">
            <X className="size-3.5" />
          </button>
        )}
      </label>

      <PeopleGroup label="In the meeting" title="Participants" count={people.length}
        open={openIn} onToggle={() => setOpenIn((v) => !v)}>
        {inMeeting.length === 0 && <PeopleNote text="No one here matches your search." />}
        {inMeeting.map((p) => {
          const isSelf = p.attendeeId === selfId;
          const isPinned = p.attendeeId === pinnedId;
          const info = byCrmId.get(p.crmUserId);
          const sub = p.crmUserId === hostId ? "Meeting host" : p.isGuest ? "Guest" : info?.department ?? "";
          return (
            <div key={p.attendeeId} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-emerald-400/5">
              <ProfileBubble name={p.name} avatar={p.avatar ?? info?.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.name}{isSelf ? " (You)" : ""}</p>
                {sub && <p className="truncate text-[11px] text-emerald-200/50">{sub}</p>}
              </div>
              {p.handRaised && <Hand className="size-4 shrink-0 text-amber-400" aria-label="Hand raised" />}
              {isPinned && <Pin className="size-4 shrink-0 text-emerald-300" aria-label="Pinned" />}
              {p.muted
                ? <MicOff className="size-4 shrink-0 text-rose-400" aria-label="Muted" />
                : <Mic className="size-4 shrink-0 text-emerald-400" aria-label="Unmuted" />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label={`More options for ${p.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-emerald-200/70 hover:bg-emerald-400/10 hover:text-emerald-100">
                    <MoreVertical className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-emerald-400/25 bg-[#142a21] text-emerald-50">
                  <DropdownMenuItem onSelect={() => onTogglePin(p.attendeeId)}
                    className="gap-2 text-emerald-50 focus:bg-emerald-400/15 focus:text-emerald-50">
                    {isPinned ? <PinOff className="size-4 text-emerald-300" /> : <Pin className="size-4 text-emerald-300" />}
                    {isPinned ? "Unpin" : "Pin to your screen"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </PeopleGroup>

      <PeopleGroup label="Not in the meeting" title="Invited" count={notInTotal}
        open={openOut} onToggle={() => setOpenOut((v) => !v)}>
        {!directory && <PeopleNote text="Loading…" />}
        {directory && notInTotal === 0 && <PeopleNote text="Everyone who was invited is here." />}
        {directory && notInTotal > 0 && notInMeeting.length === 0 && <PeopleNote text="No one here matches your search." />}
        {notInMeeting.map((d) => {
          const sub = d.isHost ? "Meeting host · Not in the meeting" : d.isGuest ? "Guest · Not in the meeting" : "Not in the meeting";
          return (
            <div key={d.crmUserId} className="flex items-center gap-2.5 rounded-lg px-2 py-2 opacity-80 hover:bg-emerald-400/5">
              <ProfileBubble name={d.fullName} avatar={d.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{d.fullName}</p>
                <p className="truncate text-[11px] text-emerald-200/50">{sub}</p>
              </div>
            </div>
          );
        })}
      </PeopleGroup>
    </div>
  );
}