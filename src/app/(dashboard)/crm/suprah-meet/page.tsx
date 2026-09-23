"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Building2, CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleDot, Clock, Copy, Globe, Plus, Repeat, Search, ShieldCheck, Sparkles, Trash2,
  Users, Video, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { MeetingSummaryPanel } from "@/components/suprah-meet/MeetingSummaryPanel";
import { SuprahMeetLogo } from "@/components/suprah-meet/SuprahMeetLogo";

interface MeetingRow {
  _id: string; code: string; title: string;
  status: "scheduled" | "live" | "ended";
  scheduledAt: string | null;
  seriesId: string | null;
  hostCrmUserId: string;
  participants: { fullName: string }[];
  recording: { status: string };
  createdAt: string;
}
interface CrmUserRow { _id: string; fullName: string; role: string; department?: string; }
interface DeptRow { key: string; label: string; }

type RepeatRule = "none" | "daily" | "weekdays" | "weekends" | "custom";
const MAX_SESSIONS = 30;
const PAST_PER_PAGE = 10;
const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const mdt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  }) + " MDT";

/** Local "YYYY-MM-DD" without the UTC shift of toISOString(). */
const fmtDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "Today + offsetDays" as YYYY-MM-DD in America/Denver — the calendar runs on Mountain time. */
const denverDayStr = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Denver" });

export default function SuprahMeetLobbyPage() {
  const router = useRouter();
  const [meetings, setMeetings] = React.useState<MeetingRow[]>([]);
  const [selfId, setSelfId] = React.useState("");
  const [canManageAll, setCanManageAll] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [showNew, setShowNew] = React.useState<false | "now" | "later">(false);
  const [confirmDelete, setConfirmDelete] = React.useState<MeetingRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [pastPage, setPastPage] = React.useState(1);

  const load = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/crm/meet/meetings");
      setMeetings(res.data?.data?.meetings ?? []);
      setSelfId(res.data?.data?.selfCrmUserId ?? "");
      setCanManageAll(Boolean(res.data?.data?.canManageAll));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not load meetings.");
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

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
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not delete the meeting.");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (m: MeetingRow) => canManageAll || m.hostCrmUserId === selfId;

  const live = meetings.filter((m) => m.status === "live");
  const upcoming = meetings.filter((m) => m.status === "scheduled");
  const past = meetings.filter((m) => m.status === "ended");

  // ── Past meetings pagination: max 10 per page ─────────────────────────
  const pastTotalPages = Math.max(1, Math.ceil(past.length / PAST_PER_PAGE));
  const safePastPage = Math.min(pastPage, pastTotalPages);
  const pastVisible = past.slice((safePastPage - 1) * PAST_PER_PAGE, safePastPage * PAST_PER_PAGE);

  React.useEffect(() => {
    // Clamp if the list shrinks (e.g. after a reload).
    if (pastPage > pastTotalPages) setPastPage(pastTotalPages);
  }, [pastPage, pastTotalPages]);

  const goPastPage = (page: number) => {
    setPastPage(Math.min(Math.max(1, page), pastTotalPages));
    setExpanded(null); // collapse any open summary when switching pages
  };

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] w-full overflow-hidden">
      {/* Digital ambient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.045)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="absolute -left-32 top-0 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
        {/* Brand bar */}
        <header className="mb-8 flex flex-wrap items-center gap-4 md:mb-12">
          <div className="flex items-center gap-3">
            <SuprahMeetLogo className="size-11 md:size-12" />
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-tight md:text-xl">
                Suprah <span className="text-emerald-500">Meet</span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">CRM Video Platform</p>
            </div>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-xl border bg-card/70 p-1 pl-3 backdrop-blur md:flex">
            <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinByCode()}
              placeholder="Enter a meeting code"
              className="h-9 w-52 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
            <Button variant="secondary" onClick={joinByCode} className="gap-1">
              Join <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </header>

        <div className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:gap-14">
          {/* Hero */}
          <section>
            <h2 className="max-w-xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Where your dealership team
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> meets, decides, and moves</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm text-muted-foreground md:text-base">
              Enterprise-grade video built into Suprah AI — schedule single or recurring sessions in MDT,
              tag people or whole departments, record to the cloud, and let AI turn every session into
              decisions and action items.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" className="gap-2 bg-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-500"
                onClick={() => setShowNew("now")}>
                <Video className="size-4" /> New meeting
              </Button>
              <Button size="lg" variant="outline" className="gap-2 border-emerald-500/30"
                onClick={() => setShowNew("later")}>
                <CalendarClock className="size-4" /> Schedule
              </Button>
            </div>

            {/* Mobile join */}
            <div className="mt-5 flex items-center gap-2 rounded-xl border bg-card/70 p-1 pl-3 backdrop-blur md:hidden">
              <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinByCode()}
                placeholder="Enter a meeting code"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
              <Button variant="secondary" onClick={joinByCode}>Join</Button>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            {/* Capability tiles */}
            <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <Capability icon={<ShieldCheck className="size-5" />} title="CRM-only access"
                text="Every session is gated by your CRM identity and scoped to your org." />
              <Capability icon={<CircleDot className="size-5" />} title="Cloud recording"
                text="Server-side capture straight to AWS — nothing depends on one laptop." />
              <Capability icon={<Sparkles className="size-5" />} title="AI summaries"
                text="Key points, decisions, and action items generated after every recording." />
            </div>
          </section>

          {/* Meetings column */}
          <section className="space-y-7">
            {live.length > 0 && (
              <Group title="Happening now" live>
                {live.map((m) => (
                  <MeetingCard key={m._id} m={m}
                    action={<Button size="sm" className="bg-emerald-600 hover:bg-emerald-500"
                      onClick={() => router.push(`/crm/suprah-meet/room/${m.code}`)}>Join now</Button>} />
                ))}
              </Group>
            )}

            <Group title="Upcoming">
              {upcoming.length === 0 && <EmptyRow text="Nothing scheduled yet — plan one with Schedule." />}
              {upcoming.map((m) => (
                <MeetingCard key={m._id} m={m} sub={m.scheduledAt ? mdt(m.scheduledAt) : undefined}
                  action={
                    <div className="flex items-center gap-1">
                      {canDelete(m) && (
                        <Button size="icon" variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          title="Delete this session" onClick={() => setConfirmDelete(m)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline"
                        onClick={() => router.push(`/crm/suprah-meet/room/${m.code}`)}>Start</Button>
                    </div>
                  } />
              ))}
            </Group>

            <Group title="Past meetings">
              {past.length === 0 && <EmptyRow text="Ended meetings appear here with recordings and AI summaries." />}
              {pastVisible.map((m) => (
                <div key={m._id} className="overflow-hidden rounded-2xl border bg-card/70 backdrop-blur">
                  <MeetingCard m={m} plain
                    action={<Button size="sm" variant="ghost" className="gap-1"
                      onClick={() => setExpanded(expanded === m._id ? null : m._id)}>
                      Summary <ChevronDown className={cn("size-4 transition-transform", expanded === m._id && "rotate-180")} />
                    </Button>} />
                  {expanded === m._id && <div className="border-t p-3"><MeetingSummaryPanel code={m.code} /></div>}
                </div>
              ))}

              {/* Pagination — max 10 per page */}
              {past.length > PAST_PER_PAGE && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    {(safePastPage - 1) * PAST_PER_PAGE + 1}–{Math.min(safePastPage * PAST_PER_PAGE, past.length)} of {past.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-8"
                      disabled={safePastPage <= 1} onClick={() => goPastPage(safePastPage - 1)}
                      title="Previous page">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-16 text-center text-xs text-muted-foreground">
                      Page {safePastPage} of {pastTotalPages}
                    </span>
                    <Button size="icon" variant="outline" className="size-8"
                      disabled={safePastPage >= pastTotalPages} onClick={() => goPastPage(safePastPage + 1)}
                      title="Next page">
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Group>
          </section>
        </div>
      </div>

      {showNew && (
        <NewMeetingModal
          initialMode={showNew === "later" ? "later" : "now"}
          onClose={() => setShowNew(false)}
          onCreated={(code) => router.push(`/crm/suprah-meet/room/${code}`)}
          onScheduled={() => { setShowNew(false); void load(); }}
        />
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

/* ── Landing building blocks ─────────────────────────────────────── */
function Capability({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur transition-colors hover:border-emerald-500/40">
      <div className="mb-2 grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function Group({ title, live, children }: { title: string; live?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <h3 className={cn("mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        live && "text-emerald-500")}>
        {live && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}{title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">{text}</p>;
}

function MeetingCard({ m, sub, action, plain }: { m: MeetingRow; sub?: string; action: React.ReactNode; plain?: boolean }) {
  const copy = () => void navigator.clipboard?.writeText(m.code).catch(() => {});
  return (
    <div className={cn("flex items-center gap-3 p-3", !plain && "rounded-2xl border bg-card/70 backdrop-blur")}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
        {m.status === "scheduled" ? <CalendarClock className="size-5" /> : <Video className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
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
      </div>
      {m.status === "live" && <Badge className="animate-pulse border-emerald-500/30 bg-emerald-500/15 text-emerald-500">Live</Badge>}
      {action}
    </div>
  );
}

/* ── New meeting modal — instant/scheduled/recurring + audience tagging ───── */
function NewMeetingModal({ initialMode, onClose, onCreated, onScheduled }: {
  initialMode: "now" | "later";
  onClose: () => void; onCreated: (code: string) => void; onScheduled: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [mode, setMode] = React.useState<"now" | "later">(initialMode);
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("09:00");
  const [repeat, setRepeat] = React.useState<RepeatRule>("none");
  const [customDays, setCustomDays] = React.useState<Set<number>>(new Set());
  const [until, setUntil] = React.useState("");
  const [audience, setAudience] = React.useState<"people" | "departments" | "all">("people");
  const [selectedUsers, setSelectedUsers] = React.useState<Map<string, string>>(new Map());
  const [selectedDepts, setSelectedDepts] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<CrmUserRow[]>([]);
  const [departments, setDepartments] = React.useState<DeptRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // "Today"/"Tomorrow" chips and the date-picker minimum follow Mountain time,
  // not the viewer's local day (PH is a day ahead of Utah in the evening).
  const todayStr = React.useMemo(() => denverDayStr(0), []);
  const tomorrowStr = React.useMemo(() => denverDayStr(1), []);

  // Repeating rules need an end date — default to two weeks out.
  React.useEffect(() => {
    if (repeat !== "none" && date && !until) {
      const d = new Date(`${date}T00:00:00`);
      d.setDate(d.getDate() + 13);
      setUntil(fmtDay(d));
    }
  }, [repeat, date, until]);

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
          (Array.isArray(raw) ? raw : []).map((d: any) => ({
            // NOTE: sent value must match CrmUser.department. If your
            // department docs store it under a different field, adjust here.
            key: String(d.key ?? d.slug ?? d.name ?? d.label ?? ""),
            label: String(d.label ?? d.name ?? d.key ?? ""),
          })).filter((d: DeptRow) => d.key)
        );
      } catch { /* picker degrades gracefully */ }
    })();
  }, []);

  const timeOptions = React.useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) for (const m of [0, 15, 30, 45]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      opts.push({ value, label: `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}` });
    }
    return opts;
  }, []);

  /** Session dates (YYYY-MM-DD) implied by the repeat rule, capped at 30. */
  const sessionDates = React.useMemo(() => {
    if (mode !== "later" || !date) return [];
    if (repeat === "none") return [date];
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
      if (matches) out.push(fmtDay(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [mode, date, repeat, until, customDays]);

  const timeLabel = timeOptions.find((o) => o.value === time)?.label ?? time;
  const preview = React.useMemo(() => {
    if (mode !== "later" || !date) return null;
    if (sessionDates.length === 0) return "No days match this repeat rule — adjust the days or the end date.";
    if (sessionDates.length === 1) {
      const d = new Date(`${sessionDates[0]}T00:00:00`);
      return `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${timeLabel} MDT`;
    }
    return `${sessionDates.length} sessions · ${timeLabel} MDT · ${sessionDates[0]} to ${sessionDates[sessionDates.length - 1]}`;
  }, [mode, date, sessionDates, timeLabel]);

  const toggleUser = (u: CrmUserRow) =>
    setSelectedUsers((s) => {
      const next = new Map(s);
      next.has(u._id) ? next.delete(u._id) : next.set(u._id, u.fullName);
      return next;
    });

  const toggleDept = (key: string) =>
    setSelectedDepts((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleDow = (dow: number) =>
    setCustomDays((s) => {
      const next = new Set(s);
      next.has(dow) ? next.delete(dow) : next.add(dow);
      return next;
    });

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const body: any = {
        title,
        inviteAll: audience === "all",
        invitees: audience === "people" ? [...selectedUsers.keys()] : [],
        inviteDepartments: audience === "departments" ? [...selectedDepts] : [],
      };
      if (mode === "later") {
        if (!date) throw new Error("Pick a date.");
        if (sessionDates.length === 0) throw new Error("No days match this repeat rule.");
        if (sessionDates.length === 1) body.scheduledAt = `${sessionDates[0]}T${time}`;
        else body.occurrences = sessionDates.map((d) => `${d}T${time}`);
      }
      const res = await apiClient.post("/api/crm/meet/meetings", body);
      const code = res.data?.data?.code;
      mode === "now" ? onCreated(code) : onScheduled();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Could not create the meeting.");
      setBusy(false);
    }
  };

  const fieldCls = "h-10 w-full rounded-lg border bg-background px-3 text-sm focus:border-emerald-500/60 focus:outline-none";

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
                  {timeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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

        {/* Who */}
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tag attendees</label>
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

        <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
          Tagged attendees see every session in Suprah Meet and get an alert 10 minutes before each one starts.
          Anyone in your org can still join with a session&apos;s code. You can delete sessions later from the Upcoming list.
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