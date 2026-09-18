'use client';

import * as React from 'react';
import type { SSMessage } from '@/hooks/useSupraSpaceSocket';

type PinEvent = { id: string; pinnerName: string; msgId: string };

type MessageTimelineProps = {
  messages: SSMessage[];
  pinEvents: PinEvent[];
  dateLabel: (date: string) => string;
  renderDateSeparator: (date: string) => React.ReactNode;
  renderMessage: (message: SSMessage, options: { showAvatar: boolean; hideTime: boolean }) => React.ReactNode;
};

export const MessageTimeline = React.memo(function MessageTimeline({ messages, pinEvents, dateLabel, renderDateSeparator, renderMessage }: MessageTimelineProps) {
  const entries = React.useMemo(() => {
    const pinEventsByMessageId = new Map(pinEvents.map(event => [event.msgId, event]));
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
      return { message, showDate, showAvatar, hideTime, pinEvent: pinEventsByMessageId.get(message._id) };
    });
  }, [dateLabel, messages, pinEvents]);

  return <>{entries.map(({ message, showDate, showAvatar, hideTime, pinEvent }) => {
    return (
      <React.Fragment key={message._id}>
        {showDate && renderDateSeparator(message.createdAt)}
        <div id={`ss4-msg-${message._id}`}>
          {renderMessage(message, { showAvatar, hideTime })}
        </div>
        {pinEvent && (
          <div className="flex items-center justify-center px-3 py-1 my-0.5 sm:px-4 sm:py-1.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full sm:px-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 14 }}>{'\u{1f4cc}'}</span>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pinEvent.pinnerName}</span>{' pinned a message to the board'}
              </p>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  })}</>;
});
