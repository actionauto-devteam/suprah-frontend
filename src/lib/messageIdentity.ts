type IdentifiableMessage = {
  _id?: unknown;
  id?: unknown;
  messageId?: unknown;
  providerMessageId?: unknown;
} | null | undefined;

type ThreadMessage = {
  _id?: unknown;
  id?: unknown;
  messageId?: unknown;
  providerMessageId?: unknown;
  isLeadFallback?: unknown;
  direction?: unknown;
  leadId?: unknown;
  body?: unknown;
  createdAt?: unknown;
} | null | undefined;

type InquiryLead = {
  _id?: unknown;
  comments?: unknown;
  createdAt?: unknown;
} | null | undefined;

const STORED_INQUIRY_WINDOW_MS = 10 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

export function messageIdentityKeys(message: IdentifiableMessage): string[] {
  const keys: string[] = [];
  const recordId = message?._id || message?.id || message?.messageId;
  if (recordId) keys.push(`record:${String(recordId)}`);
  if (message?.providerMessageId) keys.push(`provider:${String(message.providerMessageId)}`);
  return keys;
}

export function withoutRepeatedRecords<T extends IdentifiableMessage>(messages: T[]): Array<{ message: T; index: number }> {
  const seen = new Set<string>();
  const unique: Array<{ message: T; index: number }> = [];
  messages.forEach((message, index) => {
    const keys = messageIdentityKeys(message);
    if (keys.some((key) => seen.has(key))) return;
    keys.forEach((key) => seen.add(key));
    unique.push({ message, index });
  });
  return unique;
}

const timeOf = (value: unknown) => new Date(String(value ?? "")).getTime();

export function isStoredLeadInquiry(message: ThreadMessage, lead: InquiryLead): boolean {
  if (!message || !lead?._id || message.isLeadFallback) return false;
  if (message.direction !== "inbound" || message.providerMessageId) return false;
  if (String(message.leadId ?? "") !== String(lead._id)) return false;
  const comments = String(lead.comments ?? "").trim();
  if (!comments || String(message.body ?? "").trim() !== comments) return false;
  const leadCreated = timeOf(lead.createdAt);
  const messageCreated = timeOf(message.createdAt);
  if (!Number.isFinite(leadCreated) || !Number.isFinite(messageCreated)) return false;
  const delta = messageCreated - leadCreated;
  return delta >= -CLOCK_SKEW_MS && delta <= STORED_INQUIRY_WINDOW_MS;
}

export function visibleThreadEntries<T extends ThreadMessage>(messages: T[], lead: InquiryLead): Array<{ message: T; index: number }> {
  const unique = withoutRepeatedRecords(messages);
  if (!unique.some(({ message }) => isStoredLeadInquiry(message, lead))) return unique;
  return unique.filter(({ message }) => !message?.isLeadFallback);
}
