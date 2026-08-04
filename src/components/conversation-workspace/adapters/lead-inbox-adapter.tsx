import {
  CalendarDays,
  Calculator,
  CircleDollarSign,
  Clock3,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  Tag,
  UserRound,
} from "lucide-react";
import type { Lead } from "@/hooks/useLeads";
import { resolveCustomerEmail } from "../customer-email";
import type {
  WorkspaceActivityItem,
  WorkspaceContact,
  WorkspaceDetailSection,
  WorkspaceQuickAction,
} from "../workspace-types";

export function leadToWorkspaceContact(lead: Lead): WorkspaceContact {
  return {
    id: lead._id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    name:
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
      lead.senderName ||
      "Unknown Lead",
    email: resolveCustomerEmail(lead),
    phone: lead.phone,
    subtitle: resolveCustomerEmail(lead) || lead.phone || "No contact information",
    preview: lead.subject || "(No subject)",
    timestamp: lead.createdAt,
    status: lead.status,
    channel: lead.channel,
    source: lead.source,
    isRead: lead.isRead,
    count: (lead as any)._n,
    raw: lead,
  };
}

export function leadDetailSections(
  lead: Lead,
  sourceEmail: string,
): WorkspaceDetailSection[] {
  const customerEmail = resolveCustomerEmail(lead);
  const leadName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
    "Unknown Lead";
  const address = lead.address || "Not provided";
  const tags = lead.tags?.join(", ") || lead.labels?.join(", ") || "Not provided";
  const source = lead.source || sourceEmail;
  const opportunityValue =
    lead.opportunityValue !== undefined && lead.opportunityValue !== null
      ? `$${Number(lead.opportunityValue).toLocaleString()}`
      : "Not provided";
  const vehicleLabel = [lead.vehicle?.year, lead.vehicle?.make, lead.vehicle?.model]
    .filter(Boolean)
    .join(" ") || "Vehicle not specified";

  return [
    {
      id: "contact",
      title: "Contact information",
      rows: [
        { id: "name", label: "Name", value: leadName, icon: <UserRound size={15} />, copyText: leadName },
        { id: "phone", label: "Phone", value: lead.phone || "Not provided", icon: <Phone size={15} />, copyText: lead.phone || "" },
        { id: "email", label: "Email", value: customerEmail || "Not provided", icon: <Mail size={15} />, copyText: customerEmail },
        { id: "address", label: "Address", value: address, icon: <MapPin size={15} />, copyText: lead.address || "" },
        { id: "tags", label: "Tags", value: tags, icon: <Tag size={15} />, copyText: tags === "Not provided" ? "" : tags },
      ],
    },
    {
      id: "lead",
      title: "Lead information",
      rows: [
        { id: "source", label: "Source", value: source, icon: <Tag size={15} />, copyText: source },
        { id: "value", label: "Opportunity value", value: opportunityValue, icon: <CircleDollarSign size={15} />, copyText: opportunityValue === "Not provided" ? "" : opportunityValue },
        { id: "vehicle", label: "Vehicle", value: vehicleLabel, icon: <Calculator size={15} />, copyText: vehicleLabel },
        { id: "created", label: "Created", value: lead.createdAt, icon: <Clock3 size={15} />, copyText: String(lead.createdAt || "") },
      ],
    },
  ];
}

export function leadActivityItems(lead: Lead): WorkspaceActivityItem[] {
  const vehicleLabel = [lead.vehicle?.year, lead.vehicle?.make, lead.vehicle?.model]
    .filter(Boolean)
    .join(" ");

  const inquiry: WorkspaceActivityItem = {
    id: `inquiry-${lead._id}`,
    kind: "inquiry",
    title: "Lead inquiry received",
    description: lead.subject || lead.parsedContent || lead.comments || vehicleLabel,
    createdAt: lead.createdAt,
  };

  const notes: WorkspaceActivityItem[] = (lead.notes || []).map((note, index) => ({
    id: note._id || `note-${note.createdAt}-${index}`,
    kind: "note",
    title: "Note added",
    description: note.text,
    createdAt: note.createdAt,
  }));

  const statuses: WorkspaceActivityItem[] = (lead.statusHistory || []).map((entry, index) => ({
    id: `status-${entry.changedAt}-${index}`,
    kind: "status",
    title: `Status changed to ${entry.to}`,
    description: entry.reason || `Previous status: ${entry.from}`,
    createdAt: entry.changedAt,
  }));

  return [inquiry, ...notes, ...statuses].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

export function leadQuickActions(actions: {
  onCall: () => void;
  onPayment: () => void;
  onAppointment: () => void;
  onQuote: () => void;
  onNote: () => void;
  hasPhone?: boolean;
}): WorkspaceQuickAction[] {
  return [
    { id: "call", label: "Call", icon: <Phone size={16} />, onClick: actions.onCall, disabled: !actions.hasPhone },
    { id: "payment", label: "Payment", icon: <CircleDollarSign size={16} />, onClick: actions.onPayment },
    { id: "appointment", label: "Schedule", icon: <CalendarDays size={16} />, onClick: actions.onAppointment },
    { id: "quote", label: "Calculate", icon: <Calculator size={16} />, onClick: actions.onQuote },
    { id: "note", label: "Note", icon: <StickyNote size={16} />, onClick: actions.onNote, tone: "warning" },
  ];
}