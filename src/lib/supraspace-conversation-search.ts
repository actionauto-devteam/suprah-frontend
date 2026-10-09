type SearchMember = { fullName?: string | null; username?: string | null };

type SearchConversation = {
  _id: string;
  name?: string | null;
  members?: SearchMember[] | null;
  lastMessageAt?: string | null;
  lastMessage?: { createdAt?: string | null } | null;
};

export function normalizeSupraSpaceConversationSearch(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function supraSpaceConversationSearchScore(
  conversation: SearchConversation,
  displayName: string,
  query: string | null | undefined,
): number | null {
  const needle = normalizeSupraSpaceConversationSearch(query);
  if (!needle) return 0;
  const terms = needle.split(' ');
  const candidates = [displayName, conversation.name || '', ...(conversation.members || []).flatMap(member => [member.fullName || '', member.username || ''])]
    .map(normalizeSupraSpaceConversationSearch)
    .filter(Boolean);
  const exact = candidates.some(candidate => candidate === needle);
  if (exact) return 0;
  const starts = candidates.some(candidate => candidate.startsWith(needle));
  if (starts) return 1;
  const contains = candidates.some(candidate => candidate.includes(needle));
  if (contains) return 2;
  const combined = candidates.join(' ');
  return terms.every(term => combined.includes(term)) ? 3 : null;
}

export function filterSupraSpaceConversations<T extends SearchConversation>(
  conversations: T[],
  displayName: (conversation: T) => string,
  query: string | null | undefined,
): T[] {
  const normalizedQuery = normalizeSupraSpaceConversationSearch(query);
  if (!normalizedQuery) return conversations;
  return conversations
    .map((conversation, index) => ({ conversation, index, score: supraSpaceConversationSearchScore(conversation, displayName(conversation), normalizedQuery) }))
    .filter((entry): entry is { conversation: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(entry => entry.conversation);
}

export function recentSupraSpaceConversations<T extends SearchConversation>(conversations: T[], limit = 8): T[] {
  const seen = new Set<string>();
  return conversations
    .filter(conversation => {
      if (!conversation._id || seen.has(conversation._id)) return false;
      seen.add(conversation._id);
      return true;
    })
    .sort((a, b) => new Date(b.lastMessageAt || b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessageAt || a.lastMessage?.createdAt || 0).getTime())
    .slice(0, limit);
}
