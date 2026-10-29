"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, BellRing, Building2, CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Copy, Globe, Lock, Pencil, Plus, Repeat, Search, Share2, Trash2,
  Users, Video, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { MeetingSummaryPanel } from "@/components/suprah-meet/MeetingSummaryPanel";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";
import { ShareMeetingDialog } from "@/components/suprah-meet/ShareMeetingDialog";
import type { ShareableMeeting } from "@/lib/meet-share";
import { useOptionalCrmNotificationContext } from "@/context/CrmNotificationContext";
import { useCrmWebPush } from "@/hooks/useCrmWebPush";
import { useMeetSession } from "@/components/suprah-meet/MeetSessionProvider";
import { forgetRecentMeet, readRecentMeet } from "@/lib/meet-recent";

interface MeetingRow {
  _id: string; code: string; title: string;
  status: "scheduled" | "live" | "ended";
  visibility?: "public" | "private";
  scheduledAt: string | null;
  seriesId: string | null;
  hostCrmUserId: string;
  inviteAll: boolean;
  invitees: string[];
  inviteDepartments: string[];
  participants: { crmUserId: string; fullName: string; avatar?: string | null; isGuest?: boolean; leftAt?: string | null }[];
  recording: { status: string };
  timer?: { elapsedMs: number; running: boolean; activeSince?: string | null; hostPresent?: boolean };
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}
interface CrmUserRow { _id: string; fullName: string; role: string; department?: string; }
interface DeptRow { key: string; label: string; }

interface MeetingMutationPayload {
  title: string;
  visibility: "public" | "private";
  inviteAll: boolean;
  invitees: string[];
  inviteDepartments: string[];
  scheduledAt?: string;
  occurrences?: string[];
}

type RepeatRule = "none" | "daily" | "weekdays" | "weekends" | "custom";
const MAX_SESSIONS = 30;
const PER_PAGE = 10; // Upcoming and Past both paginate at 10 per page
const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** 15-minute schedule slots, shared by the New and Edit modals. */
const TIME_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 15, 30, 45]) {
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    opts.push({ value, label: `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}` });
  }
  return opts;
})();

const fieldCls = "h-10 w-full rounded-lg border bg-background px-3 text-sm focus:border-emerald-500/60 focus:outline-none";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const apiErrorMessage = (error: unknown, fallback: string) => {
  if (!isRecord(error)) return fallback;
  const response = isRecord(error.response) ? error.response : null;
  const data = response && isRecord(response.data) ? response.data : null;
  if (data && typeof data.message === "string" && data.message) return data.message;
  return typeof error.message === "string" && error.message ? error.message : fallback;
};

const mdt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }) + " MDT";

/** Local "YYYY-MM-DD" without the UTC shift of toISOString(). */
const fmtDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Time-only Mountain label, e.g. "10:00 AM". */
const mdtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" });

/** Human countdown to a UTC instant — timezone-proof (pure epoch math). */
const countdown = (iso: string, nowMs: number) => {
  const d = new Date(iso).getTime() - nowMs;
  if (d <= 60_000) return "Starting now";
  const mins = Math.round(d / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60), rm = mins % 60;
  if (h < 24) return rm ? `in ${h}h ${rm}m` : `in ${h}h`;
  const days = Math.round(h / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
};

/** Active meeting time only; host-away and waiting segments never inflate it. */
const meetingMinutes = (meeting: MeetingRow, nowMs: number) => {
  const activeSinceMs = meeting.timer?.activeSince ? new Date(meeting.timer.activeSince).getTime() : null;
  const elapsedMs = Math.max(0, meeting.timer?.elapsedMs ?? 0)
    + (meeting.timer?.running && activeSinceMs ? Math.max(0, nowMs - activeSinceMs) : 0);
  return Math.max(1, Math.round(elapsedMs / 60_000));
};

// A scheduled meeting that nobody started within this window counts as missed.
const MISSED_AFTER_MS = 15 * 60_000;

/** "Today + offsetDays" as YYYY-MM-DD in America/Denver — the calendar runs on Mountain time. */
const denverDayStr = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Denver" });

const wallMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

const denverNowMinutes = (nowMs: number) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Denver", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const get = (type: string) => Number(parts.find((x) => x.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
};

function useDenverClock() {
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const today = new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  const minutes = denverNowMinutes(nowMs);
  const isPast = React.useCallback(
    (day: string, hhmm: string) => day < today || (day === today && wallMinutes(hhmm) <= minutes),
    [today, minutes]);
  return { today, isPast };
}

const PAST_TIME_MSG = "That time has already passed in Mountain time (MDT) — pick a later time.";

export default function SuprahMeetLobbyPage() {
  const router = useRouter();
  const { activeCode, meet: activeMeet } = useMeetSession();
  const deviceAlerts = useCrmWebPush();
  const crmNotifications = useOptionalCrmNotificationContext();
  const meetingNoticeKey = (crmNotifications?.notifications ?? [])
    .filter((notice) => notice.type === 'suprah_meet_invited' || notice.type === 'suprah_meet_reminder' || notice.type === 'suprah_meet_live')
    .map((notice) => notice._id).join(',');
  const [meetings, setMeetings] = React.useState<MeetingRow[]>([]);
  const [selfId, setSelfId] = React.useState("");
  const [canManageAll, setCanManageAll] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyTab, setHistoryTab] = React.useState<"scheduled" | "ended">("scheduled");
  const [showNew, setShowNew] = React.useState<false | "now" | "later">(false);
  const [confirmDelete, setConfirmDelete] = React.useState<MeetingRow | null>(null);
  const [editTarget, setEditTarget] = React.useState<MeetingRow | null>(null);
  // Lightweight toast (the lobby had none before the guest-link action).
  const [toast, setToast] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);
  const [shareTarget, setShareTarget] = React.useState<{ meetings: ShareableMeeting[]; heading?: string } | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [upcomingPage, setUpcomingPage] = React.useState(1);
  const [missedPage, setMissedPage] = React.useState(1);
  const [pastPage, setPastPage] = React.useState(1);
  const [recentMeet, setRecentMeet] = React.useState<ReturnType<typeof readRecentMeet>>(null);
  React.useEffect(() => { setRecentMeet(readRecentMeet()); }, []);
  React.useEffect(() => {
    if (!historyOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [historyOpen]);
  // The lobby's clock: drives countdowns and Upcoming→Missed transitions live.
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/crm/meet/meetings");
      const rows: MeetingRow[] = res.data?.data?.meetings ?? [];
      setMeetings(rows);
      setRecentMeet((recent) => {
        const saved = recent ?? readRecentMeet();
        if (saved && rows.some((meeting) => meeting.code === saved.code && meeting.status === "ended")) {
          forgetRecentMeet(saved.code);
          return null;
        }
        return saved;
      });
      setSelfId(res.data?.data?.selfCrmUserId ?? "");
      setCanManageAll(Boolean(res.data?.data?.canManageAll));
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not load meetings."));
    }
  }, []);
  React.useEffect(() => { void load(); }, [load, meetingNoticeKey]);
  // Background refresh keeps host-open, running, paused, and ended room state
  // current without a manual reload.
  React.useEffect(() => {
    const t = setInterval(() => { void load(); }, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    const onOnline = () => { void load(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [load]);

  const joinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError("Enter a meeting code to join."); return; }
    router.push(`/crm/suprah-meet/room/${encodeURIComponent(code)}`);
  };

  const doDelete = async (m: MeetingRow, wholeSeries: boolean) => {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/crm/meet/meetings/${m.code}${wholeSeries ? "?series=1" : ""}`);
      setConfirmDelete(null);
      await load();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not delete the meeting."));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (m: MeetingRow) => canManageAll || m.hostCrmUserId === selfId;

  const live = meetings.filter((m) => m.status === "live" && m.timer?.running);
  const openRooms = meetings.filter((m) => m.status === "live" && !m.timer?.running);
  // Scheduled meetings are classified by ABSOLUTE time (UTC epoch), never the
  // viewer's local timezone: still upcoming vs. missed (time passed unjoined).
  const scheduled = meetings.filter((m) => m.status === "scheduled");
  const upcoming = scheduled.filter(
    (m) => !m.scheduledAt || new Date(m.scheduledAt).getTime() >= nowMs - MISSED_AFTER_MS);
  const missed = scheduled.filter(
    (m) => m.scheduledAt && new Date(m.scheduledAt).getTime() < nowMs - MISSED_AFTER_MS);
  const past = meetings.filter((m) => m.status === "ended");
  const previousScheduled = [...missed, ...past.filter((m) => Boolean(m.scheduledAt))]
    .sort((a, b) => new Date(b.scheduledAt ?? b.createdAt).getTime() - new Date(a.scheduledAt ?? a.createdAt).getTime());
  const recentLive = recentMeet
    ? meetings.find((meeting) => meeting.code === recentMeet.code && meeting.status === "live") ?? null
    : null;
  const resumableCode = activeCode ?? recentLive?.code ?? null;
  const resumableTitle = activeMeet.meeting?.title ?? recentLive?.title ?? recentMeet?.title ?? resumableCode;

  // ── Pagination: Upcoming and Past both cap at 10 per page ─────────────
  const upcomingTotalPages = Math.max(1, Math.ceil(upcoming.length / PER_PAGE));
  const safeUpcomingPage = Math.min(upcomingPage, upcomingTotalPages);
  const upcomingVisible = upcoming.slice((safeUpcomingPage - 1) * PER_PAGE, safeUpcomingPage * PER_PAGE);

  const missedTotalPages = Math.max(1, Math.ceil(previousScheduled.length / PER_PAGE));
  const safeMissedPage = Math.min(missedPage, missedTotalPages);
  const missedVisible = previousScheduled.slice((safeMissedPage - 1) * PER_PAGE, safeMissedPage * PER_PAGE);

  const pastTotalPages = Math.max(1, Math.ceil(past.length / PER_PAGE));
  const safePastPage = Math.min(pastPage, pastTotalPages);
  const pastVisible = past.slice((safePastPage - 1) * PER_PAGE, safePastPage * PER_PAGE);

  React.useEffect(() => {
    // Clamp if the lists shrink (e.g. after a delete or reload).
    if (upcomingPage > upcomingTotalPages) setUpcomingPage(upcomingTotalPages);
    if (missedPage > missedTotalPages) setMissedPage(missedTotalPages);
    if (pastPage > pastTotalPages) setPastPage(pastTotalPages);
  }, [upcomingPage, upcomingTotalPages, missedPage, missedTotalPages, pastPage, pastTotalPages]);

  const goUpcomingPage = (page: number) =>
    setUpcomingPage(Math.min(Math.max(1, page), upcomingTotalPages));

  const goMissedPage = (page: number) =>
    setMissedPage(Math.min(Math.max(1, page), missedTotalPages));

  const goPastPage = (page: number) => {
    setPastPage(Math.min(Math.max(1, page), pastTotalPages));
    setExpanded(null); // collapse any open summary when switching pages
  };

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] w-full">
      {/* Digital ambient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.045)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="absolute -left-32 top-0 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-4 py-5 md:px-8 md:py-7">
        {/* Brand bar */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SuprahMeetLogo className="size-11 md:size-12" />
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-tight md:text-xl">
                Suprah <span className="text-emerald-500">Meet</span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">CRM Video Platform</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            {(live.length > 0 || openRooms.length > 0) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[.07] px-3 py-1.5 text-emerald-600 dark:text-emerald-400">
                <span className={cn("size-1.5 rounded-full bg-emerald-500", live.length > 0 && "animate-pulse")} />
                {live.length + openRooms.length} open {live.length + openRooms.length === 1 ? "room" : "rooms"}
              </span>
            )}
            <span>{upcoming.length} upcoming</span>
          </div>
        </header>

        <section className="mb-7 overflow-hidden rounded-2xl border border-emerald-500/25 bg-card/90 p-4 shadow-md shadow-emerald-950/10 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">Join a meeting</p>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Enter the code from your invite</h2>
              <p className="mt-1 text-sm text-muted-foreground">Paste the code you received. Meeting codes look like MEET-0000.</p>
              <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinByCode()}
                  placeholder="MEET-0000" aria-label="Meeting code" autoCapitalize="characters"
                  className="h-14 min-w-0 flex-1 border-emerald-500/25 bg-background/80 px-4 text-base font-medium uppercase tracking-wide shadow-inner focus-visible:ring-emerald-500/40 md:text-lg" />
                <Button onClick={joinByCode} size="lg"
                  className="h-14 shrink-0 gap-2 bg-emerald-600 px-8 text-base shadow-md shadow-emerald-600/20 hover:bg-emerald-500">
                  Join meeting <ArrowRight className="size-4" />
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>
            {resumableCode && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[.08] p-4 lg:w-[22rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                  {activeCode ? "Meeting still open" : "Last joined meeting"}
                </p>
                <p className="mt-1 truncate font-semibold">{resumableTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{resumableCode}</p>
                <Button className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => router.push(`/crm/suprah-meet/room/${resumableCode}`)}>
                  {activeCode ? "Return to meeting" : "Rejoin meeting"}
                </Button>
              </div>
            )}
          </div>
        </section>

        <div className="grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-8">
          <aside className="order-2 min-w-0 space-y-4 xl:sticky xl:top-5 xl:self-start">
            <section className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
              <h2 className="text-sm font-semibold">Meeting tools</h2>
              <div className="mt-3 grid gap-2">
                <Button className="justify-start gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => setShowNew("now")}>
                  <Video className="size-4" /> Start a new meeting
                </Button>
                <Button variant="outline" className="justify-start gap-2 border-emerald-500/30" onClick={() => setShowNew("later")}>
                  <CalendarClock className="size-4" /> Create a schedule
                </Button>
              </div>
            </section>
            <section className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500"><BellRing className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">Device meeting alerts</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {deviceAlerts.isLoading ? "Checking this device…" : deviceAlerts.isSubscribed
                      ? "On for this browser or installed PWA."
                      : deviceAlerts.isSupported
                        ? "Off on this device. Enable alerts for invites, reminders, and live meetings."
                        : "Not supported by this browser or installation."}
                  </p>
                  {deviceAlerts.isSupported && !deviceAlerts.isSubscribed && !deviceAlerts.isLoading && (
                    <Button size="sm" variant="outline" className="mt-3 w-full border-emerald-500/30"
                      onClick={() => void deviceAlerts.subscribe()}>Enable device alerts</Button>
                  )}
                </div>
              </div>
            </section>
            <button type="button" onClick={() => { setHistoryTab(previousScheduled.length > 0 ? "scheduled" : "ended"); setHistoryOpen(true); }}
              className="group flex w-full items-center justify-between rounded-2xl border bg-card/80 px-4 py-4 text-left shadow-sm transition-colors hover:border-emerald-500/35 hover:bg-card">
              <span>
                <span className="block text-sm font-medium text-foreground">Earlier meetings</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Schedules and meeting history</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {previousScheduled.length + past.filter((meeting) => !meeting.scheduledAt).length}
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </aside>

          {/* Meetings column */}
          <section className="order-1 min-w-0 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Your meetings</p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight">Today and coming up</h2>
              </div>
              <p className="text-xs text-muted-foreground">Live rooms stay at the top automatically.</p>
            </div>
            {live.length > 0 && (
              <Group title="Happening now" live>
                {live.map((m) => (
                  <MeetingCard key={m._id} m={m} emphasis
                    sub={m.startedAt
                      ? <>since {mdtTime(m.startedAt)} MT · {meetingMinutes(m, nowMs)} active min</>
                      : undefined}
                    action={<div className="flex items-center gap-1.5">
                      <button className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-500"
                        title="Share invite — send it by Gmail, Messenger, text, and more"
                        aria-label="Share invite"
                        onClick={() => setShareTarget({ meetings: [m] })}>
                        <Share2 className="size-4" />
                      </button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => router.push(`/crm/suprah-meet/room/${m.code}`)}>Join now</Button>
                    </div>} />
                ))}
              </Group>
            )}

            {openRooms.length > 0 && (
              <Group title="Open rooms">
                {openRooms.map((m) => (
                  <MeetingCard key={m._id} m={m}
                    sub={!m.timer?.hostPresent ? "host stepped away — waiting for their return" : m.startedAt ? "paused until another attendee is present" : "host is ready — waiting for another attendee"}
                    action={<Button size="sm" onClick={() => router.push(`/crm/suprah-meet/room/${m.code}`)}>Join room</Button>} />
                ))}
              </Group>
            )}

            <Group title={live.length > 0 || openRooms.length > 0 ? "Up next" : "Upcoming meetings"} prominent>
              {upcoming.length === 0 && <EmptyRow text="Your scheduled meetings will appear here." />}
              {upcomingVisible.map((m, index) => (
                <MeetingCard key={m._id} m={m} emphasis={index === 0}
                  sub={m.scheduledAt ? (
                    <>
                      {m.visibility === "private" && (
                        <Lock className="mr-1 inline size-3 -translate-y-px text-amber-500" aria-label="Private meeting" />
                      )}
                      {mdt(m.scheduledAt)} ·{" "}
                      <span className={cn(new Date(m.scheduledAt).getTime() - nowMs <= 60_000
                        ? "animate-pulse font-semibold" : undefined)}>
                        {countdown(m.scheduledAt, nowMs)}
                      </span>
                    </>
                  ) : undefined}
                  action={
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost"
                        className="size-8 text-muted-foreground hover:text-emerald-500"
                        title="Share invite — send it by Gmail, Messenger, text, and more"
                        aria-label="Share invite"
                        onClick={() => setShareTarget({ meetings: [m] })}>
                        <Share2 className="size-4" />
                      </Button>
                      {canDelete(m) && (
                        <>
                          <Button size="icon" variant="ghost"
                            className="size-8 text-muted-foreground hover:text-emerald-500"
                            title="Edit meeting" onClick={() => setEditTarget(m)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            title="Delete this session" onClick={() => setConfirmDelete(m)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline"
                        onClick={() => router.push(`/crm/suprah-meet/room/${m.code}`)}>{m.hostCrmUserId === selfId ? 'Start' : 'Join'}</Button>
                    </div>
                  } />
              ))}
              <Pager total={upcoming.length} page={safeUpcomingPage}
                totalPages={upcomingTotalPages} onPage={goUpcomingPage} />
            </Group>

          </section>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close earlier meetings"
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" onClick={() => setHistoryOpen(false)} />
          <aside role="dialog" aria-modal="true" aria-labelledby="meet-history-title"
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l bg-background shadow-2xl sm:max-w-2xl">
            <header className="border-b px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Suprah Meet</p>
                  <h2 id="meet-history-title" className="mt-1 text-xl font-semibold tracking-tight">Earlier meetings</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Review schedules that passed and summaries from ended calls.</p>
                </div>
                <Button type="button" size="icon" variant="ghost" className="shrink-0" aria-label="Close"
                  onClick={() => setHistoryOpen(false)}><X className="size-5" /></Button>
              </div>
              <div className="mt-4 grid grid-cols-2 rounded-xl border bg-muted/30 p-1">
                <button type="button" onClick={() => { setHistoryTab("scheduled"); setExpanded(null); }}
                  className={cn("rounded-lg px-3 py-2 text-sm transition-colors", historyTab === "scheduled" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  Earlier schedules <span className="ml-1 text-xs">{previousScheduled.length}</span>
                </button>
                <button type="button" onClick={() => { setHistoryTab("ended"); setExpanded(null); }}
                  className={cn("rounded-lg px-3 py-2 text-sm transition-colors", historyTab === "ended" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  All ended <span className="ml-1 text-xs">{past.length}</span>
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <div className="space-y-2">
                {historyTab === "scheduled" && (
                  <>
                    {previousScheduled.length === 0 && <EmptyRow text="Earlier scheduled meetings will appear here." />}
                    {missedVisible.map((m) => (
                      <EarlierMeetingRow key={`schedule-${m._id}`} m={m} selfId={selfId} canDelete={canDelete(m)}
                        expanded={expanded === m._id} onToggle={() => setExpanded(expanded === m._id ? null : m._id)}
                        onOpen={() => router.push(`/crm/suprah-meet/room/${m.code}`)}
                        onEdit={() => { setHistoryOpen(false); setEditTarget(m); }}
                        onDelete={() => { setHistoryOpen(false); setConfirmDelete(m); }} />
                    ))}
                    <Pager total={previousScheduled.length} page={safeMissedPage}
                      totalPages={missedTotalPages} onPage={goMissedPage} />
                  </>
                )}
                {historyTab === "ended" && (
                  <>
                    {past.length === 0 && <EmptyRow text="Ended meetings appear here with recordings and summaries." />}
                    {pastVisible.map((m) => (
                      <div key={m._id} className="overflow-hidden rounded-2xl border bg-card/70">
                        <MeetingCard m={m} plain
                          sub={m.endedAt ? <>ended {mdt(m.endedAt)}{m.startedAt && <> · {meetingMinutes(m, new Date(m.endedAt).getTime())} active min</>}</> : undefined}
                          action={<Button size="sm" variant="ghost" className="gap-1"
                            onClick={() => setExpanded(expanded === m._id ? null : m._id)}>
                            Summary <ChevronDown className={cn("size-4 transition-transform", expanded === m._id && "rotate-180")} />
                          </Button>} />
                        {expanded === m._id && <div className="border-t p-3"><MeetingSummaryPanel code={m.code} /></div>}
                      </div>
                    ))}
                    <Pager total={past.length} page={safePastPage} totalPages={pastTotalPages} onPage={goPastPage} />
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-max max-w-[90%] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-background px-4 py-2 text-center text-sm shadow-lg">
          {toast}
        </div>
      )}

      {showNew && (
        <NewMeetingModal
          initialMode={showNew === "later" ? "later" : "now"}
          onClose={() => setShowNew(false)}
          onCreated={(code) => router.push(`/crm/suprah-meet/room/${code}`)}
          onScheduled={(created) => {
            setShowNew(false);
            void load();
            if (created.length > 0) setShareTarget({ meetings: created, heading: "Meeting scheduled — send the invite" });
          }}
        />
      )}

      {shareTarget && (
        <ShareMeetingDialog meetings={shareTarget.meetings} heading={shareTarget.heading}
          onClose={() => setShareTarget(null)} />
      )}

      {editTarget && (
        <EditMeetingModal m={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); void load(); }} />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-emerald-500/25 bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-semibold">Delete this meeting?</h3>
            <p className="mb-1 text-sm text-muted-foreground">
              {confirmDelete.title} · {confirmDelete.code}
              {confirmDelete.scheduledAt && <> · {mdt(confirmDelete.scheduledAt)}</>}
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              {confirmDelete.seriesId
                ? "This session is part of a recurring series. You can remove just this session or every remaining session in the series."
                : "Tagged attendees will no longer see it, and its code will stop working."}
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="destructive" disabled={deleting}
                onClick={() => void doDelete(confirmDelete, false)}>
                {confirmDelete.seriesId ? "Delete this session only" : "Delete meeting"}
              </Button>
              {confirmDelete.seriesId && (
                <Button variant="outline" disabled={deleting}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => void doDelete(confirmDelete, true)}>
                  Delete all sessions in this series
                </Button>
              )}
              <Button variant="ghost" disabled={deleting} onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, live, prominent, children }: { title: string; live?: boolean; prominent?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(prominent && "rounded-3xl border border-emerald-500/20 bg-card/55 p-4 shadow-sm md:p-5")}>
      <h3 className={cn("mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        live && "text-emerald-500", prominent && "mb-3 text-sm text-foreground")}>
        {live && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}{title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">{text}</p>;
}

/** Shared pager for meeting lists — renders nothing until a list exceeds one page. */
function Pager({ total, page, totalPages, onPage }: {
  total: number; page: number; totalPages: number; onPage: (page: number) => void;
}) {
  if (total <= PER_PAGE) return null;
  return (
    <div className="flex items-center justify-between pt-1">
      <p className="text-xs text-muted-foreground">
        {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" className="size-8"
          disabled={page <= 1} onClick={() => onPage(page - 1)} title="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-16 text-center text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button size="icon" variant="outline" className="size-8"
          disabled={page >= totalPages} onClick={() => onPage(page + 1)} title="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function MeetingCard({ m, sub, action, plain, emphasis }: { m: MeetingRow; sub?: React.ReactNode; action: React.ReactNode; plain?: boolean; emphasis?: boolean }) {
  const copy = () => void navigator.clipboard?.writeText(m.code).catch(() => {});
  const activePeople = m.participants.filter((person) => !person.leftAt);
  // flex-wrap + the ml-auto action cluster: on narrow phones the buttons
  // drop to their own line instead of clipping off the right edge.
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 p-3", !plain && "rounded-2xl border bg-card/70 backdrop-blur", emphasis && "border-emerald-500/35 bg-emerald-500/[.06] p-4 shadow-md shadow-emerald-950/10")}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
        {m.status === "scheduled" ? <CalendarClock className="size-5" /> : <Video className="size-5" />}
      </div>
      <div className="min-w-0 flex-1 basis-40">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {m.title}
          {m.seriesId && (
            <span title="Part of a recurring series">
              <Repeat className="size-3 shrink-0 text-emerald-500" />
            </span>
          )}
        </p>
        <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-500">
          {m.code} <Copy className="size-3" />
          {sub && <span className="ml-1 text-emerald-600 dark:text-emerald-400">· {sub}</span>}
        </button>
        {m.status === "live" && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex -space-x-1.5" aria-label={`${activePeople.length} people currently in the meeting`}>
              {activePeople.slice(0, 4).map((person) => (
                <span key={person.crmUserId} title={person.fullName}
                  className="grid size-5 place-items-center rounded-full border border-card bg-emerald-600 text-[8px] font-semibold text-white">
                  {person.fullName.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
            <span>{activePeople.length} in the meeting{activePeople.length > 0 && activePeople.length <= 3 ? `: ${activePeople.map((person) => person.fullName).join(", ")}` : ""}</span>
          </div>
        )}
      </div>
      {m.status === "live" && <Badge className={cn("border-emerald-500/30 bg-emerald-500/15 text-emerald-500", m.timer?.running && "animate-pulse")}>
        {m.timer?.running ? "Live" : !m.timer?.hostPresent ? "Host away" : m.startedAt ? "Paused" : "Open"}
      </Badge>}
      <div className="ml-auto flex shrink-0 items-center">{action}</div>
    </div>
  );
}

function EarlierMeetingRow({ m, selfId, canDelete, expanded, onToggle, onOpen, onEdit, onDelete }: {
  m: MeetingRow;
  selfId: string;
  canDelete: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card/70">
      <MeetingCard m={m} plain
        sub={m.status === "ended"
          ? <>ended {m.endedAt ? mdt(m.endedAt) : m.scheduledAt ? mdt(m.scheduledAt) : ""}</>
          : <span className="text-amber-500 dark:text-amber-400">{m.scheduledAt ? mdt(m.scheduledAt) : ""} · not started</span>}
        action={m.status === "ended" ? (
          <Button size="sm" variant="ghost" className="gap-1" onClick={onToggle}>
            Summary <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            {canDelete && (
              <>
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-emerald-500"
                  title="Reschedule" onClick={onEdit}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive"
                  title="Delete this session" onClick={onDelete}><Trash2 className="size-4" /></Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onOpen}>{m.hostCrmUserId === selfId ? "Start" : "View room"}</Button>
          </div>
        )} />
      {m.status === "ended" && expanded && <div className="border-t p-3"><MeetingSummaryPanel code={m.code} /></div>}
    </div>
  );
}

/* ── Audience picker — shared by the New and Edit meeting modals ──────────── */
function AudiencePicker({ audience, setAudience, selectedUsers, setSelectedUsers, selectedDepts, setSelectedDepts }: {
  audience: "people" | "departments" | "all";
  setAudience: (a: "people" | "departments" | "all") => void;
  selectedUsers: Map<string, string>;
  setSelectedUsers: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  selectedDepts: Set<string>;
  setSelectedDepts: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<CrmUserRow[]>([]);
  const [departments, setDepartments] = React.useState<DeptRow[]>([]);

  // People search
  React.useEffect(() => {
    if (audience !== "people") return;
    const t = setTimeout(async () => {
      try {
        const res = await apiClient.get("/api/crm/users", { params: { search, limit: 20 } });
        setUsers(res.data?.data?.users ?? []);
      } catch { /* degrade gracefully */ }
    }, 250);
    return () => clearTimeout(t);
  }, [search, audience]);

  // Departments (loaded once)
  React.useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get("/api/crm/departments");
        const raw = res.data?.data?.departments ?? res.data?.data ?? [];
        setDepartments(
          (Array.isArray(raw) ? raw : []).map((value: unknown) => {
            const d = isRecord(value) ? value : {};
            return {
            // NOTE: sent value must match CrmUser.department. If your
            // department docs store it under a different field, adjust here.
            key: String(d.key ?? d.slug ?? d.name ?? d.label ?? ""),
            label: String(d.label ?? d.name ?? d.key ?? ""),
            };
          }).filter((d: DeptRow) => d.key)
        );
      } catch { /* picker degrades gracefully */ }
    })();
  }, []);

  const toggleUser = (u: CrmUserRow) =>
    setSelectedUsers((s) => {
      const next = new Map(s);
      if (next.has(u._id)) next.delete(u._id);
      else next.set(u._id, u.fullName);
      return next;
    });

  const toggleDept = (key: string) =>
    setSelectedDepts((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <>
        {/* Who */}
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Who should see this meeting and get alerts?</label>
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1 text-xs">
          {([["people", "People", <Users key="u" className="size-3.5" />],
             ["departments", "Departments", <Building2 key="b" className="size-3.5" />],
             ["all", "Everyone", <Globe key="g" className="size-3.5" />]] as const).map(([a, label, icon]) => (
            <button key={a} onClick={() => setAudience(a)}
              className={cn("flex items-center justify-center gap-1.5 rounded-md py-2 transition-colors",
                audience === a ? "bg-background font-medium text-emerald-600 shadow-sm dark:text-emerald-400" : "text-muted-foreground")}>
              {icon} {label}
            </button>
          ))}
        </div>

        {audience === "people" && (
          <>
            {selectedUsers.size > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[...selectedUsers.entries()].map(([id, name]) => (
                  <span key={id} className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400">
                    {name}
                    <button onClick={() => setSelectedUsers((s) => { const n = new Map(s); n.delete(id); return n; })}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative mb-1.5">
              <Search className="absolute left-2.5 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search teammates" value={search}
                onChange={(e) => setSearch(e.target.value)} className="h-10 pl-8" />
            </div>
            <div className="mb-3 max-h-36 overflow-y-auto rounded-lg border">
              {users.map((u) => (
                <button key={u._id} onClick={() => toggleUser(u)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted">
                  <span>{u.fullName} <span className="text-xs text-muted-foreground">· {u.department || u.role}</span></span>
                  {selectedUsers.has(u._id) && <Check className="size-4 text-emerald-500" />}
                </button>
              ))}
              {users.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">No teammates found.</p>}
            </div>
          </>
        )}

        {audience === "departments" && (
          <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border">
            {departments.map((d) => (
              <button key={d.key} onClick={() => toggleDept(d.key)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted">
                <span className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground" /> {d.label}
                </span>
                {selectedDepts.has(d.key) && <Check className="size-4 text-emerald-500" />}
              </button>
            ))}
            {departments.length === 0 && (
              <p className="p-3 text-center text-xs text-muted-foreground">No departments found.</p>
            )}
          </div>
        )}

        {audience === "all" && (
          <p className="mb-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            Every active CRM user in your organization will see this meeting and receive the reminder.
          </p>
        )}
    </>
  );
}

/* ── New meeting modal — instant/scheduled/recurring + audience tagging ───── */
function NewMeetingModal({ initialMode, onClose, onCreated, onScheduled }: {
  initialMode: "now" | "later";
  onClose: () => void; onCreated: (code: string) => void; onScheduled: (created: ShareableMeeting[]) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [mode, setMode] = React.useState<"now" | "later">(initialMode);
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("09:00");
  const [repeat, setRepeat] = React.useState<RepeatRule>("none");
  const [customDays, setCustomDays] = React.useState<Set<number>>(new Set());
  const [until, setUntil] = React.useState("");
  const [audience, setAudience] = React.useState<"people" | "departments" | "all">("people");
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");
  const [selectedUsers, setSelectedUsers] = React.useState<Map<string, string>>(new Map());
  const [selectedDepts, setSelectedDepts] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // "Today"/"Tomorrow" chips and the date-picker minimum follow Mountain time,
  // not the viewer's local day (PH is a day ahead of Utah in the evening).
  const { today: todayStr, isPast } = useDenverClock();
  const tomorrowStr = denverDayStr(1);

  // Repeating rules need an end date — default to two weeks out.
  React.useEffect(() => {
    if (repeat !== "none" && date && !until) {
      const d = new Date(`${date}T00:00:00`);
      d.setDate(d.getDate() + 13);
      setUntil(fmtDay(d));
    }
  }, [repeat, date, until]);

  /** Session dates (YYYY-MM-DD) implied by the repeat rule, capped at 30. */
  const sessionDates = React.useMemo(() => {
    if (mode !== "later" || !date) return [];
    if (repeat === "none") return isPast(date, time) ? [] : [date];
    const out: string[] = [];
    const cursor = new Date(`${date}T00:00:00`);
    const stop = new Date(`${(until || date)}T00:00:00`);
    while (cursor <= stop && out.length < MAX_SESSIONS) {
      const dow = cursor.getDay();
      const matches =
        repeat === "daily" ||
        (repeat === "weekdays" && dow >= 1 && dow <= 5) ||
        (repeat === "weekends" && (dow === 0 || dow === 6)) ||
        (repeat === "custom" && customDays.has(dow));
      if (matches && !isPast(fmtDay(cursor), time)) out.push(fmtDay(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [mode, date, repeat, until, customDays, time, isPast]);

  React.useEffect(() => {
    if (mode !== "later" || date !== todayStr || !isPast(date, time)) return;
    const next = TIME_OPTIONS.find((o) => !isPast(date, o.value));
    if (next) setTime(next.value);
  }, [mode, date, time, todayStr, isPast]);

  const timeLabel = TIME_OPTIONS.find((o) => o.value === time)?.label ?? time;
  const preview = React.useMemo(() => {
    if (mode !== "later" || !date) return null;
    if (sessionDates.length === 0) {
      return repeat === "none" ? PAST_TIME_MSG : "No upcoming days match this repeat rule — adjust the days or the end date.";
    }
    if (sessionDates.length === 1) {
      const d = new Date(`${sessionDates[0]}T00:00:00`);
      return `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${timeLabel} MDT`;
    }
    return `${sessionDates.length} sessions · ${timeLabel} MDT · ${sessionDates[0]} to ${sessionDates[sessionDates.length - 1]}`;
  }, [mode, date, repeat, sessionDates, timeLabel]);

  const toggleDow = (dow: number) =>
    setCustomDays((s) => {
      const next = new Set(s);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      return next;
    });

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const body: MeetingMutationPayload = {
        title,
        visibility,
        inviteAll: audience === "all",
        invitees: audience === "people" ? [...selectedUsers.keys()] : [],
        inviteDepartments: audience === "departments" ? [...selectedDepts] : [],
      };
      if (mode === "later") {
        if (!date) throw new Error("Pick a date.");
        if (audience === "people" && selectedUsers.size === 0) {
          throw new Error("Choose at least one person to notify, or select a department or All CRM users.");
        }
        if (audience === "departments" && selectedDepts.size === 0) {
          throw new Error("Choose at least one department to notify, or select people or All CRM users.");
        }
        if (sessionDates.length === 0) {
          throw new Error(repeat === "none" ? PAST_TIME_MSG : "No upcoming days match this repeat rule.");
        }
        if (sessionDates.length === 1) body.scheduledAt = `${sessionDates[0]}T${time}`;
        else body.occurrences = sessionDates.map((d) => `${d}T${time}`);
      }
      const res = await apiClient.post("/api/crm/meet/meetings", body);
      const data = res.data?.data;
      const code = data?.code;
      if (mode === "now") { onCreated(code); return; }
      const rows: ShareableMeeting[] = Array.isArray(data?.meetings) ? data.meetings : data ? [data] : [];
      const list = rows
        .filter((x) => x?.code)
        .map((x) => ({ code: x.code, title: x.title, scheduledAt: x.scheduledAt ?? null, status: x.status }));
      onScheduled(list);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not create the meeting."));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-3 backdrop-blur-sm md:p-6"
      onClick={onClose}>
      <div className="my-auto w-full max-w-lg rounded-2xl border border-emerald-500/25 bg-background p-5 shadow-2xl shadow-emerald-950/40"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SuprahMeetLogo className="size-8" />
            <h2 className="text-lg font-semibold">New meeting</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <Input placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 h-10" />

        {/* When */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {([["now", "Start now", <Video key="v" className="size-4" />],
             ["later", "Schedule", <CalendarClock key="c" className="size-4" />]] as const).map(([m, label, icon]) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm transition-colors",
                mode === m
                  ? "border-emerald-500 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:bg-muted")}>
              {icon} {label}
            </button>
          ))}
        </div>

        {mode === "later" && (
          <div className="mb-4 rounded-xl border bg-muted/30 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarClock className="size-3.5" /> {repeat === "none" ? "Date" : "First day"}
                </label>
                <input type="date" min={todayStr} value={date}
                  onChange={(e) => setDate(e.target.value)} className={fieldCls} />
                <div className="mt-1.5 flex gap-1.5">
                  {[["Today", todayStr], ["Tomorrow", tomorrowStr]].map(([label, value]) => (
                    <button key={label} onClick={() => setDate(value)}
                      className={cn("rounded-full border px-2.5 py-0.5 text-[11px]",
                        date === value ? "border-emerald-500 text-emerald-500" : "text-muted-foreground hover:bg-muted")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="size-3.5" /> Time
                  <span className="ml-auto rounded bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold text-emerald-500">MDT</span>
                </label>
                <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls}>
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} disabled={!!date && isPast(date, o.value)}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <MountainNow />

            {/* Repeat */}
            <div className="mt-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Repeat className="size-3.5" /> Repeat
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {([["none", "Once"], ["daily", "Every day"], ["weekdays", "Weekdays"],
                   ["weekends", "Weekends"], ["custom", "Custom"]] as const).map(([r, label]) => (
                  <button key={r} onClick={() => setRepeat(r)}
                    className={cn("rounded-lg border px-2 py-1.5 text-xs transition-colors",
                      repeat === r
                        ? "border-emerald-500 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:bg-muted")}>
                    {label}
                  </button>
                ))}
              </div>

              {repeat === "custom" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DOW_LABELS.map((label, dow) => (
                    <button key={dow} onClick={() => toggleDow(dow)}
                      className={cn("size-9 rounded-full border text-xs font-medium transition-colors",
                        customDays.has(dow)
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground hover:bg-muted")}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {repeat !== "none" && (
                <div className="mt-2.5">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Repeat until</label>
                  <input type="date" min={date || todayStr} value={until}
                    onChange={(e) => setUntil(e.target.value)} className={fieldCls} />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Up to {MAX_SESSIONS} sessions. Each session has its own code, recording, and AI summary.
                  </p>
                </div>
              )}
            </div>

            {preview && (
              <p className={cn("mt-3 border-t pt-2.5 text-center text-xs font-medium",
                sessionDates.length === 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                {preview}
              </p>
            )}
          </div>
        )}

        <AudiencePicker audience={audience} setAudience={setAudience}
          selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers}
          selectedDepts={selectedDepts} setSelectedDepts={setSelectedDepts} />

        {/* Privacy */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([["public", "Public", <Globe key="g" className="size-4" />, "Anyone in your org with the code joins right away."],
             ["private", "Private", <Lock key="l" className="size-4" />, "People you didn't tag wait for the host to admit them."]] as const)
            .map(([v, label, icon, desc]) => (
            <button key={v} onClick={() => setVisibility(v)}
              className={cn("flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                visibility === v
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-border hover:border-emerald-500/30")}>
              <span className={cn("flex items-center gap-2 text-sm font-medium",
                visibility === v && "text-emerald-600 dark:text-emerald-400")}>{icon}{label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>

        <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
          Tagged attendees receive an invitation, see every session in Upcoming, and get a reminder 10 minutes before each one starts.
          {visibility === "public"
            ? " Anyone in your org can also join with a session's code."
            : " Others can request to join with the code — the host admits them from the room."}{" "}
          You can delete sessions later from the Upcoming list.
        </p>

        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        <Button onClick={() => void create()} disabled={busy || (mode === "later" && sessionDates.length === 0)}
          className="h-11 w-full gap-2 bg-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-500">
          <Plus className="size-4" />
          {mode === "now" ? "Create and join"
            : sessionDates.length > 1 ? `Schedule ${sessionDates.length} sessions` : "Schedule meeting"}
        </Button>
      </div>
    </div>
  );
}

/* ── Edit meeting modal — reschedule, retitle, and retag an upcoming session ─ */
function EditMeetingModal({ m, onClose, onSaved }: {
  m: MeetingRow; onClose: () => void; onSaved: () => void;
}) {
  // The session's current wall time in Mountain time — what the pickers should show.
  const wall = React.useMemo(() => {
    if (!m.scheduledAt) return { date: denverDayStr(0), time: "09:00" };
    const d = new Date(m.scheduledAt);
    return {
      date: d.toLocaleDateString("en-CA", { timeZone: "America/Denver" }),
      time: d.toLocaleTimeString("en-GB", {
        timeZone: "America/Denver", hour: "2-digit", minute: "2-digit", hour12: false,
      }),
    };
  }, [m.scheduledAt]);

  const [title, setTitle] = React.useState(m.title);
  const [date, setDate] = React.useState(wall.date);
  const [time, setTime] = React.useState(wall.time);
  const [audience, setAudience] = React.useState<"people" | "departments" | "all">(
    m.inviteAll ? "all" : m.inviteDepartments.length > 0 ? "departments" : "people");
  const [selectedUsers, setSelectedUsers] = React.useState<Map<string, string>>(() => {
    // Seed names from participants (people who already joined a session); the
    // effect below fills in the rest from the user directory.
    const names = new Map(m.participants.map((p) => [p.crmUserId, p.fullName]));
    return new Map(m.invitees.map((id) => [id, names.get(id) ?? "Teammate"]));
  });
  const [selectedDepts, setSelectedDepts] = React.useState<Set<string>>(new Set(m.inviteDepartments));
  const [visibility, setVisibility] = React.useState<"public" | "private">(m.visibility ?? "public");
  const [applySeries, setApplySeries] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { today: todayStr, isPast } = useDenverClock();

  // Resolve real names for tagged people who haven't joined a session yet.
  React.useEffect(() => {
    if (m.invitees.length === 0) return;
    void (async () => {
      try {
        const res = await apiClient.get("/api/crm/users", { params: { limit: 200 } });
        const byId = new Map<string, string>(
          (res.data?.data?.users ?? []).map((u: CrmUserRow) => [u._id, u.fullName]));
        setSelectedUsers((prev) => {
          const next = new Map(prev);
          for (const id of next.keys()) {
            const name = byId.get(id);
            if (name) next.set(id, name);
          }
          return next;
        });
      } catch { /* chips fall back to "Teammate" */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeChanged = date !== wall.date || time !== wall.time;
  const pastPick = timeChanged && !!date && isPast(date, time);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      if (audience === "people" && selectedUsers.size === 0) {
        throw new Error("Choose at least one person to notify, or select a department or All CRM users.");
      }
      if (audience === "departments" && selectedDepts.size === 0) {
        throw new Error("Choose at least one department to notify, or select people or All CRM users.");
      }
      const body: MeetingMutationPayload = {
        title,
        visibility,
        inviteAll: audience === "all",
        invitees: audience === "people" ? [...selectedUsers.keys()] : [],
        inviteDepartments: audience === "departments" ? [...selectedDepts] : [],
      };
      if (timeChanged) {
        if (!date) throw new Error("Pick a date.");
        body.scheduledAt = `${date}T${time}`; // Mountain wall time — backend converts (DST-aware)
      }
      await apiClient.patch(`/api/crm/meet/meetings/${m.code}${applySeries ? "?series=1" : ""}`, body);
      onSaved();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not update the meeting."));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-3 backdrop-blur-sm md:p-6"
      onClick={onClose}>
      <div className="my-auto w-full max-w-lg rounded-2xl border border-emerald-500/25 bg-background p-5 shadow-2xl shadow-emerald-950/40"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SuprahMeetLogo className="size-8" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">Edit meeting</h2>
              <p className="text-[11px] text-muted-foreground">
                {m.code}{m.seriesId && " · part of a recurring series"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <Input placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 h-10" />

        {/* When */}
        <div className="mb-4 rounded-xl border bg-muted/30 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarClock className="size-3.5" /> Date
              </label>
              <input type="date" min={todayStr} value={date}
                onChange={(e) => setDate(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="size-3.5" /> Time
                <span className="ml-auto rounded bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold text-emerald-500">MDT</span>
              </label>
              <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls}>
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}
                    disabled={!!date && o.value !== wall.time && isPast(date, o.value)}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <MountainNow />
          {m.seriesId && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Date and time changes apply to this session only — the other sessions in the series keep their own days.
            </p>
          )}
        </div>

        <AudiencePicker audience={audience} setAudience={setAudience}
          selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers}
          selectedDepts={selectedDepts} setSelectedDepts={setSelectedDepts} />

        {/* Privacy */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([["public", "Public", <Globe key="g" className="size-4" />, "Anyone in your org with the code joins right away."],
             ["private", "Private", <Lock key="l" className="size-4" />, "People you didn't tag wait for the host to admit them."]] as const)
            .map(([v, label, icon, desc]) => (
            <button key={v} onClick={() => setVisibility(v)}
              className={cn("flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                visibility === v
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-border hover:border-emerald-500/30")}>
              <span className={cn("flex items-center gap-2 text-sm font-medium",
                visibility === v && "text-emerald-600 dark:text-emerald-400")}>{icon}{label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>

        {m.seriesId && (
          <label className="mb-4 flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
            <input type="checkbox" checked={applySeries} onChange={(e) => setApplySeries(e.target.checked)}
              className="mt-0.5 accent-emerald-600" />
            <span className="text-muted-foreground">
              Apply the <span className="font-medium text-foreground">title, attendees, and privacy</span> to every
              remaining session in this series. Times stay per-session.
            </span>
          </label>
        )}

        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        {pastPick && <p className="mb-2 text-sm text-destructive">{PAST_TIME_MSG}</p>}
        <Button onClick={() => void save()} disabled={busy || pastPick}
          className="h-11 w-full gap-2 bg-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-500">
          <Pencil className="size-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}

/** Live "right now in Mountain time" readout — removes timezone guesswork when scheduling from elsewhere. */
function MountainNow() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400">
      Right now in Mountain time:{" "}
      <span className="font-medium">
        {now.toLocaleString("en-US", {
          timeZone: "America/Denver", weekday: "short", month: "short",
          day: "numeric", hour: "numeric", minute: "2-digit",
        })}
      </span>
    </p>
  );
}
