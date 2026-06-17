'use client';

import * as React from 'react';
import { X, Minus, Send, Loader2, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, resolveImageUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';
import { SSMessage } from '@/hooks/useSupraSpaceSocket';

// ─── Layout constants ─────────────────────────────────────────────────────────
const POPUP_W     = 320;
const POPUP_GAP   = 8;
const POPUP_RIGHT = 16;   // distance from right edge of viewport
const POPUP_H     = 400;  // expanded height (px)
const HEADER_H    = 48;   // minimized / header-only height

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(conv: SSConv, myId: string | null): string {
  if (conv.type === 'group') return conv.name || 'Group';
  return conv.members.find((m) => m._id !== myId)?.fullName ?? 'Unknown';
}

function getAvatarSrc(conv: SSConv, myId: string | null): string | undefined {
  if (conv.type === 'group') return conv.avatar;
  return conv.members.find((m) => m._id !== myId)?.avatar;
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function msgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderContent(msg: SSMessage): string {
  const map: Record<string, string> = {
    image: '📷 Photo',
    voice: '🎤 Voice message',
    gif:   '🎬 GIF',
    file:  '📎 File',
    poll:  '📊 Poll',
    event: '📅 Event',
  };
  return map[msg.type] ?? msg.content ?? '';
}

// ─── Single popup ─────────────────────────────────────────────────────────────

interface ChatPopupProps {
  conv: SSConv;
  stackIndex: number; // 0 = rightmost
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

function ChatPopup({
  conv,
  stackIndex,
  isMinimized,
  onClose,
  onToggleMinimize,
}: ChatPopupProps) {
  const { crmUserId, crmToken, socket, markAsRead } = useSupraSpaceMessenger();
  const [messages, setMessages] = React.useState<SSMessage[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [input,    setInput]    = React.useState('');
  const [sending,  setSending]  = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef  = React.useRef<HTMLInputElement>(null);

  const displayName = getDisplayName(conv, crmUserId);
  const avatarSrc   = getAvatarSrc(conv, crmUserId);
  const rightPx     = POPUP_RIGHT + stackIndex * (POPUP_W + POPUP_GAP);

  // Fetch messages when first opened or un-minimized
  React.useEffect(() => {
    if (!crmToken) return;
    setLoading(true);
    apiClient
      .get(`/api/supraspace/conversations/${conv._id}/messages`, {
        headers: { Authorization: `Bearer ${crmToken}` },
        params: { limit: 40 },
        _skipAuthRefresh: true,
      } as any)
      .then((r) => {
        setMessages(r.data?.data ?? []);
        markAsRead(conv._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // Only re-fetch when conv changes or token changes — not on every minimize toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv._id, crmToken]);

  // Mark as read when un-minimized
  React.useEffect(() => {
    if (!isMinimized && messages.length > 0) markAsRead(conv._id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinimized]);

  // Receive real-time messages from the shared global socket
  React.useEffect(() => {
    if (!socket) return;
    const handler = ({
      conversationId,
      message,
    }: {
      conversationId: string;
      message: SSMessage;
    }) => {
      if (conversationId !== conv._id) return;
      setMessages((prev) =>
        prev.find((m) => m._id === message._id) ? prev : [...prev, message]
      );
      if (!isMinimized) markAsRead(conv._id);
    };
    socket.on('message:new', handler);
    return () => { socket.off('message:new', handler); };
  }, [socket, conv._id, isMinimized, markAsRead]);

  // Auto-scroll to newest message
  React.useEffect(() => {
    if (!isMinimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized]);

  // Focus input when opened / un-minimized
  React.useEffect(() => {
    if (!isMinimized) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isMinimized]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !crmToken) return;
    setInput('');
    setSending(true);
    try {
      const r = await apiClient.post(
        `/api/supraspace/conversations/${conv._id}/messages`,
        { content: text },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any
      );
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages((prev) => [...prev, sent]);
    } catch { /* ignored */ } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="fixed bottom-0 z-50 flex flex-col shadow-2xl rounded-t-xl overflow-hidden border border-border/60 bg-card"
      style={{
        width:      POPUP_W,
        right:      rightPx,
        height:     isMinimized ? HEADER_H : POPUP_H,
        transition: 'height 0.2s ease',
      }}
    >
      {/* ── Header ── */}
      <div
        className="h-12 shrink-0 flex items-center gap-2.5 px-3 bg-gradient-to-r from-blue-600 to-blue-500 cursor-pointer select-none"
        onClick={onToggleMinimize}
      >
        <Avatar className="h-7 w-7 shrink-0">
          {avatarSrc && <AvatarImage src={resolveImageUrl(avatarSrc)} />}
          <AvatarFallback className="text-[10px] font-semibold bg-blue-400 text-white">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>

        <span className="text-[13px] font-semibold text-white truncate flex-1">
          {displayName}
        </span>

        <button
          className="shrink-0 text-white/80 hover:text-white transition-colors p-0.5 rounded"
          onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          <Minus className="size-3.5" />
        </button>

        <button
          className="shrink-0 text-white/80 hover:text-white transition-colors p-0.5 rounded"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* ── Body (hidden when minimized) ── */}
      {!isMinimized && (
        <>
          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-3 py-2 bg-background min-h-0 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="size-6 text-muted-foreground/30 mb-2" />
                <p className="text-[11px] text-muted-foreground">
                  No messages yet
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.isDeleted) return null;
                const isOwn = msg.sender?._id === crmUserId;
                return (
                  <div
                    key={msg._id}
                    className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[76%] px-3 py-1.5 rounded-2xl text-[12px] leading-relaxed break-words',
                        isOwn
                          ? 'bg-blue-500 text-white rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      )}
                    >
                      {renderContent(msg)}
                      <div
                        className={cn(
                          'text-[9px] mt-0.5',
                          isOwn ? 'text-white/60 text-right' : 'text-muted-foreground'
                        )}
                      >
                        {msgTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-t border-border/50 bg-card">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 text-[12px] bg-muted/50 rounded-full px-3 py-1.5 outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-blue-500/40 min-w-0"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full shrink-0 text-blue-500 hover:bg-blue-500/10 disabled:opacity-40"
              disabled={!input.trim() || sending}
              onClick={handleSend}
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Manager ──────────────────────────────────────────────────────────────────

export function ChatPopupManager() {
  const { conversations, openChats, minimizedChats, closeChatPopup, toggleMinimize } =
    useSupraSpaceMessenger();

  if (openChats.length === 0) return null;

  return (
    <>
      {openChats.map((convId, index) => {
        const conv = conversations.find((c) => c._id === convId);
        if (!conv) return null;
        return (
          <ChatPopup
            key={convId}
            conv={conv}
            stackIndex={index}
            isMinimized={minimizedChats.has(convId)}
            onClose={() => closeChatPopup(convId)}
            onToggleMinimize={() => toggleMinimize(convId)}
          />
        );
      })}
    </>
  );
}
