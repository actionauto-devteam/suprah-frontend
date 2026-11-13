import { apiClient } from "../api-client";

export type ComposerChannel = "sms" | "email";

export interface ReplyChannelOption {
  available: boolean;
  code: string | null;
  reason: string | null;
  recipient: string | null;
  sender?: { number: string; label: string };
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

export function noServerAnswerMessage(error: unknown): string | null {
  const err = error as {
    isAxiosError?: boolean;
    config?: unknown;
    code?: string;
    message?: string;
    response?: { data?: { message?: unknown } };
  } | null;
  if (!err || !(err.isAxiosError || err.config)) return null;
  const serverMessage = err.response?.data?.message;
  if (typeof serverMessage === "string" && serverMessage.trim()) return null;
  const timedOut = err.code === "ECONNABORTED" || err.code === "ETIMEDOUT" || /timeout/i.test(String(err.message || ""));
  if (timedOut) return "Suprah took too long to answer, so we can't tell if your message went out. Check the conversation before sending again.";
  if (!err.response) return "Couldn't reach Suprah. Check your internet connection, then check the conversation before sending again.";
  return "Suprah is busy or restarting right now. Wait a moment, check the conversation, then try again.";
}

export const SEND_UNCERTAIN_CODE = "SEND_UNCERTAIN";
export const SEND_IN_PROGRESS_CODE = "SEND_IN_PROGRESS";
export const RECIPIENT_CHANGED_CODE = "RECIPIENT_CHANGED";
