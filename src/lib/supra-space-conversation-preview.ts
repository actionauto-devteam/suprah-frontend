import { stripSupraSpaceFormattingForPreview } from './supra-space-message-formatting';

export type SupraSpacePreviewMessage = {
  content?: string | null;
  type?: string | null;
  attachments?: unknown[] | null;
  isDeleted?: boolean | null;
  createdAt?: string | null;
  sender?: { _id?: string | null; fullName?: string | null } | null;
  poll?: { question?: string | null } | null;
  event?: { title?: string | null } | null;
};

export type SupraSpacePreviewReaction = {
  userId?: string | null;
  userName?: string | null;
  emoji?: string | null;
  createdAt?: string | null;
} | null | undefined;

export type SupraSpaceConversationPreview = {
  text: string;
  senderPrefix: string;
  isReaction: boolean;
};

function timestamp(value?: string | null): number {
  const result = value ? new Date(value).getTime() : 0;
  return Number.isFinite(result) ? result : 0;
}

function reactionPreview(
  reaction: SupraSpacePreviewReaction,
  message: SupraSpacePreviewMessage | null | undefined,
  viewerId?: string | null,
): string | null {
  if (
    !reaction?.emoji
    || !viewerId
    || reaction.userId === viewerId
    || message?.sender?._id !== viewerId
    || timestamp(reaction.createdAt) <= 0
    || timestamp(reaction.createdAt) < timestamp(message?.createdAt)
  ) return null;

  const name = reaction.userName?.trim().split(/\s+/)[0] || 'Someone';
  return `${name} reacted ${reaction.emoji} to your message`;
}

function messagePreview(message: SupraSpacePreviewMessage): string {
  if (message.isDeleted) return 'Message deleted';

  if (message.type === 'voice') return '🎤 Voice message';
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'gif') return '🎬 GIF';
  if (message.type === 'file') return '📎 File';
  if (message.type === 'poll') return `📊 ${message.poll?.question || 'Poll'}`;
  if (message.type === 'event') return `📅 ${message.event?.title || 'Event'}`;

  return getSupraSpaceMessagePreviewText(message.content)
    || (message.attachments?.length ? '📎 Attachment' : 'No messages yet');
}

export function getSupraSpaceMessagePreviewText(content?: string | null): string {
  return stripSupraSpaceFormattingForPreview(content);
}

export function getSupraSpaceConversationPreview({
  lastMessage,
  lastReaction,
  unreadCount = 0,
  conversationType,
  viewerId,
}: {
  lastMessage?: SupraSpacePreviewMessage | null;
  lastReaction?: SupraSpacePreviewReaction;
  unreadCount?: number | null;
  conversationType?: 'direct' | 'group' | null;
  viewerId?: string | null;
}): SupraSpaceConversationPreview {
  if ((unreadCount || 0) >= 2) return { text: `${unreadCount} new messages`, senderPrefix: '', isReaction: false };

  const reaction = reactionPreview(lastReaction, lastMessage, viewerId);
  if (reaction) return { text: reaction, senderPrefix: '', isReaction: true };

  if (!lastMessage) return { text: 'No messages yet', senderPrefix: '', isReaction: false };

  const senderName = lastMessage.sender?.fullName?.trim().split(/\s+/)[0];
  return {
    text: messagePreview(lastMessage),
    senderPrefix: conversationType === 'group' && lastMessage.sender?._id !== viewerId && senderName ? `${senderName}: ` : '',
    isReaction: false,
  };
}
