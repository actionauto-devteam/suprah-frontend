'use client';

import * as React from 'react';
import {
  AlertCircle, Archive, Check as CheckIcon, CheckCheck, ChevronLeft, Download,
  FileText, Loader2, MessageSquare, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Paperclip,
  Search, Send, Trash2, UserPlus, Users, Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Avatar, CenterSpinner, PendingFileChip, UploadProgressBar } from './Shared';
import { NewConversationModal } from './NewConversationModal';
import { ManageParticipantsModal } from './ManageParticipantsModal';
import {
  API_BASE, convAvatarSeed, convDisplayName, fmtChatDate, fmtChatTime,
  fmtListDate, fmtSize, getErrorMessage, ini, isGroupConv, senderLabel,
  validateFiles, avaColor,
} from './utils';
import type { ConvAttachment, ConvMessage, ConvPushPayload, MailConv, NewConversationPayload } from './types';

/* ── Attachment bubble ─────────────────────────────────────────────────── */

function ConvAttachmentView({ token, convId, message, att, index }: {
  token: string; convId: string; message: ConvMessage; att: ConvAttachment; index: number;
}) {
  const isImg = att.mimeType.startsWith('image/');
  const own = message.direction === 'outbound';
  // R2-stored files are direct URLs; inbound Gmail files stream through the
  // authenticated proxy (crmAuth accepts ?t= tokens, same as voice notes).
  const href = att.storageUrl
    || `${API_BASE}/api/mail/conversations/${convId}/attachments/${message._id}/${index}?t=${encodeURIComponent(token)}`;

  if (isImg) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden" style={{ maxWidth: 'min(240px, 100%)' }}>
        <img
          src={href}
          alt={att.originalName}
          className="rounded-xl object-cover hover:opacity-90 transition-opacity"
          style={{ maxHeight: 200, display: 'block' }}
        />
      </a>
    );
  }

  return (
    <a
      href={href}
      download={att.originalName}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-opacity hover:opacity-80"
      style={{
        maxWidth: 'min(260px, 100%)',
        background: own ? 'rgba(0,0,0,0.2)' : 'var(--surface-2)',
        border: `1px solid ${own ? 'rgba(255,255,255,0.12)' : 'var(--border-1)'}`,
      }}
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: own ? 'rgba(255,255,255,0.12)' : 'var(--accent-muted)' }}>
        <FileText className="h-4 w-4" style={{ color: own ? 'rgba(255,255,255,0.8)' : 'var(--accent)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate" style={{ color: own ? 'rgba(255,255,255,0.92)' : 'var(--text-primary)' }}>{att.originalName}</p>
        <p className="sm5-mono mt-0.5" style={{ fontSize: 10, color: own ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }}>{fmtSize(att.size)}</p>
      </div>
      <Download className="h-3.5 w-3.5 shrink-0" style={{ color: own ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)' }} />
    </a>
  );
}

/* ── Conversation list row ─────────────────────────────────────────────── */

type ConversationMessageSearchMatch = {
  conversationId: string;
  messageId: string;
  snippet: string;
  fromName?: string;
  fromEmail?: string;
  sentAt: string;
};

function ConvRow({
  conv,
  active,
  collapsed,
  searchMatch,
  onOpen,
  onDelete,
}: {
  conv: MailConv;
  active: boolean;
  collapsed: boolean;
  searchMatch?: ConversationMessageSearchMatch;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const display = convDisplayName(conv);
  const unread = conv.unreadCount > 0;
  const group = isGroupConv(conv);
  const preview = searchMatch?.snippet || conv.lastMessagePreview || conv.subject;
  const previewPrefix = searchMatch
    ? ''
    : conv.lastMessageDirection === 'outbound'
      ? 'You: '
      : (group && conv.lastMessageFromName ? `${conv.lastMessageFromName.split(' ')[0]}: ` : '');

  return (
    <div
      onClick={onOpen}
      className={cn(
        'sm5-conv-row group relative flex items-center gap-2.5 px-3 py-2.5',
        active && 'sm5-conv-active',
        unread && 'bg-emerald-500/5',
        collapsed && '@lg:justify-center @lg:px-2',
      )}
      title={collapsed ? display : undefined}
    >
      <div className="relative shrink-0">
        <Avatar seed={convAvatarSeed(conv)} size={36} fontSize={12} icon={group ? <Users2 className="h-4 w-4" /> : undefined} />
        {collapsed && unread && (
          <span
            className="absolute -right-1 -top-1 hidden min-w-4 rounded-full bg-emerald-600 px-1 text-center text-[8px] font-black leading-4 text-white @lg:block"
            aria-label={`${conv.unreadCount} unread`}
          >
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>
      <div className={cn('min-w-0 flex-1', collapsed && '@lg:hidden')}>
        <div className="flex items-center gap-2">
          <p className={cn('sm5-title-sm truncate', unread ? 'font-bold' : 'font-semibold')}>{display}</p>
          <span className="ml-auto shrink-0 sm5-mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {conv.lastMessageAt ? fmtListDate(new Date(conv.lastMessageAt).getTime()) : ''}
          </span>
        </div>
        <p
          className="sm5-supporting truncate mt-0.5"
          style={{
            fontSize: 12,
            fontWeight: unread ? 600 : 400,
            color: searchMatch
              ? 'var(--accent-text)'
              : unread
                ? 'var(--text-primary)'
                : 'var(--text-tertiary)',
          }}
          title={searchMatch?.snippet}
        >
          {searchMatch && (
            <span className="mr-1 font-bold">Message:</span>
          )}
          {previewPrefix}{preview}
        </p>
        {searchMatch && (
          <p
            className="truncate mt-0.5"
            style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}
          >
            {searchMatch.fromName || searchMatch.fromEmail || 'Email message'}
            {' · '}
            {fmtListDate(new Date(searchMatch.sentAt).getTime())}
          </p>
        )}
      </div>
      {unread && (
        <span
          className={cn(
            'shrink-0 rounded-full text-white font-bold text-center',
            collapsed && '@lg:hidden',
          )}
          style={{ fontSize: 9, minWidth: 17, height: 17, lineHeight: '17px', padding: '0 4px', background: 'var(--accent)' }}
        >
          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
        </span>
      )}
      {/* Desktop-only — mobile gets swipe-to-reveal Archive/Delete instead
          (see SwipeableConvRow), not a persistent icon on every row. */}
      {!collapsed && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="hidden! h-7 w-7 shrink-0 @lg:flex! @lg:opacity-0 @lg:group-hover:opacity-100 sm5-icon-btn"
          title="Delete conversation"
          aria-label="Delete conversation"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ── Swipe-to-reveal (mobile) ─────────────────────────────────────────── */

const SWIPE_ACTION_WIDTH = 72;
const SWIPE_REVEAL_WIDTH = SWIPE_ACTION_WIDTH * 2;
const SWIPE_OPEN_THRESHOLD = SWIPE_REVEAL_WIDTH / 2;

/**
 * Wraps a ConvRow with a touch-only swipe-left gesture that reveals
 * Archive/Delete behind it — the desktop equivalent is ConvRow's own
 * hover-reveal trash icon, not this. Gated on `event.pointerType === 'touch'`
 * so a desktop mouse drag can never trigger it, regardless of window width.
 */
function SwipeableConvRow({
  conv,
  active,
  collapsed,
  searchMatch,
  onOpen,
  onArchive,
  onDelete,
  isOpen,
  onOpenChange,
}: {
  conv: MailConv;
  active: boolean;
  collapsed: boolean;
  searchMatch?: ConversationMessageSearchMatch;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dragX, setDragX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStateRef = React.useRef<{ pointerId: number; startX: number; startDragX: number } | null>(null);
  const draggingRef = React.useRef(false);

  React.useEffect(() => {
    setDragX(isOpen ? -SWIPE_REVEAL_WIDTH : 0);
  }, [isOpen]);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    dragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, startDragX: dragX };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const delta = event.clientX - state.startX;
    if (Math.abs(delta) > 4) draggingRef.current = true;
    setDragX(Math.min(0, Math.max(-SWIPE_REVEAL_WIDTH, state.startDragX + delta)));
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    setIsDragging(false);
    const wasDragging = draggingRef.current;
    draggingRef.current = false;

    if (wasDragging) {
      const nowOpen = dragX <= -SWIPE_OPEN_THRESHOLD;
      onOpenChange(nowOpen);
      return;
    }

    // A tap, not a drag: closes an already-open row instead of opening the
    // thread underneath it; otherwise behaves like a normal row tap.
    if (isOpen) {
      onOpenChange(false);
    } else {
      onOpen();
    }
  };

  // Not just hidden behind the row — unmounted entirely while closed, so a
  // stray sliver of Archive/Delete color can never bleed past the row's edge
  // (subpixel rounding on the translateX cover was leaving a hairline trace).
  const revealed = isDragging || dragX < 0;

  return (
    <div className="relative overflow-hidden">
      {revealed && (
        <div
          className="absolute inset-y-0 right-0 flex @lg:hidden"
          style={{ width: SWIPE_REVEAL_WIDTH }}
        >
          <button
            type="button"
            onClick={() => {
              onArchive();
              onOpenChange(false);
            }}
            style={{ width: SWIPE_ACTION_WIDTH, background: 'var(--warning)' }}
            className="flex flex-col items-center justify-center gap-1 text-white"
          >
            <Archive className="h-4 w-4" />
            <span style={{ fontSize: 9, fontWeight: 700 }}>Archive</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
            style={{ width: SWIPE_ACTION_WIDTH, background: 'var(--danger)' }}
            className="flex flex-col items-center justify-center gap-1 text-white"
          >
            <Trash2 className="h-4 w-4" />
            <span style={{ fontSize: 9, fontWeight: 700 }}>Delete</span>
          </button>
        </div>
      )}

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
          background: 'var(--bg-elevated)',
        }}
      >
        <ConvRow
          conv={conv}
          active={active}
          collapsed={collapsed}
          searchMatch={searchMatch}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

/* ── Chat bubbles ──────────────────────────────────────────────────────── */


function StatusIcon({ m }: { m: ConvMessage }) {
  if (m.status === 'sending') return <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--text-tertiary)' }} />;
  if (m.status === 'failed') return <AlertCircle className="h-3 w-3" style={{ color: 'var(--danger)' }} />;
  if (m.status === 'delivered') return <CheckCheck className="h-3 w-3" style={{ color: 'var(--accent-text)' }} />;
  return <CheckIcon className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />;
}

function ChatBubble({ token, convId, msg, prev, isGroup }: {
  token: string; convId: string; msg: ConvMessage; prev?: ConvMessage; isGroup: boolean;
}) {
  const showDate = !prev || fmtChatDate(prev.sentAt) !== fmtChatDate(msg.sentAt);
  const own = msg.direction === 'outbound';
  // In a group, label an inbound bubble with its sender when the previous
  // bubble came from someone else.
  const showSender = isGroup && !own && (!prev || prev.direction === 'outbound' || prev.fromEmail !== msg.fromEmail);
  const senderColor = avaColor(msg.fromName || msg.fromEmail);

  return (
    <>
      {showDate && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1" style={{ height: 1, background: 'var(--border-1)' }} />
          <span
            className="rounded-full px-3 py-0.5"
            style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}
          >
            {fmtChatDate(msg.sentAt)}
          </span>
          <div className="flex-1" style={{ height: 1, background: 'var(--border-1)' }} />
        </div>
      )}

      <div className={cn('flex flex-col gap-1 sm5-enter', own ? 'items-end' : 'items-start')}>
        {showSender && (
          <div className="flex items-center gap-1.5 pl-1">
            <span
              className="h-4 w-4 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: senderColor, fontSize: 8 }}
            >
              {ini(msg.fromName || msg.fromEmail)}
            </span>
            <span className="font-semibold" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{senderLabel(msg)}</span>
          </div>
        )}

        {(msg.bodyText || msg.attachments.length === 0) && (
          <div
            className={cn('px-3.5 py-2.5', own ? 'sm5-bubble-own' : 'sm5-bubble-other')}
            style={{ maxWidth: 'min(85%, 34rem)', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {msg.bodyText || '(no text)'}
          </div>
        )}

        {msg.attachments.map((a, idx) => (
          <ConvAttachmentView key={idx} token={token} convId={convId} message={msg} att={a} index={idx} />
        ))}

        <div className={cn('flex items-center gap-1.5 px-1', own && 'flex-row-reverse')}>
          <span className="sm5-mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtChatTime(msg.sentAt)}</span>
          {own && <StatusIcon m={msg} />}
          {msg.status === 'failed' && <span style={{ fontSize: 10, color: 'var(--danger)' }}>{msg.errorMessage || 'Failed to send'}</span>}
        </div>
      </div>
    </>
  );
}

/* ── Conversation tab ──────────────────────────────────────────────────── */

export function ConversationTab({
  token,
  convPushes,
  onConvPushesHandled,
  refreshSignal = 0,
  manualRefreshSignal = 0,
  onUnreadTotalChange,
}: {
  token: string;
  convPushes: ConvPushPayload[];
  onConvPushesHandled: (handledCount: number) => void;
  refreshSignal?: number;
  manualRefreshSignal?: number;
  onUnreadTotalChange?: (count: number) => void;
}) {
  const auth = React.useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [convos, setConvos] = React.useState<MailConv[]>([]);
  const [loadingConvos, setLoadingConvos] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // Which row's mobile swipe (Archive/Delete) is currently revealed — opening
  // one closes any other left open.
  const [swipedRowId, setSwipedRowId] = React.useState<string | null>(null);
  const activeIdRef = React.useRef<string | null>(null);
  const realtimeRefreshSignalRef = React.useRef(refreshSignal);
  const manualRefreshSignalRef = React.useRef(manualRefreshSignal);

  const [railCollapsed, setRailCollapsed] = React.useState(false);
  React.useEffect(() => {
    setRailCollapsed(
      localStorage.getItem('sm5_email_chat_rail_collapsed') === '1',
    );
  }, []);

  const toggleRail = () => {
    setRailCollapsed((current) => {
      const next = !current;
      localStorage.setItem(
        'sm5_email_chat_rail_collapsed',
        next ? '1' : '0',
      );
      return next;
    });
  };
  const convosRequestSeqRef = React.useRef(0);
  const messagesRequestSeqRef = React.useRef<Record<string, number>>({});
  const realtimeRevisionRef = React.useRef(0);
  React.useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const [msgs, setMsgs] = React.useState<Record<string, ConvMessage[]>>({});
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [searchRefreshNonce, setSearchRefreshNonce] = React.useState(0);
  const [searchConvos, setSearchConvos] = React.useState<MailConv[] | null>(null);
  const [messageSearchMatches, setMessageSearchMatches] = React.useState<
    Record<string, ConversationMessageSearchMatch>
  >({});
  const [searchTarget, setSearchTarget] = React.useState<{
    conversationId: string;
    messageId: string;
  } | null>(null);
  const searchRequestSeqRef = React.useRef(0);
  const searchWindowRequestSeqRef = React.useRef(0);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const sendReqIdRef = React.useRef(0);

  const activeConv = convos.find((c) => c._id === activeId);
  const activeMsgs = activeId ? (msgs[activeId] || []) : [];
  const isGroup = isGroupConv(activeConv);

  const unreadTotal = React.useMemo(
    () =>
      convos.reduce(
        (total: number, conversation: MailConv) =>
          total + Math.max(0, Number(conversation.unreadCount || 0)),
        0,
      ),
    [convos],
  );

  React.useEffect(() => {
    onUnreadTotalChange?.(unreadTotal);
  }, [onUnreadTotalChange, unreadTotal]);

  // Unified Email Chat search:
  // one debounced request searches conversation metadata + persisted local
  // MailMessage text. It never queries Gmail and never starts a per-thread
  // request storm.
  React.useEffect(() => {
    const query = q.trim();
    const requestSeq = ++searchRequestSeqRef.current;

    if (!query) {
      setSearching(false);
      setSearchConvos(null);
      setMessageSearchMatches({});
      return;
    }

    if (query.length < 2) {
      setSearching(false);
      setSearchConvos([]);
      setMessageSearchMatches({});
      return;
    }

    setSearching(true);
    setSearchConvos(null);
    setMessageSearchMatches({});

    const timer = window.setTimeout(() => {
      void apiClient
        .get('/api/mail/conversations', {
          headers: auth,
          params: { q: query },
        })
        .then((response) => {
          if (requestSeq !== searchRequestSeqRef.current) return;

          const conversations = Array.isArray(
            response.data?.data?.conversations,
          )
            ? response.data.data.conversations as MailConv[]
            : [];

          const matches = Array.isArray(
            response.data?.data?.messageMatches,
          )
            ? response.data.data.messageMatches as ConversationMessageSearchMatch[]
            : [];

          setSearchConvos(conversations);
          setMessageSearchMatches(
            Object.fromEntries(
              matches.map((match) => [
                match.conversationId,
                match,
              ]),
            ),
          );
        })
        .catch(() => {
          if (requestSeq !== searchRequestSeqRef.current) return;
          setSearchConvos([]);
          setMessageSearchMatches({});
        })
        .finally(() => {
          if (requestSeq === searchRequestSeqRef.current) {
            setSearching(false);
          }
        });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [auth, q, searchRefreshNonce]);

  /* ── Data fetching ── */

  const fetchConvos = React.useCallback(async (silent = false) => {
    const requestSeq = ++convosRequestSeqRef.current;
    const realtimeRevisionAtStart = realtimeRevisionRef.current;

    if (!silent) setLoadingConvos(true);

    try {
      const response = await apiClient.get('/api/mail/conversations', {
        headers: auth,
      });

      // Do not let an older read-only fetch overwrite a socket message that
      // arrived while the request was in flight.
      if (
        requestSeq !== convosRequestSeqRef.current ||
        realtimeRevisionAtStart !== realtimeRevisionRef.current
      ) {
        return;
      }

      setConvos(response.data?.data?.conversations || []);
    } catch (error) {
      if (!silent) {
        toast.error(
          getErrorMessage(error, 'Could not load conversations.'),
        );
      }
    } finally {
      if (requestSeq === convosRequestSeqRef.current) {
        setLoadingConvos(false);
      }
    }
  }, [auth]);

  const fetchMessages = React.useCallback(async (convId: string, silent = false) => {
    const requestSeq =
      (messagesRequestSeqRef.current[convId] || 0) + 1;
    messagesRequestSeqRef.current[convId] = requestSeq;
    const realtimeRevisionAtStart = realtimeRevisionRef.current;

    if (!silent) setLoadingMsgs(true);

    try {
      const response = await apiClient.get(
        `/api/mail/conversations/${convId}/messages`,
        { headers: auth },
      );

      if (
        messagesRequestSeqRef.current[convId] !== requestSeq ||
        realtimeRevisionAtStart !== realtimeRevisionRef.current
      ) {
        return;
      }

      setMsgs((current) => ({
        ...current,
        [convId]: response.data?.data?.messages || [],
      }));
    } catch {
      // Keep the last successful/optimistic message state.
    } finally {
      if (messagesRequestSeqRef.current[convId] === requestSeq) {
        setLoadingMsgs(false);
      }
    }
  }, [auth]);

  const fetchMessageSearchWindow = React.useCallback(
    async (
      convId: string,
      match: ConversationMessageSearchMatch,
    ) => {
      const requestSeq = ++searchWindowRequestSeqRef.current;

      // Existing messages endpoint already supports `before`. One millisecond
      // after the matched timestamp makes the matching bubble itself eligible,
      // then returns up to 100 messages ending at that point in history.
      const sentAtMs = new Date(match.sentAt).getTime();
      const before = Number.isFinite(sentAtMs)
        ? new Date(sentAtMs + 1).toISOString()
        : undefined;

      try {
        const response = await apiClient.get(
          `/api/mail/conversations/${convId}/messages`,
          {
            headers: auth,
            params: {
              limit: 100,
              ...(before ? { before } : {}),
            },
          },
        );

        if (
          requestSeq !== searchWindowRequestSeqRef.current ||
          activeIdRef.current !== convId
        ) {
          return;
        }

        const windowMessages = Array.isArray(
          response.data?.data?.messages,
        )
          ? response.data.data.messages as ConvMessage[]
          : [];

        setMsgs((current) => {
          const map = new Map<string, ConvMessage>();

          for (const message of current[convId] || []) {
            map.set(message._id, message);
          }
          for (const message of windowMessages) {
            map.set(message._id, message);
          }

          return {
            ...current,
            [convId]: [...map.values()].sort(
              (a, b) =>
                new Date(a.sentAt).getTime() -
                new Date(b.sentAt).getTime(),
            ),
          };
        });
      } catch {
        // The normal latest-message load remains usable. Search simply won't
        // jump if the historical window cannot be retrieved.
      }
    },
    [auth],
  );

  React.useEffect(() => { fetchConvos(); }, [fetchConvos]);

  // Realtime reconciliation remains read-only. Socket/history events may cause
  // this signal frequently, so it must NEVER trigger another Gmail sync.
  React.useEffect(() => {
    if (refreshSignal === realtimeRefreshSignalRef.current) return;
    realtimeRefreshSignalRef.current = refreshSignal;

    void fetchConvos(true);
    const currentConversationId = activeIdRef.current;
    if (currentConversationId) {
      void fetchMessages(currentConversationId, true);
    }
  }, [fetchConvos, fetchMessages, refreshSignal]);

  // Explicit header Refresh:
  // 1) run the existing Gmail sync so inbound Email Chat ingestion is current;
  // 2) reload the conversation directory;
  // 3) reload the exact open conversation;
  // 4) rerun the current people/message search, if one is active.
  React.useEffect(() => {
    if (
      manualRefreshSignal ===
      manualRefreshSignalRef.current
    ) {
      return;
    }
    manualRefreshSignalRef.current =
      manualRefreshSignal;

    let cancelled = false;

    void (async () => {
      try {
        await apiClient.post(
          '/api/mail/sync',
          {},
          { headers: auth },
        );
      } catch {
        // Still reconcile the locally persisted Email Chat data below.
      }

      if (cancelled) return;

      const currentConversationId =
        activeIdRef.current;

      const work: Promise<unknown>[] = [
        fetchConvos(true),
      ];

      if (currentConversationId) {
        work.push(
          fetchMessages(
            currentConversationId,
            true,
          ),
        );
      }

      await Promise.allSettled(work);

      if (cancelled) return;

      // The search effect owns request sequencing/debouncing/result shaping.
      // Bumping this nonce reruns the SAME current query instead of clearing
      // the user's filter.
      if (q.trim().length >= 2) {
        setSearchRefreshNonce(
          (value) => value + 1,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    auth,
    fetchConvos,
    fetchMessages,
    manualRefreshSignal,
    q,
  ]);

  /* ── Real-time push from the sync engine / send fan-out ── */

  React.useEffect(() => {
    if (convPushes.length === 0) return;

    const batch = convPushes;
    realtimeRevisionRef.current += 1;
    let missingConversation = false;

    setMsgs((current) => {
      const next = { ...current };

      for (const { conversationId, message } of batch) {
        const existing = next[conversationId] || [];
        const found = existing.some(
          (item) => item._id === message._id,
        );

        next[conversationId] = found
          ? existing.map((item) =>
              item._id === message._id ? message : item,
            )
          : [...existing, message];
      }

      return next;
    });

    setConvos((current) => {
      let next = current;

      for (const { conversationId, message } of batch) {
        const found = next.some(
          (conversation) =>
            conversation._id === conversationId,
        );

        if (!found) {
          missingConversation = true;
          continue;
        }

        next = next.map((conversation) =>
          conversation._id === conversationId
            ? {
                ...conversation,
                lastMessageAt: message.sentAt,
                lastMessagePreview:
                  message.bodyText?.slice(0, 140) ||
                  '📎 Attachment',
                lastMessageDirection: message.direction,
                lastMessageFromName: message.fromName,
                unreadCount:
                  message.direction === 'inbound' &&
                  activeIdRef.current !== conversationId
                    ? (conversation.unreadCount || 0) + 1
                    : activeIdRef.current === conversationId
                      ? 0
                      : conversation.unreadCount,
              }
            : conversation,
        );
      }

      return [...next].sort(
        (a, b) =>
          new Date(b.lastMessageAt || 0).getTime() -
          new Date(a.lastMessageAt || 0).getTime(),
      );
    });

    for (const { conversationId, message } of batch) {
      if (
        activeIdRef.current === conversationId &&
        message.direction === 'inbound'
      ) {
        apiClient
          .post(
            `/api/mail/conversations/${conversationId}/read`,
            {},
            { headers: auth },
          )
          .catch(() => {});
      }
    }

    // If Gmail created/materialized a conversation that was not yet in this
    // pane's list, reconcile the list once after all pushes are applied.
    if (missingConversation) {
      void fetchConvos(true);
    }

    // Remove only the batch this render actually consumed. If another socket
    // message arrived meanwhile, page.tsx keeps that newer tail in the queue.
    onConvPushesHandled(batch.length);
  }, [
    auth,
    convPushes,
    fetchConvos,
    onConvPushesHandled,
  ]);

  /* ── Automatic reconciliation fallback ─────────────────────────────
     Owned by page.tsx so a multi-pane workspace never creates duplicate
     polling loops. Socket pushes remain the fast path.
  ─────────────────────────────────────────────────────────────────────── */

  React.useEffect(() => {
    if (
      searchTarget &&
      searchTarget.conversationId === activeId
    ) {
      return;
    }

    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeId, activeMsgs.length, searchTarget]);

  React.useLayoutEffect(() => {
    if (
      !searchTarget ||
      searchTarget.conversationId !== activeId
    ) {
      return;
    }

    if (
      !activeMsgs.some(
        (message) => message._id === searchTarget.messageId,
      )
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(
          `email-chat-message-${searchTarget.messageId}`,
        )
        ?.scrollIntoView({
          behavior: 'auto',
          block: 'center',
        });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeId, activeMsgs, searchTarget]);

  /* ── Actions ── */

  const openConversation = (
    convId: string,
    searchMatch?: ConversationMessageSearchMatch,
    searchConversation?: MailConv,
  ) => {
    activeIdRef.current = convId;
    setActiveId(convId);

    if (searchConversation) {
      setConvos((current) => {
        const exists = current.some(
          (conversation) => conversation._id === convId,
        );

        if (exists) {
          return current.map((conversation) =>
            conversation._id === convId
              ? { ...conversation, ...searchConversation, unreadCount: 0 }
              : conversation,
          );
        }

        return [
          { ...searchConversation, unreadCount: 0 },
          ...current,
        ];
      });
    } else {
      setConvos((current) =>
        current.map((conversation) =>
          conversation._id === convId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    }

    if (searchMatch) {
      setSearchTarget({
        conversationId: convId,
        messageId: searchMatch.messageId,
      });

      // Latest messages first, then merge the historical page containing the
      // selected search hit. Sequential execution prevents the latest-page
      // replacement from racing after the historical merge.
      void (async () => {
        await fetchMessages(convId);
        await fetchMessageSearchWindow(
          convId,
          searchMatch,
        );
      })();
    } else {
      setSearchTarget(null);
      void fetchMessages(convId);
    }

    apiClient
      .post(
        `/api/mail/conversations/${convId}/read`,
        {},
        { headers: auth },
      )
      .catch(() => {});
  };

  const createConversation = async (payload: NewConversationPayload) => {
    try {
      const r = await apiClient.post('/api/mail/conversations', payload, { headers: auth });
      const conv: MailConv = r.data?.data;
      setNewOpen(false);
      setConvos((p) => (p.some((c) => c._id === conv._id) ? p.map((c) => (c._id === conv._id ? conv : c)) : [conv, ...p]));
      openConversation(conv._id);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not start the conversation.'));
      throw e;
    }
  };

  const applyConvUpdate = (updated: MailConv) => {
    setConvos((p) => p.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
  };

  const archiveActive = () => {
    if (!activeConv) return;
    apiClient.patch(`/api/mail/conversations/${activeConv._id}`, { isArchived: true }, { headers: auth })
      .then(() => {
        toast.success('Conversation archived');
        setConvos((p) => p.filter((c) => c._id !== activeConv._id));
        setActiveId(null);
      })
      .catch(() => toast.error('Could not archive.'));
  };

  // Permanently removes the conversation wrapper from Suprah (the Gmail
  // thread itself is untouched) — deletable straight from the list row,
  // not just from an open thread.
  const deleteConversationRow = (conv: MailConv) => {
    apiClient.delete(`/api/mail/conversations/${conv._id}`, { headers: auth })
      .then(() => {
        toast.success('Conversation deleted');
        setConvos((p) => p.filter((c) => c._id !== conv._id));
        setActiveId((current) => (current === conv._id ? null : current));
      })
      .catch(() => toast.error('Could not delete conversation.'));
  };

  // Row-level counterpart of archiveActive() — same endpoint, but works on
  // whichever row was swiped, not just the currently-open thread.
  const archiveConversationRow = (conv: MailConv) => {
    apiClient.patch(`/api/mail/conversations/${conv._id}`, { isArchived: true }, { headers: auth })
      .then(() => {
        toast.success('Conversation archived');
        setConvos((p) => p.filter((c) => c._id !== conv._id));
        setActiveId((current) => (current === conv._id ? null : current));
      })
      .catch(() => toast.error('Could not archive.'));
  };

  const addFiles = (list: FileList | null) => {
    const result = validateFiles(list, files.length);
    if ('error' in result) { toast.error(result.error); return; }
    if (result.files.length) setFiles((prev) => [...prev, ...result.files]);
  };

  const handleSend = async () => {
    if (!activeId || sending) return;
    if (!input.trim() && files.length === 0) return;
    const convId = activeId;
    const text = input.trim();
    const hasFiles = files.length > 0;
    const reqId = ++sendReqIdRef.current;
    setSending(true);
    setProgress(hasFiles ? 0 : null);
    try {
      const fd = new FormData();
      fd.append('text', text);
      files.forEach((f) => fd.append('files', f));
      const r = await apiClient.post(`/api/mail/conversations/${convId}/messages`, fd, {
        headers: { ...auth, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: any) => {
          if (hasFiles && e.total && sendReqIdRef.current === reqId) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      });
      const message: ConvMessage = r.data?.data?.message;
      if (message) {
        setMsgs((p) => {
          const ex = p[convId] || [];
          return ex.some((m) => m._id === message._id) ? p : { ...p, [convId]: [...ex, message] };
        });
        setConvos((p) => p
          .map((c) => (c._id === convId ? {
            ...c,
            lastMessageAt: message.sentAt,
            lastMessagePreview: message.bodyText?.slice(0, 140) || '📎 Attachment',
            lastMessageDirection: 'outbound' as const,
            lastMessageFromName: message.fromName,
          } : c))
          .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
      }
      setInput('');
      setFiles([]);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Message failed to send.'));
      fetchMessages(convId, true);
    } finally {
      sendReqIdRef.current++;
      setSending(false);
      setProgress(null);
    }
  };

  const normalizedSearchQuery = q.trim().toLowerCase();

  const immediateMetadataMatches = React.useMemo(
    () =>
      !normalizedSearchQuery
        ? convos
        : convos.filter((conversation) =>
            convDisplayName(conversation)
              .toLowerCase()
              .includes(normalizedSearchQuery) ||
            conversation.subject
              .toLowerCase()
              .includes(normalizedSearchQuery) ||
            conversation.participants.some(
              (participant) =>
                participant.email
                  .toLowerCase()
                  .includes(normalizedSearchQuery) ||
                String(participant.name || '')
                  .toLowerCase()
                  .includes(normalizedSearchQuery),
            ) ||
            String(conversation.lastMessagePreview || '')
              .toLowerCase()
              .includes(normalizedSearchQuery),
          ),
    [convos, normalizedSearchQuery],
  );

  const visibleConvos = normalizedSearchQuery
    ? searchConvos ?? immediateMetadataMatches
    : convos;

  /* ── Render ── */

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      {/* Conversation list */}
      <aside
        className={cn(
          'sm5-rail relative flex-col w-full @lg:shrink-0 transition-[width] duration-200',
          railCollapsed ? '@lg:w-16' : '@lg:w-80',
          activeId ? 'hidden @lg:flex' : 'flex',
        )}
      >
        <div className={cn('sm5-toolbar gap-2', railCollapsed ? '@lg:justify-center @lg:px-2' : 'px-3')}>
          <div className={cn('relative flex-1', railCollapsed && '@lg:hidden')}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={q}
              onChange={(event) => {
                const value = event.target.value;
                setQ(value);
                setSearchConvos(null);
                setMessageSearchMatches({});

                if (!value.trim()) {
                  setSearchTarget(null);
                }
              }}
              placeholder="Search people or messages…"
              aria-label="Search Email Chat people, subjects, or message text"
              className="sm5-input w-full h-9 pl-9 pr-8 text-xs"
            />
            {searching && (
              <Loader2
                className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin"
                style={{ color: 'var(--accent)' }}
                aria-label="Searching Email Chat"
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto sm5-scroll px-2 py-2 space-y-0.5">
          {loadingConvos && <CenterSpinner />}
          {!loadingConvos && !searching && visibleConvos.length === 0 && (
            <div className={cn(
              'flex flex-col items-center gap-3 py-14 px-4 text-center',
              railCollapsed && '@lg:hidden',
            )}>
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent-muted)', border: '1px dashed rgba(52,201,125,0.3)' }}
              >
                {normalizedSearchQuery
                  ? <Search className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                  : <Users className="h-5 w-5" style={{ color: 'var(--accent)' }} />}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {normalizedSearchQuery
                  ? normalizedSearchQuery.length < 2
                    ? 'Type at least 2 characters to search message text.'
                    : `No people, subjects, or messages match “${q.trim()}”.`
                  : 'Chat with anyone outside the platform — one person or a group. Messages travel as email, but feel like chat.'}
              </p>
            </div>
          )}
          {visibleConvos.map((c) => {
            const searchMatch =
              messageSearchMatches[c._id];

            return (
              <SwipeableConvRow
                key={c._id}
                conv={c}
                active={activeId === c._id}
                collapsed={railCollapsed}
                searchMatch={searchMatch}
                onOpen={() =>
                  openConversation(
                    c._id,
                    searchMatch,
                    c,
                  )
                }
                onArchive={() => archiveConversationRow(c)}
                onDelete={() => deleteConversationRow(c)}
                isOpen={swipedRowId === c._id}
                onOpenChange={(open) => setSwipedRowId(open ? c._id : null)}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className={cn(
            'sm5-btn absolute bottom-4 right-4 z-10 flex h-11 items-center justify-center gap-2 rounded-full px-4 shadow-lg @lg:bottom-16',
            railCollapsed && '@lg:w-11 @lg:px-0',
          )}
          style={{ fontSize: 13 }}
          title="New conversation"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          <span className={cn(railCollapsed && '@lg:hidden')}>New Chat</span>
        </button>

        <div
          className="hidden shrink-0 py-2.5 @lg:block"
          style={{ borderTop: '1px solid var(--border-1)' }}
        >
          <button
            type="button"
            onClick={toggleRail}
            className={cn(
              'sm5-icon-btn h-9',
              railCollapsed
                ? 'mx-auto w-9'
                : 'mx-2.5 flex w-[calc(100%-1.25rem)] items-center justify-start gap-3 px-3.5',
            )}
            title={railCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            {railCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span style={{ fontSize: 12.5, letterSpacing: '0.045em' }}>
                  Minimize
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Chat pane */}
      <main className={cn('flex-col min-w-0 flex-1', activeId ? 'flex sm5-slide-in @lg:animate-none' : 'hidden @lg:flex')}>
        {!activeId && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageSquare className="h-9 w-9" style={{ color: 'var(--text-disabled)' }} />
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Select a conversation, or start a new one</p>
          </div>
        )}

        {activeId && activeConv && (
          <>
            {/* Chat header */}
            <div className="sm5-toolbar gap-2.5 px-3" style={{ background: 'var(--bg-elevated)' }}>
              <button onClick={() => setActiveId(null)} className="sm5-icon-btn h-9 w-9 @lg:hidden" title="Back">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Avatar seed={convAvatarSeed(activeConv)} size={36} fontSize={12} icon={isGroup ? <Users2 className="h-4 w-4" /> : undefined} />
              <div className="min-w-0 flex-1">
                <p className="sm5-display font-bold truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {convDisplayName(activeConv)}
                </p>
                <p className="truncate" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {isGroup
                    ? `${activeConv.participants.length} members · via email`
                    : `${activeConv.participants[0]?.email || ''} · via email`}
                </p>
              </div>
              <button
                onClick={() => setManageOpen(true)}
                className="sm5-icon-btn h-9 w-9 shrink-0"
                title={isGroup ? 'Manage members' : 'Add members / make group'}
              >
                {isGroup ? <Users2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </button>
              <button onClick={archiveActive} className="sm5-icon-btn h-9 w-9 shrink-0" title="Archive conversation">
                <Archive className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto sm5-scroll px-3 sm:px-4 py-3 space-y-1.5">
              {loadingMsgs && activeMsgs.length === 0 && <CenterSpinner />}
              {!loadingMsgs && activeMsgs.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
                  <span style={{ fontSize: 40, lineHeight: 1 }}>{isGroup ? '👥' : '✉️'}</span>
                  <p className="font-semibold mt-2" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {isGroup ? 'Start the group conversation' : `Say hello to ${convDisplayName(activeConv)}`}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {isGroup
                      ? 'Your first message is emailed to all members — their replies land here for everyone.'
                      : 'Your first message opens the email thread — replies land here as chat, in real time.'}
                  </p>
                </div>
              )}
              {activeMsgs.map((m, i) => {
                const isSearchTarget =
                  searchTarget?.conversationId === activeConv._id &&
                  searchTarget.messageId === m._id;

                return (
                  <div
                    key={m._id}
                    id={`email-chat-message-${m._id}`}
                    className={cn(
                      'rounded-xl transition-[box-shadow,background-color] duration-200',
                      isSearchTarget &&
                        'bg-emerald-500/[0.06] ring-2 ring-emerald-500/55 ring-offset-2 ring-offset-transparent',
                    )}
                  >
                    <ChatBubble
                      token={token}
                      convId={activeConv._id}
                      msg={m}
                      prev={activeMsgs[i - 1]}
                      isGroup={isGroup}
                    />
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            <div className="shrink-0 px-3 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4 sm:pb-3 space-y-1.5">
              {files.length > 0 && (
                <div
                  className="flex flex-wrap gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--accent-muted)', border: '1px solid rgba(52,201,125,0.2)' }}
                >
                  {files.map((f, i) => (
                    <PendingFileChip key={`${f.name}-${i}`} file={f} onRemove={() => setFiles((p) => p.filter((_, idx) => idx !== i))} />
                  ))}
                </div>
              )}
              {progress !== null && <UploadProgressBar progress={progress} />}
              <div
                className="flex items-end gap-2 rounded-2xl px-3 py-2"
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-border)' }}
              >
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                <button onClick={() => fileRef.current?.click()} className="sm5-icon-btn h-9 w-9 shrink-0" title="Attach files">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={isGroup ? 'Message the group… (emailed to all)' : 'Message… (delivered as email)'}
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none py-1.5"
                  style={{ fontSize: 14, color: 'var(--text-primary)', maxHeight: 120, lineHeight: 1.5 }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || (!input.trim() && files.length === 0)}
                  className="sm5-btn h-9 w-9 flex items-center justify-center shrink-0"
                  title="Send"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {newOpen && <NewConversationModal onClose={() => setNewOpen(false)} onCreate={createConversation} />}
      {manageOpen && activeConv && (
        <ManageParticipantsModal token={token} conv={activeConv} onClose={() => setManageOpen(false)} onChanged={applyConvUpdate} />
      )}
    </div>
  );
}