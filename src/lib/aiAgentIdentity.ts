export const AI_AGENT_FALLBACK_LABEL = "AI Agent";
export const AI_AGENT_NAME_MAX_LENGTH = 40;
export const AI_AGENT_NAME_REQUIRED_CODE = "AI_AGENT_NAME_REQUIRED";
export const AI_AGENT_NAME_REQUIRED_MESSAGE = "Set an AI Agent name in CRM Settings to enable AI features.";
export const AI_AGENT_SETTINGS_HREF = "/crm/settings/ai-agent?tab=modes";
export const AI_AGENT_IDENTITY_QUERY_KEY = ["ai-agent-identity"] as const;

export function cleanAiAgentName(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, AI_AGENT_NAME_MAX_LENGTH)
    .trim();
}

export function isValidAiAgentName(value: unknown): boolean {
  return /\p{L}/u.test(cleanAiAgentName(value));
}

export function configuredAiAgentName(value: unknown): string | null {
  const name = cleanAiAgentName(value);
  return isValidAiAgentName(name) ? name : null;
}

export function aiAgentDisplayName(name: string | null | undefined): string {
  return name || AI_AGENT_FALLBACK_LABEL;
}
