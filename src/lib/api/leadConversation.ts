import { apiClient } from "../api-client";

export type DeliveryCode = "sending" | "sent" | "delivered" | "failed" | "unconfirmed" | "received";
export type ConversationChannel = "sms" | "email" | "webchat" | "call" | "note" | "inquiry";

export interface ConversationItem {
  id: string;
  kind: "message" | "call" | "note" | "inquiry";
  channel: ConversationChannel;
  direction?: "inbound" | "outbound";
  occurredAt: string;
  body: string;
  subject?: string;
  author: { name: string; kind: "customer" | "staff" | "ai" | "system"; userId?: string | null };
  status?: { code: DeliveryCode; label: string; failureMessage?: string; errorDetail?: string };
  call?: { status: string; label: string; durationSec?: number | null; answeredBy?: string | null };
  inquiry?: {
    isOriginal: boolean;
    kind: string;
    source?: string | null;
    sourceProvider?: string | null;
    channel?: string | null;
    vehicle?: { year?: string; make?: string; model?: string; trim?: string } | null;
  };
  attachments?: string[];
  messageId?: string;
}

export interface EarlierLeadSummary {
  _id: string;
  name: string;
  status: string;
  source?: string | null;
  channel?: string | null;
  createdAt: string;
  closed: boolean;
  combined?: boolean;
  previousStatus?: string | null;
}

export interface LeadCombineInfo {
  combined?: { count: number; at: string };
  combinedInto?: { leadId: string; name: string; at: string };
  canUndo?: boolean;
}

export interface EarlierConversations {
  available: boolean;
  reason?: string | null;
  leads: EarlierLeadSummary[];
  unlinkedCount: number;
}

interface PauseState {
  aiPausedAt?: string | null;
  aiPausedBy?: { name?: string } | null;
  aiAutoPausedUntil?: string | null;
}

export interface LeadConversationData {
  lead: { _id: string; name: string; status: string; channel?: string | null; closed: boolean; unverified: boolean };
  composer: { closed: boolean; blocked: boolean; intakeMode: "off" | "active" | "paused" };
  items: ConversationItem[];
  nextCursor: string | null;
  unavailableSources: string[];
  earlier: EarlierConversations | null;
  combine?: LeadCombineInfo | null;
  channelState: {
    sms: PauseState & { conversationId: string | null; ownsConversation: boolean; optedOut: boolean };
    webchat: (PauseState & { sessionId: string; contactPolicy?: unknown }) | null;
    email: PauseState;
  } | null;
}

export interface LeadConversationMeta {
  composer: LeadConversationData["composer"];
  earlier: EarlierConversations | null;
  combine?: LeadCombineInfo | null;
  unavailableSources: string[];
  unverified: boolean;
  nextCursor: string | null;
}

export async function fetchLeadConversation(leadId: string, params: { before?: string; limit?: number } = {}): Promise<LeadConversationData> {
  const res = await apiClient.get(`/api/leads/${leadId}/conversation`, { params });
  return res.data?.data;
}

export async function fetchEarlierConversation(leadId: string, earlierId: string): Promise<{ lead: { _id: string; name: string; status: string } | null; items: ConversationItem[] }> {
  const res = await apiClient.get(`/api/leads/${leadId}/conversation/earlier/${earlierId}`);
  return res.data?.data;
}

const DELIVERY_RANK: Record<string, number> = {
  sending: 0,
  sent: 1,
  unconfirmed: 2,
  delivered: 3,
  failed: 3,
  received: 3,
};

export function toDeliveryCode(raw?: string | null): DeliveryCode | undefined {
  switch (raw) {
    case "queued":
    case "sending":
      return "sending";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "failed":
      return "failed";
    case "pending_reconciliation":
    case "unconfirmed":
      return "unconfirmed";
    case "received":
      return "received";
    default:
      return undefined;
  }
}

export const DELIVERY_LABELS: Record<DeliveryCode, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  unconfirmed: "Couldn't confirm delivery",
  received: "Received",
};

export function laterStatus(current?: string | null, incoming?: string | null): DeliveryCode | undefined {
  const a = toDeliveryCode(current);
  const b = toDeliveryCode(incoming);
  if (!a) return b;
  if (!b) return a;
  return (DELIVERY_RANK[b] ?? 0) >= (DELIVERY_RANK[a] ?? 0) ? b : a;
}

export type ThreadEntry = Record<string, unknown>;

export function conversationItemsToThread(items: ConversationItem[], leadId: string): ThreadEntry[] {
  return items
    .filter((item) => item.kind !== "note")
    .map((item) => {
      const outbound = item.direction === "outbound";
      return {
        _id: item.messageId || item.id,
        timelineId: item.id,
        timelineKind: item.kind,
        fromTimeline: true,
        leadId,
        channel: item.channel,
        direction: item.direction || "inbound",
        body: item.body,
        text: item.body,
        subject: item.subject,
        createdAt: item.occurredAt,
        status: item.status?.code,
        statusLabel: item.status?.label,
        smsFailureMessage: item.status?.failureMessage,
        errorDetail: item.status?.errorDetail,
        sentBy: outbound ? { userId: item.author.userId || undefined, name: item.author.name } : undefined,
        senderName: item.author.name,
        authorKind: item.author.kind,
        call: item.call,
        inquiry: item.inquiry,
        attachments: item.attachments,
        isLeadFallback: item.kind === "inquiry" && Boolean(item.inquiry?.isOriginal),
      };
    });
}

export function liveThreadMessage(raw: ThreadEntry, channel: "sms" | "webchat"): ThreadEntry {
  const code = toDeliveryCode(raw?.status ? String(raw.status) : undefined) || (raw?.direction === "inbound" ? "received" : "sent");
  return {
    ...raw,
    channel,
    fromTimeline: true,
    status: code,
    statusLabel: DELIVERY_LABELS[code],
  };
}

export function mergeThreadStatuses(previous: ThreadEntry[] | undefined, next: ThreadEntry[]): ThreadEntry[] {
  if (!previous?.length) return next;
  const known = new Map(previous.map((message) => [String(message?._id || ""), message]));
  return next.map((message) => {
    const before = known.get(String(message?._id || ""));
    if (!before?.status || !message?.status) return message;
    const status = laterStatus(String(before.status), String(message.status));
    if (!status || status === message.status) return message;
    return {
      ...message,
      status,
      statusLabel: DELIVERY_LABELS[status],
      smsFailureMessage: before.smsFailureMessage || message.smsFailureMessage,
    };
  });
}
