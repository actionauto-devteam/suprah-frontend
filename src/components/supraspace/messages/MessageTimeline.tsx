'use client';

import * as React from 'react';
import type { SSMessage } from '@/hooks/useSupraSpaceSocket';

type MessageTimelineProps = {
  messages: SSMessage[];
  unreadBoundaryMessageId?: string | null;
  dateLabel: (date: string) => string;
  renderDateSeparator: (date: string) => React.ReactNode;
  renderUnreadSeparator?: () => React.ReactNode;
  renderMessage: (message: SSMessage, options: { showAvatar: boolean; hideTime: boolean }) => React.ReactNode;
};

export const MessageTimeline = React.memo(function MessageTimeline({ messages, unreadBoundaryMessageId, dateLabel, renderDateSeparator, renderUnreadSeparator, renderMessage }: MessageTimelineProps) {
  const entries = React.useMemo(() => {
    return messages.map((message, index) => {
      const previous = messages[index - 1] || null;
      const next = messages[index + 1] || null;
      const date = dateLabel(message.createdAt);
      const previousDate = previous ? dateLabel(previous.createdAt) : null;
      const nextDate = next ? dateLabel(next.createdAt) : null;
      const showDate = !previous || date !== previousDate;
      const showAvatar = !previous || previous.sender?._id !== message.sender?._id || showDate;
      const hideTime = Boolean(
        next
        && next.sender?._id === message.sender?._id
        && nextDate === date
        && new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() < 5 * 60 * 1000,
      );
      return { message, showDate, showAvatar, hideTime };
    });
  }, [dateLabel, messages]);

  return <>{entries.map(({ message, showDate, showAvatar, hideTime }) => {
    return (
      <React.Fragment key={message._id}>
        {showDate && renderDateSeparator(message.createdAt)}
        {message._id === unreadBoundaryMessageId && renderUnreadSeparator?.()}
        <div id={`ss4-msg-${message._id}`}>
          {renderMessage(message, { showAvatar, hideTime })}
        </div>
      </React.Fragment>
    );
  })}</>;
});
