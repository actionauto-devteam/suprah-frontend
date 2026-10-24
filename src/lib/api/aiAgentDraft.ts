import { apiClient } from "../api-client";
import { AI_AGENT_NAME_REQUIRED_CODE } from "../aiAgentIdentity";

export type AiDraftChannel = "sms" | "email" | "webchat";

export interface AiAgentDraft {
  draft: string;
  channel: AiDraftChannel;
  agentName: string;
  note: string | null;
}

export const AI_DRAFT_FAILED_MESSAGE = "Couldn't generate a reply right now. Please try again.";
export const AI_DRAFT_TIMEOUT_MS = 45_000;

const KEEP_SERVER_MESSAGE = new Set([
  AI_AGENT_NAME_REQUIRED_CODE,
  "AI_DRAFT_UNSAFE",
  "AI_DRAFT_IN_PROGRESS",
  "AI_DRAFT_WRONG_CHANNEL",
  "AI_DRAFT_RATE_LIMITED",
  "CONTACT_RESTRICTED",
  "CONTACT_RESTRICTION_UNAVAILABLE",
  "lead_closed",
]);

const NOT_RETRYABLE = new Set([
  AI_AGENT_NAME_REQUIRED_CODE,
  "AI_DRAFT_WRONG_CHANNEL",
  "CONTACT_RESTRICTED",
  "lead_closed",
]);

export interface AiDraftFailure {
  code: string | null;
  message: string;
  retryable: boolean;
  nameRequired: boolean;
}

export function describeAiDraftFailure(error: unknown): AiDraftFailure {
  const response = (error as { response?: { status?: number; data?: { message?: unknown; errors?: Array<{ code?: unknown }> } } })?.response;
  const code = typeof response?.data?.errors?.[0]?.code === "string" ? String(response.data.errors[0].code) : null;
  const serverMessage = typeof response?.data?.message === "string" ? response.data.message.trim() : "";
  const keep = Boolean(code && KEEP_SERVER_MESSAGE.has(code) && serverMessage);
  return {
    code,
    message: keep ? serverMessage : AI_DRAFT_FAILED_MESSAGE,
    retryable: !code || !NOT_RETRYABLE.has(code),
    nameRequired: code === AI_AGENT_NAME_REQUIRED_CODE,
  };
}

export async function requestAiAgentDraft(leadId: string, channel: AiDraftChannel): Promise<AiAgentDraft> {
  const res = await apiClient.post(`/api/leads/${leadId}/ai-draft`, { channel }, { timeout: AI_DRAFT_TIMEOUT_MS });
  const data = (res.data?.data || {}) as Partial<AiAgentDraft>;
  const draft = String(data.draft || "").trim();
  if (!draft) throw new Error("empty draft");
  return {
    draft,
    channel: (data.channel as AiDraftChannel) || channel,
    agentName: String(data.agentName || ""),
    note: data.note ? String(data.note) : null,
  };
}
