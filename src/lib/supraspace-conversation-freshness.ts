/**
 * A conversation request is only a snapshot. A socket message can arrive after
 * that request begins but before its response is applied; never let that older
 * snapshot move the conversation backwards in the UI.
 */
export type SupraSpaceConversationActivity = {
  lastMessageAt?: string | null;
  lastMessage?: { createdAt?: string | null } | null;
  lastReaction?: { createdAt?: string | null } | null;
};

function timestamp(value?: string | null): number {
  if (!value) return 0;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : 0;
}

export function getSupraSpaceConversationActivityAt(conversation: SupraSpaceConversationActivity): number {
  return timestamp(conversation.lastMessageAt)
    || timestamp(conversation.lastReaction?.createdAt)
    || timestamp(conversation.lastMessage?.createdAt);
}

export function hasNewerSupraSpaceConversationActivity(
  current: SupraSpaceConversationActivity,
  snapshot: SupraSpaceConversationActivity,
): boolean {
  return getSupraSpaceConversationActivityAt(current) > getSupraSpaceConversationActivityAt(snapshot);
}
