import {
  Bot,
  Car,
  Check,
  Clock,
  Mail,
  MessageSquare,
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

export interface CommunicationWorkspaceLog {
  _id: string;
  channel: "sms" | "email" | "call";
  direction: "inbound" | "outbound";
  status: string;
  body?: string;
  durationSeconds?: number;
  createdAt: string;
  metadata?: { subject?: string; mode?: string };
}

export const communicationLeadToContact = (lead: Lead): WorkspaceContact => {
  const customerEmail = resolveCustomerEmail(lead);

  return ({
  id: lead._id,
  firstName: lead.firstName,
  lastName: lead.lastName,
  name: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.senderName || "Unknown Lead",
  email: customerEmail,
  phone: lead.phone,
  subtitle: lead.phone || customerEmail || "No contact information",
  preview: lead.subject || lead.source || "Lead conversation",
  timestamp: lead.updatedAt,
  status: lead.status,
  channel: lead.channel,
  source: lead.source,
  isRead: lead.isRead,
  raw: lead,
  });
};

export function communicationDetailSections(lead: Lead, eventCount: number): WorkspaceDetailSection[] {
  const customerEmail = resolveCustomerEmail(lead);
  const vehicle = [lead.vehicle?.year, lead.vehicle?.make, lead.vehicle?.model]
    .filter(Boolean)
    .join(" ");

  return [
    {
      id: "contact",
      title: "Contact information",
      rows: [
        {
          id: "name",
          label: "Name",
          value: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown Lead",
          icon: <UserRound size={15} />,
          copyText: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown Lead",
        },
        { id: "phone", label: "Phone", value: lead.phone, icon: <Phone size={15} />, copyText: lead.phone || "" },
        { id: "email", label: "Email", value: customerEmail || "No customer email", icon: <Mail size={15} />, copyText: customerEmail },
      ],
    },
    {
      id: "context",
      title: "Customer & Vehicle Overview",
      rows: [
        { id: "vehicle", label: "Vehicle interest", value: vehicle || "Vehicle not specified", icon: <Car size={15} />, copyText: vehicle || "Vehicle not specified" },
        { id: "source", label: "Lead source", value: lead.source || "Unknown", icon: <Tag size={15} />, copyText: lead.source || "Unknown" },
        { id: "events", label: "Conversation events", value: eventCount, icon: <Clock size={15} />, copyText: String(eventCount) },
      ],
    },
    {
      id: "ai",
      title: "SuprahAI",
      rows: [
        { id: "ready", label: "Assistant", value: "Unified customer history and next-action context are ready.", icon: <Bot size={15} /> },
      ],
    },
  ];
}

export function communicationActivities(lead: Lead, logs: CommunicationWorkspaceLog[]): WorkspaceActivityItem[] {
  const noteItems: WorkspaceActivityItem[] = (lead.notes || []).map((note, index) => ({
    id: note._id || `note-${note.createdAt}-${index}`,
    kind: "note",
    title: "Internal note added",
    description: note.text,
    createdAt: note.createdAt,
  }));

  const statusItems: WorkspaceActivityItem[] = (lead.statusHistory || []).map((entry, index) => ({
    id: `status-${entry.changedAt}-${index}`,
    kind: "status",
    title: `Status changed to ${entry.to}`,
    description: entry.reason || `Previous status: ${entry.from}`,
    createdAt: entry.changedAt,
  }));

  const communicationItems: WorkspaceActivityItem[] = logs.map((log) => {
    const kind = log.channel === "call" ? "call" : log.channel;
    const duration = log.durationSeconds
      ? `${Math.floor(log.durationSeconds / 60)}m ${String(log.durationSeconds % 60).padStart(2, "0")}s`
      : undefined;

    return {
      id: `communication-${log._id}`,
      kind,
      title:
        log.channel === "call"
          ? `${log.direction === "inbound" ? "Inbound" : "Outbound"} call ${log.status}`
          : `${log.direction === "inbound" ? "Inbound" : "Outbound"} ${log.channel.toUpperCase()}`,
      description:
        log.channel === "email" && log.metadata?.subject
          ? `${log.metadata.subject}: ${log.body || ""}`
          : [log.body, duration ? `Duration: ${duration}` : undefined].filter(Boolean).join(" · ") || log.status,
      createdAt: log.createdAt,
    } as WorkspaceActivityItem;
  });

  return [...noteItems, ...statusItems, ...communicationItems].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

export function communicationQuickActions(actions: {
  onCall: () => void;
  onEmail: () => void;
  onSms: () => void;
  onNote: () => void;
  onMarkContacted: () => void;
  hasPhone: boolean;
  hasEmail: boolean;
  contacted: boolean;
  activeChannel: "sms" | "email";
}): WorkspaceQuickAction[] {
  return [
    { id: "call", label: "Call", icon: <Phone size={16} />, onClick: actions.onCall, disabled: !actions.hasPhone },
    {
      id: "sms",
      label: "SMS",
      icon: <MessageSquare size={16} />,
      onClick: actions.onSms,
      disabled: !actions.hasPhone,
      tone: actions.activeChannel === "sms" ? "accent" : "default",
      isActive: actions.activeChannel === "sms",
    },
    {
      id: "email",
      label: "Email",
      icon: <Mail size={16} />,
      onClick: actions.onEmail,
      disabled: !actions.hasEmail,
      tone: actions.activeChannel === "email" ? "accent" : "default",
      isActive: actions.activeChannel === "email",
    },
    { id: "contacted", label: "Contacted", icon: <Check size={16} />, onClick: actions.onMarkContacted, disabled: actions.contacted },
    { id: "note", label: "Note", icon: <StickyNote size={16} />, onClick: actions.onNote, tone: "warning" },
  ];
}