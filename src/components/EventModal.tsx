"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarItem, CrmUserLite, EventDraft } from "@/types/calendar.types";
import { toLocalInputValue } from "@/utils/calendar.utils";

/**
 * Create / edit modal for calendar items.
 *
 * TODO(integration): swap `fetchCrmUsers` for your existing users endpoint
 * or shared hook (the same list SupraSpace and Project Management use for
 * assignee pickers).
 */
async function fetchCrmUsers(): Promise<CrmUserLite[]> {
  const res = await fetch("/api/crm-users?fields=name", {
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.users ?? data.items ?? [];
}

const TYPES = [
  { value: "event", label: "Event" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
  { value: "reminder", label: "Reminder" },
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
        start: toLocalInputValue(new Date(editing.start)),
        end: toLocalInputValue(new Date(editing.end)),
        allDay: editing.allDay,
        repeatsDailyWindow: editing.repeatsDailyWindow,
        dailyStartTime: editing.dailyStartTime ?? "09:00",
        dailyEndTime: editing.dailyEndTime ?? "10:00",
        assignees: editing.assignees?.map((a) => a._id) ?? [],
        generateMeetingLink: false,
      };
    }
    const s = presetStart ?? new Date();
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
      assignees: [],
      generateMeetingLink: false,
    };
  }, [editing, presetStart]);

  const [draft, setDraft] = useState<EventDraft>(initial);
  const [users, setUsers] = useState<CrmUserLite[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAppointment = editing?.source === "appointment";

  useEffect(() => {
    void fetchCrmUsers().then(setUsers);
  }, []);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleAssignee = (id: string) =>
    set(
      "assignees",
      draft.assignees.includes(id)
        ? draft.assignees.filter((a) => a !== id)
        : [...draft.assignees, id]
    );

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
      await onSave({
        ...draft,
        start: new Date(draft.start).toISOString(),
        end: new Date(draft.end).toISOString(),
      });
    } catch {
      setError("Couldn’t save the item. Try again.");
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30";
  const label = "mb-1 block text-[11px] font-medium uppercase tracking-wider text-zinc-500";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_0_60px_-20px_rgba(52,211,153,0.4)]"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative max-h-[85vh] overflow-auto p-6">
          <h2 className="mb-4 text-base font-semibold text-zinc-100">
            {editing ? "Edit item" : "New item"}
          </h2>

          {isAppointment && (
            <p className="mb-4 rounded-lg border border-teal-300/30 bg-teal-300/10 p-3 text-xs text-teal-200">
              This is an appointment from the Appointment Page. Edit it there to
              change customer details — title and time shown here are read-only.
            </p>
          )}

          {/* Type */}
          <div className="mb-4 flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                disabled={isAppointment}
                onClick={() => set("type", t.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  draft.type === t.value
                    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                    : "border-white/10 text-zinc-400 hover:bg-white/5"
                } disabled:opacity-40`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className={label} htmlFor="sc-title">Title</label>
            <input
              id="sc-title"
              className={field}
              disabled={isAppointment}
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
              disabled={isAppointment}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Details, agenda, notes…"
            />
          </div>

          {/* Timing */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="sc-start">Starts</label>
              <input
                id="sc-start"
                type="datetime-local"
                className={`${field} font-mono tabular-nums`}
                disabled={isAppointment}
                value={draft.start}
                onChange={(e) => set("start", e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="sc-end">Ends</label>
              <input
                id="sc-end"
                type="datetime-local"
                className={`${field} font-mono tabular-nums`}
                disabled={isAppointment}
                value={draft.end}
                onChange={(e) => set("end", e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={isAppointment}
                checked={draft.allDay}
                onChange={(e) => set("allDay", e.target.checked)}
                className="accent-emerald-400"
              />
              All day
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={isAppointment}
                checked={draft.repeatsDailyWindow}
                onChange={(e) => set("repeatsDailyWindow", e.target.checked)}
                className="accent-emerald-400"
              />
              Multi-day, same time each day
            </label>
          </div>

          {draft.repeatsDailyWindow && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
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
              <p className="col-span-2 text-[11px] text-emerald-200/70">
                Runs every day between the start and end dates, only during this
                time window.
              </p>
            </div>
          )}

          {/* Assignees */}
          <div className="mb-4">
            <span className={label}>Assign CRM users</span>
            <div className="flex max-h-32 flex-wrap gap-2 overflow-auto rounded-lg border border-white/10 bg-zinc-900/60 p-2">
              {users.length === 0 && (
                <span className="text-xs text-zinc-500">Loading users…</span>
              )}
              {users.map((u) => {
                const active = draft.assignees.includes(u._id);
                const name =
                  [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                  u.email ||
                  "User";
                return (
                  <button
                    key={u._id}
                    disabled={isAppointment}
                    onClick={() => toggleAssignee(u._id)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      active
                        ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                        : "border-white/10 text-zinc-400 hover:bg-white/5"
                    } disabled:opacity-40`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Assigned users are notified and see this on their own calendar.
            </p>
          </div>

          {/* Supra-Space */}
          {draft.type === "meeting" && !isAppointment && (
            <div className="mb-4 rounded-lg border border-cyan-400/25 bg-cyan-400/5 p-3">
              {editing?.meetingLink ? (
                <div className="text-xs text-cyan-200">
                  <span className="mb-1 block font-medium">Supra-Space meeting</span>
                  <a
                    href={editing.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-mono text-cyan-300 underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-200"
                  >
                    {editing.meetingLink}
                  </a>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-cyan-200">
                  <input
                    type="checkbox"
                    checked={draft.generateMeetingLink}
                    onChange={(e) => set("generateMeetingLink", e.target.checked)}
                    className="accent-cyan-400"
                  />
                  Generate a Supra-Space meeting link
                </label>
              )}
            </div>
          )}

          {error && <p className="mb-3 text-xs text-rose-300">{error}</p>}

          <div className="flex items-center gap-2">
            {onDelete && !isAppointment && (
              <button
                onClick={() => void onDelete()}
                className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-400/10"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-auto rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300 transition hover:bg-white/5"
            >
              Cancel
            </button>
            {!isAppointment && (
              <button
                onClick={() => void submit()}
                disabled={saving}
                className="rounded-lg bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-[0_0_20px_-6px_rgba(52,211,153,0.9)] transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}