"use client";

import * as React from "react";
import {
  CalendarDays,
  Calculator,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  Tag,
  UserRound,
  X,
  PanelRightClose,
} from "lucide-react";
import { Avatar } from "./atomic/Avatar";

interface LeadDetailsPanelProps {
  lead: any;
  sourceEmail: string;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onAppointment: () => void;
  onQuote: () => void;
  onAddNote: (note: string) => void | Promise<void>;
}

type PanelTab = "details" | "activity";
type ActivityFilter = "all" | "status" | "notes";

interface ActivityItem {
  id: string;
  type: "inquiry" | "status" | "note";
  title: string;
  description: string;
  createdAt: string | Date | undefined;
}

const getLeadName = (lead: any) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.senderName ||
  "Unknown Lead";

const formatDate = (value: any) => {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="suprah-detail-row">
      <div className="suprah-detail-row-icon">{icon}</div>

      <div className="min-w-0">
        <span>{label}</span>
        <p className="break-words">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

export function LeadDetailsPanel({
  lead,
  sourceEmail,
  onClose,
  onStatusChange,
  onAppointment,
  onQuote,
  onAddNote,
}: LeadDetailsPanelProps) {
  const [tab, setTab] = React.useState<PanelTab>("details");
  const [activityFilter, setActivityFilter] =
    React.useState<ActivityFilter>("all");

  const [contactOpen, setContactOpen] = React.useState(true);
  const [leadOpen, setLeadOpen] = React.useState(true);

  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [noteError, setNoteError] = React.useState("");
  const [isSavingNote, setIsSavingNote] = React.useState(false);

  const noteInputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const leadName = getLeadName(lead);
  const vehicle = lead?.vehicle;

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
    : "Vehicle not specified";

  const activityItems = React.useMemo<ActivityItem[]>(() => {
    const inquiryItem: ActivityItem = {
      id: `inquiry-${lead?._id || "unknown"}`,
      type: "inquiry",
      title: "Lead inquiry received",
      description:
        lead?.subject ||
        lead?.parsedContent ||
        lead?.comments ||
        vehicleLabel,
      createdAt: lead?.createdAt,
    };

    const noteItems: ActivityItem[] = (lead?.notes || []).map(
      (item: any, index: number) => ({
        id:
          item?._id ||
          `note-${item?.createdAt || "unknown"}-${index}`,
        type: "note",
        title: "Note added",
        description: item?.text || "Internal note",
        createdAt: item?.createdAt,
      }),
    );

    const statusItems: ActivityItem[] = (lead?.statusHistory || []).map(
      (entry: any, index: number) => ({
        id: `status-${entry?.changedAt || "unknown"}-${index}`,
        type: "status",
        title: `Status changed to ${entry?.to || "Updated"}`,
        description:
          entry?.reason ||
          `Previous status: ${entry?.from || "Unknown"}`,
        createdAt: entry?.changedAt,
      }),
    );

    return [inquiryItem, ...noteItems, ...statusItems].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [
    lead?._id,
    lead?.subject,
    lead?.parsedContent,
    lead?.comments,
    lead?.createdAt,
    lead?.notes,
    lead?.statusHistory,
    vehicleLabel,
  ]);

  const filteredActivityItems = React.useMemo(() => {
    if (activityFilter === "status") {
      return activityItems.filter((item) => item.type === "status");
    }

    if (activityFilter === "notes") {
      return activityItems.filter((item) => item.type === "note");
    }

    return activityItems;
  }, [activityFilter, activityItems]);

  React.useEffect(() => {
    setTab("details");
    setActivityFilter("all");
    setNoteOpen(false);
    setNote("");
    setNoteError("");
    setIsSavingNote(false);
  }, [lead?._id]);

  React.useEffect(() => {
    if (!noteOpen) return;

    const timer = window.setTimeout(() => {
      noteInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [noteOpen]);

  React.useEffect(() => {
    if (!noteOpen || isSavingNote) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNoteOpen(false);
        setNote("");
        setNoteError("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [noteOpen, isSavingNote]);

  const openNoteDialog = () => {
    setNote("");
    setNoteError("");
    setNoteOpen(true);
  };

  const closeNoteDialog = () => {
    if (isSavingNote) return;

    setNoteOpen(false);
    setNote("");
    setNoteError("");
  };

  const handleSaveNote = async () => {
    const trimmedNote = note.trim();

    if (!trimmedNote) {
      setNoteError("Please enter a note before saving.");
      noteInputRef.current?.focus();
      return;
    }

    if (trimmedNote.length > 5000) {
      setNoteError("The note cannot exceed 5,000 characters.");
      noteInputRef.current?.focus();
      return;
    }

    try {
      setIsSavingNote(true);
      setNoteError("");

      await onAddNote(trimmedNote);

      setNote("");
      setNoteOpen(false);
      setTab("activity");
      setActivityFilter("all");
    } catch (error) {
      console.error("Failed to save note:", error);
      setNoteError("The note could not be saved. Please try again.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleNoteKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSaveNote();
    }
  };

  return (
    <aside className="suprah-details-panel">
      <div className="suprah-profile-header">
        <Avatar
          first={lead?.firstName}
          last={lead?.lastName}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate">{leadName}</h2>

          <p className="truncate">
            {lead?.phone ||
              lead?.email ||
              lead?.senderEmail ||
              "No contact information"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="ss4-icon-btn h-8 w-8"
          aria-label="Hide lead details"
          title="Hide lead details"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <p className="suprah-contact-type">Contact type: Lead</p>

      <div className="suprah-ai-summary">
        <strong>Conversation summary</strong>

        <p>
          {lead?.aiSummary ||
            `This lead submitted an inquiry about ${vehicleLabel}. Review the conversation and follow up with the next best action.`}
        </p>
      </div>

      <div className="suprah-quick-actions">
        <a
          href={lead?.phone ? `tel:${lead.phone}` : undefined}
          aria-disabled={!lead?.phone}
          title="Call lead"
        >
          <Phone size={16} />
          <span>Call</span>
        </a>

        <button
          type="button"
          onClick={onQuote}
          title="Request payment"
        >
          <CircleDollarSign size={16} />
          <span>Request payment</span>
        </button>

        <button
          type="button"
          onClick={onAppointment}
          title="Schedule appointment"
        >
          <CalendarDays size={16} />
          <span>Schedule</span>
        </button>

        <button
          type="button"
          onClick={onQuote}
          title="Calculate quote"
        >
          <Calculator size={16} />
          <span>Calculate</span>
        </button>

        <button
          type="button"
          onClick={openNoteDialog}
          title="Add internal note"
          aria-label="Add internal note"
        >
          <StickyNote size={16} />
          <span>Note</span>
        </button>
      </div>

      {noteOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.58)" }}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeNoteDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-note-dialog-title"
            className="w-full max-w-[420px] rounded-xl border p-5"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-2)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  id="lead-note-dialog-title"
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Add note
                </h3>

                <p
                  className="mt-1 truncate text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Add an internal note for {leadName}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeNoteDialog}
                disabled={isSavingNote}
                className="ss4-icon-btn h-8 w-8 shrink-0"
                aria-label="Close add note dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              ref={noteInputRef}
              rows={6}
              value={note}
              disabled={isSavingNote}
              maxLength={5000}
              onChange={(event) => {
                setNote(event.target.value);

                if (noteError) {
                  setNoteError("");
                }
              }}
              onKeyDown={handleNoteKeyDown}
              placeholder="Write an internal note..."
              className="w-full resize-none rounded-lg border p-3 text-sm outline-none"
              style={{
                background: "var(--bg-base)",
                borderColor: noteError
                  ? "var(--danger, #ef4444)"
                  : "var(--border-2)",
                color: "var(--text-primary)",
              }}
              aria-invalid={Boolean(noteError)}
              aria-describedby={
                noteError ? "lead-note-error" : "lead-note-helper"
              }
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              {noteError ? (
                <p
                  id="lead-note-error"
                  className="text-sm"
                  style={{ color: "var(--danger, #ef4444)" }}
                >
                  {noteError}
                </p>
              ) : (
                <p
                  id="lead-note-helper"
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Press Ctrl + Enter or Command + Enter to save.
                </p>
              )}

              <span
                className="shrink-0 text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                {note.length}/5000
              </span>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNoteDialog}
                disabled={isSavingNote}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: "var(--border-2)",
                  color: "var(--text-primary)",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveNote()}
                disabled={isSavingNote || !note.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "var(--accent)",
                  color: "#ffffff",
                }}
              >
                {isSavingNote ? "Saving..." : "Save note"}
              </button>
            </div>
          </div>
        </div>
      )}

      <label
        className="suprah-status-label"
        htmlFor="lead-detail-status"
      >
        Lead status
      </label>

      <select
        id="lead-detail-status"
        className="suprah-status-select"
        value={lead?.status || "New"}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="New">New</option>
        <option value="Pending">Pending</option>
        <option value="Contacted">Contacted</option>
        <option value="Appointment Set">Appointment Set</option>
        <option value="Closed">Closed</option>
      </select>

      <div className="suprah-stage-track" aria-hidden="true">
        {[
          "New",
          "Pending",
          "Contacted",
          "Appointment Set",
          "Closed",
        ].map((status) => (
          <span
            key={status}
            className={status === lead?.status ? "active" : ""}
          />
        ))}
      </div>

      <div className="suprah-tabs">
        <button
          type="button"
          className={tab === "details" ? "active" : ""}
          onClick={() => setTab("details")}
        >
          Details
        </button>

        <button
          type="button"
          className={tab === "activity" ? "active" : ""}
          onClick={() => setTab("activity")}
        >
          Activity
        </button>
      </div>

      <div className="suprah-details-scroll">
        {tab === "details" ? (
          <>
            <section className="suprah-detail-section">
              <button
                type="button"
                className="suprah-detail-section-title"
                onClick={() => setContactOpen((value) => !value)}
              >
                <span>Contact information</span>

                {contactOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>

              {contactOpen && (
                <div className="suprah-detail-section-body">
                  <DetailRow
                    icon={<UserRound size={15} />}
                    label="Name"
                    value={leadName}
                  />

                  <DetailRow
                    icon={<Phone size={15} />}
                    label="Phone"
                    value={lead?.phone}
                  />

                  <DetailRow
                    icon={<Mail size={15} />}
                    label="Email"
                    value={lead?.email || lead?.senderEmail}
                  />

                  <DetailRow
                    icon={<MapPin size={15} />}
                    label="Address"
                    value={lead?.address}
                  />

                  <DetailRow
                    icon={<Tag size={15} />}
                    label="Tags"
                    value={
                      Array.isArray(lead?.tags)
                        ? lead.tags.join(", ")
                        : lead?.labels?.join(", ")
                    }
                  />
                </div>
              )}
            </section>

            <section className="suprah-detail-section">
              <button
                type="button"
                className="suprah-detail-section-title"
                onClick={() => setLeadOpen((value) => !value)}
              >
                <span>Lead information</span>

                {leadOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>

              {leadOpen && (
                <div className="suprah-detail-section-body">
                  <DetailRow
                    icon={<Tag size={15} />}
                    label="Source"
                    value={lead?.source || sourceEmail}
                  />

                  <DetailRow
                    icon={<CircleDollarSign size={15} />}
                    label="Opportunity value"
                    value={
                      lead?.opportunityValue
                        ? `$${Number(
                            lead.opportunityValue,
                          ).toLocaleString()}`
                        : undefined
                    }
                  />

                  <DetailRow
                    icon={<Calculator size={15} />}
                    label="Vehicle"
                    value={vehicleLabel}
                  />

                  <DetailRow
                    icon={<Clock3 size={15} />}
                    label="Created"
                    value={formatDate(lead?.createdAt)}
                  />
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="suprah-activity">
            <div className="suprah-activity-heading">
              <h3>Activity timeline</h3>

              <select
                aria-label="Filter activity"
                value={activityFilter}
                onChange={(event) =>
                  setActivityFilter(event.target.value as ActivityFilter)
                }
              >
                <option value="all">All activity</option>
                <option value="status">Status changes</option>
                <option value="notes">Notes</option>
              </select>
            </div>

            <div className="suprah-timeline">
              {filteredActivityItems.length > 0 ? (
                filteredActivityItems.map((item) => (
                  <article
                    key={item.id}
                    className="suprah-activity-card"
                  >
                    <span className="suprah-timeline-dot" />

                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <time>{formatDate(item.createdAt)}</time>
                  </article>
                ))
              ) : (
                <div
                  className="rounded-lg border p-4 text-sm"
                  style={{
                    borderColor: "var(--border-1)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  No activity found for this filter.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}