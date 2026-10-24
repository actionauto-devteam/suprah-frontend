import { apiClient } from "../api-client";

export type ComposerChannel = "sms" | "email";

export interface ReplyChannelOption {
  available: boolean;
  code: string | null;
  reason: string | null;
  recipient: string | null;
}

export interface LeadReplyOptions {
  leadId: string;
  mode: "webchat" | "direct";
  defaultChannel: ComposerChannel | null;
  sms: ReplyChannelOption;
  email: ReplyChannelOption & { subject: string; subjectLocked: boolean };
}

export async function fetchLeadReplyOptions(leadId: string): Promise<LeadReplyOptions> {
  const res = await apiClient.get(`/api/leads/${leadId}/reply-options`);
  return res.data?.data as LeadReplyOptions;
}

export function formatSmsRecipient(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(raw);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : raw;
}

export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const SEND_UNCERTAIN_CODE = "SEND_UNCERTAIN";
export const SEND_IN_PROGRESS_CODE = "SEND_IN_PROGRESS";
export const RECIPIENT_CHANGED_CODE = "RECIPIENT_CHANGED";
