type SupraSpaceReceiptMessage = {
  _id: string;
  type?: string | null;
  isDeleted?: boolean;
  readBy?: string[] | null;
};

/**
 * A system notice can be the newest persisted record, but it does not have a
 * message bubble that can host a seen-by row. Keep each reader's receipt on
 * their newest visible user message instead.
 */
export function getSupraSpaceLatestReadReceiptMessageIds(
  messages: readonly SupraSpaceReceiptMessage[],
  viewerId?: string | null,
): Record<string, string> {
  const latestByReader: Record<string, string> = {};

  messages.forEach((message) => {
    if (message.isDeleted || message.type === 'system') return;
    (message.readBy || []).forEach((reader) => {
      const readerId = String(reader);
      if (readerId && readerId !== viewerId) latestByReader[readerId] = message._id;
    });
  });

  return latestByReader;
}
