"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { ContactDetailsPanel } from "@/components/conversation-workspace/ContactDetailsPanel";
import { resolveCustomerEmail } from "@/components/conversation-workspace/customer-email";
import {
  leadActivityItems,
  leadDetailSections,
  leadQuickActions,
  leadToWorkspaceContact,
} from "@/components/conversation-workspace/adapters/lead-inbox-adapter";

interface LeadDetailsUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  tags?: string[];
  source?: string;
  opportunityValue?: number | null;
  vehicle?: {
    year?: string;
    make?: string;
    model?: string;
  };
}

interface LeadDetailsPanelProps {
  lead: any;
  sourceEmail: string;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onAppointment: () => void;
  onRequestPayment: () => void;
  onCalculateQuote: () => void;
  onAddNote: (note: string) => void | Promise<void>;
  onUpdateDetails: (changes: LeadDetailsUpdate) => void | Promise<void>;
}

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Pending", label: "Pending" },
  { value: "Contacted", label: "Contacted" },
  { value: "Appointment Set", label: "Appointment Set" },
];

const fieldClass =
  "h-9 w-full min-w-0 rounded-md border bg-(--input-bg) px-2.5 text-xs outline-none focus:border-emerald-500/60";

export function LeadDetailsPanel({
  lead,
  sourceEmail,
  onClose,
  onStatusChange,
  onAppointment,
  onRequestPayment,
  onCalculateQuote,
  onAddNote,
  onUpdateDetails,
}: LeadDetailsPanelProps) {
  const [noteIntent, setNoteIntent] = React.useState(0);
  const [editingContact, setEditingContact] = React.useState(false);
  const [editingLead, setEditingLead] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [savingLead, setSavingLead] = React.useState(false);

  const initialContact = React.useMemo(
    () => ({
      firstName: lead?.firstName || "",
      lastName: lead?.lastName || "",
      email: resolveCustomerEmail(lead),
      phone: lead?.phone || "",
      address: lead?.address || "",
      tags: (lead?.tags || lead?.labels || []).join(", "),
    }),
    [lead],
  );

  const initialLeadInfo = React.useMemo(
    () => ({
      source: lead?.source || sourceEmail || "",
      opportunityValue:
        lead?.opportunityValue === undefined || lead?.opportunityValue === null
          ? ""
          : String(lead.opportunityValue),
      vehicleYear: lead?.vehicle?.year || "",
      vehicleMake: lead?.vehicle?.make || "",
      vehicleModel: lead?.vehicle?.model || "",
    }),
    [lead, sourceEmail],
  );

  const [contactDraft, setContactDraft] = React.useState(initialContact);
  const [leadDraft, setLeadDraft] = React.useState(initialLeadInfo);

  React.useEffect(() => {
    setContactDraft(initialContact);
    setLeadDraft(initialLeadInfo);
    setEditingContact(false);
    setEditingLead(false);
  }, [lead?._id, initialContact, initialLeadInfo]);

  const phone = String(lead?.phone || "").trim();
  const dialablePhone = phone.replace(/[^\d+]/g, "");
  const contact = React.useMemo(() => leadToWorkspaceContact(lead), [lead]);
  const details = React.useMemo(
    () => leadDetailSections(lead, sourceEmail),
    [lead, sourceEmail],
  );
  const activities = React.useMemo(() => leadActivityItems(lead), [lead]);

  const actions = React.useMemo(
    () =>
      leadQuickActions({
        onCall: () => {
          if (dialablePhone) window.location.href = `tel:${dialablePhone}`;
        },
        onPayment: onRequestPayment,
        onAppointment,
        onQuote: onCalculateQuote,
        onNote: () => setNoteIntent((value) => value + 1),
        hasPhone: Boolean(dialablePhone),
      }),
    [dialablePhone, onAppointment, onCalculateQuote, onRequestPayment],
  );

  const saveContact = async () => {
    if (!contactDraft.firstName.trim()) return;
    setSavingContact(true);
    try {
      await onUpdateDetails({
        firstName: contactDraft.firstName.trim(),
        lastName: contactDraft.lastName.trim(),
        email: contactDraft.email.trim(),
        phone: contactDraft.phone.trim(),
        address: contactDraft.address.trim(),
        tags: contactDraft.tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean),
      });
      setEditingContact(false);
    } finally {
      setSavingContact(false);
    }
  };

  const saveLeadInformation = async () => {
    setSavingLead(true);
    try {
      const rawValue = leadDraft.opportunityValue.trim();
      const parsedValue = rawValue === "" ? null : Number(rawValue);
      if (parsedValue !== null && (!Number.isFinite(parsedValue) || parsedValue < 0)) {
        throw new Error("Opportunity value must be zero or greater");
      }

      await onUpdateDetails({
        source: leadDraft.source.trim(),
        opportunityValue: parsedValue,
        vehicle: {
          year: leadDraft.vehicleYear.trim(),
          make: leadDraft.vehicleMake.trim(),
          model: leadDraft.vehicleModel.trim(),
        },
      });
      setEditingLead(false);
    } finally {
      setSavingLead(false);
    }
  };

  return (
    <ContactDetailsPanel
      contact={contact}
      contactTypeLabel="Contact type: Lead"
      summary={
        lead?.aiSummary ||
        `This lead submitted an inquiry about ${[
          lead?.vehicle?.year,
          lead?.vehicle?.make,
          lead?.vehicle?.model,
        ]
          .filter(Boolean)
          .join(" ") || "a vehicle"}. Review the conversation and follow up with the next best action.`
      }
      quickActions={actions}
      detailSections={details}
      activities={activities}
      onClose={onClose}
      status={lead?.status || "New"}
      statusOptions={STATUS_OPTIONS}
      onStatusChange={onStatusChange}
      onAddNote={onAddNote}
      activitySubtitle="Inquiry, notes, and status history"
      openNoteSignal={noteIntent}
      sectionEditors={{
        contact: {
          isEditing: editingContact,
          onEdit: () => setEditingContact(true),
          onCancel: () => {
            setContactDraft(initialContact);
            setEditingContact(false);
          },
          content: (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={contactDraft.firstName} onChange={(event) => setContactDraft((current) => ({ ...current, firstName: event.target.value }))} placeholder="First name" className={fieldClass} />
                <input value={contactDraft.lastName} onChange={(event) => setContactDraft((current) => ({ ...current, lastName: event.target.value }))} placeholder="Last name" className={fieldClass} />
              </div>
              <input type="email" value={contactDraft.email} onChange={(event) => setContactDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className={fieldClass} />
              <input type="tel" value={contactDraft.phone} onChange={(event) => setContactDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" className={fieldClass} />
              <input value={contactDraft.address} onChange={(event) => setContactDraft((current) => ({ ...current, address: event.target.value }))} placeholder="Address" className={fieldClass} />
              <input value={contactDraft.tags} onChange={(event) => setContactDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags separated by commas" className={fieldClass} />
              <button type="button" onClick={() => void saveContact()} disabled={savingContact || !contactDraft.firstName.trim()} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-xs font-semibold text-white disabled:opacity-45">
                <Save className="h-3.5 w-3.5" />
                {savingContact ? "Saving…" : "Save contact information"}
              </button>
            </div>
          ),
        },
        lead: {
          isEditing: editingLead,
          onEdit: () => setEditingLead(true),
          onCancel: () => {
            setLeadDraft(initialLeadInfo);
            setEditingLead(false);
          },
          content: (
            <div className="space-y-2">
              <input value={leadDraft.source} onChange={(event) => setLeadDraft((current) => ({ ...current, source: event.target.value }))} placeholder="Lead source" className={fieldClass} />
              <input type="number" min="0" step="0.01" value={leadDraft.opportunityValue} onChange={(event) => setLeadDraft((current) => ({ ...current, opportunityValue: event.target.value }))} placeholder="Opportunity value" className={fieldClass} />
              <div className="grid grid-cols-[0.8fr_1fr_1fr] gap-2">
                <input value={leadDraft.vehicleYear} onChange={(event) => setLeadDraft((current) => ({ ...current, vehicleYear: event.target.value }))} placeholder="Year" className={fieldClass} />
                <input value={leadDraft.vehicleMake} onChange={(event) => setLeadDraft((current) => ({ ...current, vehicleMake: event.target.value }))} placeholder="Make" className={fieldClass} />
                <input value={leadDraft.vehicleModel} onChange={(event) => setLeadDraft((current) => ({ ...current, vehicleModel: event.target.value }))} placeholder="Model" className={fieldClass} />
              </div>
              <p className="text-[10px] leading-relaxed text-(--text-tertiary)">Created date is system-managed and cannot be edited.</p>
              <button type="button" onClick={() => void saveLeadInformation()} disabled={savingLead} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-xs font-semibold text-white disabled:opacity-45">
                <Save className="h-3.5 w-3.5" />
                {savingLead ? "Saving…" : "Save lead information"}
              </button>
            </div>
          ),
        },
      }}
    />
  );
}