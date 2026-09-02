"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CalendarItem, CrmUserLite, EventDraft } from "@/types/calendar.types";
import {
  calendarTzLabel,
  addDays,
  fmtDayLabel,
  fromZoned,
  startOfDay,
  toDateKey,
  toLocalInputValue,
  toZoned,
  zonedNow,
} from "@/utils/calendar.utils";

/**
 * Create / edit modal for calendar items.
 * Assignee list comes from the Team Pulse members endpoint via the shared
 * apiClient (Bearer token + refresh handled there).
 */
async function fetchCrmUsers(): Promise<CrmUserLite[]> {
  try {
    const res = await apiClient.getTeamMembers();
    const raw = res.data?.members ?? res.data?.data ?? res.data ?? [];
    const mapped = (Array.isArray(raw) ? raw : []).map((u: any) => ({
      _id: String(u._id ?? u.id),
      fullName: u.fullName ?? u.name,
      username: u.username,
      email: u.email,
    }));
    return Array.from(new Map(mapped.map((u) => [u._id, u])).values());
  } catch {
    return [];
  }
}

const TYPES = [
  { value: "event", label: "Event" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
  { value: "reminder", label: "Reminder" },
] as const;

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function EventModal({
  editing,
  presetStart,
  onClose,
  onSave,
  onDelete,
}: {
  editing?: CalendarItem;
  presetStart?: Date;
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const initial = useMemo<EventDraft>(() => {
    if (editing) {
      return {
        id: editing.id,
        type: (editing.type === "appointment" ? "event" : editing.type) as EventDraft["type"],
        title: editing.title,
        description: editing.description ?? "",
        start: toLocalInputValue(toZoned(new Date(editing.start))),
        end: toLocalInputValue(toZoned(new Date(editing.end))),
        allDay: editing.allDay,
        repeatsDailyWindow: editing.repeatsDailyWindow,
        dailyStartTime: editing.dailyStartTime ?? "09:00",
        dailyEndTime: editing.dailyEndTime ?? "10:00",
        includedDates: editing.includedDates ?? [],
        assignees: editing.assignees?.map((a) => a._id) ?? [],
        generateMeetingLink: false,
        status: editing.status ?? "scheduled",
      };
    }
    // presetStart from grid clicks is already Mountain Time wall-clock.
    const s = presetStart ?? zonedNow();
    const e = new Date(s.getTime() + 3_600_000);
    return {
      type: "event",
      title: "",
      description: "",
      start: toLocalInputValue(s),
      end: toLocalInputValue(e),
      allDay: false,
      repeatsDailyWindow: false,
      dailyStartTime: "09:00",
      dailyEndTime: "10:00",
      includedDates: [],
      assignees: [],
      generateMeetingLink: false,
      status: "scheduled",
    };
  }, [editing, presetStart]);

  const [draft, setDraft] = useState<EventDraft>(initial);
  const [users, setUsers] = useState<CrmUserLite[]>([]);
  const [participantQuery, setParticipantQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAppointment = editing?.source === "appointment";
  /** Only the creator edits; participants get a view-only details modal. */
  const readOnly = isAppointment || (editing ? editing.canEdit !== true : false);
  const creatorName =
    editing?.createdBy?.fullName ||
    editing?.createdBy?.username ||
    editing?.createdBy?.email ||
    "its creator";

  useEffect(() => {
    void fetchCrmUsers().then(setUsers);
  }, []);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /** Shifts End by the same duration when Start changes, so moving an item only takes one edit. Editing End directly stays independent. */
  const handleStartChange = (value: string) => {
    const prevStart = new Date(draft.start).getTime();
    const prevEnd = new Date(draft.end).getTime();
    const duration =
      !isNaN(prevStart) && !isNaN(prevEnd) && prevEnd > prevStart
        ? prevEnd - prevStart
        : 3_600_000;
    const newStart = new Date(value).getTime();
    setDraft((d) => ({
      ...d,
      start: value,
      end: isNaN(newStart) ? d.end : toLocalInputValue(new Date(newStart + duration)),
    }));
  };

  const toggleAssignee = (id: string) =>
    set(
      "assignees",
      draft.assignees.includes(id)
        ? draft.assignees.filter((a) => a !== id)
        : [...draft.assignees, id]
    );

  const displayName = (u: CrmUserLite) =>
    u.fullName || u.username || u.email || "User";

  const filteredUsers = users.filter((u) =>
    [u.fullName, u.username, u.email]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(participantQuery.trim().toLowerCase()))
  );

  /** "All" reflects and toggles every user (not just the filtered view). */
  const allTagged = users.length > 0 && draft.assignees.length === users.length;

  const toggleAll = () =>
    set("assignees", allTagged ? [] : users.map((u) => u._id));

  /** Days spanned by the current start–end range (date parts only). */
  const rangeDays = useMemo(() => {
    const s = startOfDay(new Date(draft.start));
    const e = startOfDay(new Date(draft.end));
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];
    const days: Date[] = [];
    for (let d = s; d <= e && days.length <= 62; d = addDays(d, 1)) {
      days.push(d);
    }
    return days;
  }, [draft.start, draft.end]);

  /** Empty includedDates = every day runs. */
  const dayActive = (key: string) =>
    draft.includedDates.length === 0 || draft.includedDates.includes(key);

  const toggleDay = (key: string) => {
    const all = rangeDays.map(toDateKey);
    // Materialise the implicit "all days" before removing one.
    const current = draft.includedDates.length === 0 ? all : draft.includedDates;
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    // Keep at least one day; if back to all, store [] (= every day).
    if (next.length === 0) return;
    set("includedDates", next.length === all.length ? [] : next);
  };

  const submit = async () => {
    if (!draft.title.trim()) {
      setError("A title is required.");
      return;
    }
    if (new Date(draft.end) < new Date(draft.start)) {
      setError("End must be after start.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const validKeys = new Set(rangeDays.map(toDateKey));
      await onSave({
        ...draft,
        includedDates: draft.repeatsDailyWindow
          ? draft.includedDates.filter((k) => validKeys.has(k))
          : [],
        start: fromZoned(new Date(draft.start)).toISOString(),
        end: fromZoned(new Date(draft.end)).toISOString(),
      });
    } catch {
      setError("Couldn’t save the item. Try again.");
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50";
  const label = "mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15" />

        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {editing ? (readOnly ? "Schedule details" : "Edit item") : "New item"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editing ? "View or edit this calendar item's details." : "Create a new calendar item."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {isAppointment && (
            <p className="mb-4 rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-700 dark:text-teal-200">
              This is an appointment from the Appointment Page. Edit it there to
              change customer details — title and time shown here are read-only.
            </p>
          )}

          {readOnly && !isAppointment && (
            <p className="mb-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-700 dark:text-cyan-200">
              View only — {creatorName} created this {draft.type} and is the
              only one who can change it. You&apos;re tagged as a participant.
            </p>
          )}

          {/* Type */}
          <div className="mb-4 flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={readOnly}
                onClick={() => set("type", t.value)}
                aria-pressed={draft.type === t.value}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  draft.type === t.value
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "border-border text-muted-foreground hover:bg-accent"
                } disabled:opacity-40`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status (edit only) */}
          {editing && !isAppointment && (
            <div className="mb-4 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => set("status", s.value)}
                  aria-pressed={draft.status === s.value}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    draft.status === s.value
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                      : "border-border text-muted-foreground hover:bg-accent"
                  } disabled:opacity-40`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="mb-4">
            <label className={label} htmlFor="sc-title">Title</label>
            <input
              id="sc-title"
              className={field}
              disabled={readOnly}
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={`Name this ${draft.type}`}
            />
          </div>

          <div className="mb-4">
            <label className={label} htmlFor="sc-desc">Description</label>
            <textarea
              id="sc-desc"
              className={`${field} min-h-20 resize-y`}
              disabled={readOnly}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Details, agenda, notes…"
            />
          </div>

          {/* Timing */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="sc-start">Starts ({calendarTzLabel()})</label>
              <DateTimePicker
                id="sc-start"
                value={draft.start}
                onChange={handleStartChange}
                disabled={readOnly}
                className={`${field} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className={label} htmlFor="sc-end">Ends ({calendarTzLabel()})</label>
              <DateTimePicker
                id="sc-end"
                value={draft.end}
                onChange={(v) => set("end", v)}
                disabled={readOnly}
                className={`${field} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={draft.allDay}
                onChange={(e) => set("allDay", e.target.checked)}
                className="accent-emerald-500"
              />
              All day
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={draft.repeatsDailyWindow}
                onChange={(e) => set("repeatsDailyWindow", e.target.checked)}
                className="accent-emerald-500"
              />
              Multi-day, same time each day
            </label>
          </div>

          {draft.repeatsDailyWindow && (
            <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:border-emerald-400/25 dark:bg-emerald-400/10 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="sc-dstart">Daily start</label>
                <input
                  id="sc-dstart"
                  type="time"
                  className={`${field} font-mono tabular-nums`}
                  value={draft.dailyStartTime}
                  onChange={(e) => set("dailyStartTime", e.target.value)}
                />
              </div>
              <div>
                <label className={label} htmlFor="sc-dend">Daily end</label>
                <input
                  id="sc-dend"
                  type="time"
                  className={`${field} font-mono tabular-nums`}
                  value={draft.dailyEndTime}
                  onChange={(e) => set("dailyEndTime", e.target.value)}
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-emerald-700/80 dark:text-emerald-200/70">
                  Runs on these days
                </span>
                {rangeDays.length === 0 ? (
                  <p className="text-[11px] text-emerald-700/70 dark:text-emerald-200/60">
                    Set valid start and end dates to pick days.
                  </p>
                ) : (
                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-auto">
                    {rangeDays.map((day) => {
                      const key = toDateKey(day);
                      const active = dayActive(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleDay(key)}
                          aria-pressed={active}
                          className={`rounded-md border px-2 py-1 font-mono text-[10px] tabular-nums transition ${
                            active
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 shadow-[0_0_8px_-3px_rgba(52,211,153,0.6)] dark:text-emerald-200"
                              : "border-border text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {fmtDayLabel(day)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-emerald-700/70 dark:text-emerald-200/60">
                  Highlighted days run during the time window above — tap to
                  include or skip a day.
                </p>
              </div>
            </div>
          )}

          {/* Assignees */}
          <div className="mb-4">
            <span className={label}>Tag participants</span>
            <div className="rounded-lg border border-border bg-muted/30">
              {/* Search + select all */}
              <div className="flex items-center gap-2 border-b border-border p-2">
                <input
                  type="search"
                  aria-label="Search participants"
                  placeholder="Search participants…"
                  disabled={readOnly}
                  value={participantQuery}
                  onChange={(e) => setParticipantQuery(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-cyan-500/50 disabled:opacity-40"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition hover:bg-accent">
                  <input
                    type="checkbox"
                    disabled={readOnly || users.length === 0}
                    checked={allTagged}
                    onChange={toggleAll}
                    className="accent-cyan-500"
                  />
                  All
                </label>
              </div>

              {/* Checkable list */}
              <div className="max-h-40 overflow-auto p-1">
                {users.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading users…</p>
                )}
                {users.length > 0 && filteredUsers.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    No one matches “{participantQuery}”.
                  </p>
                )}
                {filteredUsers.map((u) => {
                  const active = draft.assignees.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition ${
                        active
                          ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
                          : "text-foreground hover:bg-accent"
                      } ${readOnly ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={active}
                        onChange={() => toggleAssignee(u._id)}
                        className="accent-cyan-500"
                      />
                      <span className="truncate">{displayName(u)}</span>
                      {u.email && u.fullName && (
                        <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                          {u.email}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {draft.assignees.length > 0 && (
                <span className="mr-1 font-mono tabular-nums text-cyan-600 dark:text-cyan-300">
                  {draft.assignees.length} tagged ·
                </span>
              )}
              Tagged participants are notified and see this on their own calendar.
            </p>
          </div>

          {/* Supra-Space */}
          {draft.type === "meeting" && (editing?.meetingLink || !readOnly) && (
            <div className="mb-4 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3">
              {editing?.meetingLink ? (
                <div className="text-xs text-cyan-700 dark:text-cyan-200">
                  <span className="mb-1 block font-medium">Supra-Space meeting</span>
                  <a
                    href={editing.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-mono text-cyan-700 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
                  >
                    {editing.meetingLink}
                  </a>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-cyan-700 dark:text-cyan-200">
                  <input
                    type="checkbox"
                    checked={draft.generateMeetingLink}
                    onChange={(e) => set("generateMeetingLink", e.target.checked)}
                    className="accent-cyan-500"
                  />
                  Generate a Supra-Space meeting link
                </label>
              )}
            </div>
          )}

          {error && <p className="mb-3 text-xs text-rose-600 dark:text-rose-300">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {onDelete && !readOnly && (
              <button
                onClick={() => void onDelete()}
                className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-300"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-auto rounded-lg border border-border px-4 py-2 text-xs text-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            {!readOnly && (
              <button
                onClick={() => void submit()}
                disabled={saving}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_-6px_rgba(16,185,129,0.7)] transition hover:bg-emerald-400 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
