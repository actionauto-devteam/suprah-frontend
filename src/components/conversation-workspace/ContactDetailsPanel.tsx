"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  PanelRightClose,
  Save,
  StickyNote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/leads/atomic/Avatar";
import { ActivityTimeline } from "./ActivityTimeline";
import type {
  WorkspaceActivityItem,
  WorkspaceContact,
  WorkspaceContactEditor,
  WorkspaceDetailSection,
  WorkspaceDetailsTab,
  WorkspaceQuickAction,
  WorkspaceSectionEditor,
  WorkspaceStatusOption,
} from "./workspace-types";
import {
  workspaceContactName,
  workspaceContactSubtitle,
} from "./workspace-utils";

type ActivityFilter = "all" | "notes" | "status" | "calls";

function actionTone(tone: WorkspaceQuickAction["tone"]) {
  if (tone === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (tone === "danger") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (tone === "accent") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "border-(--border-2) bg-(--bg-hover) text-(--text-secondary)";
}

export interface ContactDetailsPanelProps {
  contact: WorkspaceContact;
  contactTypeLabel?: string;
  summary?: string;
  quickActions?: WorkspaceQuickAction[];
  detailSections: WorkspaceDetailSection[];
  activities: WorkspaceActivityItem[];
  activitySubtitle?: string;
  detailsTab?: WorkspaceDetailsTab;
  onDetailsTabChange?: (tab: WorkspaceDetailsTab) => void;
  onClose: () => void;
  status?: string;
  statusOptions?: WorkspaceStatusOption[];
  onStatusChange?: (status: string) => void;
  onAddNote?: (note: string) => void | Promise<void>;
  isSavingNote?: boolean;
  contactEditor?: WorkspaceContactEditor;
  sectionEditors?: Record<string, WorkspaceSectionEditor | undefined>;
  openNoteSignal?: number;
}

export function ContactDetailsPanel({
  contact,
  contactTypeLabel = "Contact type: Lead",
  summary,
  quickActions = [],
  detailSections,
  activities,
  activitySubtitle = "Notes and customer activity",
  detailsTab: controlledTab,
  onDetailsTabChange,
  onClose,
  status,
  statusOptions,
  onStatusChange,
  onAddNote,
  isSavingNote = false,
  contactEditor,
  sectionEditors = {},
  openNoteSignal = 0,
}: ContactDetailsPanelProps) {
  const [internalTab, setInternalTab] = React.useState<WorkspaceDetailsTab>("details");
  const tab = controlledTab ?? internalTab;
  const setTab = (value: WorkspaceDetailsTab) => {
    setInternalTab(value);
    onDetailsTabChange?.(value);
  };

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [noteError, setNoteError] = React.useState("");
  const [editingContact, setEditingContact] = React.useState(false);
  const [copiedRowId, setCopiedRowId] = React.useState<string | null>(null);
  const [activityFilter, setActivityFilter] = React.useState<ActivityFilter>("all");

  const lastOpenNoteSignalRef = React.useRef(openNoteSignal);

  React.useEffect(() => {
    if (openNoteSignal > lastOpenNoteSignalRef.current && onAddNote) {
      setNoteOpen(true);
    }
    lastOpenNoteSignalRef.current = openNoteSignal;
  }, [openNoteSignal]);

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    detailSections.forEach((section) => {
      next[section.id] = section.defaultOpen !== false;
    });
    setOpenSections(next);
    setInternalTab("details");
    setNoteOpen(false);
    setNote("");
    setNoteError("");
    setEditingContact(false);
    setCopiedRowId(null);
    setActivityFilter("all");
  }, [contact.id]);

  const filteredActivities = React.useMemo(() => {
    if (activityFilter === "notes") {
      return activities.filter((item) => item.kind === "note");
    }

    if (activityFilter === "status") {
      return activities.filter((item) => item.kind === "status");
    }

    if (activityFilter === "calls") {
      return activities.filter((item) => item.kind === "call");
    }

    return activities;
  }, [activities, activityFilter]);

  const emptyActivityLabel =
    activityFilter === "notes"
      ? "No internal notes have been added yet."
      : activityFilter === "status"
        ? "No status changes have been recorded yet."
        : activityFilter === "calls"
          ? "No call history has been recorded yet."
          : "No activity has been recorded yet.";

  const copyDetailValue = async (rowId: string, value?: string) => {
    const text = value?.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedRowId(rowId);
      window.setTimeout(() => {
        setCopiedRowId((current) => (current === rowId ? null : current));
      }, 1500);
    } catch {
      setCopiedRowId(null);
    }
  };

  const saveNote = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setNoteError("Please enter a note before saving.");
      return;
    }
    if (trimmed.length > 5000) {
      setNoteError("The note cannot exceed 5,000 characters.");
      return;
    }
    try {
      await onAddNote?.(trimmed);
      setNote("");
      setNoteError("");
      setNoteOpen(false);
      setTab("activity");
    } catch {
      setNoteError("The note could not be saved. Please try again.");
    }
  };

  return (
    <aside className="cw-details-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l" style={{ borderColor: "var(--border-1)", background: "var(--bg-elevated)" }}>
      <div className="cw-profile-header shrink-0 border-b p-4" style={{ borderColor: "var(--border-1)" }}>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar first={contact.firstName} last={contact.lastName} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold">{workspaceContactName(contact)}</h2>
            <p className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>
              {workspaceContactSubtitle(contact)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ss4-icon-btn h-9 w-9 shrink-0" aria-label="Close details panel" title="Close details panel">
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>
          {contactTypeLabel}
        </p>

        {summary ? (
          <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "var(--border-1)", background: "var(--bg-subtle)" }}>
            <strong className="text-xs">Conversation summary</strong>
            <p className="mt-1.5 break-words text-[11px] leading-relaxed [overflow-wrap:anywhere]" style={{ color: "var(--text-secondary)" }}>
              {summary}
            </p>
          </div>
        ) : null}

        {quickActions.length > 0 ? (
          <div className="cw-quick-actions mt-3 grid grid-cols-5 gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                title={action.title || action.label}
                aria-pressed={action.isActive || undefined}
                className={cn(
                  "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[9px] font-medium transition hover:bg-(--bg-active) disabled:cursor-not-allowed disabled:opacity-40",
                  actionTone(action.tone),
                  action.isActive && "border-emerald-400/60 bg-emerald-500/15 text-emerald-700 shadow-sm shadow-emerald-500/10 dark:text-emerald-300",
                )}
              >
                {action.icon}
                <span className="max-w-full truncate">{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        {status && statusOptions && onStatusChange ? (
          <div className="mt-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
              Lead status
            </label>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              className="h-9 w-full rounded-lg border px-3 text-xs outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 rounded-lg border p-1" style={{ borderColor: "var(--border-1)", background: "var(--surface-2)" }}>
          <button type="button" onClick={() => setTab("details")} className={cn("h-8 rounded-md text-xs font-semibold", tab === "details" ? "bg-(--bg-elevated) shadow-sm" : "text-(--text-tertiary)")}>Details</button>
          <button type="button" onClick={() => setTab("activity")} className={cn("h-8 rounded-md text-xs font-semibold", tab === "activity" ? "bg-(--bg-elevated) shadow-sm" : "text-(--text-tertiary)")}>Activity</button>
        </div>
      </div>

      <div className="cw-details-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        {tab === "details" ? (
          <div className="min-w-0 space-y-3">
            {detailSections.map((section) => {
              const isOpen = openSections[section.id] ?? section.defaultOpen !== false;
              const isEditableContactSection = section.id === "contact" && Boolean(contactEditor);
              const sectionEditor = sectionEditors[section.id];
              const hasSectionEditor = Boolean(sectionEditor);
              const hasAnyEditor = isEditableContactSection || hasSectionEditor;
              const isSectionEditing = Boolean(sectionEditor?.isEditing);
              const isEditingThisSection = sectionEditor
                ? sectionEditor.isEditing
                : isEditableContactSection && editingContact;

              const cancelContactEdit = () => {
                if (contactEditor) {
                  contactEditor.onChange({
                    firstName: contact.firstName || "",
                    lastName: contact.lastName || "",
                    email: contact.email || "",
                    phone: contact.phone || "",
                  });
                }
                setEditingContact(false);
              };

              return (
                <section key={section.id} className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border-1)", background: "var(--bg-subtle)" }}>
                  <div className="flex w-full items-center justify-between gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setOpenSections((current) => ({ ...current, [section.id]: !isOpen }))}
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                    >
                      <strong className="truncate text-xs">{section.title}</strong>
                      {!hasAnyEditor ? (isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />) : null}
                    </button>

                    {hasAnyEditor ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (sectionEditor) {
                              if (sectionEditor.isEditing) sectionEditor.onCancel();
                              else {
                                setOpenSections((current) => ({ ...current, [section.id]: true }));
                                sectionEditor.onEdit();
                              }
                              return;
                            }

                            if (editingContact) cancelContactEdit();
                            else {
                              setOpenSections((current) => ({ ...current, [section.id]: true }));
                              setEditingContact(true);
                            }
                          }}
                          className="ss4-pill-btn flex h-7 items-center gap-1 px-2 text-[10px] font-semibold"
                        >
                          {isEditingThisSection ? <X className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                          {isEditingThisSection ? "Cancel" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenSections((current) => ({ ...current, [section.id]: !isOpen }))}
                          className="ss4-icon-btn h-7 w-7"
                          aria-label={`${isOpen ? "Collapse" : "Expand"} ${section.title}`}
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isOpen ? (
                    isSectionEditing && sectionEditor ? (
                      <div className="border-t p-3" style={{ borderColor: "var(--border-1)" }}>
                        {sectionEditor.content}
                      </div>
                    ) : editingContact && isEditableContactSection && contactEditor ? (
                      <div className="space-y-2 border-t p-3" style={{ borderColor: "var(--border-1)" }}>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={contactEditor.value.firstName} onChange={(event) => contactEditor.onChange({ ...contactEditor.value, firstName: event.target.value })} placeholder="First name" className="h-9 min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none" style={{ borderColor: "var(--border-1)" }} />
                          <input value={contactEditor.value.lastName} onChange={(event) => contactEditor.onChange({ ...contactEditor.value, lastName: event.target.value })} placeholder="Last name" className="h-9 min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none" style={{ borderColor: "var(--border-1)" }} />
                        </div>
                        <input type="email" value={contactEditor.value.email} onChange={(event) => contactEditor.onChange({ ...contactEditor.value, email: event.target.value })} placeholder="Email" className="h-9 w-full min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none" style={{ borderColor: "var(--border-1)" }} />
                        <input type="tel" value={contactEditor.value.phone} onChange={(event) => contactEditor.onChange({ ...contactEditor.value, phone: event.target.value })} placeholder="Phone" className="h-9 w-full min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none" style={{ borderColor: "var(--border-1)" }} />
                        <button
                          type="button"
                          onClick={() => void contactEditor.onSave()}
                          disabled={contactEditor.isSaving || (contactEditor.firstNameRequired !== false && !contactEditor.value.firstName.trim())}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-xs font-semibold text-white disabled:opacity-45"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {contactEditor.isSaving ? "Saving…" : "Save contact"}
                        </button>
                      </div>
                    ) : (
                      <div className="border-t" style={{ borderColor: "var(--border-1)" }}>
                        {section.rows.map((row, index) => {
                          const canCopy = Boolean(row.copyText?.trim());
                          const copyKey = `${section.id}:${row.id}`;

                          return (
                            <div
                              key={row.id}
                              className={cn(
                                "grid items-center gap-2 px-3 py-2.5",
                                canCopy
                                  ? "grid-cols-[28px_minmax(0,1fr)_30px]"
                                  : "grid-cols-[28px_minmax(0,1fr)]",
                                index < section.rows.length - 1 && "border-b",
                              )}
                              style={{ borderColor: "var(--border-1)" }}
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--accent-muted)", color: "var(--accent-text)" }}>
                                {row.icon}
                              </div>
                              <div className="min-w-0">
                                <span className="block text-[10px]" style={{ color: "var(--text-tertiary)" }}>{row.label}</span>
                                <p className="mt-0.5 break-words text-xs leading-relaxed [overflow-wrap:anywhere]">{row.value || "Not provided"}</p>
                              </div>
                              {canCopy ? (
                                <button
                                  type="button"
                                  onClick={() => void copyDetailValue(copyKey, row.copyText)}
                                  className="ss4-icon-btn h-7 w-7 shrink-0 rounded-md border"
                                  style={{ borderColor: "var(--border-1)" }}
                                  aria-label={row.copyLabel || `Copy ${row.label}`}
                                  title={copiedRowId === copyKey ? "Copied" : row.copyLabel || `Copy ${row.label}`}
                                >
                                  {copiedRowId === copyKey ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <section className="min-w-0">
            <div className="mb-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-bold leading-tight [overflow-wrap:anywhere]">
                  Activity timeline
                </h3>
                <p
                  className="mt-1 break-words text-[10px] leading-[1.35] [overflow-wrap:anywhere]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {activitySubtitle}
                </p>
              </div>

              <label className="relative block w-[132px] shrink-0">
                <span className="sr-only">Filter activity timeline</span>
                <select
                  value={activityFilter}
                  onChange={(event) =>
                    setActivityFilter(event.target.value as ActivityFilter)
                  }
                  className="h-8 w-full appearance-none rounded-md border py-0 pl-2.5 pr-7 text-[11px] font-medium outline-none transition focus:border-(--accent)"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-primary)",
                  }}
                  aria-label="Filter activity timeline"
                >
                  <option value="all">All activity</option>
                  <option value="notes">Notes</option>
                  <option value="status">Status changes</option>
                  <option value="calls">Call history</option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </label>
            </div>

            <ActivityTimeline
              items={filteredActivities}
              emptyLabel={emptyActivityLabel}
            />
          </section>
        )}
      </div>

      {noteOpen ? (
        <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingNote) setNoteOpen(false); }}>
          <div className="w-full max-w-md rounded-xl border p-5" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-2)", boxShadow: "var(--shadow-lg)" }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h3 className="text-lg font-semibold">Add note</h3><p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Add an internal note for {workspaceContactName(contact)}.</p></div>
              <button type="button" onClick={() => setNoteOpen(false)} disabled={isSavingNote} className="ss4-icon-btn h-8 w-8"><X className="h-4 w-4" /></button>
            </div>
            <textarea value={note} onChange={(event) => { setNote(event.target.value); setNoteError(""); }} rows={6} maxLength={5000} disabled={isSavingNote} placeholder="Write an internal note…" className="w-full resize-none rounded-lg border p-3 text-sm outline-none" style={{ background: "var(--bg-base)", borderColor: noteError ? "var(--danger)" : "var(--border-2)" }} />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs" style={{ color: noteError ? "var(--danger)" : "var(--text-tertiary)" }}>{noteError || "Internal notes are visible only to your team."}</p>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{note.length}/5000</span>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNoteOpen(false)} disabled={isSavingNote} className="ss4-pill-btn h-9 px-4 text-sm font-medium">Cancel</button>
              <button type="button" onClick={() => void saveNote()} disabled={isSavingNote || !note.trim()} className="h-9 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{isSavingNote ? "Saving…" : "Save note"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}