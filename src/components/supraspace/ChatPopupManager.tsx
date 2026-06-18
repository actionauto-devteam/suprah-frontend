'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { X, Minus, Send, Loader2, MessageCircle, MoreHorizontal, Check } from 'lucide-react';
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

const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Photo',
  voice: '🎤 Voice message',
  gif:   '🎬 GIF',
  file:  '📎 File',
  poll:  '📊 Poll',
  event: '📅 Event',
};

function renderContent(msg: SSMessage, isOwn: boolean): React.ReactNode {
  const label = MEDIA_LABELS[msg.type];
  if (label) return label;
  const text = msg.content ?? '';
  const parts = text.split(/(@\w+)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        /^@\w+/.test(part) ? (
          <span
            key={i}
            className="font-bold"
            style={isOwn
              ? { color: 'rgba(255,255,255,0.95)', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' }
              : { color: '#60a5fa' }
            }
          >
            {part}
          </span>
        ) : part
      )}
    </>
  );
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
  const [fetchError, setFetchError] = React.useState(false);
  const [input,    setInput]    = React.useState('');
  const [sending,  setSending]  = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef  = React.useRef<HTMLInputElement>(null);

  // @mention state
  const [mentionQuery,  setMentionQuery]  = React.useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = React.useState<number>(-1);
  const [mentionIdx,    setMentionIdx]    = React.useState(0);

  const [hovMsg, setHovMsg] = React.useState<string | null>(null);
  const [menuMsg, setMenuMsg] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuMsg) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuMsg(null); setHovMsg(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuMsg]);

  const handleReact = async (messageId: string, emoji: string) => {
    setMenuMsg(null); setHovMsg(null);
    try {
      await apiClient.post(`/api/supraspace/messages/${messageId}/react`, { emoji },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
    } catch { /* best-effort */ }
  };

  const msgSeenByMembers = React.useMemo(() => {
    const lastSeen: Record<string, string> = {};
    messages.forEach(m => { (m.readBy || []).forEach((id: string) => { if (id !== crmUserId) lastSeen[id] = m._id; }); });
    const result: Record<string, {_id:string;fullName:string;avatar?:string}[]> = {};
    conv.members.forEach(member => {
      if (member._id === crmUserId) return;
      const lastMsgId = lastSeen[member._id];
      if (lastMsgId) { if (!result[lastMsgId]) result[lastMsgId] = []; result[lastMsgId].push(member); }
    });
    return result;
  }, [messages, conv.members, crmUserId]);
  const displayName = getDisplayName(conv, crmUserId);
  const avatarSrc   = getAvatarSrc(conv, crmUserId);
  const rightPx     = POPUP_RIGHT + stackIndex * (POPUP_W + POPUP_GAP);

  const mentionOptions = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const allOpt = conv.type === 'group'
      ? [{ id: 'all', name: 'all', fullName: 'Notify all members' }]
      : [];
    const memberOpts = conv.members
      .filter(m => m._id !== crmUserId)
      .map(m => ({ id: m._id, name: m.fullName.split(' ')[0].toLowerCase(), fullName: m.fullName }));
    const opts = [...allOpt, ...memberOpts];
    if (!q) return opts;
    return opts.filter(o => o.name.startsWith(q) || o.fullName.toLowerCase().includes(q));
  }, [mentionQuery, conv, crmUserId]);

  const insertMention = React.useCallback((name: string) => {
    const before = input.slice(0, mentionAnchor);
    const after  = input.slice(mentionAnchor + 1 + (mentionQuery?.length ?? 0));
    const next   = `${before}@${name} ${after}`;
    setInput(next);
    setMentionQuery(null);
    setMentionAnchor(-1);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + name.length + 2;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  }, [input, mentionAnchor, mentionQuery]);

  // Fetch messages — use context token or fall back to localStorage directly
  const fetchMessages = React.useCallback(async () => {
    const effectiveToken = crmToken || (typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null);
    if (!effectiveToken) return;
    setLoading(true);
    setFetchError(false);
    try {
      const r = await apiClient.get(`/api/supraspace/conversations/${conv._id}/messages`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
        params: { limit: 40 },
      });
      setMessages(r.data?.data ?? []);
      markAsRead(conv._id);
    } catch (err: any) {
      console.error('[ChatPopup] messages fetch failed:', err?.response?.status, err?.response?.data ?? err?.message);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv._id, crmToken]);

  React.useEffect(() => { fetchMessages(); }, [fetchMessages]);

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
    setMentionQuery(null);
    setMentionAnchor(-1);
    setSending(true);
    try {
      const r = await apiClient.post(
        `/api/supraspace/conversations/${conv._id}/messages`,
        { content: text },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any
      );
      const sent: SSMessage = r.data?.data;
      // Guard against socket delivering the same message before the API response lands
      if (sent) setMessages((prev) => prev.find((m) => m._id === sent._id) ? prev : [...prev, sent]);
    } catch { /* ignored */ } finally {
      setSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const cursor = e.target.selectionStart ?? val.length;
    const match  = val.slice(0, cursor).match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionAnchor(cursor - match[0].length);
      setMentionIdx(0);
    } else {
      setMentionQuery(null);
      setMentionAnchor(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionOptions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionOptions[mentionIdx].name); return; }
      if (e.key === 'Escape')    { setMentionQuery(null); setMentionAnchor(-1); return; }
    }
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
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <MessageCircle className="size-6 text-muted-foreground/30" />
                <p className="text-[11px] text-muted-foreground">
                  {fetchError ? 'Failed to load messages' : 'No messages yet'}
                </p>
                {fetchError && (
                  <button onClick={fetchMessages} className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2">Retry</button>
                )}
              </div>
            ) : (
              messages.map((msg, idx) => {
                if (msg.isDeleted) return null;
                const isOwn = msg.sender?._id === crmUserId;
                const isHov = hovMsg === msg._id;
                const isMenuOpen = menuMsg === msg._id;
                const prevVisible = messages.slice(0, idx).findLast(m => !m.isDeleted);
                const showName = !isOwn &&
                  (!prevVisible || prevVisible.sender?._id !== msg.sender?._id);
                return (
                  <div
                    key={msg._id}
                    className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
                    onMouseEnter={() => setHovMsg(msg._id)}
                    onMouseLeave={() => { if (menuMsg !== msg._id) setHovMsg(null); }}
                  >
                    {showName && (
                      <span className="px-1 mb-0.5 text-[10px] font-semibold" style={{ color: 'var(--accent-text,#60a5fa)' }}>
                        {msg.sender?.fullName}
                      </span>
                    )}
                    <div className="relative max-w-[76%]">
                      <div
                        className={cn(
                          'px-3 py-1.5 rounded-2xl text-[12px] leading-relaxed break-words',
                          isOwn
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        )}
                      >
                        {renderContent(msg, isOwn)}
                        {isOwn ? (
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[9px] text-white/60">{msgTime(msg.createdAt)}</span>
                            {(() => {
                              const seenMembers = msgSeenByMembers[msg._id] || [];
                              if (seenMembers.length === 0) return <Check className="h-2.5 w-2.5 text-white/50" />;
                              return (
                                <div className="flex items-center" style={{ gap: 1 }}>
                                  {seenMembers.slice(0, 3).map(m => (
                                    <div key={m._id} title={m.fullName}
                                      className="h-3 w-3 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white"
                                      style={{ fontSize: 5, background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
                                      {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : m.fullName[0]?.toUpperCase()}
                                    </div>
                                  ))}
                                  {seenMembers.length > 3 && <span className="text-[8px] text-white/60">+{seenMembers.length - 3}</span>}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-[9px] mt-0.5 text-muted-foreground">{msgTime(msg.createdAt)}</div>
                        )}
                      </div>
                      {isHov && (
                        <div className={cn('absolute -top-2.5 z-20', isOwn ? '-left-2.5' : '-right-2.5')}>
                          <button
                            className="h-5 w-5 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--surface-2,#23242a)', color: 'var(--text-secondary)', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', border: '1px solid var(--border,rgba(255,255,255,0.08))' }}
                            onClick={(e) => { e.stopPropagation(); setMenuMsg(isMenuOpen ? null : msg._id); }}
                            title="React"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                          {isMenuOpen && (
                            <div ref={menuRef} className={cn('absolute bottom-full mb-1 flex items-center gap-0.5 px-1.5 py-1 rounded-xl', isOwn ? 'right-0' : 'left-0')}
                              style={{ background: 'var(--surface-1,#1a1b1e)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                              {['❤️', '😂', '👍', '😮', '😢', '🎉'].map(emoji => (
                                <button key={emoji}
                                  className="hover:bg-white/10 rounded px-1 py-0.5 text-sm transition-colors leading-none"
                                  onClick={() => handleReact(msg._id, emoji)}
                                >{emoji}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-border/50 bg-card">
            {/* @mention dropdown */}
            {mentionQuery !== null && mentionOptions.length > 0 && (
              <div className="px-1 pt-1 pb-0.5 border-b border-border/40 max-h-32 overflow-y-auto">
                {mentionOptions.map((opt, idx) => (
                  <button
                    key={opt.id}
                    onMouseDown={e => { e.preventDefault(); insertMention(opt.name); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[11px] transition-colors',
                      idx === mentionIdx ? 'bg-blue-500/15 text-blue-400' : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    <span className="font-semibold text-blue-400">@{opt.name}</span>
                    <span className="text-muted-foreground truncate">{opt.fullName}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 px-2 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => { setMentionQuery(null); setMentionAnchor(-1); }, 150)}
                placeholder="Type a message..."
                className="flex-1 text-[12px] bg-muted/50 rounded-full px-3 py-1.5 outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-blue-500/40 min-w-0" style={{ fontSize: 16 }}
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
  const pathname = usePathname();

  if (openChats.length === 0) return null;
  if (pathname === '/crm/supra-space') return null;

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
