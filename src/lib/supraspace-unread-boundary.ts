export type SupraSpaceReadStateMessage = {
  _id: string;
  sender?: { _id?: string | null } | null;
  readBy?: string[] | null;
  isDeleted?: boolean;
};

export function findSupraSpaceUnreadBoundary(
  messages: SupraSpaceReadStateMessage[],
  viewerId: string,
  expectedUnreadCount: number | undefined,
): string | null {
  if (!viewerId || !expectedUnreadCount || expectedUnreadCount < 1) return null;

  const unreadMessages = messages.filter(message =>
    !message.isDeleted
    && message.sender?._id !== viewerId
    && !(message.readBy || []).includes(viewerId),
  );

  if (unreadMessages.length < expectedUnreadCount) return null;
  return unreadMessages[0]?._id || null;
}
